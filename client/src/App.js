import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import PrivateRoute from './components/PrivateRoute';
import Login from './pages/Login';
import ClassroomSelection from './pages/ClassroomSelection';
import AttendanceView from './pages/AttendanceView';
import QuickAttendanceMode from './pages/QuickAttendanceMode';
import IssueReporting from './pages/IssueReporting';
import EmergencyAction from './pages/EmergencyAction';
import CoordinatorDashboard from './pages/CoordinatorDashboard';
import AdminRoomManagement from './pages/AdminRoomManagement';
import Footer from './components/Footer';
import SplashScreen from './components/SplashScreen';
import GateEntryPage from './pages/GateEntryPage';
import './App.css';

function App() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <AuthProvider>
      <SocketProvider>
        {showSplash ? (
          <SplashScreen onFinish={() => setShowSplash(false)} />
        ) : (
          <Router>
            <div className="app-container" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', paddingBottom: '60px' }}>
              <div style={{ flex: 1 }}>
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route
                    path="/select-classroom"
                    element={
                      <PrivateRoute>
                        <ClassroomSelection />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/attendance"
                    element={
                      <PrivateRoute>
                        <AttendanceView />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/quick-attendance"
                    element={
                      <PrivateRoute>
                        <QuickAttendanceMode />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/issues"
                    element={
                      <PrivateRoute>
                        <IssueReporting />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/emergency"
                    element={
                      <PrivateRoute>
                        <EmergencyAction />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/gate-entry"
                    element={
                      <PrivateRoute>
                        <GateEntryPage />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/dashboard"
                    element={
                      <PrivateRoute>
                        <CoordinatorDashboard />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/admin/room/:roomNumber"
                    element={
                      <PrivateRoute>
                        <AdminRoomManagement />
                      </PrivateRoute>
                    }
                  />
                  <Route path="/" element={<Navigate to="/login" replace />} />
                </Routes>
              </div>
              <Footer />
            </div>
          </Router>
        )}
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;

