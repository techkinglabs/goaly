import React from 'react';

interface SwitchProps {
  checked: boolean;
  onChange: () => void;
  label: string;
  className?: string;
}

const Switch: React.FC<SwitchProps> = ({ checked, onChange, label, className = '' }) => (
  <label className={`inline-flex items-center gap-2 cursor-pointer select-none text-sm text-[var(--text-secondary)] ${className}`}>
    <div className="relative inline-block h-5 w-9 transition-colors duration-200 ease-in-out">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="absolute inset-0 h-full w-full opacity-0 cursor-pointer"
        aria-label={label}
      />
      <span
        className={`absolute inset-0 rounded-full transition-colors duration-200`}
        style={{ backgroundColor: checked ? 'var(--accent)' : 'var(--border)' }}
      />
      <span
        className="absolute top-1 left-1 h-3 w-3 rounded-full bg-white transition-transform duration-200"
        style={{ transform: checked ? 'translateX(1rem)' : 'translateX(0)' }}
      />
    </div>
    <span>{label}</span>
  </label>
);

export default React.memo(Switch);
