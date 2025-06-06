// src/hooks/useLogout.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { logout } from '../api/authApi';

export const useLogout = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: logout,
    onSuccess: () => {
      localStorage.removeItem('auth');
      queryClient.setQueryData(['auth'], null);
      queryClient.invalidateQueries({ queryKey: ['auth'] });
      toast.success('Logged out successfully!');
      navigate('/login');
    },
    onError: (error) => {
      toast.error(error.message || 'Logout failed');
    },
  });
};