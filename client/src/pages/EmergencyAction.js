import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import './EmergencyAction.css';

const EMERGENCY_TYPES = [
  { id: 'team-leaving', label: 'Team Leaving Hackathon', icon: '🚪' },
  { id: 'team-missing', label: 'Team Missing (After Meal)', icon: '⚠️' },
  { id: 'emergency', label: 'Emergency Situation', icon: '🚨' },
  { id: 'medical', label: 'Medical Emergency', icon: '🏥' }
];

const EmergencyAction = () => {
  const { user, selectedClassroom, logout } = useAuth();
  const navigate = useNavigate();
  const [selectedType, setSelectedType] = useState('');
  const [teamName, setTeamName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedType) {
      alert('Please select an emergency type');
      return;
    }

    if (!description.trim()) {
      alert('Please provide details');
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(
        `/api/emergency`,
        {
          type: selectedType,
          roomNumber: selectedClassroom,
          teamName: teamName.trim() || undefined,
          description: description.trim()
        }
      );
      alert('Emergency alert sent! Organizers have been notified.');
      setSelectedType('');
      setTeamName('');
      setDescription('');
      navigate('/attendance');
    } catch (error) {
      console.error('Error sending emergency alert:', error);
      alert('Failed to send emergency alert');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="emergency-action">
      <div className="header-bar">
        <div className="header-info">
          <h1>Critical Action - Room {selectedClassroom}</h1>
          <p className="volunteer-name">{user?.name}</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-secondary" onClick={() => navigate('/attendance')}>
            Back
          </button>
          <button className="btn btn-secondary" onClick={() => {
            logout();
            navigate('/login');
          }}>
            Logout
          </button>
        </div>
      </div>

      <div className="emergency-warning">
        <h2>⚠️ This will notify all organizers immediately</h2>
        <p>Use this only for critical situations requiring immediate attention.</p>
      </div>

      <div className="emergency-form-container">
        <form onSubmit={handleSubmit}>
          <div className="form-section">
            <h2>Emergency Type</h2>
            <div className="emergency-types">
              {EMERGENCY_TYPES.map((type) => (
                <button
                  key={type.id}
                  type="button"
                  className={`emergency-type-btn ${selectedType === type.id ? 'active' : ''}`}
                  onClick={() => setSelectedType(type.id)}
                >
                  <span className="emergency-icon">{type.icon}</span>
                  <span>{type.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="form-section">
            <h2>Team Name (if applicable)</h2>
            <input
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="Enter team name..."
              className="emergency-input"
            />
          </div>

          <div className="form-section">
            <h2>Details</h2>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide detailed information about the situation..."
              rows="6"
              className="emergency-description"
              required
            />
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate('/attendance')}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-emergency"
              disabled={submitting || !selectedType || !description.trim()}
            >
              {submitting ? 'Sending Alert...' : 'Send Emergency Alert'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EmergencyAction;

