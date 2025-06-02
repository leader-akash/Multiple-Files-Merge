import './App.css';
import { Route, Routes } from 'react-router-dom';
import HomePage from './pages/HomePage';
import PurchasePlans from './pages/PurchasePlans';
import Login from './pages/Login';
import Signup from './pages/Signup';


function App() {
  

  return (
    <div className="min-h-screen w-[100vw] bg-gray-50 flex items-center justify-center p-4">

        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/pruchase-plans" element={<PurchasePlans />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

        </Routes>




    </div>
  );
}

export default App;