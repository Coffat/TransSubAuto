import React, { useCallback, useState } from 'react';
import { TranslationJob } from '../App';
import { UploadIcon } from './icons/UploadIcon';
import { DelaySlider } from './DelaySlider';
import { XCircleIcon } from './icons/XCircleIcon';
import { GlossaryInput } from './GlossaryInput';
import clsx from 'clsx';

interface FileUploadAreaProps {
  jobs: TranslationJob[];
  onFilesSelected: (files: File[]) => void;
  onProcessQueue: () => void;
  onClearQueue: () => void;
  onStopQueue: () => void;
  isProcessing: boolean;
  isApiKeySet: boolean;
  fileDelay: number;
  onFileDelayChange: (delay: number) => void;
  chunkDelay: number;
  onChunkDelayChange: (delay: number) => void;
  glossary: string;
  onGlossaryChange: (value: string) => void;
}

const JobStatus: React.FC<{ job: TranslationJob }> = ({ job }) => {
    const { status, progress } = job;

    const getStatusColor = () => {
        switch(status) {
            case 'queued': return 'text-slate-400';
            case 'processing': return 'text-cyan-400';
            case 'completed': return 'text-green-400';
            case 'error': return 'text-red-400';
            default: return 'text-slate-400';
        }
    }
    
    const getStatusText = () => {
        if (status === 'processing' && progress) {
            return `${progress.current} / ${progress.total} chunks`;
        }
        return status;
    }

    return (
        <span className={clsx(
            "font-semibold capitalize", 
            getStatusColor(),
            status === 'processing' && 'animate-pulse'
        )}>
            {getStatusText()}
        </span>
    );
};


export const FileUploadArea: React.FC<FileUploadAreaProps> = ({ 
    jobs, onFilesSelected, onProcessQueue, onClearQueue, onStopQueue, isProcessing, 
    isApiKeySet, fileDelay, onFileDelayChange, chunkDelay, onChunkDelayChange,
    glossary, onGlossaryChange
}) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      onFilesSelected(Array.from(e.target.files));
    }
  };

  const handleDragEvents = (e: React.DragEvent<HTMLDivElement>, isEntering: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(isEntering);
  };
  
  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    handleDragEvents(e, false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesSelected(Array.from(e.dataTransfer.files));
      e.dataTransfer.clearData();
    }
  }, [onFilesSelected]);


  return (
    <div className="flex flex-col h-full bg-slate-800 rounded-lg shadow-lg overflow-hidden">
        <div 
            className={clsx(
                "flex-grow p-4 transition-colors",
                isDragging ? 'bg-slate-700/80' : 'bg-slate-800'
            )}
            onDragEnter={(e) => handleDragEvents(e, true)}
            onDragLeave={(e) => handleDragEvents(e, false)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
        >
            {jobs.length === 0 ? (
                 <label htmlFor="file-upload" className="flex flex-col items-center justify-center w-full h-full border-2 border-dashed border-slate-600 hover:border-cyan-500 rounded-lg cursor-pointer transition-colors">
                    <UploadIcon className="w-12 h-12 text-slate-500 mb-4" />
                    <p className="text-lg text-slate-400">Drag & Drop .vtt files here</p>
                    <p className="text-sm text-slate-500">or click to select</p>
                    <input id="file-upload" type="file" multiple accept=".vtt" className="hidden" onChange={handleFileChange} disabled={isProcessing} />
                </label>
            ) : (
                <div className="h-full max-h-[350px] overflow-y-auto pr-2">
                    <ul className="space-y-2">
                        {jobs.map(job => (
                            <li key={job.id} className="p-2 bg-slate-700/50 rounded-md text-sm flex justify-between items-center">
                                <span className="font-mono truncate mr-4">{job.file.name}</span>
                                <JobStatus job={job} />
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
              
        <div className="p-4 bg-slate-700/50 border-t border-slate-600">
            <div className="mb-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                    <DelaySlider
                        id="chunk-delay-slider"
                        label="Delay Between Chunks"
                        description="Delay between requests for a single file. Helps avoid rapid-fire API calls."
                        value={chunkDelay}
                        onChange={onChunkDelayChange}
                        disabled={isProcessing}
                    />
                    <DelaySlider
                        id="file-delay-slider"
                        label="Delay Between Files"
                        description="Increase if you encounter quota errors. A few seconds is a safe start."
                        value={fileDelay}
                        onChange={onFileDelayChange}
                        disabled={isProcessing}
                    />
                </div>
                <GlossaryInput
                    value={glossary}
                    onChange={onGlossaryChange}
                    disabled={isProcessing}
                />
            </div>
            <div className="flex space-x-4">
                 {isProcessing ? (
                    <button
                        onClick={onStopQueue}
                        className="w-full inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-red-500 transition-colors"
                        >
                        <XCircleIcon className="mr-3 h-5 w-5 text-white" />
                        Stop Processing
                    </button>
                ) : (
                    <>
                        <button
                            onClick={onProcessQueue}
                            disabled={jobs.filter(j => j.status === 'queued').length === 0 || !isApiKeySet}
                            title={!isApiKeySet ? 'Please set your API key first' : 'Translate all queued files'}
                            className="w-full inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-cyan-500 disabled:bg-slate-500 disabled:cursor-not-allowed transition-colors"
                        >
                            {`Translate Queued (${jobs.filter(j => j.status === 'queued').length})`}
                        </button>
                        <button
                            onClick={onClearQueue}
                            disabled={isProcessing}
                            className="px-6 py-3 border border-slate-500 text-base font-medium rounded-md shadow-sm text-slate-300 bg-slate-600 hover:bg-slate-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Clear All
                        </button>
                    </>
                )}
            </div>
        </div>
    </div>
  );
};