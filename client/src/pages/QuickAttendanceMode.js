import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import './QuickAttendanceMode.css';

const QuickAttendanceMode = () => {
  const { user, selectedClassroom, logout } = useAuth();
  const socket = useSocket();
  const navigate = useNavigate();
  const [teams, setTeams] = useState([]);
  const [teamCounts, setTeamCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!selectedClassroom) {
      setTimeout(() => {
        navigate('/select-classroom');
      }, 100);
      return;
    }
    fetchTeams();
  }, [selectedClassroom, navigate, fetchTeams]);

  useEffect(() => {
    if (socket) {
      socket.on('attendance-bulk-updated', () => {
        fetchTeams();
      });

      return () => {
        socket.off('attendance-bulk-updated');
      };
    }
  }, [socket, fetchTeams]);

  const fetchTeams = useCallback(async () => {
    try {
      const response = await axios.get(
        `/api/teams/classroom/${selectedClassroom}`
      );
      const teamsData = response.data;
      setTeams(teamsData);

      // Initialize counts
      const counts = {};
      teamsData.forEach(team => {
        counts[team._id] = {
          present: team.presentCount || 0,
          total: team.totalCount || 0
        };
      });
      setTeamCounts(counts);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching teams:', error);
      setLoading(false);
    }
  }, [selectedClassroom]);

  const updateCount = (teamId, delta) => {
    setTeamCounts(prev => {
      const current = prev[teamId] || { present: 0, total: 0 };
      const newPresent = Math.max(0, Math.min(current.total, current.present + delta));
      return {
        ...prev,
        [teamId]: {
          ...current,
          present: newPresent
        }
      };
    });
  };

  const saveAttendance = async () => {
    setSaving(true);
    try {
      const updates = teams.map(team => {
        const count = teamCounts[team._id] || { present: 0, total: team.totalCount };
        const presentCount = count.present;
        const totalCount = count.total;

        // Determine which members should be present/absent
        const members = team.members || [];
        const memberUpdates = members.map((member, index) => ({
          memberId: member._id,
          status: index < presentCount ? 'present' : 'absent'
        }));

        return {
          teamId: team._id,
          presentCount,
          totalCount,
          members: memberUpdates
        };
      });

      await axios.post(
        `/api/attendance/bulk-update`,
        {
          updates,
          roomNumber: selectedClassroom
        }
      );

      alert('Attendance saved successfully!');
      navigate('/attendance');
    } catch (error) {
      console.error('Error saving attendance:', error);
      alert('Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="quick-attendance">
      <div className="header-bar">
        <div className="header-info">
          <h1>Quick Attendance - Room {selectedClassroom}</h1>
          <p className="volunteer-name">{user?.name}</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-secondary" onClick={() => navigate('/attendance')}>
            Back to Detailed View
          </button>
          <button className="btn btn-secondary" onClick={() => {
            logout();
            navigate('/login');
          }}>
            Logout
          </button>
        </div>
      </div>

      <div className="quick-instructions">
        <p>Tap + or - to quickly update present count for each team. Tap Save when done.</p>
      </div>

      <div className="quick-teams-list">
        {teams.map((team) => {
          const count = teamCounts[team._id] || { present: 0, total: team.totalCount };

          return (
            <div key={team._id} className="quick-team-item">
              <div className="quick-team-name">
                <h3>{team.teamName}</h3>
              </div>
              <div className="quick-count-controls">
                <button
                  className="count-btn"
                  onClick={() => updateCount(team._id, -1)}
                  disabled={count.present === 0}
                >
                  −
                </button>
                <div className="count-display">
                  {count.present} / {count.total}
                </div>
                <button
                  className="count-btn"
                  onClick={() => updateCount(team._id, 1)}
                  disabled={count.present >= count.total}
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="save-section">
        <button
          className="btn btn-success"
          onClick={saveAttendance}
          disabled={saving}
          style={{ fontSize: '20px', padding: '20px' }}
        >
          {saving ? 'Saving...' : 'Save Attendance'}
        </button>
      </div>
    </div>
  );
};

export default QuickAttendanceMode;

