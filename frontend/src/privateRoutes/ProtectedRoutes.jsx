// src/components/ProtectedRoute.tsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';



export default function ProtectedRoute({ children }) {
  const { data: auth, isPending } = useAuth();

  if (isPending) return <div>Loading...</div>;
  if (!auth?.isAuthenticated) return <Navigate to="/login" replace />;

  return <>{children}</>;
}