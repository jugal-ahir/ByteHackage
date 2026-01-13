import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import './AttendanceView.css';

const AttendanceView = () => {
  const { user, selectedClassroom, logout, selectClassroom } = useAuth();
  const socket = useSocket();
  const navigate = useNavigate();
  const [classroom, setClassroom] = useState(null);
  const [teams, setTeams] = useState([]);
  const [expandedTeams, setExpandedTeams] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState({});
  const [searchQuery, setSearchQuery] = useState('');

  const fetchClassroom = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/classrooms/${selectedClassroom}`);
      setClassroom(response.data);
      setTeams(response.data.teams || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching classroom:', error);
      if (error.response?.status === 404) {
        alert(`Classroom ${selectedClassroom} not found. Please contact an administrator.`);
        navigate('/select-classroom');
      } else {
        alert('Error loading classroom. Please try again.');
      }
      setLoading(false);
    }
  }, [selectedClassroom, navigate]);

  const handleAttendanceUpdate = useCallback((data) => {
    if (data.roomNumber === selectedClassroom) {
      fetchClassroom();
    }
  }, [selectedClassroom, fetchClassroom]);

  const handleStatusUpdate = useCallback((data) => {
    if (data.roomNumber === selectedClassroom && classroom) {
      setClassroom(prev => prev ? { ...prev, currentStatus: data.status } : null);
    }
  }, [selectedClassroom, classroom]);

  useEffect(() => {
    if (!selectedClassroom) {
      const timer = setTimeout(() => {
        navigate('/select-classroom');
      }, 100);
      return () => clearTimeout(timer);
    }
    fetchClassroom();
  }, [selectedClassroom, navigate, fetchClassroom]);

  useEffect(() => {
    if (socket) {
      socket.on('attendance-updated', handleAttendanceUpdate);
      socket.on('classroom-status-updated', handleStatusUpdate);

      return () => {
        socket.off('attendance-updated');
        socket.off('classroom-status-updated');
      };
    }
  }, [socket, handleAttendanceUpdate, handleStatusUpdate]);

  const toggleTeam = (teamId) => {
    const newExpanded = new Set(expandedTeams);
    if (newExpanded.has(teamId)) {
      newExpanded.delete(teamId);
    } else {
      newExpanded.add(teamId);
    }
    setExpandedTeams(newExpanded);
  };

  const updateMemberStatus = async (memberId, status, teamName) => {
    setUpdating(prev => ({ ...prev, [memberId]: true }));
    try {
      await axios.post('/api/attendance/update', {
        memberId,
        status,
        roomNumber: selectedClassroom,
        teamName
      });
      await fetchClassroom();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
    } finally {
      setUpdating(prev => ({ ...prev, [memberId]: false }));
    }
  };

  const updateClassroomStatus = async (status) => {
    try {
      await axios.post(`/api/classrooms/${selectedClassroom}/status`, { status });
      await fetchClassroom();
    } catch (error) {
      console.error('Error updating classroom status:', error);
      alert('Failed to update classroom status');
    }
  };

  const filteredTeams = teams.filter(team =>
    team.teamName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    team.members?.some(member => member.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!classroom) {
    return <div className="error">Classroom not found</div>;
  }

  return (
    <div className="attendance-view">
      <div className="header-bar">
        <div className="header-info">
          <h1 style={{ marginBottom: '12px' }}>Room {selectedClassroom}</h1>
          <p className="volunteer-name">{user?.name}</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-secondary" onClick={async () => {
            await selectClassroom(null);
            navigate('/select-classroom');
          }}>
            Change Room
          </button>
          <button className="btn btn-secondary" onClick={() => {
            logout();
            navigate('/login');
          }}>
            Logout
          </button>
        </div>
      </div>

      <div className="classroom-status-bar">
        <button
          className={`classroom-status-btn ${classroom.currentStatus === 'active' ? 'active active-green' : ''}`}
          onClick={() => updateClassroomStatus('active')}
        >
          Class Active
        </button>
        <button
          className={`classroom-status-btn ${classroom.currentStatus === 'lunch' ? 'active active-yellow' : ''}`}
          onClick={() => updateClassroomStatus('lunch')}
        >
          Class at Lunch
        </button>
        <button
          className={`classroom-status-btn ${classroom.currentStatus === 'night' ? 'active active-blue' : ''}`}
          onClick={() => updateClassroomStatus('night')}
        >
          Night/Sleeping
        </button>
        <button
          className={`classroom-status-btn ${classroom.currentStatus === 'emergency' ? 'active active-red' : ''}`}
          onClick={() => updateClassroomStatus('emergency')}
        >
          Emergency/Medical
        </button>
        <button
          className={`classroom-status-btn ${classroom.currentStatus === 'jury' ? 'active active-purple' : ''}`}
          onClick={() => updateClassroomStatus('jury')}
        >
          Jury/Mentor Visit
        </button>
        <button
          className={`classroom-status-btn ${classroom.currentStatus === 'empty' ? 'active active-gray' : ''}`}
          onClick={() => updateClassroomStatus('empty')}
        >
          Temporarily Empty
        </button>
      </div>

      <div className="action-buttons">
        <button className="btn btn-primary" onClick={() => navigate('/quick-attendance')}>
          Quick Attendance Mode
        </button>
        <button className="btn btn-warning" onClick={() => navigate('/issues')}>
          Report Issue
        </button>
        <button className="btn btn-emergency" onClick={() => navigate('/emergency')}>
          🚨 Critical Action
        </button>
      </div>

      <div className="teams-list">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '16px' }}>
          <h2 style={{ margin: 0 }}>Teams</h2>
          <div className="search-container" style={{ position: 'relative', width: '100%', maxWidth: '300px' }}>
            <input
              type="text"
              placeholder="Search team or member..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px 10px 40px',
                borderRadius: '12px',
                border: '1px solid #e5e7eb',
                fontSize: '0.95rem',
                backgroundColor: 'white',
                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
              }}
            />
            <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '1.1rem' }}>🔍</span>
          </div>
        </div>
        {filteredTeams.length === 0 ? (
          <div className="empty-classroom">
            <p>No teams assigned to this classroom yet.</p>
            <p>Please contact an administrator to add teams.</p>
          </div>
        ) : (
          filteredTeams.map((team) => {
            const isExpanded = expandedTeams.has(team._id);
            const presentCount = team.members?.filter(m => m.currentStatus === 'present').length || 0;
            const totalCount = team.members?.length || 0;

            return (
              <div key={team._id} className="team-card">
                <div className="team-header" onClick={() => toggleTeam(team._id)}>
                  <div>
                    <h3>{team.teamName}</h3>
                    <p className="team-count">{presentCount} / {totalCount} Present</p>
                  </div>
                  <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
                </div>

                {isExpanded && (
                  <div className="team-members">
                    {team.members?.map((member) => (
                      <div key={member._id} className="member-item">
                        <div className="member-info">
                          <strong>{member.name}</strong>
                          <span className={`status-badge status-${member.currentStatus}`}>
                            {member.currentStatus}
                          </span>
                        </div>
                        <div className="member-status-buttons">
                          <button
                            className={`status-btn status-present ${member.currentStatus === 'present' ? 'active' : ''}`}
                            onClick={() => updateMemberStatus(member._id, 'present', team.teamName)}
                            disabled={updating[member._id]}
                          >
                            Present
                          </button>
                          <button
                            className={`status-btn status-absent ${member.currentStatus === 'absent' ? 'active' : ''}`}
                            onClick={() => updateMemberStatus(member._id, 'absent', team.teamName)}
                            disabled={updating[member._id]}
                          >
                            Absent
                          </button>
                          <button
                            className={`status-btn status-lunch ${member.currentStatus === 'lunch' ? 'active' : ''}`}
                            onClick={() => updateMemberStatus(member._id, 'lunch', team.teamName)}
                            disabled={updating[member._id]}
                          >
                            At Lunch
                          </button>
                          <button
                            className={`status-btn status-sleeping ${member.currentStatus === 'sleeping' ? 'active' : ''}`}
                            onClick={() => updateMemberStatus(member._id, 'sleeping', team.teamName)}
                            disabled={updating[member._id]}
                          >
                            Sleeping
                          </button>
                          <button
                            className={`status-btn status-left ${member.currentStatus === 'left' ? 'active' : ''}`}
                            onClick={() => updateMemberStatus(member._id, 'left', team.teamName)}
                            disabled={updating[member._id]}
                          >
                            Left Campus
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default AttendanceView;
