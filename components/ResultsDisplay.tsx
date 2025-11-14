
import React from 'react';
import { TranslationJob } from '../App';
import { ResultItem } from './ResultItem';

interface ResultsDisplayProps {
  jobs: TranslationJob[];
}

export const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ jobs }) => {
  const processedJobs = jobs.filter(job => job.status === 'completed' || job.status === 'error');

  return (
    <div className="flex flex-col h-full bg-slate-800 rounded-lg shadow-lg min-h-[500px] lg:min-h-0 overflow-hidden">
      {processedJobs.length === 0 ? (
        <div className="flex items-center justify-center h-full p-8 text-slate-500">
          <p>Completed translations will appear here.</p>
        </div>
      ) : (
        <div className="h-full overflow-y-auto p-4 space-y-3">
            {processedJobs.map(job => (
                <ResultItem key={job.id} job={job} />
            ))}
        </div>
      )}
    </div>
  );
};
