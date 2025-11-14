
import React, { useRef, useEffect } from 'react';

interface ConsoleMessage {
  level: string;
  message: string;
}

interface ConsoleProps {
  messages: ConsoleMessage[];
  onClear: () => void;
}

const getLevelColor = (level: string) => {
  switch (level) {
    case 'error':
      return 'text-red-400';
    case 'warn':
      return 'text-yellow-400';
    case 'info':
      return 'text-cyan-400';
    default:
      return 'text-slate-300';
  }
};

export const Console: React.FC<ConsoleProps> = ({ messages, onClear }) => {
  const endOfMessagesRef = useRef<null | HTMLDivElement>(null);

  const scrollToBottom = () => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="flex flex-col h-64 bg-slate-950/70 border border-slate-700 rounded-lg shadow-lg">
      <header className="flex items-center justify-between p-2 border-b border-slate-700 flex-shrink-0">
        <h3 className="text-sm font-semibold text-slate-300">Console</h3>
        <button
          onClick={onClear}
          className="px-3 py-1 text-xs font-medium rounded-md text-slate-300 bg-slate-700 hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950 focus:ring-cyan-500"
        >
          Clear
        </button>
      </header>
      <div className="flex-grow p-2 overflow-y-auto font-mono text-xs">
        {messages.length === 0 ? (
          <p className="text-slate-500">Console output will appear here...</p>
        ) : (
          messages.map((msg, index) => (
            <div key={index} className={`whitespace-pre-wrap break-words ${getLevelColor(msg.level)}`}>
              {msg.message}
            </div>
          ))
        )}
        <div ref={endOfMessagesRef} />
      </div>
    </div>
  );
};
