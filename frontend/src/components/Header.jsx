// src/components/Header.tsx
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useLogout } from '../hooks/useLogout';
import '../styles/header.css';

export default function Header() {
  const { data: auth, isPending } = useAuth();
  const { mutate: logout, isPending: isLoggingOut } = useLogout();
  const navigate = useNavigate();

  return (
    <header className="bg-gray-800 text-white p-4 shadow-md sticky top-0 z-50">
      <div className="flex justify-between items-center">
        <h1
          className="text-2xl font-bold cursor-pointer hover:text-gray-200 transition-colors"
          onClick={() => navigate('/')}
        >
          PDF Merger
        </h1>
        <nav className="flex items-center space-x-4">
          {isPending ? (
            <div className="text-gray-400">Loading...</div>
          ) : auth ? (
            <>
              <button
                onClick={() => navigate("/profile")}
                className="transparent-btn bg-transparent text-white flex items-center space-x-2  transition-colors"
              >
                <span className="text-sm ">{auth.user.email}</span>
              </button>
              <button
                onClick={() => logout()}
                disabled={isLoggingOut}
                className="px-4 py-2 text-red-600  rounded-md hover:bg-red-700 disabled:bg-gray-400 transition-colors"
              >
                {isLoggingOut ? 'Logging out...' : 'Logout'}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => navigate('/login')}
                className="px-4 py-2 bg-blue-500 text-blue-500 rounded-md hover:bg-blue-600 transition-colors"
              >
                Login
              </button>
              <button
                onClick={() => navigate('/signup')}
                className="transparent-btn px-4 py-2 bg-transparent border border-white text-blue-500 rounded-md  transition-colors"
              >
                Signup
              </button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}