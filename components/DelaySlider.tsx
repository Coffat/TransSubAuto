import React from 'react';

interface DelaySliderProps {
  id: string;
  label: string;
  description: string;
  value: number;
  onChange: (value: number) => void;
  disabled: boolean;
}

export const DelaySlider: React.FC<DelaySliderProps> = ({ id, label, description, value, onChange, disabled }) => {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-300 mb-2">
        {label}: <span className="font-bold text-cyan-400">{value} seconds</span>
      </label>
      <input
        id={id}
        type="range"
        min="1"
        max="30"
        step="1"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled}
        className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed
                   focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-700 focus:ring-cyan-500
                   [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:bg-cyan-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:transition-transform
                   [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:bg-cyan-500 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-none
                   "
      />
       <p className="text-xs text-slate-500 mt-1 h-8">
        {description}
      </p>
    </div>
  );
};
