
import React, { useState, useCallback } from 'react';
import { translateVttStream } from './services/geminiService';
import { FileUploadArea } from './components/FileUploadArea';
import { ResultsDisplay } from './components/ResultsDisplay';
import { readFileAsText } from './utils/fileUtils';

export interface TranslationJob {
  id: number;
  file: File;
  status: 'queued' | 'processing' | 'completed' | 'error';
  translatedVtt?: string;
  error?: string;
}

const App: React.FC = () => {
  const [jobs, setJobs] = useState<TranslationJob[]>([]);
  const [isProcessingQueue, setIsProcessingQueue] = useState<boolean>(false);

  const handleFilesSelected = (files: File[]) => {
    const newJobs: TranslationJob[] = files.map((file, index) => ({
      id: Date.now() + index,
      file,
      status: 'queued',
    }));
    setJobs(newJobs);
  };

  const updateJobStatus = (id: number, updates: Partial<TranslationJob>) => {
    setJobs(prevJobs =>
      prevJobs.map(job => (job.id === id ? { ...job, ...updates } : job))
    );
  };
  
  const handleClearQueue = () => {
    setJobs([]);
  };

  const handleProcessQueue = useCallback(async () => {
    if (!jobs.length || isProcessingQueue) return;

    setIsProcessingQueue(true);

    for (const job of jobs) {
      if (job.status !== 'queued') continue;

      try {
        updateJobStatus(job.id, { status: 'processing' });
        const vttInput = await readFileAsText(job.file);

        if (!vttInput.trim()) {
          throw new Error('VTT file is empty or could not be read.');
        }

        const stream = await translateVttStream(vttInput);
        let accumulatedText = '';

        for await (const chunk of stream) {
          accumulatedText += chunk.text;
        }

        const translatedMatch = accumulatedText.match(/=== TRANSLATED VTT ===\s*([\s\S]*)/);
        if (translatedMatch && translatedMatch[1]) {
           updateJobStatus(job.id, {
            status: 'completed',
            translatedVtt: translatedMatch[1].trimStart(),
          });
        } else {
          throw new Error('Translation output was not in the expected format.');
        }

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        console.error(`Translation failed for ${job.file.name}: ${errorMessage}`);
        updateJobStatus(job.id, { status: 'error', error: errorMessage });
      } finally {
        // Simple delay to avoid hitting API rate limits
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    setIsProcessingQueue(false);
  }, [jobs, isProcessingQueue]);

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
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="flex flex-col">
             <h2 className="text-2xl font-semibold text-white mb-4">Upload Files</h2>
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
            <ResultsDisplay jobs={jobs} />
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
