import React, { useState, useCallback, useEffect } from 'react';
import { Chat } from '@google/genai';
import { translateVttWithChat } from './services/geminiService';
import { FileUploadArea } from './components/FileUploadArea';
import { ResultsDisplay } from './components/ResultsDisplay';
import { readFileAsText } from './utils/fileUtils';
import { splitVttIntoCues, groupCuesIntoChunks, countCues, extractTranslatedVttContent } from './utils/vttUtils';
import { Notification } from './components/Notification';
import { StatsDisplay } from './components/StatsDisplay';

export interface TranslationJob {
  id: number;
  file: File;
  status: 'queued' | 'processing' | 'completed' | 'error';
  translatedVtt?: string;
  error?: string;
  chatSession?: Chat;
}

interface AppNotification {
  type: 'info' | 'error' | 'success';
  message: string;
}

const CHUNK_SIZE = 70; // Number of cues per chunk

const App: React.FC = () => {
  const [jobs, setJobs] = useState<TranslationJob[]>([]);
  const [isProcessingQueue, setIsProcessingQueue] = useState<boolean>(false);
  const [notification, setNotification] = useState<AppNotification | null>(null);
  const [needsProcessing, setNeedsProcessing] = useState<boolean>(false);

  const handleFilesSelected = (files: File[]) => {
    const newJobs: TranslationJob[] = files.map((file, index) => ({
      id: Date.now() + index,
      file,
      status: 'queued',
    }));
    setJobs(newJobs);
    setNotification(null);
  };

  const updateJobStatus = (id: number, updates: Partial<TranslationJob>) => {
    setJobs(prevJobs =>
      prevJobs.map(job => (job.id === id ? { ...job, ...updates } : job))
    );
  };
  
  const handleClearQueue = () => {
    setJobs([]);
    setNotification(null);
  };
  
  const validateTranslation = (originalVtt: string, finalAiOutput: string) => {
      const originalCueCount = countCues(originalVtt);
      const translatedContent = extractTranslatedVttContent(finalAiOutput);
      const translatedCueCount = countCues(translatedContent);
      
      // Allow a small tolerance (95% of original cues), but not significantly more.
      const isSufficient = translatedCueCount >= originalCueCount * 0.95;
      const isNotExcessive = translatedCueCount <= originalCueCount + 5; // Allow for rare cases of minor splitting.

      if (!isSufficient || !isNotExcessive) {
        throw new Error(`Validation Failed: The output has a mismatched number of subtitle cues. Original: ${originalCueCount}, Translated: ${translatedCueCount}. The AI likely produced an incomplete or malformed response.`);
      }
  };

  const handleProcessQueue = useCallback(async () => {
    if (!jobs.length || isProcessingQueue) return;

    setIsProcessingQueue(true);
    const queuedJobs = jobs.filter(j => j.status === 'queued');
    if (queuedJobs.length > 0) {
        setNotification({ 
            type: 'info', 
            message: `Starting translation process for ${queuedJobs.length} file(s)...` 
        });
    }
    
    let hasError = false;

    for (const job of jobs) {
      if (job.status !== 'queued') continue;

      try {
        updateJobStatus(job.id, { status: 'processing', translatedVtt: '' });
        const vttInput = await readFileAsText(job.file);

        if (!vttInput.trim()) {
          throw new Error('VTT file is empty or could not be read.');
        }

        const { header, cues } = splitVttIntoCues(vttInput);

        if (cues.length <= CHUNK_SIZE) {
          // Process small files in a single pass
          setNotification({ type: 'info', message: `Translating ${job.file.name} (single pass)...` });
          
          const { chat, stream } = await translateVttWithChat(job.chatSession, vttInput, true);
          updateJobStatus(job.id, { chatSession: chat });

          let accumulatedText = '';
          let lastUiUpdate = 0;
          const UI_UPDATE_INTERVAL = 200;

          for await (const chunk of stream) {
            accumulatedText += chunk.text;
            const now = Date.now();
            if (now - lastUiUpdate > UI_UPDATE_INTERVAL) {
              updateJobStatus(job.id, { translatedVtt: accumulatedText });
              lastUiUpdate = now;
            }
          }
          
          // Final validation
          validateTranslation(vttInput, accumulatedText);
          
          updateJobStatus(job.id, {
              status: 'completed',
              translatedVtt: accumulatedText,
          });

        } else {
          // Process large files in chunks
          const chunks = groupCuesIntoChunks(cues, CHUNK_SIZE);
          let finalTranslatedVtt = '';
          let currentChatSession = job.chatSession;
          
          for (let i = 0; i < chunks.length; i++) {
            const isInitialChunk = i === 0;
            const chunkContent = chunks[i];
            const contentToSend = isInitialChunk ? (header ? `${header}\n\n${chunkContent}` : `WEBVTT\n\n${chunkContent}`) : chunkContent;

            setNotification({ type: 'info', message: `Translating ${job.file.name} (chunk ${i + 1}/${chunks.length})...` });

            try {
              const { chat, stream } = await translateVttWithChat(currentChatSession, contentToSend, isInitialChunk);
              currentChatSession = chat; // Persist session for the next chunk
              updateJobStatus(job.id, { chatSession: currentChatSession });

              let accumulatedChunkText = '';
              for await (const chunk of stream) {
                accumulatedChunkText += chunk.text;
              }

              // Defensively clean any markers from the chunk's response before appending.
              const cleanChunk = accumulatedChunkText
                .replace('=== TRANSLATED VTT ===', '')
                .replace('=== END OF TRANSLATION ===', '')
                .trim();
              
              if (cleanChunk) {
                 finalTranslatedVtt += cleanChunk + '\n\n';
              }
             
              // Update the UI with the raw accumulated output. The AI provides the header in the first chunk.
              updateJobStatus(job.id, { translatedVtt: finalTranslatedVtt });

              // Add a delay between chunks to avoid hitting rate limits
              if (i < chunks.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 3000));
              }

            } catch (chunkError) {
              const errorMessage = chunkError instanceof Error ? chunkError.message : String(chunkError);
              throw new Error(`Failed on chunk ${i + 1}/${chunks.length}. Details: ${errorMessage}`);
            }
          }
          
           const finalVttWithMarkers = `=== TRANSLATED VTT ===\n\n${finalTranslatedVtt.trim()}\n\n=== END OF TRANSLATION ===`;
           
           // Final validation after stitching all chunks
           validateTranslation(vttInput, finalVttWithMarkers);
           
           updateJobStatus(job.id, { status: 'completed', translatedVtt: finalVttWithMarkers });
        }
        
        const remainingJobs = jobs.filter(j => j.status === 'queued' && j.id !== job.id);
        if(remainingJobs.length > 0) {
            await new Promise(resolve => setTimeout(resolve, 5000));
        }

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        console.error(`Translation failed for ${job.file.name}: ${errorMessage}`);
        updateJobStatus(job.id, { status: 'error', error: errorMessage, translatedVtt: job.translatedVtt || '' });
        setNotification({ type: 'error', message: `Processing stopped on "${job.file.name}": ${errorMessage}` });
        hasError = true;
        break;
      }
    }

    if (!hasError && jobs.every(j => j.status === 'completed' || j.status === 'error')) {
        const completedCount = jobs.filter(j => j.status === 'completed').length;
        if(completedCount > 0 && completedCount === jobs.length) {
            setNotification({ type: 'success', message: 'All files translated successfully!' });
        }
    }

    setIsProcessingQueue(false);
  }, [jobs, isProcessingQueue]);
  
  const handleRetryJob = (id: number) => {
    if (isProcessingQueue) return;
    setJobs(prevJobs =>
      prevJobs.map(job =>
        job.id === id
          ? { ...job, status: 'queued', error: undefined, translatedVtt: undefined, chatSession: undefined }
          : job
      )
    );
    setNotification(null);
    setNeedsProcessing(true);
  };

  useEffect(() => {
    if (needsProcessing && !isProcessingQueue) {
      setNeedsProcessing(false);
      handleProcessQueue();
    }
  }, [needsProcessing, isProcessingQueue, handleProcessQueue]);


  return (
    <div className="min-h-screen bg-slate-900 font-sans p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold text-white">
            WebVTT Subtitle <span className="text-cyan-400">Translator</span>
          </h1>
          <p className="mt-4 text-lg text-slate-400">
            Translate subtitles from English to Vietnamese while preserving perfect VTT structure.
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Crafted by <span className="font-semibold text-cyan-400">CoffatDev</span>
          </p>
        </header>

        {notification && (
            <Notification
                type={notification.type}
                message={notification.message}
                onDismiss={() => setNotification(null)}
            />
        )}

        <main className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="flex flex-col">
             <h2 className="text-2xl font-semibold text-white mb-4">Upload Files</h2>
             <StatsDisplay jobs={jobs} />
             <FileUploadArea
                jobs={jobs}
                onFilesSelected={handleFilesSelected}
                onProcessQueue={handleProcessQueue}
                onClearQueue={handleClearQueue}
                isProcessing={isProcessingQueue}
            />
          </div>
          
          <div className="flex flex-col">
            <h2 className="text-2xl font-semibold text-white mb-4">Results</h2>
            <ResultsDisplay jobs={jobs} onRetryJob={handleRetryJob} />
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;