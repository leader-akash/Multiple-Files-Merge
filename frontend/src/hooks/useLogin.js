// src/hooks/useLogin.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { login } from '../api/authApi';
import { toast } from 'react-toastify';

export const useLogin = () => {
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    return useMutation({
        mutationFn: login,
        onSuccess: (data) => {
            localStorage.setItem('auth', JSON.stringify(data));
            queryClient.setQueryData(['auth'], data);
            toast.success('Logged in successfully!');
            navigate('/');
        },
        onError: (error) => {
            console.error('Login error:', error);
        },
    });
};