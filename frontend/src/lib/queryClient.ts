import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './http';
import { logger } from './logger';

/** Centralised, type-safe query keys — no stringly-typed keys at call sites. */
export const queryKeys = {
  goals: {
    all: ['goals'] as const,
    list: (filter: string) => ['goals', 'list', filter] as const,
    detail: (id: number) => ['goals', 'detail', id] as const,
  },
  entries: {
    all: ['entries'] as const,
    list: () => ['entries', 'list'] as const,
  },
  chart: {
    all: ['chart'] as const,
    data: (range: string, anchor: string) => ['chart', 'data', range, anchor] as const,
  },
} as const;

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          // Never retry client errors (4xx) — the request itself is wrong.
          if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
          return failureCount < 2;
        },
      },
      mutations: {
        onError: (error) => logger.error('Mutation failed', error),
      },
    },
  });
}
