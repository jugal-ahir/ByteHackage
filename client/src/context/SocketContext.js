import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const { selectedClassroom, user } = useAuth();

  useEffect(() => {
    const newSocket = io(process.env.REACT_APP_API_URL || `http://${window.location.hostname}:5000`);
    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  useEffect(() => {
    if (socket && selectedClassroom) {
      socket.emit('join-classroom', selectedClassroom);
    }
  }, [socket, selectedClassroom]);

  useEffect(() => {
    if (socket && user && (user.role === 'coordinator' || user.role === 'organizer')) {
      socket.emit('join-dashboard');
    }
  }, [socket, user]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};

