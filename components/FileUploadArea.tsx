
import React, { useCallback, useState } from 'react';
import { TranslationJob } from '../App';
import { UploadIcon } from './icons/UploadIcon';
import clsx from 'clsx';

interface FileUploadAreaProps {
  jobs: TranslationJob[];
  onFilesSelected: (files: File[]) => void;
  onProcessQueue: () => void;
  onClearQueue: () => void;
  isProcessing: boolean;
}

const getStatusColor = (status: TranslationJob['status']) => {
    switch(status) {
        case 'queued': return 'text-slate-400';
        case 'processing': return 'text-cyan-400 animate-pulse';
        case 'completed': return 'text-green-400';
        case 'error': return 'text-red-400';
    }
}

export const FileUploadArea: React.FC<FileUploadAreaProps> = ({ 
    jobs, onFilesSelected, onProcessQueue, onClearQueue, isProcessing 
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
                <div className="h-full max-h-96 overflow-y-auto pr-2">
                    <ul className="space-y-2">
                        {jobs.map(job => (
                            <li key={job.id} className="p-2 bg-slate-700/50 rounded-md text-sm flex justify-between items-center">
                                <span className="font-mono truncate mr-4">{job.file.name}</span>
                                <span className={clsx("font-semibold capitalize", getStatusColor(job.status))}>
                                    {job.status}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
      
        <div className="p-4 bg-slate-700/50 border-t border-slate-600/50 flex space-x-4">
             <button
                onClick={onProcessQueue}
                disabled={isProcessing || jobs.length === 0}
                className="w-full inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-cyan-500 disabled:bg-slate-500 disabled:cursor-not-allowed transition-colors"
                >
                {isProcessing ? (
                    <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                    </>
                ) : (
                    `Translate All (${jobs.length})`
                )}
            </button>
            <button
                onClick={onClearQueue}
                disabled={isProcessing}
                className="px-6 py-3 border border-slate-500 text-base font-medium rounded-md shadow-sm text-slate-300 bg-slate-600 hover:bg-slate-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
                Clear
            </button>
      </div>
    </div>
  );
};
