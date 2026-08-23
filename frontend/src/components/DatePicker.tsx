import React, { useState, useRef, useEffect } from 'react';
import { formatDate } from '../api';

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  required?: boolean;
  min?: string;
  autoFocus?: boolean;
}

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

const toISO = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const startOfMonth = (d: Date): Date => new Date(d.getFullYear(), d.getMonth(), 1);
const addMonths = (d: Date, n: number): Date => new Date(d.getFullYear(), d.getMonth() + n, 1);

const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  className = '',
  required,
  min,
  autoFocus,
}) => {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<Date>(value ? new Date(value) : new Date());
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => {
    if (value) setView(new Date(value));
  }, [value]);

  const selected = value ? new Date(value) : null;
  const first = startOfMonth(view);
  // Monday-based offset: JS getDay() Sunday=0 -> shift so Monday=0
  const leadBlanks = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < leadBlanks; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(view.getFullYear(), view.getMonth(), d));

  const isDisabled = (d: Date): boolean => {
    if (min && toISO(d) < min) return true;
    return false;
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        className="form-input w-full text-left"
        onClick={() => setOpen((o) => !o)}
      >
        {selected ? formatDate(selected) : 'Select date'}
      </button>
      {open && (
        <div className="absolute z-50 mt-1 p-3 surface rounded-xl border border-[var(--border)] shadow-lg" style={{ backgroundColor: 'var(--bg-elevated)' }}>
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              className="btn btn-secondary !px-2 !py-1"
              onClick={() => setView((v) => addMonths(v, -1))}
            >
              ‹
            </button>
            <span className="font-semibold text-[var(--text-primary)]">
              {view.getFullYear()}/{String(view.getMonth() + 1).padStart(2, '0')}
            </span>
            <button
              type="button"
              className="btn btn-secondary !px-2 !py-1"
              onClick={() => setView((v) => addMonths(v, 1))}
            >
              ›
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-[var(--text-muted)] mb-1">
            {WEEKDAYS.map((w) => (
              <div key={w}>{w}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((d, i) => {
              if (!d) return <div key={`b${i}`} />;
              const iso = toISO(d);
              const isSelected = selected && toISO(selected) === iso;
              const disabled = isDisabled(d);
              return (
                <button
                  key={iso}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    onChange(iso);
                    setOpen(false);
                  }}
                  className={`!px-2 !py-1 rounded text-sm ${
                    isSelected
                      ? 'bg-blue-600 text-white'
                      : disabled
                        ? 'opacity-40 cursor-not-allowed text-[var(--text-muted)]'
                        : 'hover:bg-blue-500/20 text-[var(--text-primary)]'
                  }`}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default DatePicker;
