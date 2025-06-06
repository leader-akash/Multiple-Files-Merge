// src/hooks/useAuth.ts
import { useQuery } from '@tanstack/react-query';

export const useAuth = () => {
  return useQuery({
    queryKey: ['auth'],
    queryFn: async () => {
      const auth = localStorage.getItem('auth');
      if (!auth) return null;
      return JSON.parse(auth);
    },
    staleTime: Infinity, // Auth state doesn't expire unless explicitly changed
  });
};