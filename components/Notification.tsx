
import React from 'react';
import clsx from 'clsx';
import { XIcon } from './icons/XIcon';

interface NotificationProps {
  type: 'info' | 'error' | 'success';
  message: string;
  onDismiss: () => void;
}

const typeStyles = {
  info: 'bg-sky-900/70 border-sky-500 text-sky-200',
  success: 'bg-green-900/70 border-green-500 text-green-200',
  error: 'bg-red-900/70 border-red-500 text-red-200',
};

export const Notification: React.FC<NotificationProps> = ({ type, message, onDismiss }) => {
  return (
    <div className={clsx(
        "mb-6 p-4 border-l-4 rounded-r-lg shadow-lg flex items-center justify-between animate-fade-in",
        typeStyles[type]
    )}>
      <p className="text-sm font-medium">{message}</p>
      <button
        onClick={onDismiss}
        className="ml-4 p-1 rounded-full hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/50"
        aria-label="Dismiss notification"
      >
        <XIcon className="w-5 h-5" />
      </button>
    </div>
  );
};
