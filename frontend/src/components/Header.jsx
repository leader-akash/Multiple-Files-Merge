import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Header = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false); // Replace with your auth logic
  const [user, setUser] = useState({  email: 'john@example.com' }); // Mock user data
  const navigate = useNavigate();

  const handleProfileClick = () => {
    navigate('/profile');
  };

  const handleLogin = () => {
    // Replace with actual login logic
    navigate("/login")
    // setIsLoggedIn(true);
    // setUser({  email: 'john@example.com' });
  };

  const handleLogout = () => {
    // Replace with actual logout logic
    setIsLoggedIn(false);
    setUser(null);
  };

  return (
    <header className="bg-gray-800 text-white p-4 shadow-md">
      <div className="container mx-auto flex justify-between items-center">
        <h1 className="text-2xl font-bold cursor-pointer" onClick={() => navigate("/")}>PDF Merger</h1>
        <div className="flex items-center space-x-4">
          {isLoggedIn ? (
            <>
              <div 
                className="flex items-center space-x-2 cursor-pointer hover:text-gray-300"
                onClick={handleProfileClick}
              >
                <div>
                  <p className="text-sm text-gray-400">{user?.email}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="text-red-600 px-4 py-2 rounded-md transition-colors"
              >
                Logout
              </button>
            </>
          ) : (
            <button
              onClick={handleLogin}
              className="text-blue-500 px-4 py-2 rounded-md transition-colors"
            >
              Login
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;