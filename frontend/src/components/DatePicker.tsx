import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  addMonths,
  daysInMonth as getDaysInMonth,
  formatDate,
  mondayBasedDay,
  parseLocalDate,
  startOfMonth,
  toLocalISODate,
} from '../utils/date';
import { useEscapeKey } from '../hooks/useEscapeKey';

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  id?: string;
  min?: string;
  autoFocus?: boolean;
  invalid?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'] as const;
/** Approx. calendar popover height; used to decide flip direction. */
const POPOVER_HEIGHT = 320;

/**
 * Accessible date picker built on the shared local-date helpers.
 * All parsing goes through `parseLocalDate`, so a `YYYY-MM-DD` value is never
 * interpreted as UTC midnight (which shifted the day in western timezones).
 */
const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  className = '',
  id,
  min,
  autoFocus,
  invalid = false,
  disabled = false,
  placeholder = 'Select date',
}) => {
  const [open, setOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(() => {
    if (!value) return null;
    const parsed = parseLocalDate(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }, [value]);

  const [view, setView] = useState<Date>(() => selected ?? new Date());

  // Keep the visible month in sync with an externally changed value.
  useEffect(() => {
    if (selected) setView(startOfMonth(selected));
  }, [selected]);

  const close = useCallback(() => setOpen(false), []);
  useEscapeKey(open, close);

  const toggleOpen = useCallback(() => {
    if (disabled) return;
    // Measure before flipping: state updaters must remain side-effect free.
    if (!open && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setOpenUp(window.innerHeight - rect.bottom < POPOVER_HEIGHT);
    }
    setOpen((previous) => !previous);
  }, [disabled, open]);

  // Click-outside to dismiss.
  useEffect(() => {
    if (!open) return;
    const handler = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const cells = useMemo<(Date | null)[]>(() => {
    const first = startOfMonth(view);
    const leadBlanks = mondayBasedDay(first);
    const total = getDaysInMonth(view);
    const result: (Date | null)[] = Array.from({ length: leadBlanks }, () => null);
    for (let day = 1; day <= total; day += 1) {
      result.push(new Date(view.getFullYear(), view.getMonth(), day));
    }
    return result;
  }, [view]);

  const isDisabled = useCallback((date: Date) => Boolean(min) && toLocalISODate(date) < min!, [min]);

  const selectedIso = selected ? toLocalISODate(selected) : null;
  const todayIso = toLocalISODate(new Date());

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        id={id}
        className="form-input w-full text-left"
        onClick={toggleOpen}
        disabled={disabled}
        autoFocus={autoFocus}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-invalid={invalid}
      >
        {selected ? formatDate(selected) : placeholder}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Choose date"
          className={`absolute z-50 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-3 shadow-lg ${
            openUp ? 'bottom-full mb-1' : 'mt-1'
          }`}
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <button
              type="button"
              className="btn btn-secondary px-2 py-1"
              onClick={() => setView((current) => addMonths(current, -1))}
              aria-label="Previous month"
            >
              ‹
            </button>
            <span className="font-semibold text-[var(--text-primary)]">
              {view.getFullYear()}/{String(view.getMonth() + 1).padStart(2, '0')}
            </span>
            <button
              type="button"
              className="btn btn-secondary px-2 py-1"
              onClick={() => setView((current) => addMonths(current, 1))}
              aria-label="Next month"
            >
              ›
            </button>
          </div>

          <div className="mb-1 grid grid-cols-7 gap-1 text-center text-xs text-[var(--text-muted)]">
            {WEEKDAYS.map((weekday) => (
              <div key={weekday}>{weekday}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {cells.map((date, index) => {
              if (!date) return <div key={`blank-${index}`} />;
              const iso = toLocalISODate(date);
              const isSelected = selectedIso === iso;
              const cellDisabled = isDisabled(date);

              return (
                <button
                  key={iso}
                  type="button"
                  disabled={cellDisabled}
                  aria-current={iso === todayIso ? 'date' : undefined}
                  aria-pressed={isSelected}
                  onClick={() => {
                    onChange(iso);
                    setOpen(false);
                  }}
                  className={`rounded px-2 py-1 text-sm ${
                    isSelected
                      ? 'bg-blue-600 text-white'
                      : cellDisabled
                        ? 'cursor-not-allowed text-[var(--text-muted)] opacity-40'
                        : iso === todayIso
                          ? 'text-[var(--text-primary)] ring-1 ring-[var(--accent)] hover:bg-blue-500/20'
                          : 'text-[var(--text-primary)] hover:bg-blue-500/20'
                  }`}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default React.memo(DatePicker);
