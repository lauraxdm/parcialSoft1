import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from './components/Navbar';
import Home from './components/Home';
import Login from './components/Login';
import Register from './components/Register';
import Room from './components/Room';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userInfo, setUserInfo] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsAuthenticated(true);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUserInfo();
    } else {
      setIsLoading(false);
    }
  }, []);

  const fetchUserInfo = async () => {
    try {
      const response = await axios.get('http://107.21.8.204:3000/user');
      setUserInfo(response.data);
    } catch (error) {
      console.error('Error fetching user info:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const setAuth = (boolean) => {
    setIsAuthenticated(boolean);
    if (!boolean) {
      localStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
      setUserInfo(null);
    } else {
      fetchUserInfo();
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        <Navbar isAuthenticated={isAuthenticated} setAuth={setAuth} userInfo={userInfo} />
        <div className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={
              isAuthenticated ? <Home setAuth={setAuth} /> : <Navigate to="/login" />
            } />
            <Route path="/login" element={
              !isAuthenticated ? <Login setAuth={setAuth} /> : <Navigate to="/" />
            } />
            <Route path="/register" element={
              !isAuthenticated ? <Register setAuth={setAuth} /> : <Navigate to="/" />
            } />
            <Route path="/room/:id" element={
              isAuthenticated ? <Room /> : <Navigate to="/login" />
            } />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;