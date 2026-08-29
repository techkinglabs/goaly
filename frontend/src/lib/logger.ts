/**
 * Tiny logging seam. Keeps `console.*` out of feature code so the sink can be
 * swapped for Sentry/OTel later, and stays quiet in production builds.
 */
const isDev = import.meta.env.DEV;

type LogContext = Record<string, unknown>;

function emit(
  level: 'debug' | 'info' | 'warn' | 'error',
  message: string,
  context?: LogContext
): void {
  if (!isDev && level !== 'error') return;
  const payload = context ? [message, context] : [message];
  // eslint-disable-next-line no-console
  console[level](...payload);
}

export const logger = {
  debug: (message: string, context?: LogContext) => emit('debug', message, context),
  info: (message: string, context?: LogContext) => emit('info', message, context),
  warn: (message: string, context?: LogContext) => emit('warn', message, context),
  error: (message: string, error?: unknown, context?: LogContext) =>
    emit('error', message, { ...context, error }),
};
