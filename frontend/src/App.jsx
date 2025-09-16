import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useCheckAuthStatusQuery, useLogoutMutation } from './redux/apiSlice';
import Welcome from './components/Welcome';
import Home from './components/Home.jsx';
import Main from './components/Main';
import VerifyEmail from './components/VerifyEmail';
import './App.css';

const LoadingSpinner = () => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    fontSize: '18px',
    color: '#666'
  }}>
    <div style={{ textAlign: 'center' }}>
      <div style={{
        width: '40px',
        height: '40px',
        border: '4px solid #f3f3f3',
        borderTop: '4px solid #e29f9f',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        margin: '0 auto 20px'
      }}></div>
      <div>Loading Altar Maker...</div>
    </div>
    <style>{`
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `}</style>
  </div>
);

const App = () => {
  const navigate = useNavigate();
  const { data: authData, isLoading, isError, refetch } = useCheckAuthStatusQuery();
  const [logout] = useLogoutMutation();
  
  const user = authData?.user || null;

  const handleLogin = (userData) => {
    // The login mutation will update the cache, which will trigger a re-render
    // with the new user data from the checkAuthStatus query
    refetch();
  };

  const handleLogout = async () => {
    try {
      await logout().unwrap();
      // Clear client-side storage
      localStorage.removeItem('token');
      sessionStorage.clear();
      document.cookie = "session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=localhost";
      
      // Force a hard navigation to ensure all state is cleared
      window.location.href = '/';
      
      // The logout mutation will invalidate the User tag, which will clear the cache
      // and trigger a re-render with no user data
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };
  
  const handleWelcomeLogin = () => {
    // Navigate to login page using React Router
    navigate('/login');
  };

  const handleWelcomeRegister = () => {
    // Navigate to register page using React Router
    navigate('/register');
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

const [user, setUser] = useState(null);

useEffect(() => {
  const storedUser = localStorage.getItem('user');
  if (storedUser) {
    setUser(JSON.parse(storedUser));
  }
}, []);

  return (
    <div className="app">
      <Routes>
        <Route 
          path="/" 
          element={
            user ? <Navigate to="/main" replace /> : <Welcome onLogin={handleWelcomeLogin} onRegister={handleWelcomeRegister} />
          } 
        />
        <Route 
          path="/home" 
          element={
            user ? <Navigate to="/main" replace /> : <Home onLogin={handleLogin} />
          } 
        />
        <Route 
          path="/login" 
          element={
            user ? <Navigate to="/main" replace /> : <Home onLogin={handleLogin} />
          } 
        />
        <Route 
          path="/main" 
          element={
            user ? <Main user={user} onLogout={handleLogout} /> : <Navigate to="/" replace />
          } 
        />
        <Route 
          path="/verify-email" 
          element={<VerifyEmail />} 
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
};

export default App;