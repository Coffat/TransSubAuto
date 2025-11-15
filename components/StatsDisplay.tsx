
import React from 'react';
import { TranslationJob } from '../App';
import { ArchiveBoxIcon } from './icons/ArchiveBoxIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { ClockIcon } from './icons/ClockIcon';
import { XCircleIcon } from './icons/XCircleIcon';

interface StatsDisplayProps {
  jobs: TranslationJob[];
}

const StatCard: React.FC<{
    icon: React.ReactNode;
    value: number;
    label: string;
    colorClass: string;
}> = ({ icon, value, label, colorClass }) => {
    return (
        <div className="flex-1 flex items-center p-3 bg-slate-800/50 rounded-lg">
            <div className={`p-2 rounded-md mr-4 ${colorClass}`}>
                {icon}
            </div>
            <div>
                <div className="text-2xl font-bold text-white">{value}</div>
                <div className="text-sm font-medium text-slate-400">{label}</div>
            </div>
        </div>
    );
};

export const StatsDisplay: React.FC<StatsDisplayProps> = ({ jobs }) => {
  const total = jobs.length;
  const completed = jobs.filter(j => j.status === 'completed').length;
  const remaining = jobs.filter(j => j.status === 'queued' || j.status === 'processing').length;
  const failed = jobs.filter(j => j.status === 'error').length;

  if (total === 0) {
      return null;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
      <StatCard 
        icon={<ArchiveBoxIcon className="w-6 h-6 text-white"/>} 
        value={total} 
        label="Total" 
        colorClass="bg-slate-600"
      />
      <StatCard 
        icon={<CheckCircleIcon className="w-6 h-6 text-white"/>} 
        value={completed} 
        label="Completed"
        colorClass="bg-green-600"
      />
      <StatCard 
        icon={<ClockIcon className="w-6 h-6 text-white"/>} 
        value={remaining} 
        label="Remaining"
        colorClass="bg-cyan-600"
      />
      <StatCard 
        icon={<XCircleIcon className="w-6 h-6 text-white"/>} 
        value={failed} 
        label="Failed"
        colorClass="bg-red-600"
      />
    </div>
  );
};
