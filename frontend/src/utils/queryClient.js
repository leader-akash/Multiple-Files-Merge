// src/queryClient.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache data for 24 hours
      gcTime: 1000 * 60 * 60 * 24,
      // Stale time of 5 minutes (data considered fresh for 5 mins)
      staleTime: 1000 * 60 * 5,
      // Retry failed requests up to 3 times
      retry: 3,
      // Disable refetching on window focus by default
      refetchOnWindowFocus: false,
    },
  },
});