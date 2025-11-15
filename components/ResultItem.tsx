
import React, { useState, useMemo } from 'react';
import { TranslationJob } from '../App';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { CheckIcon } from './icons/CheckIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { DownloadIcon } from './icons/DownloadIcon';
import { RefreshIcon } from './icons/RefreshIcon';
import { downloadFile } from '../utils/fileUtils';
import clsx from 'clsx';

interface ResultItemProps {
  job: TranslationJob;
  onRetryJob: (id: number) => void;
}

export const ResultItem: React.FC<ResultItemProps> = ({ job, onRetryJob }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const cleanVtt = useMemo(() => (job.translatedVtt || '').trim(), [job.translatedVtt]);

  const handleCopy = () => {
    if (!cleanVtt) return;
    navigator.clipboard.writeText(cleanVtt);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };
  
  const handleDownload = () => {
    if (!cleanVtt) return;
    downloadFile(cleanVtt, job.file.name.replace('.vtt', '_vi.vtt'));
  }

  const isSuccess = job.status === 'completed';

  return (
    <div className={clsx(
        "bg-slate-700/50 rounded-lg transition-all duration-300 animate-fade-in",
        isSuccess ? "border-l-4 border-green-500" : "border-l-4 border-red-500"
    )}>
      <div className="w-full flex items-center justify-between p-3 text-left">
        <div 
          className="flex items-center flex-grow cursor-pointer truncate mr-4 group"
          onClick={() => setIsExpanded(!isExpanded)}
          role="button"
          tabIndex={0}
          onKeyPress={(e) => ['Enter', ' '].includes(e.key) && setIsExpanded(!isExpanded)}
          aria-expanded={isExpanded}
        >
          <span className="font-mono text-sm truncate text-slate-200 group-hover:text-cyan-400 transition-colors">{job.file.name}</span>
          <ChevronDownIcon className={clsx("w-5 h-5 text-slate-400 transition-transform ml-2 flex-shrink-0", isExpanded && "rotate-180")} />
        </div>
        
        <div className="flex items-center space-x-3 flex-shrink-0">
          <button 
              onClick={handleCopy} 
              className="p-1.5 rounded-full text-slate-400 hover:bg-slate-600 hover:text-cyan-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-700 focus:ring-cyan-500 transition-colors"
              aria-label="Copy to clipboard"
              title={isCopied ? 'Copied!' : 'Copy to clipboard'}
              disabled={!cleanVtt}
          >
              {isCopied ? <CheckIcon className="w-5 h-5 text-green-400" /> : <ClipboardIcon className="w-5 h-5" />}
          </button>
          
          <button 
              onClick={handleDownload}
              className="p-1.5 rounded-full text-slate-400 hover:bg-slate-600 hover:text-cyan-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-700 focus:ring-cyan-500 transition-colors"
              aria-label="Download translated file"
              title="Download translated file"
              disabled={!cleanVtt}
          >
              <DownloadIcon className="w-5 h-5" />
          </button>
          
          <div className="flex items-center space-x-1.5">
            {job.status === 'error' && (
              <button 
                onClick={() => onRetryJob(job.id)}
                className="p-1.5 rounded-full text-slate-400 hover:bg-slate-600 hover:text-cyan-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-700 focus:ring-cyan-500 transition-colors"
                aria-label="Retry translation"
                title="Retry translation"
              >
                  <RefreshIcon className="w-5 h-5" />
              </button>
            )}
            <span className={clsx(
                "text-xs font-bold uppercase px-2 py-1 rounded-full",
                isSuccess ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300"
            )}>
                {job.status}
            </span>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="p-3 border-t border-slate-600/50">
          {job.status !== 'error' && job.translatedVtt !== undefined ? (
            <textarea
              readOnly
              value={cleanVtt}
              className="w-full h-48 p-2 bg-slate-900/50 rounded-md text-slate-300 font-mono text-xs resize-none focus:outline-none"
              spellCheck="false"
            />
          ) : job.status === 'error' ? (
            <div className="p-2 bg-red-900/30 rounded-md">
                <p className="text-red-300 text-sm font-semibold">Error:</p>
                <p className="text-red-400 text-xs mt-1 font-mono">{job.error}</p>
                {job.translatedVtt && (
                     <textarea
                        readOnly
                        value={(job.translatedVtt || '').trim()}
                        className="w-full h-32 p-2 mt-2 bg-slate-900/50 rounded-md text-slate-400 font-mono text-xs resize-y focus:outline-none"
                        spellCheck="false"
                        placeholder="Partial output for debugging..."
                    />
                )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};
