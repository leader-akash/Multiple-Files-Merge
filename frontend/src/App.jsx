import './App.css';
import { Route, Routes } from 'react-router-dom';
import HomePage from './pages/HomePage';


function App() {
  

  return (
    <div className="min-h-screen w-[100vw] bg-gray-50 flex items-center justify-center p-4">

        <Routes>
          <Route path="/" element={<HomePage />} />
        </Routes>




    </div>
  );
}

export default App;