import React from 'react';

interface FieldErrorProps {
  message?: string;
  id?: string;
}

/** Inline validation message wired up via `aria-describedby`. */
const FieldError: React.FC<FieldErrorProps> = ({ message, id }) => {
  if (!message) return null;
  return (
    <p id={id} className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
      {message}
    </p>
  );
};

export default FieldError;
