import './App.css';
import { Route, Routes } from 'react-router-dom';
import HomePage from './pages/HomePage';
import PurchasePlans from './pages/PurchasePlans';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Header from './components/Header';
import Profile from './pages/Profile';


function App() {
  

  return (
    <div className="">
        <Header />

        <div className="min-h-screen w-[100vw] bg-gray-50 flex items-center justify-center p-4">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/pruchase-plans" element={<PurchasePlans />} />
          
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/profile" element={<Profile />} />

        </Routes>
        </div>




    </div>
  );
}

export default App;