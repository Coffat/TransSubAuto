
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Chat } from '@google/genai';
import { translateVttWithChat } from './services/geminiService';
import { FileUploadArea } from './components/FileUploadArea';
import { ResultsDisplay } from './components/ResultsDisplay';
import { readFileAsText } from './utils/fileUtils';
import { countCues, splitVttIntoCues, groupCuesIntoChunks } from './utils/vttUtils';
import { Notification } from './components/Notification';
import { StatsDisplay } from './components/StatsDisplay';
import { ApiKeyInput } from './components/ApiKeyInput';
import { Console } from './components/Console';

export interface TranslationJob {
  id: number;
  file: File;
  status: 'queued' | 'processing' | 'completed' | 'error';
  translatedVtt?: string;
  error?: string;
  chatSession?: Chat;
  progress?: {
    current: number;
    total: number;
  };
}

interface AppNotification {
  type: 'info' | 'error' | 'success';
  message: string;
}

interface ConsoleMessage {
  level: string;
  message: string;
}

const CUES_PER_CHUNK = 25;
const MAX_CHUNK_RETRIES = 3;


const App: React.FC = () => {
  const [jobs, setJobs] = useState<TranslationJob[]>([]);
  const [isProcessingQueue, setIsProcessingQueue] = useState<boolean>(false);
  const [notification, setNotification] = useState<AppNotification | null>(null);
  const [needsProcessing, setNeedsProcessing] = useState<boolean>(false);
  const [apiKey, setApiKey] = useState<string>('');
  const [isApiKeySet, setIsApiKeySet] = useState<boolean>(false);
  const [fileDelay, setFileDelay] = useState<number>(12);
  const [chunkDelay, setChunkDelay] = useState<number>(5);
  const [glossary, setGlossary] = useState<string>('');
  const [consoleMessages, setConsoleMessages] = useState<ConsoleMessage[]>([]);
  const stopRequest = useRef(false);

  const logToConsole = useCallback((message: string, level: 'info' | 'warn' | 'error' | 'log' = 'log') => {
    const timestamp = new Date().toLocaleTimeString();
    setConsoleMessages(prev => [...prev.slice(-200), { level, message: `[${timestamp}] ${message}` }]);
  }, []);
  
  const handleClearConsole = () => {
    setConsoleMessages([]);
  };

  useEffect(() => {
    const storedApiKey = localStorage.getItem('gemini_api_key');
    if (storedApiKey) {
      setApiKey(storedApiKey);
      setIsApiKeySet(true);
    }
  }, []);

  const handleSaveKey = (key: string) => {
    if (!key.trim()) {
      setNotification({ type: 'error', message: 'API Key cannot be empty.' });
      return;
    }
    localStorage.setItem('gemini_api_key', key);
    setApiKey(key);
    setIsApiKeySet(true);
    setNotification({ type: 'success', message: 'API Key saved successfully!' });
  };

  const handleClearKey = () => {
    localStorage.removeItem('gemini_api_key');
    setApiKey('');
    setIsApiKeySet(false);
    setNotification({ type: 'info', message: 'API Key cleared. Please enter a new key to continue.' });
  };

  const handleFilesSelected = (files: File[]) => {
    const newJobs: TranslationJob[] = files.map((file, index) => ({
      id: Date.now() + index,
      file,
      status: 'queued',
    }));
    setJobs(newJobs);
    setNotification(null);
  };
  
  const handleStopQueue = useCallback(() => {
    stopRequest.current = true;
    logToConsole('Stop request initiated by user.', 'warn');
    setNotification({ type: 'info', message: 'Stopping process... The current operation will finish, then stop.' });
  }, [logToConsole]);

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
      const translatedContent = finalAiOutput.trim();
      const translatedCueCount = countCues(translatedContent);
      
      const isSufficient = translatedCueCount >= originalCueCount * 0.95;
      const isNotExcessive = translatedCueCount <= originalCueCount + 5;

      if (!isSufficient || !isNotExcessive) {
        throw new Error(`Validation Failed: Mismatched subtitle cues. Original: ${originalCueCount}, Translated: ${translatedCueCount}. The AI likely produced an incomplete or malformed response.`);
      }
  };

  const handleProcessQueue = useCallback(async () => {
    if (!isApiKeySet) {
        setNotification({ type: 'error', message: 'Please set your Gemini API Key before starting.' });
        return;
    }
    if (isProcessingQueue || jobs.filter(j => j.status === 'queued').length === 0) {
        return;
    }

    setIsProcessingQueue(true);
    stopRequest.current = false;
    const queuedJobs = jobs.filter(j => j.status === 'queued');
    logToConsole(`Starting translation for ${queuedJobs.length} file(s)...`, 'info');
    setNotification({ 
        type: 'info', 
        message: `Processing ${queuedJobs.length} file(s)... See console for details.` 
    });
    
    let hasError = false;
    let wasStopped = false;

    for (const job of jobs) {
      if (job.status !== 'queued') continue;
      
      if (stopRequest.current) {
        wasStopped = true;
        break;
      }
      
      logToConsole(`Processing file: ${job.file.name}`, 'info');

      let vttHeader = '';
      let finalTranslatedContent = '';
      let chatSession: Chat | undefined = undefined;


      try {
        updateJobStatus(job.id, { status: 'processing', translatedVtt: '', error: undefined });
        const vttInput = await readFileAsText(job.file);

        if (!vttInput.trim()) throw new Error('VTT file is empty or could not be read.');
        
        const { header, cues } = splitVttIntoCues(vttInput);
        vttHeader = header;
        finalTranslatedContent = vttHeader ? `${vttHeader}\n\n` : '';

        if (cues.length === 0) {
             updateJobStatus(job.id, { status: 'completed', translatedVtt: vttHeader });
             continue;
        }

        const chunks = groupCuesIntoChunks(cues, CUES_PER_CHUNK);
        
        for (let i = 0; i < chunks.length; i++) {
            if (stopRequest.current) {
                wasStopped = true;
                updateJobStatus(job.id, { status: 'queued', translatedVtt: '', progress: undefined, error: undefined });
                logToConsole(`Stopped processing before chunk ${i+1} of ${job.file.name}. Reverting status to 'queued'.`, 'warn');
                break;
            }

            const chunk = chunks[i];
            updateJobStatus(job.id, { progress: { current: i + 1, total: chunks.length } });
            
            let chunkAccumulatedText = '';
            let chunkSucceeded = false;

            for (let attempt = 1; attempt <= MAX_CHUNK_RETRIES + 1; attempt++) {
                if (stopRequest.current) {
                    wasStopped = true;
                    updateJobStatus(job.id, { status: 'queued', translatedVtt: '', progress: undefined, error: undefined });
                    logToConsole(`Stopped processing during chunk ${i+1} attempt. Reverting status to 'queued'.`, 'warn');
                    break;
                }

                try {
                    logToConsole(`Translating ${job.file.name} (chunk ${i + 1}/${chunks.length}` + (attempt > 1 ? `, attempt ${attempt}` : '') + `)...`);
                    
                    chunkAccumulatedText = ''; // Reset for each attempt

                    const { chat, stream } = await translateVttWithChat(chatSession, chunk, apiKey, glossary);
                    if (!chatSession) chatSession = chat;
                    
                    for await (const chunkResponse of stream) {
                        chunkAccumulatedText += chunkResponse.text;
                        const partialUpdate = finalTranslatedContent + chunkAccumulatedText;
                        updateJobStatus(job.id, { translatedVtt: partialUpdate });
                    }

                    const originalChunkCueCount = countCues(chunk);
                    const translatedChunkCueCount = countCues(chunkAccumulatedText);

                    if (originalChunkCueCount !== translatedChunkCueCount) {
                        throw new Error(`Chunk validation failed. Expected ${originalChunkCueCount} cues, but received ${translatedChunkCueCount}.`);
                    }
                    
                    logToConsole(`Chunk ${i+1}/${chunks.length} of ${job.file.name} translated successfully.`, 'info');
                    chunkSucceeded = true;
                    break; 
                } catch (error) {
                    console.warn(`Attempt ${attempt} for chunk ${i + 1} of ${job.file.name} failed.`, error);
                    chatSession = undefined; // Invalidate session to start fresh on retry

                    if (attempt > MAX_CHUNK_RETRIES) {
                        throw new Error(`Failed to translate chunk ${i + 1} after ${MAX_CHUNK_RETRIES + 1} attempts. Last error: ${(error as Error).message}`);
                    }

                    const errorMessage = (error as Error).message.toLowerCase();
                    let backoffDelay = 1500 * Math.pow(2, attempt - 1);

                    // Add aggressive backoff for rate limit errors
                    if (errorMessage.includes('resource_exhausted')) {
                        const newChunkDelay = Math.min(chunkDelay + 5, 30);
                        logToConsole(`Rate limit hit. Automatically increasing delay between chunks to ${newChunkDelay}s.`, 'warn');
                        setChunkDelay(newChunkDelay);
                        
                        // Apply a significant cooldown on EVERY rate limit failure to allow quota to recover.
                        const cooldownPeriod = 15000; // 15 seconds cooldown
                        backoffDelay += cooldownPeriod;
                        logToConsole(`Applying an additional ${cooldownPeriod / 1000}s cooldown period due to rate limit.`, 'warn');
                    }
                    
                    logToConsole(`Attempt failed for chunk ${i+1} of ${job.file.name}. Retrying in ${backoffDelay / 1000}s...`, 'warn');
                    await new Promise(resolve => setTimeout(resolve, backoffDelay));
                }
            }

            if (wasStopped) break;

            if (chunkSucceeded) {
                finalTranslatedContent += chunkAccumulatedText.trim() + '\n\n';
            } else {
                throw new Error(`Chunk ${i + 1} could not be processed successfully.`);
            }

            if (i < chunks.length - 1 && !stopRequest.current) {
                logToConsole(`Waiting ${chunkDelay}s before next chunk...`);
                await new Promise(resolve => setTimeout(resolve, chunkDelay * 1000));
            }
        }

        if (wasStopped) break;

        validateTranslation(vttInput, finalTranslatedContent);
        
        updateJobStatus(job.id, {
            status: 'completed',
            translatedVtt: finalTranslatedContent.trim(),
            progress: undefined,
        });
        logToConsole(`Successfully validated and completed translation for ${job.file.name}.`, 'info');

      } catch (error) {
        hasError = true;
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        console.error(`Error processing ${job.file.name}:`, error);
        updateJobStatus(job.id, { status: 'error', error: errorMessage, progress: undefined });
        logToConsole(`Error processing ${job.file.name}: ${errorMessage}`, 'error');
      }

      const currentIndex = jobs.findIndex(j => j.id === job.id);
      if (!wasStopped && currentIndex < jobs.length - 1) {
          const hasMoreQueued = jobs.slice(currentIndex + 1).some(j => j.status === 'queued');
          if (hasMoreQueued) {
               logToConsole(`Waiting ${fileDelay}s before processing next file...`);
               await new Promise(resolve => setTimeout(resolve, fileDelay * 1000));
          }
      }
    }

    if (wasStopped) {
        setNotification({ type: 'info', message: 'Translation process stopped by user.' });
        logToConsole('Translation process stopped by user.', 'warn');
    } else if (hasError) {
        setNotification({ type: 'error', message: 'Some files failed to translate. Check results and console for details.' });
        logToConsole('Queue processing finished with one or more errors.', 'error');
    } else {
        setNotification({ type: 'success', message: `All processed files completed successfully!` });
        logToConsole('Queue processing finished successfully.', 'info');
    }

    setIsProcessingQueue(false);
  }, [jobs, isProcessingQueue, isApiKeySet, apiKey, fileDelay, chunkDelay, glossary, logToConsole]);
  
  const handleRetryJob = (id: number) => {
    const jobToRetry = jobs.find(job => job.id === id);
    if (jobToRetry && (jobToRetry.status === 'error' || jobToRetry.status === 'completed')) {
      updateJobStatus(id, { 
        status: 'queued', 
        error: undefined, 
        translatedVtt: undefined, 
        chatSession: undefined,
        progress: undefined
      });
      setNeedsProcessing(true);
    }
  };

  useEffect(() => {
    if (needsProcessing && !isProcessingQueue) {
      setNeedsProcessing(false);
      handleProcessQueue();
    }
  }, [needsProcessing, isProcessingQueue, handleProcessQueue]);

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <main className="max-w-7xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-100">
            WebVTT Subtitle <span className="text-cyan-400">Translator</span>
          </h1>
          <p className="mt-2 text-lg text-slate-400">
            AI-powered batch translation from English to Vietnamese.
          </p>
        </header>
        
        <div className="mb-6">
          <ApiKeyInput
            isApiKeySet={isApiKeySet}
            onSaveKey={handleSaveKey}
            onClearKey={handleClearKey}
          />
        </div>

        {notification && (
          <Notification 
            type={notification.type} 
            message={notification.message}
            onDismiss={() => setNotification(null)} 
          />
        )}
        
        <StatsDisplay jobs={jobs} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <FileUploadArea 
            jobs={jobs}
            onFilesSelected={handleFilesSelected} 
            onProcessQueue={handleProcessQueue}
            onClearQueue={handleClearQueue}
            onStopQueue={handleStopQueue}
            isProcessing={isProcessingQueue}
            isApiKeySet={isApiKeySet}
            fileDelay={fileDelay}
            onFileDelayChange={setFileDelay}
            chunkDelay={chunkDelay}
            onChunkDelayChange={setChunkDelay}
            glossary={glossary}
            onGlossaryChange={setGlossary}
          />
          <ResultsDisplay jobs={jobs} onRetryJob={handleRetryJob} />
        </div>
        
        <div className="mt-6">
          <Console messages={consoleMessages} onClear={handleClearConsole} />
        </div>
      </main>
    </div>
  );
};

export default App;
