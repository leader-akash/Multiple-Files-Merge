// src/App.tsx
import { Route, Routes, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import HomePage from './pages/HomePage';
import PurchasePlans from './pages/PurchasePlans';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Profile from './pages/Profile';
import Header from './components/Header';
import { useAuth } from './hooks/useAuth';
// import ErrorBoundary from './utils/ErrorBoundary';
import "./App.css"

// function ProtectedRoute({ children }) {
//   const { data: auth, isPending } = useAuth();

//   if (isPending) return <div className="text-center p-4">Loading...</div>;
//   if (!auth) return <Navigate to="/login" replace />;
//   return <>{children}</>;
// }

// function GuestRoute({ children }) {
//   const { data: auth, isPending } = useAuth();

//   if (isPending) return <div className="text-center p-4">Loading...</div>;
//   if (auth) return <Navigate to="/" replace />;
//   return <>{children}</>;
// }

export default function App() {
  return (
    // <ErrorBoundary>
      <div className='app-width'>
        <Header />
      <div className="flex flex-col min-h-screen">
        <main className=" flex items-center justify-center p-4">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route
              path="/purchase-plans"
              element={
                  <PurchasePlans />
              }
            />
            <Route
              path="/login"
              element={
                // <GuestRoute>
                  <Login />
                // </GuestRoute>
              }
            />
            <Route
              path="/signup"
              element={
                // <GuestRoute>
                  <Signup />
                // </GuestRoute>
              }
            />
            <Route
              path="/profile"
              element={
                // <ProtectedRoute>
                  <Profile />
                // </ProtectedRoute>
              }
            />
          </Routes>
        </main>
        <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} />
      </div>
      </div>
    // </ErrorBoundary>
  );
}


// import './App.css';
// import { Route, Routes } from 'react-router-dom';
// import HomePage from './pages/HomePage';
// import PurchasePlans from './pages/PurchasePlans';
// import Login from './pages/Login';
// import Signup from './pages/Signup';
// import Header from './components/Header';
// import Profile from './pages/Profile';


// function App() {
  

//   return (
//     <div className="">
//         <Header />

//         <div className="min-h-screen w-[100vw] bg-gray-50 flex items-center justify-center p-4">
//         <Routes>
//           <Route path="/" element={<HomePage />} />
//           <Route path="/pruchase-plans" element={<PurchasePlans />} />
          
//           <Route path="/login" element={<Login />} />
//           <Route path="/signup" element={<Signup />} />
//           <Route path="/profile" element={<Profile />} />

//         </Routes>
//         </div>




//     </div>
//   );
// }

// export default App;