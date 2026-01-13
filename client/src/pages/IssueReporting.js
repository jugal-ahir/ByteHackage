import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import './IssueReporting.css';

const ISSUE_CATEGORIES = [
  { id: 'medical', label: 'Medical', icon: '🏥' },
  { id: 'technical', label: 'Technical/WiFi', icon: '💻' },
  { id: 'power', label: 'Power', icon: '⚡' },
  { id: 'food', label: 'Food/Water', icon: '🍽️' },
  { id: 'security', label: 'Security', icon: '🔒' },
  { id: 'discipline', label: 'Discipline/Noise', icon: '🔇' },
  { id: 'equipment', label: 'Equipment Required', icon: '🛠️' }
];

const IssueReporting = () => {
  const { user, selectedClassroom, logout } = useAuth();
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedCategory) {
      alert('Please select a category');
      return;
    }

    if (!description.trim()) {
      alert('Please provide a description');
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(
        `/api/issues`,
        {
          category: selectedCategory,
          description: description.trim(),
          roomNumber: selectedClassroom
        }
      );
      alert('Issue reported successfully!');
      setSelectedCategory('');
      setDescription('');
      navigate('/attendance');
    } catch (error) {
      console.error('Error reporting issue:', error);
      alert('Failed to report issue');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="issue-reporting">
      <div className="header-bar">
        <div className="header-info">
          <h1>Report Issue - Room {selectedClassroom}</h1>
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

      <div className="issue-form-container">
        <form onSubmit={handleSubmit}>
          <div className="form-section">
            <h2>Select Category</h2>
            <div className="issue-categories">
              {ISSUE_CATEGORIES.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  className={`issue-category-btn ${selectedCategory === category.id ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(category.id)}
                >
                  <span className="category-icon">{category.icon}</span>
                  <span>{category.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="form-section">
            <h2>Description</h2>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide details about the issue..."
              rows="6"
              className="issue-description"
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
              className="btn btn-primary"
              disabled={submitting || !selectedCategory || !description.trim()}
            >
              {submitting ? 'Submitting...' : 'Submit Issue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default IssueReporting;

