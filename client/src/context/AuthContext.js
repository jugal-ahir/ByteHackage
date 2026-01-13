import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedClassroom, setSelectedClassroom] = useState(null);

  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('token');

      // Set Base URL dynamically
      // Priority: 1. Environment variable, 2. Current origin (production/ngrok), 3. Hardcoded localhost:5000
      const apiUrl = process.env.REACT_APP_API_URL || (window.location.port === '3000' ? `http://${window.location.hostname}:5000` : window.location.origin);
      axios.defaults.baseURL = apiUrl;

      if (token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        await fetchUser();
      } else {
        setLoading(false);
      }

      const savedClassroom = localStorage.getItem('selectedClassroom');
      if (savedClassroom) {
        setSelectedClassroom(savedClassroom);
      }
    };

    initializeAuth();
  }, []);

  const getApiUrl = () => {
    if (process.env.REACT_APP_API_URL) return process.env.REACT_APP_API_URL;
    return window.location.port === '3000' ? `http://${window.location.hostname}:5000` : window.location.origin;
  };

  const fetchUser = async () => {
    try {
      const response = await axios.get(`${getApiUrl()}/api/auth/me`);
      setUser(response.data);
    } catch (error) {
      localStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    try {
      const response = await axios.post(`${getApiUrl()}/api/auth/login`, {
        username,
        password
      });

      const { token, user } = response.data;
      localStorage.setItem('token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      // Set user state synchronously
      setUser(user);
      setLoading(false);

      // Return user data so component can use it immediately
      return { success: true, user };
    } catch (error) {
      setLoading(false);
      return {
        success: false,
        message: error.response?.data?.message || 'Login failed'
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('selectedClassroom');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    setSelectedClassroom(null);
  };

  const selectClassroom = async (roomNumber) => {
    setSelectedClassroom(roomNumber);
    localStorage.setItem('selectedClassroom', roomNumber);
    try {
      await axios.post('/api/auth/select-room', { roomNumber });
    } catch (error) {
      console.error('Error syncing room selection with server:', error);
    }
  };

  const value = {
    user,
    loading,
    login,
    logout,
    selectedClassroom,
    selectClassroom
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

