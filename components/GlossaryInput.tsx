
import React from 'react';

interface GlossaryInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}

export const GlossaryInput: React.FC<GlossaryInputProps> = ({ value, onChange, disabled }) => {
  return (
    <div>
      <label htmlFor="glossary-input" className="block text-sm font-medium text-slate-300">
        Glossary (Optional)
      </label>
      <p className="text-xs text-slate-500 mt-1 mb-2">
        Ensure consistent translation for specific terms.
        Enter one term per line, e.g., <code className="bg-slate-900/50 px-1 py-0.5 rounded">Term: Dịch</code>.
      </p>
      <textarea
        id="glossary-input"
        rows={4}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder="Serenity: Tĩnh Lặng&#10;The Alliance: Liên Minh"
        className="w-full p-2 bg-slate-900/50 rounded-md text-slate-300 font-mono text-xs
                   border border-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500
                   resize-y disabled:opacity-50 disabled:cursor-not-allowed"
        spellCheck="false"
      />
    </div>
  );
};
