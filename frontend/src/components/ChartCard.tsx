import React, { useCallback, useState } from 'react';
import { useEscapeKey } from '../hooks/useEscapeKey';
import { CloseIcon, FullscreenIcon } from './ui/icons';

interface ChartCardProps {
  title: string;
  children: React.ReactNode;
  /** Height of the chart body when fullscreen. */
  fullscreenHeight?: string;
  className?: string;
  bodyClassName?: string;
  /** Hide the visible heading (the chart stays labelled for a11y). */
  hideTitle?: boolean;
}

const ChartCard: React.FC<ChartCardProps> = ({
  title,
  children,
  fullscreenHeight = '70vh',
  className = '',
  bodyClassName = '',
  hideTitle = false,
}) => {
  const [fullscreen, setFullscreen] = useState(false);

  const exitFullscreen = useCallback(() => setFullscreen(false), []);
  useEscapeKey(fullscreen, exitFullscreen);

  const panel = (
    <section
      aria-label={title}
      className={`surface mb-0 flex flex-col rounded-xl p-6 ${className}`}
      style={fullscreen ? { height: fullscreenHeight } : undefined}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        {hideTitle ? (
          <span />
        ) : (
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h3>
        )}
        <button
          type="button"
          onClick={() => setFullscreen((previous) => !previous)}
          className="text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
          aria-label={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          title={fullscreen ? 'Exit fullscreen (Esc)' : 'Fullscreen'}
        >
          {fullscreen ? <CloseIcon /> : <FullscreenIcon />}
        </button>
      </div>

      <div
        className={fullscreen ? 'min-h-0 flex-1' : `h-[300px] min-h-0 ${bodyClassName}`}
      >
        {children}
      </div>
    </section>
  );

  if (!fullscreen) return panel;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/70 p-4 backdrop-blur-sm">
      <div className="min-h-0 flex-1">{panel}</div>
    </div>
  );
};

export default React.memo(ChartCard);
