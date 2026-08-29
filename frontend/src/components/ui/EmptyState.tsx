import React from 'react';

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

/** Consistent placeholder for "nothing here yet" states. */
const EmptyState: React.FC<EmptyStateProps> = ({ title, description, action, className = '' }) => (
  <div className={`empty-state flex flex-col items-center justify-center gap-2 p-6 text-center ${className}`}>
    <p className="font-medium text-[var(--text-secondary)]">{title}</p>
    {description ? <p className="text-sm text-[var(--text-muted)]">{description}</p> : null}
    {action ? <div className="mt-2">{action}</div> : null}
  </div>
);

export default EmptyState;
