// src/hooks/useCreateSubscription.ts
import { useMutation } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { createSubscription } from '../api/plans';

export const useCreateSubscription = () => {
  return useMutation({
    mutationFn: ({ planId, token }) => createSubscription(planId, token),
    onSuccess: (data) => {
      toast.success('Redirecting to Stripe Checkout...');
      window.location.href = data.url; // Redirect to Stripe Checkout
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create subscription');
    },
  });
};