import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './ClassroomSelection.css';

const CLASSROOMS = ['004', '005', '202', '203', '205', '207', '208'];

const ClassroomSelection = () => {
  const { user, selectClassroom, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('standard'); // 'standard' or 'gate'

  const handleSelectClassroom = (roomNumber) => {
    selectClassroom(roomNumber);
    setTimeout(() => {
      navigate('/attendance');
    }, 50);
  };



  // If coordinator/organizer, redirect to dashboard
  useEffect(() => {
    if (user && (user.role === 'coordinator' || user.role === 'organizer')) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  // Show loading while checking user
  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p className="loading-text">Loading...</p>
      </div>
    );
  }

  // If coordinator/organizer, show redirecting message
  if (user && (user.role === 'coordinator' || user.role === 'organizer')) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p className="loading-text">Redirecting...</p>
      </div>
    );
  }

  return (
    <div className="classroom-selection-container">
      <div className="classroom-selection-card">
        <h1>Select Your Classroom</h1>

        <div className="mode-toggle-container" style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px', gap: '16px' }}>
          <button
            className={`mode-btn ${mode === 'standard' ? 'active' : ''}`}
            onClick={() => setMode('standard')}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: '1px solid var(--border-medium)',
              background: mode === 'standard' ? 'var(--primary)' : 'white',
              color: mode === 'standard' ? 'white' : 'var(--text-primary)',
              cursor: 'pointer',
              fontWeight: 600,
              transition: 'all 0.2s'
            }}
          >
            Classroom Manager
          </button>
          <button
            className={`mode-btn ${mode === 'gate' ? 'active' : ''}`}
            onClick={() => setMode('gate')}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: '1px solid var(--border-medium)',
              background: mode === 'gate' ? 'var(--primary)' : 'white',
              color: mode === 'gate' ? 'white' : 'var(--text-primary)',
              cursor: 'pointer',
              fontWeight: 600,
              transition: 'all 0.2s'
            }}
          >
            Gate Entry
          </button>
        </div>

        {mode === 'standard' ? (
          <>
            <p className="subtitle">Select classroom to manage Attendance & Issues</p>
            <div className="classroom-grid-select">
              {CLASSROOMS.map((room) => (
                <button
                  key={room}
                  className="classroom-select-btn"
                  onClick={() => handleSelectClassroom(room)}
                >
                  Room {room}
                </button>
              ))}
            </div>
            <p className="note" style={{ marginTop: '20px' }}>Manages Attendance, Issues, and Emergency Alerts.</p>
          </>
        ) : (
          <div className="gate-entry-card-container">
            <div className="gate-intro-card" style={{
              background: 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)',
              color: 'white',
              padding: '24px',
              borderRadius: '12px',
              marginBottom: '24px',
              textAlign: 'center',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
            }}>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '8px', marginTop: 0, color: 'white' }}>Gate Entry Management</h2>
              <p style={{ opacity: 0.9, margin: 0 }}>Proceed here to manage team check-ins for ALL rooms.</p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button
                className="classroom-select-btn gate-mode"
                onClick={() => navigate('/gate-entry')}
                style={{
                  borderColor: '#4f46e5',
                  color: 'white',
                  background: '#4f46e5',
                  width: '100%',
                  maxWidth: '400px',
                  padding: '12px 24px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  boxShadow: '0 2px 4px rgba(79, 70, 229, 0.4)',
                  borderRadius: '6px'
                }}
              >
                Start Gate Duty &rarr;
              </button>
            </div>
          </div>
        )}

        <p className="note" style={{ marginTop: '30px' }}>Once selected, you will be locked to this classroom for this session.</p>
      </div>
    </div>
  );
};

export default ClassroomSelection;
