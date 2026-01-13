import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import Modal from '../components/Modal';
import './CoordinatorDashboard.css';

const VerificationIcon = ({ type, size = 14 }) => {
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

const CoordinatorDashboard = () => {
  const { user, logout } = useAuth();
  const socket = useSocket();
  const navigate = useNavigate();
  const [classrooms, setClassrooms] = useState([]);
  const [issues, setIssues] = useState([]);
  const [emergencies, setEmergencies] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
    showCancel: false,
    onConfirm: null
  });

  const [issuesPage, setIssuesPage] = useState(1);
  const [emergencyPage, setEmergencyPage] = useState(1);
  const [gatePages, setGatePages] = useState({}); // { [roomId]: pageNumber }
  const ITEMS_PER_PAGE = 5;
  const GATE_TEAMS_PER_PAGE = 8;

  const showModal = (config) => {
    setModalConfig({ ...config, isOpen: true });
  };

  const closeModal = () => {
    setModalConfig(prev => ({ ...prev, isOpen: false }));
  };

  useEffect(() => {
    if (!user) {
      return; // Wait for user to load
    }
    if (user.role === 'coordinator' || user.role === 'organizer') {
      fetchData();
    } else {
      setTimeout(() => {
        navigate('/select-classroom');
      }, 100);
    }
  }, [user, navigate, fetchData]);

  useEffect(() => {
    if (socket) {
      socket.on('classroom-status-updated', handleStatusUpdate);
      socket.on('attendance-updated', handleAttendanceUpdate);
      socket.on('new-issue', handleNewIssue);
      socket.on('emergency-alert', handleEmergencyAlert);
      socket.on('gate-entry-updated', (data) => {
        setClassrooms(prev => prev.map(room => {
          if (String(room.roomNumber) === String(data.roomNumber)) {
            return {
              ...room,
              teams: room.teams.map(team =>
                team._id === data.teamId ? { ...team, gateEntry: data.gateEntry } : team
              )
            };
          }
          return room;
        }));
      });

      return () => {
        socket.off('classroom-status-updated', handleStatusUpdate);
        socket.off('attendance-updated', handleAttendanceUpdate);
        socket.off('new-issue', handleNewIssue);
        socket.off('emergency-alert', handleEmergencyAlert);
        socket.off('gate-entry-updated');
      };
    }
  }, [socket, handleStatusUpdate, handleAttendanceUpdate, handleNewIssue, handleEmergencyAlert]);

  const fetchData = useCallback(async () => {
    try {
      const [classroomsRes, issuesRes, emergenciesRes] = await Promise.all([
        axios.get('/api/classrooms'),
        axios.get('/api/issues'),
        axios.get('/api/emergency')
      ]);

      setClassrooms(classroomsRes.data);
      setIssues(issuesRes.data);
      setEmergencies(emergenciesRes.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  }, []);

  const handleStatusUpdate = useCallback((data) => {
    setClassrooms(prev =>
      prev.map(room =>
        room.roomNumber === data.roomNumber
          ? { ...room, currentStatus: data.status }
          : room
      )
    );
  }, []);

  const handleAttendanceUpdate = useCallback((data) => {
    fetchData(); // Refresh to get updated counts
  }, [fetchData]);

  const handleNewIssue = useCallback((data) => {
    setIssues(prev => [data.issue, ...prev]);
  }, []);

  const handleEmergencyAlert = useCallback((data) => {
    setEmergencies(prev => [data, ...prev]);
    // Show browser notification if available
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`Emergency Alert: ${data.type}`, {
        body: `Room ${data.roomNumber}: ${data.description || 'Emergency situation'}`,
        icon: '/favicon.ico'
      });
    }
  }, []);

  const getStatusColor = (status) => {
    const colors = {
      active: { bg: '#d4edda', border: '#28a745', text: '#155724' },
      lunch: { bg: '#fff3cd', border: '#ffc107', text: '#856404' },
      night: { bg: '#d1ecf1', border: '#17a2b8', text: '#0c5460' },
      emergency: { bg: '#f8d7da', border: '#dc3545', text: '#721c24' },
      jury: { bg: '#e7d9f0', border: '#6f42c1', text: '#4a2c5a' },
      empty: { bg: '#e2e3e5', border: '#6c757d', text: '#383d41' }
    };
    return colors[status] || colors.empty;
  };

  const getCategoryLabel = (category) => {
    const labels = {
      medical: 'Medical',
      technical: 'Technical/WiFi',
      power: 'Power',
      food: 'Food/Water',
      security: 'Security',
      discipline: 'Discipline/Noise',
      equipment: 'Equipment'
    };
    return labels[category] || category;
  };

  const getStatusLabel = (status) => {
    const labels = {
      active: 'Active',
      lunch: 'Lunch',
      night: 'Night',
      emergency: 'Emergency',
      jury: 'Jury/Mentor',
      empty: 'Empty'
    };
    return labels[status] || status;
  };

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  return (
    <div className="coordinator-dashboard">
      <div className="dashboard-header">
        <div>
          <h1>Coordinator Dashboard</h1>
          <p className="user-info">{user?.name} ({user?.role})</p>
        </div>
        <button className="btn btn-secondary" onClick={logout}>
          Logout
        </button>
      </div>

      <div className="dashboard-tabs">
        <button
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={`tab-btn ${activeTab === 'issues' ? 'active' : ''}`}
          onClick={() => setActiveTab('issues')}
        >
          Issues ({issues.filter(i => i.status === 'open').length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'emergencies' ? 'active' : ''}`}
          onClick={() => setActiveTab('emergencies')}
        >
          Emergencies ({emergencies.filter(e => !e.acknowledged).length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'gate' ? 'active' : ''}`}
          onClick={() => setActiveTab('gate')}
        >
          Gate Entry Status
        </button>
      </div>

      {activeTab === 'overview' && (
        <div className="dashboard-content">
          <h2>Classroom Status Grid</h2>
          <div className="classroom-grid">
            {classrooms.map((classroom) => {
              const colors = getStatusColor(classroom.currentStatus);
              return (
                <div
                  key={classroom._id}
                  className={`classroom-grid-item ${classroom.currentStatus}`}
                  style={{
                    backgroundColor: colors.bg,
                    borderColor: colors.border,
                    color: colors.text,
                    cursor: user?.role === 'organizer' ? 'pointer' : 'default'
                  }}
                  onClick={() => {
                    if (user?.role === 'organizer') {
                      navigate(`/admin/room/${classroom.roomNumber}`);
                    }
                  }}
                >
                  <h3>Room {classroom.roomNumber}</h3>
                  <p className="status-label">{getStatusLabel(classroom.currentStatus)}</p>
                  <p className="attendance-count">
                    {classroom.presentCount || 0} / {classroom.totalCount || 0} Present
                  </p>
                  <p className="last-updated">
                    Updated: {new Date(classroom.statusUpdatedAt || classroom.createdAt).toLocaleTimeString()}
                  </p>
                  {user?.role === 'organizer' && (
                    <p style={{ marginTop: '12px', fontSize: '12px', opacity: 0.8 }}>
                      Click to manage
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'issues' && (
        <div className="dashboard-content">
          <h2>Reported Issues</h2>
          <div className="issues-list">
            {issues.length === 0 ? (
              <p className="empty-state">No issues reported</p>
            ) : (
              <>
                {issues.slice((issuesPage - 1) * ITEMS_PER_PAGE, issuesPage * ITEMS_PER_PAGE).map((issue) => (
                  <div key={issue._id} className={`issue-card issue-${issue.status}`}>
                    <div className="issue-header">
                      <div>
                        <h3>{getCategoryLabel(issue.category)}</h3>
                        <div className="issue-meta">
                          <div>Room {issue.roomNumber}</div>
                          <div>{new Date(issue.timestamp).toLocaleString()}</div>
                          <div>Reported by: {issue.reportedBy?.name || issue.volunteerName}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
                        <span className={`status-badge status-${issue.status}`}>
                          {issue.status}
                        </span>
                        {user?.role === 'organizer' && (
                          <button
                            className="btn-delete"
                            style={{
                              fontSize: '0.875rem',
                              padding: '6px 12px',
                              height: 'auto',
                              width: 'auto',
                              borderRadius: '6px'
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              showModal({
                                title: 'Delete Issue',
                                message: 'Are you sure you want to delete this issue? This action cannot be undone.',
                                type: 'error',
                                showCancel: true,
                                confirmText: 'Delete',
                                onConfirm: async () => {
                                  try {
                                    await axios.delete(`/api/issues/${issue._id}`);
                                    setIssues(prev => prev.filter(i => i._id !== issue._id));
                                    showModal({ title: 'Success', message: 'Issue deleted successfully', type: 'success' });
                                  } catch (error) {
                                    showModal({ title: 'Error', message: 'Failed to delete issue', type: 'error' });
                                  }
                                }
                              });
                            }}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="issue-description">{issue.description}</p>

                    <div className="issue-actions" style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#4b5563' }}>Status:</label>
                      <select
                        value={issue.status}
                        onChange={async (e) => {
                          const newStatus = e.target.value;
                          try {
                            await axios.patch(
                              `/api/issues/${issue._id}`,
                              { status: newStatus }
                            );
                            setIssues(prev => prev.map(i =>
                              i._id === issue._id ? { ...i, status: newStatus } : i
                            ));
                            // Also refresh data to be safe
                            fetchData();
                          } catch (error) {
                            console.error('Error updating issue status:', error);
                            showModal({ title: 'Error', message: 'Failed to update status', type: 'error' });
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '6px',
                          border: '1px solid #d1d5db',
                          background: 'white',
                          fontSize: '0.9rem',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="open">Open</option>
                        <option value="in-progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                      </select>
                    </div>
                  </div>
                ))}
                {issues.length > ITEMS_PER_PAGE && (
                  <div className="pagination-controls" style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '15px' }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      disabled={issuesPage === 1}
                      onClick={() => setIssuesPage(p => Math.max(1, p - 1))}
                    >
                      Previous
                    </button>
                    <span style={{ alignSelf: 'center', fontSize: '0.9rem' }}>Page {issuesPage} of {Math.ceil(issues.length / ITEMS_PER_PAGE)}</span>
                    <button
                      className="btn btn-secondary btn-sm"
                      disabled={issuesPage >= Math.ceil(issues.length / ITEMS_PER_PAGE)}
                      onClick={() => setIssuesPage(p => p + 1)}
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {activeTab === 'emergencies' && (
        <div className="dashboard-content">
          <h2>Emergency Alerts</h2>
          <div className="emergencies-list">
            {emergencies.length === 0 ? (
              <p className="empty-state">No active emergencies.</p>
            ) : (
              <>
                {emergencies.slice((emergencyPage - 1) * ITEMS_PER_PAGE, emergencyPage * ITEMS_PER_PAGE).map((emergency, index) => (
                  <div
                    key={emergency._id || emergency.logId || `emergency-${index}`}
                    className={`emergency-card ${emergency.acknowledged ? 'acknowledged' : 'active'}`}
                  >
                    <div className="emergency-header" style={{ alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <h3>🚨 {emergency.type?.toUpperCase().replace('-', ' ')}</h3>
                        <div className="emergency-meta">
                          <div>Room {emergency.roomNumber}</div>
                          {emergency.teamName && <div>Team: {emergency.teamName}</div>}
                          <div>Reported by: {emergency.reportedBy?.name || emergency.volunteerName}</div>
                          <div>{new Date(emergency.timestamp).toLocaleString()}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', minWidth: '120px', gap: '9px' }}>
                        {emergency.acknowledged ? (
                          <span className="acknowledged-badge">✓ Acknowledged</span>
                        ) : (
                          <button
                            className="btn btn-success"
                            style={{ width: '100%' }}
                            onClick={async () => {
                              try {
                                const emergencyId = emergency._id || emergency.logId;
                                if (!emergencyId) {
                                  showModal({ title: 'Error', message: 'Cannot acknowledge: Missing emergency ID', type: 'error' });
                                  return;
                                }
                                await axios.patch(
                                  `/api/emergency/${emergencyId}/acknowledge`
                                );
                                fetchData();
                              } catch (error) {
                                console.error('Error acknowledging emergency:', error);
                                showModal({ title: 'Error', message: 'Failed to acknowledge emergency', type: 'error' });
                              }
                            }}
                          >
                            Acknowledge
                          </button>
                        )}
                        {user?.role === 'organizer' && (
                          <button
                            className="btn-delete"
                            style={{
                              fontSize: '0.875rem',
                              padding: '6px 12px',
                              display: 'block',
                              width: '100%',
                              textAlign: 'center',
                              height: 'auto',
                              borderRadius: '6px'
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              const emergencyId = emergency._id || emergency.logId;
                              showModal({
                                title: 'Delete Emergency Log',
                                message: 'Are you sure you want to delete this emergency log? This action cannot be undone.',
                                type: 'error',
                                showCancel: true,
                                confirmText: 'Delete',
                                onConfirm: async () => {
                                  try {
                                    await axios.delete(`/api/emergency/${emergencyId}`);
                                    setEmergencies(prev => prev.filter(e => (e._id || e.logId) !== emergencyId));
                                    showModal({ title: 'Success', message: 'Emergency log deleted successfully', type: 'success' });
                                  } catch (error) {
                                    showModal({ title: 'Error', message: 'Failed to delete emergency log', type: 'error' });
                                  }
                                }
                              });
                            }}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="emergency-description">{emergency.description}</p>
                    {emergency.notifiedOrganizers && (
                      <p className="notified-info">
                        Notified: {emergency.notifiedOrganizers.join(', ')}
                      </p>
                    )}


                  </div>
                ))}
                {emergencies.length > ITEMS_PER_PAGE && (
                  <div className="pagination-controls" style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '15px' }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      disabled={emergencyPage === 1}
                      onClick={() => setEmergencyPage(p => Math.max(1, p - 1))}
                    >
                      Previous
                    </button>
                    <span style={{ alignSelf: 'center', fontSize: '0.9rem' }}>Page {emergencyPage} of {Math.ceil(emergencies.length / ITEMS_PER_PAGE)}</span>
                    <button
                      className="btn btn-secondary btn-sm"
                      disabled={emergencyPage >= Math.ceil(emergencies.length / ITEMS_PER_PAGE)}
                      onClick={() => setEmergencyPage(p => p + 1)}
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {activeTab === 'gate' && (
        <div className="dashboard-content">
          <div className="gate-dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2>Gate Entry Status</h2>
            <div className="gate-stats" style={{ display: 'flex', gap: '20px' }}>
              <div className="stat-pill" style={{ background: '#dcfce7', color: '#166534', padding: '8px 16px', borderRadius: '20px', fontWeight: 'bold' }}>
                Entered: {classrooms.reduce((acc, room) => acc + (room.teams?.filter(t => t.gateEntry?.isEntered).length || 0), 0)}
              </div>
              <div className="stat-pill" style={{ background: '#fee2e2', color: '#991b1b', padding: '8px 16px', borderRadius: '20px', fontWeight: 'bold' }}>
                Pending: {classrooms.reduce((acc, room) => acc + (room.teams?.filter(t => !t.gateEntry?.isEntered).length || 0), 0)}
              </div>
            </div>
          </div>

          <div className="gate-grid">
            {classrooms.map(room => {
              const roomTeams = room.teams || [];
              const enteredCount = roomTeams.filter(t => t.gateEntry?.isEntered).length;
              const totalTeams = roomTeams.length;
              const currentPage = gatePages[room._id] || 1;
              const totalPages = Math.ceil(totalTeams / GATE_TEAMS_PER_PAGE);

              const paginatedTeams = roomTeams.slice(
                (currentPage - 1) * GATE_TEAMS_PER_PAGE,
                currentPage * GATE_TEAMS_PER_PAGE
              );

              return (
                <div key={room._id} className="gate-room-card" style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: 'var(--shadow-sm)', marginBottom: '20px' }}>
                  <div className="gate-room-header" style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px', marginBottom: '12px' }}>
                    <h3 style={{ margin: 0 }}>Room {room.roomNumber}</h3>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                      {enteredCount} / {totalTeams} Entered
                    </span>
                  </div>
                  <div className="gate-team-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '12px' }}>
                    {paginatedTeams.map(team => (
                      <div key={team._id} className="gate-team-item" style={{
                        padding: '12px',
                        borderRadius: '8px',
                        background: team.gateEntry?.isEntered ? '#f0fdf4' : '#f9fafb',
                        border: `1px solid ${team.gateEntry?.isEntered ? '#bbf7d0' : '#e5e7eb'}`,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{team.teamName}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                            {team.gateEntry?.isEntered ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                                <span style={{ color: '#059669', fontWeight: 500 }}>Entered at {new Date(team.gateEntry.enteredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                <span style={{
                                  padding: '2px 8px',
                                  background: team.gateEntry.verificationType === 'Bonafide' ? '#ecfdf5' :
                                    team.gateEntry.verificationType === 'ID Card' ? '#eff6ff' : '#f1f5f9',
                                  color: team.gateEntry.verificationType === 'Bonafide' ? '#059669' :
                                    team.gateEntry.verificationType === 'ID Card' ? '#2563eb' : '#475569',
                                  borderRadius: '12px',
                                  fontSize: '0.7rem',
                                  fontWeight: 700,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  border: `1px solid ${team.gateEntry.verificationType === 'Bonafide' ? '#bbf7d0' :
                                    team.gateEntry.verificationType === 'ID Card' ? '#bfdbfe' : '#e2e8f0'
                                    }`
                                }}>
                                  <VerificationIcon type={team.gateEntry.verificationType} />
                                  {team.gateEntry.verificationType === 'Nothing' ? 'No ID' : team.gateEntry.verificationType}
                                </span>
                              </div>
                            ) : (
                              <span style={{ color: '#94a3b8' }}>Not Entered</span>
                            )}
                          </div>
                        </div>
                        {team.gateEntry?.isEntered && <span style={{ fontSize: '1.2rem' }}>✅</span>}
                      </div>
                    ))}
                    {roomTeams.length === 0 && <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>No teams assigned</p>}
                  </div>

                  {totalPages > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '16px', borderTop: '1px solid #eee', paddingTop: '10px' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        disabled={currentPage === 1}
                        onClick={() => setGatePages(prev => ({ ...prev, [room._id]: Math.max(1, currentPage - 1) }))}
                      >
                        Prev
                      </button>
                      <span style={{ fontSize: '0.85rem', alignSelf: 'center', color: '#666' }}>
                        {currentPage} / {totalPages}
                      </span>
                      <button
                        className="btn btn-secondary btn-sm"
                        disabled={currentPage >= totalPages}
                        onClick={() => setGatePages(prev => ({ ...prev, [room._id]: Math.min(totalPages, currentPage + 1) }))}
                      >
                        Next
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

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
    </div >
  );
};

export default CoordinatorDashboard;

