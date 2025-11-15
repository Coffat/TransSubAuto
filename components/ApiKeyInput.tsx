import React, { useState, useEffect } from 'react';
import { KeyIcon } from './icons/KeyIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';

interface ApiKeyInputProps {
  isApiKeySet: boolean;
  onSaveKey: (key: string) => void;
  onClearKey: () => void;
}

export const ApiKeyInput: React.FC<ApiKeyInputProps> = ({ isApiKeySet, onSaveKey, onClearKey }) => {
  const [currentKey, setCurrentKey] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveKey(currentKey);
  };
  
  if (isApiKeySet) {
    return (
        <div className="bg-slate-800/50 border border-green-500/30 rounded-lg p-4 flex items-center justify-between animate-fade-in">
            <div className="flex items-center">
                <CheckCircleIcon className="w-6 h-6 text-green-400 mr-3" />
                <p className="text-sm text-slate-300 font-medium">API Key is set and ready to use.</p>
            </div>
            <button 
                onClick={onClearKey}
                className="text-sm font-semibold text-cyan-400 hover:text-cyan-300 transition-colors focus:outline-none"
            >
                Edit Key
            </button>
        </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-lg p-4 border border-slate-700 animate-fade-in">
      <div className="flex">
        <div className="flex-shrink-0 mr-4">
            <KeyIcon className="w-8 h-8 text-cyan-500" />
        </div>
        <div>
            <h3 className="text-lg font-bold text-slate-100">Enter Your Gemini API Key</h3>
            <p className="text-sm text-slate-400 mt-1">
                Your key is stored locally in your browser and is required to translate files. 
                <a 
                    href="https://ai.google.dev/gemini-api/docs/api-key" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-cyan-400 hover:underline ml-1"
                >
                    Get a key from Google AI Studio.
                </a>
            </p>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="mt-4 flex items-center gap-3">
        <input
          type="password"
          value={currentKey}
          onChange={(e) => setCurrentKey(e.target.value)}
          placeholder="Paste your API key here..."
          className="flex-grow bg-slate-900/70 border border-slate-600 rounded-md shadow-sm px-4 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
          aria-label="Gemini API Key"
        />
        <button
          type="submit"
          className="px-5 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-cyan-500 disabled:bg-slate-500 disabled:cursor-not-allowed transition-colors"
          disabled={!currentKey.trim()}
        >
          Save Key
        </button>
      </form>
    </div>
  );
};