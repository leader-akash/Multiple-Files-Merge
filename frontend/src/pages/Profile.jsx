// src/pages/Profile.tsx
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

export default function Profile() {
  const { data: auth, isPending } = useAuth();
  const navigate = useNavigate();

  if (isPending) return <div className="text-center p-4">Loading...</div>;
  if (!auth) return <div className="text-center p-4 text-red-600">Not authenticated</div>;

  return (
    <div className="container mx-auto p-4 max-w-md">
      <button
        className="mb-4 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
        onClick={() => navigate(-1)}
      >
        Back
      </button>
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-4">Profile</h2>
        <p className="text-gray-700"><strong>Email:</strong> {auth.user.email}</p>
        <p className="text-gray-700"><strong>User ID:</strong> {auth.user.id}</p>
      </div>
    </div>
  );
}