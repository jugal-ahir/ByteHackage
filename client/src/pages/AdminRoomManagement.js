import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import Modal from '../components/Modal';
import './AdminRoomManagement.css';

const VerificationIcon = ({ type, size = 16 }) => {
  const icons = {
    Bonafide: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    ),
    'ID Card': (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <circle cx="9" cy="10" r="2" />
        <line x1="15" y1="8" x2="19" y2="8" />
        <line x1="15" y1="12" x2="19" y2="12" />
        <line x1="7" y1="16" x2="17" y2="16" />
      </svg>
    ),
    Nothing: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
      </svg>
    )
  };
  return icons[type] || icons.Nothing;
};

const AdminRoomManagement = () => {
  const { roomNumber } = useParams();
  const { user, logout } = useAuth();
  const socket = useSocket();
  const navigate = useNavigate();
  const [classroom, setClassroom] = useState(null);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddTeam, setShowAddTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newMembers, setNewMembers] = useState(['']);
  const [expandedTeams, setExpandedTeams] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [extraMemberNames, setExtraMemberNames] = useState({}); // { [teamId]: name }
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
    showCancel: false,
    onConfirm: null
  });

  const showModal = (config) => {
    setModalConfig({ ...config, isOpen: true });
  };

  const closeModal = () => {
    setModalConfig(prev => ({ ...prev, isOpen: false }));
  };

  const fetchClassroomData = useCallback(async () => {
    try {
      const response = await axios.get(
        `/api/classrooms/${roomNumber}`
      );
      setClassroom(response.data);
      setTeams(response.data.teams || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching classroom:', error);
      setLoading(false);
    }
  }, [roomNumber]);

  useEffect(() => {
    if (!user) {
      return; // Wait for user to load
    }
    if (user.role !== 'organizer') {
      const timer = setTimeout(() => {
        navigate('/dashboard');
      }, 100);
      return () => clearTimeout(timer);
    }
    fetchClassroomData();
  }, [user, navigate, fetchClassroomData]);

  useEffect(() => {
    if (socket) {
      socket.on('attendance-updated', fetchClassroomData);
      socket.on('classroom-status-updated', fetchClassroomData);
      socket.on('gate-entry-updated', (data) => {
        if (String(data.roomNumber) === String(roomNumber)) {
          fetchClassroomData();
        }
      });
      socket.on('volunteer-room-updated', (data) => {
        if (String(data.roomNumber) === String(roomNumber) || classroom?.activeVolunteers?.some(v => v._id === data.volunteerId)) {
          fetchClassroomData();
        }
      });
      return () => {
        socket.off('attendance-updated', fetchClassroomData);
        socket.off('classroom-status-updated', fetchClassroomData);
        socket.off('gate-entry-updated');
        socket.off('volunteer-room-updated');
      };
    }
  }, [socket, roomNumber, classroom, fetchClassroomData]);

  const toggleTeam = (teamId) => {
    const newExpanded = new Set(expandedTeams);
    if (newExpanded.has(teamId)) {
      newExpanded.delete(teamId);
    } else {
      newExpanded.add(teamId);
    }
    setExpandedTeams(newExpanded);
  };

  const addMemberField = () => {
    setNewMembers([...newMembers, '']);
  };

  const removeMemberField = (index) => {
    const updated = newMembers.filter((_, i) => i !== index);
    setNewMembers(updated);
  };

  const updateMemberName = (index, value) => {
    const updated = [...newMembers];
    updated[index] = value;
    setNewMembers(updated);
  };

  const handleAddTeam = async () => {
    if (!newTeamName.trim()) {
      showModal({ title: 'Validation Error', message: 'Please enter a team name', type: 'error' });
      return;
    }

    const validMembers = newMembers.filter(m => m.trim());
    if (validMembers.length === 0) {
      showModal({ title: 'Validation Error', message: 'Please add at least one team member', type: 'error' });
      return;
    }

    try {
      const response = await axios.post(
        `/api/admin/rooms/${roomNumber}/teams`,
        {
          teamName: newTeamName.trim(),
          members: validMembers.map(m => m.trim())
        }
      );

      setShowAddTeam(false);
      setNewTeamName('');
      setNewMembers(['']);
      await fetchClassroomData();
      setShowAddTeam(false);
      setNewTeamName('');
      setNewMembers(['']);
      await fetchClassroomData();
      showModal({ title: 'Success', message: 'Team added successfully!', type: 'success' });
    } catch (error) {
      console.error('Error adding team:', error);
      showModal({ title: 'Error', message: 'Failed to add team: ' + (error.response?.data?.message || error.message), type: 'error' });
    }
  };

  const handleDeleteTeam = async (teamId) => {
    showModal({
      title: 'Delete Team',
      message: 'Are you sure you want to delete this team? This action cannot be undone.',
      type: 'error',
      showCancel: true,
      confirmText: 'Delete Team',
      onConfirm: async () => {
        try {
          await axios.delete(
            `/api/admin/teams/${teamId}`
          );
          await fetchClassroomData();
          showModal({ title: 'Success', message: 'Team deleted successfully!', type: 'success' });
        } catch (error) {
          console.error('Error deleting team:', error);
          showModal({ title: 'Error', message: 'Failed to delete team', type: 'error' });
        }
      }
    });
  };

  const handleDeleteMember = async (memberId, teamId) => {
    showModal({
      title: 'Remove Member',
      message: 'Are you sure you want to remove this member?',
      type: 'warning',
      showCancel: true,
      confirmText: 'Remove',
      onConfirm: async () => {
        try {
          await axios.delete(
            `/api/admin/members/${memberId}`
          );
          await fetchClassroomData();
          showModal({ title: 'Success', message: 'Member removed successfully!', type: 'success' });
        } catch (error) {
          console.error('Error deleting member:', error);
          showModal({ title: 'Error', message: 'Failed to remove member', type: 'error' });
        }
      }
    });
  };

  const handleAddMember = async (teamId) => {
    const name = extraMemberNames[teamId];
    if (!name || !name.trim()) {
      showModal({ title: 'Validation Error', message: 'Please enter a member name', type: 'error' });
      return;
    }

    try {
      await axios.post(
        `/api/admin/teams/${teamId}/members`,
        { name: name.trim() }
      );

      // Clear the input
      setExtraMemberNames(prev => ({ ...prev, [teamId]: '' }));
      // Refresh data
      await fetchClassroomData();
      showModal({ title: 'Success', message: 'Member added successfully!', type: 'success' });
    } catch (error) {
      console.error('Error adding member:', error);
      showModal({ title: 'Error', message: 'Failed to add member', type: 'error' });
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      active: { bg: '#d1fae5', border: '#10b981', text: '#065f46' },
      lunch: { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' },
      night: { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af' },
      emergency: { bg: '#fee2e2', border: '#ef4444', text: '#991b1b' },
      jury: { bg: '#ede9fe', border: '#8b5cf6', text: '#5b21b6' },
      empty: { bg: '#f3f4f6', border: '#6b7280', text: '#374151' }
    };
    return colors[status] || colors.empty;
  };

  const filteredTeams = teams.filter(team =>
    team.teamName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    team.members?.some(member => member.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading) {
    return <div className="loading">Loading room data...</div>;
  }

  if (!classroom) {
    return <div className="error">Classroom not found</div>;
  }

  const presentCount = teams.reduce((sum, team) =>
    sum + (team.members?.filter(m => m.currentStatus === 'present').length || 0), 0
  );
  const totalCount = teams.reduce((sum, team) =>
    sum + (team.members?.length || 0), 0
  );

  return (
    <div className="admin-room-management">
      <div className="header-bar">
        <div className="header-info">
          <button
            className="back-btn"
            onClick={() => navigate('/dashboard')}
            style={{ marginRight: '16px', padding: '8px 16px' }}
          >
            ← Back
          </button>
          <div>
            <h1>Room {roomNumber} Management</h1>
            <p className="admin-name">{user?.name} (Admin)</p>
          </div>
        </div>

        {classroom.activeVolunteers && classroom.activeVolunteers.length > 0 && (
          <div className="active-volunteers-list" style={{
            background: '#e0f2fe',
            padding: '8px 16px',
            borderRadius: '12px',
            border: '1px solid #7dd3fc',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <span style={{ fontSize: '1.2rem' }}>👤</span>
            <div>
              <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 600, color: '#0369a1', textTransform: 'uppercase' }}>Active Volunteers</p>
              <p style={{ margin: 0, fontSize: '0.95rem', color: '#0c4a6e', fontWeight: 500 }}>
                {classroom.activeVolunteers.map(v => v.name).join(', ')}
              </p>
            </div>
          </div>
        )}

        <button className="btn btn-secondary" onClick={() => {
          logout();
          navigate('/login');
        }}>
          Logout
        </button>
      </div>

      <div className="room-stats">
        <div className="stat-card">
          <h3>Total Teams</h3>
          <p className="stat-value">{teams.length}</p>
        </div>
        <div className="stat-card">
          <h3>Total Members</h3>
          <p className="stat-value">{totalCount}</p>
        </div>
        <div className="stat-card">
          <h3>Present</h3>
          <p className="stat-value">{presentCount}</p>
        </div>
        <div className="stat-card">
          <h3>Current Status</h3>
          <p className="stat-value" style={{
            color: getStatusColor(classroom.currentStatus).text,
            fontWeight: 700
          }}>
            {classroom.currentStatus.toUpperCase()}
          </p>
        </div>
      </div>

      <div className="actions-section">
        <button
          className="btn btn-primary"
          onClick={() => setShowAddTeam(!showAddTeam)}
        >
          {showAddTeam ? 'Cancel' : '+ Add New Team'}
        </button>
      </div>

      {showAddTeam && (
        <div className="add-team-form">
          <h2>Add New Team</h2>
          <div className="form-group">
            <label>Team Name</label>
            <input
              type="text"
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              placeholder="Enter team name"
              className="form-input"
            />
          </div>
          <div className="form-group">
            <label>Team Members</label>
            {newMembers.map((member, index) => (
              <div key={index} className="member-input-row">
                <input
                  type="text"
                  value={member}
                  onChange={(e) => updateMemberName(index, e.target.value)}
                  placeholder={`Member ${index + 1} name`}
                  className="form-input"
                />
                {newMembers.length > 1 && (
                  <button
                    className="btn-remove"
                    onClick={() => removeMemberField(index)}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            <button className="btn btn-secondary" onClick={addMemberField} style={{ marginTop: '12px' }}>
              + Add Member
            </button>
          </div>
          <button className="btn btn-success" onClick={handleAddTeam}>
            Create Team
          </button>
        </div>
      )}

      <div className="teams-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2>Teams in Room {roomNumber}</h2>
          <div className="search-container" style={{ position: 'relative', width: '300px' }}>
            <input
              type="text"
              placeholder="Search team or member..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 36px',
                borderRadius: '8px',
                border: '1px solid #d1d5db',
                fontSize: '0.9rem'
              }}
            />
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }}>🔍</span>
          </div>
        </div>
        {filteredTeams.length === 0 ? (
          <div className="empty-state">
            <p>No teams in this classroom yet.</p>
            <p>Click "Add New Team" to get started.</p>
          </div>
        ) : (
          filteredTeams.map((team) => {
            const isExpanded = expandedTeams.has(team._id);
            const presentCount = team.members?.filter(m => m.currentStatus === 'present').length || 0;
            const totalCount = team.members?.length || 0;

            return (
              <div key={team._id} className="team-card-admin">
                <div className="team-header-admin">
                  <div className="team-info" onClick={() => toggleTeam(team._id)}>
                    <h3>{team.teamName}</h3>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <p className="team-count">{presentCount} / {totalCount} Present</p>
                      {team.gateEntry?.isEntered && (
                        <span style={{
                          fontSize: '0.7rem',
                          padding: '4px 10px',
                          background: team.gateEntry.verificationType === 'Bonafide' ? '#ecfdf5' :
                            team.gateEntry.verificationType === 'ID Card' ? '#eff6ff' : '#f1f5f9',
                          color: team.gateEntry.verificationType === 'Bonafide' ? '#059669' :
                            team.gateEntry.verificationType === 'ID Card' ? '#2563eb' : '#475569',
                          borderRadius: '20px',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          border: `1px solid ${team.gateEntry.verificationType === 'Bonafide' ? '#bbf7d0' :
                              team.gateEntry.verificationType === 'ID Card' ? '#bfdbfe' : '#e2e8f0'
                            }`
                        }}>
                          <VerificationIcon type={team.gateEntry.verificationType} />
                          {team.gateEntry.verificationType === 'Nothing' ? 'No ID' : team.gateEntry.verificationType}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="team-actions">
                    <span
                      className="expand-icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleTeam(team._id);
                      }}
                    >
                      {isExpanded ? '▼' : '▶'}
                    </span>
                    <button
                      className="btn-delete"
                      style={{ fontSize: '0.875rem', padding: '6px 12px', height: 'auto', width: 'auto' }}
                      onClick={() => handleDeleteTeam(team._id)}
                      title="Delete Team"
                    >
                      Delete Team
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="team-members-admin">
                    {team.members?.length === 0 ? (
                      <p className="no-members">No members in this team</p>
                    ) : (
                      team.members?.map((member) => (
                        <div key={member._id} className="member-item-admin">
                          <div className="member-info-admin">
                            <strong>{member.name}</strong>
                            <span className={`status-badge status-${member.currentStatus}`}>
                              {member.currentStatus}
                            </span>
                          </div>
                          <button
                            className="btn-delete"
                            style={{
                              fontSize: '0.75rem',
                              padding: '4px 8px',
                              height: 'auto',
                              width: 'auto',
                              borderRadius: '4px'
                            }}
                            onClick={() => handleDeleteMember(member._id, team._id)}
                          >
                            Remove
                          </button>
                        </div>
                      ))
                    )}
                    <div className="add-extra-member" style={{
                      marginTop: '16px',
                      paddingTop: '16px',
                      borderTop: '1px dashed #e5e7eb',
                      display: 'flex',
                      gap: '8px'
                    }}>
                      <input
                        type="text"
                        value={extraMemberNames[team._id] || ''}
                        onChange={(e) => setExtraMemberNames(prev => ({ ...prev, [team._id]: e.target.value }))}
                        placeholder="New member name..."
                        style={{
                          flex: 1,
                          padding: '6px 12px',
                          borderRadius: '6px',
                          border: '1px solid #d1d5db',
                          fontSize: '0.875rem'
                        }}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddMember(team._id)}
                      />
                      <button
                        className="btn btn-primary"
                        style={{
                          fontSize: '0.75rem',
                          padding: '6px 12px',
                          height: 'auto',
                          width: 'auto'
                        }}
                        onClick={() => handleAddMember(team._id)}
                      >
                        + Add Member
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
      <Modal
        isOpen={modalConfig.isOpen}
        onClose={closeModal}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
        showCancel={modalConfig.showCancel}
        confirmText={modalConfig.confirmText}
        onConfirm={modalConfig.onConfirm}
      />
    </div>
  );
};

export default AdminRoomManagement;

