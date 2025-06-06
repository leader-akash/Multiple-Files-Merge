// src/hooks/usePlans.ts
import { useQuery } from '@tanstack/react-query';
import { fetchPlans } from '../api/plans';

export const usePlans = () => {
  return useQuery({
    queryKey: ['plans'],
    queryFn: fetchPlans,
    staleTime: 1000 * 60 * 60, // Cache plans for 1 hour
  });
};