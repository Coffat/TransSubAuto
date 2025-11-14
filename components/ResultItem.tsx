
import React, { useState } from 'react';
import { TranslationJob } from '../App';
import { ClipboardIcon } from './icons/ClipboardIcon';
import { CheckIcon } from './icons/CheckIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { downloadFile } from '../utils/fileUtils';
import clsx from 'clsx';

interface ResultItemProps {
  job: TranslationJob;
}

export const ResultItem: React.FC<ResultItemProps> = ({ job }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = () => {
    if (!job.translatedVtt) return;
    navigator.clipboard.writeText(job.translatedVtt);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };
  
  const handleDownload = () => {
    if (!job.translatedVtt) return;
    downloadFile(job.translatedVtt, job.file.name.replace('.vtt', '_vi.vtt'));
  }

  const isSuccess = job.status === 'completed';

  return (
    <div className={clsx(
        "bg-slate-700/50 rounded-lg transition-all duration-300",
        isSuccess ? "border-l-4 border-green-500" : "border-l-4 border-red-500"
    )}>
      <button 
        className="w-full flex items-center justify-between p-3 text-left"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
      >
        <span className="font-mono text-sm truncate mr-4 text-slate-200">{job.file.name}</span>
        <div className="flex items-center space-x-2">
            <span className={clsx(
                "text-xs font-bold uppercase px-2 py-1 rounded-full",
                isSuccess ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300"
            )}>
                {job.status}
            </span>
            <ChevronDownIcon className={clsx("w-5 h-5 text-slate-400 transition-transform", isExpanded && "rotate-180")} />
        </div>
      </button>

      {isExpanded && (
        <div className="p-3 border-t border-slate-600/50">
          {isSuccess && job.translatedVtt ? (
            <div>
              <div className="relative">
                <textarea
                  readOnly
                  value={job.translatedVtt}
                  className="w-full h-48 p-2 bg-slate-900/50 rounded-md text-slate-300 font-mono text-xs resize-none focus:outline-none"
                  spellCheck="false"
                />
              </div>
              <div className="flex space-x-2 mt-2">
                <button 
                    onClick={handleCopy} 
                    className="flex-1 inline-flex items-center justify-center px-3 py-2 text-sm font-medium rounded-md text-slate-200 bg-slate-600 hover:bg-slate-500 transition-colors"
                >
                    {isCopied ? <CheckIcon className="w-4 h-4 mr-2 text-green-400" /> : <ClipboardIcon className="w-4 h-4 mr-2" />}
                    {isCopied ? 'Copied!' : 'Copy'}
                </button>
                 <button 
                    onClick={handleDownload}
                    className="flex-1 inline-flex items-center justify-center px-3 py-2 text-sm font-medium rounded-md text-white bg-cyan-600 hover:bg-cyan-700 transition-colors"
                >
                    Download
                </button>
              </div>
            </div>
          ) : (
            <div className="p-2 bg-red-900/30 rounded-md">
                <p className="text-red-300 text-sm font-semibold">Error:</p>
                <p className="text-red-400 text-xs mt-1 font-mono">{job.error}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
