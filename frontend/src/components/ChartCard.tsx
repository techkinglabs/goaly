import React, { useState, useEffect } from 'react';

const FullscreenIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
  </svg>
);

const CloseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

interface ChartCardProps {
  title: string;
  children: React.ReactNode;
  /** Height of the chart body when in fullscreen. */
  fullscreenHeight?: string;
  className?: string;
  bodyClassName?: string;
  /** Hide the title heading (chart still accessible). */
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

  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFullscreen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fullscreen]);

  const panel = (
    <div className={`surface !mb-0 rounded-xl p-6 flex flex-col ${className}`} style={fullscreen ? { height: fullscreenHeight } : undefined}>
      <div className="flex justify-between items-center mb-4">
        {hideTitle ? (
          <span />
        ) : (
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h3>
        )}
        <button
          onClick={() => setFullscreen((v) => !v)}
          className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          aria-label={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          title={fullscreen ? 'Exit fullscreen (Esc)' : 'Fullscreen (Esc)'}
        >
          {fullscreen ? <CloseIcon /> : <FullscreenIcon />}
        </button>
      </div>
      <div className={fullscreen ? 'flex-1 min-h-0' : `min-h-0 ${bodyClassName}`} style={fullscreen ? undefined : { height: 300 }}>
        {children}
      </div>
    </div>
  );

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm p-4 flex flex-col">
        <div className="flex-1" style={{ minHeight: 0 }}>
          {panel}
        </div>
      </div>
    );
  }

  return panel;
};

export default ChartCard;
