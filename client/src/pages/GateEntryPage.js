import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import Modal from '../components/Modal';
import './GateEntryPage.css';

const VerificationIcons = {
    Bonafide: () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="m9 12 2 2 4-4" />
        </svg>
    ),
    IDCard: () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <circle cx="9" cy="10" r="2" />
            <line x1="15" y1="8" x2="19" y2="8" />
            <line x1="15" y1="12" x2="19" y2="12" />
            <line x1="7" y1="16" x2="17" y2="16" />
        </svg>
    ),
    Nothing: () => (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
        </svg>
    )
};

const GateEntryPage = () => {
    const { user, logout } = useAuth();
    const socket = useSocket();
    const navigate = useNavigate();
    const [allTeams, setAllTeams] = useState([]);
    const [filteredTeams, setFilteredTeams] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const [modalConfig, setModalConfig] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'info',
        onConfirm: null,
        showCancel: false,
        confirmText: 'OK'
    });

    const showModal = (config) => setModalConfig({ ...config, isOpen: true });
    const closeModal = () => setModalConfig(prev => ({ ...prev, isOpen: false }));

    // Fetch all data on mount
    useEffect(() => {
        fetchAllData();
    }, []);

    // Real-time updates
    useEffect(() => {
        if (socket) {
            socket.on('gate-entry-updated', (data) => {
                setAllTeams(prevTeams => prevTeams.map(team => {
                    if (team._id === data.teamId) {
                        // If team update included member sync (Team Toggle)
                        if (data.members) {
                            return {
                                ...team,
                                gateEntry: data.gateEntry,
                                members: team.members.map(m => {
                                    const updatedM = data.members.find(um => um._id === m._id);
                                    return updatedM ? { ...m, gateEntry: updatedM.gateEntry, currentStatus: updatedM.currentStatus || m.currentStatus } : m;
                                })
                            };
                        }
                        // If member update (Member Toggle)
                        if (data.memberId) {
                            return {
                                ...team,
                                gateEntry: data.gateEntry,
                                members: team.members.map(m =>
                                    m._id === data.memberId ? { ...m, gateEntry: data.memberGateEntry, currentStatus: data.currentStatus || m.currentStatus } : m
                                )
                            };
                        }
                        // Fallback
                        return { ...team, gateEntry: data.gateEntry };
                    }
                    return team;
                }));
            });
            return () => socket.off('gate-entry-updated');
        }
    }, [socket]);

    // Filtering
    useEffect(() => {
        const query = searchQuery.toLowerCase();
        const filtered = allTeams.filter(team =>
            team.teamName.toLowerCase().includes(query) ||
            team.members.some(m => m.name.toLowerCase().includes(query)) ||
            (team.roomNumber && team.roomNumber.toLowerCase().includes(query))
        );
        // Sort alphabetically by team name to keep order stable regardless of status
        filtered.sort((a, b) => a.teamName.localeCompare(b.teamName));
        setFilteredTeams(filtered);
        setCurrentPage(1); // Reset to first page on search
    }, [searchQuery, allTeams]);

    const fetchAllData = async () => {
        try {
            // Fixed: Use relative path
            const response = await axios.get('/api/classrooms');

            const classrooms = response.data;
            const flattenedTeams = [];

            classrooms.forEach(room => {
                if (room.teams) {
                    room.teams.forEach(team => {
                        flattenedTeams.push({
                            ...team,
                            roomNumber: room.roomNumber,
                            bandColor: room.bandColor
                        });
                    });
                }
            });
            setAllTeams(flattenedTeams);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching data:', error);
            setLoading(false);
        }
    };

    const handleToggleTeam = async (team) => {
        const newStatus = !team.gateEntry?.isEntered;
        const verificationType = team.verificationType || team.gateEntry?.verificationType || 'Nothing';

        // Optimistic: Update team AND all members
        setAllTeams(prev => prev.map(t =>
            t._id === team._id ? {
                ...t,
                gateEntry: {
                    ...t.gateEntry,
                    isEntered: newStatus,
                    verificationType: verificationType
                },
                members: t.members.map(m => ({
                    ...m,
                    currentStatus: !newStatus && m.currentStatus === 'absent' ? 'present' : m.currentStatus,
                    gateEntry: {
                        isEntered: newStatus,
                        enteredAt: new Date(),
                        verificationType: verificationType
                    }
                }))
            } : t
        ));

        try {
            await axios.put(
                `/api/classrooms/${team.roomNumber}/teams/${team._id}/gate-entry`,
                { isEntered: newStatus, verificationType }
            );
        } catch (error) {
            console.error('Entry update failed:', error);
            // Fetch fresh data to revert safely
            fetchAllData();
            showModal({ title: 'Error', message: 'Failed to update entry status', type: 'error' });
        }
    };

    const handleToggleMember = async (team, member) => {
        const newStatus = !member.gateEntry?.isEntered;
        const verificationType = team.verificationType || team.gateEntry?.verificationType || 'Nothing';

        // Optimistic update
        setAllTeams(prev => prev.map(t => {
            if (t._id === team._id) {
                const updatedMembers = t.members.map(m =>
                    m._id === member._id ? {
                        ...m,
                        gateEntry: {
                            ...m.gateEntry,
                            isEntered: newStatus,
                            verificationType: verificationType
                        }
                    } : m
                );
                // Optimistically check if all are now entered to update team status visually immediately
                const allEntered = updatedMembers.every(m => m.gateEntry?.isEntered);
                return {
                    ...t,
                    members: updatedMembers,
                    gateEntry: {
                        ...t.gateEntry,
                        isEntered: allEntered,
                        verificationType: verificationType
                    }
                };
            }
            return t;
        }));

        try {
            await axios.put(
                `/api/classrooms/${team.roomNumber}/teams/${team._id}/members/${member._id}/gate-entry`,
                { isEntered: newStatus, verificationType }
            );
        } catch (error) {
            console.error('Member update failed:', error);
            fetchAllData();
        }
    };

    const handleFinalizeTeam = (team) => {
        const verificationType = team.verificationType || team.gateEntry?.verificationType || 'Nothing';

        showModal({
            title: 'Confirm Team Entry',
            message: `Are you sure you want to mark entry for ${team.teamName}? All members not checked in will be marked as ABSENT.`,
            type: 'info',
            showCancel: true,
            confirmText: 'Mark Entry',
            onConfirm: () => performFinalize(team, verificationType)
        });
    };

    const performFinalize = async (team, verificationType) => {
        // Optimistic update
        setAllTeams(prev => prev.map(t =>
            t._id === team._id ? {
                ...t,
                gateEntry: {
                    ...t.gateEntry,
                    isEntered: true,
                    verificationType: verificationType
                },
                members: t.members.map(m => ({
                    ...m,
                    currentStatus: m.gateEntry?.isEntered ? 'present' : 'absent'
                }))
            } : t
        ));

        try {
            await axios.put(
                `/api/classrooms/${team.roomNumber}/teams/${team._id}/finalize-entry`,
                { verificationType }
            );
        } catch (error) {
            console.error('Finalize entry failed:', error);
            fetchAllData();
            showModal({ title: 'Error', message: 'Failed to finalize entry', type: 'error' });
        }
    };

    const handleVerificationChange = async (team, type) => {
        const verificationType = type;
        // Update local state first for responsiveness
        setAllTeams(prev => prev.map(t =>
            t._id === team._id ? { ...t, verificationType: type } : t
        ));

        // If team is already entered, sync with backend immediately
        if (team.gateEntry?.isEntered) {
            try {
                await axios.put(
                    `/api/classrooms/${team.roomNumber}/teams/${team._id}/gate-entry`,
                    { isEntered: true, verificationType }
                );
            } catch (error) {
                console.error('Failed to sync verification type:', error);
                fetchAllData();
            }
        }
    };

    if (loading) return <div className="loading">Loading gate data...</div>;

    return (
        <div className="gate-entry-page">
            <div className="header-bar">
                <div className="header-info">
                    <h1 style={{ marginBottom: '12px' }}>Gate Entry Management</h1>
                    <p className="volunteer-name">Volunteer: {user?.name}</p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button className="btn btn-secondary" onClick={() => navigate('/select-classroom')}>
                        Back
                    </button>
                    <button className="btn btn-secondary" onClick={() => { logout(); navigate('/login'); }}>
                        Logout
                    </button>
                </div>
            </div>

            <div className="gate-content">
                <div className="search-bar-container">
                    <input
                        type="text"
                        placeholder="Search Team, Member, or Room Number..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="search-input"
                        autoFocus
                    />
                </div>

                <div className="teams-list">
                    {filteredTeams.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map(team => {
                        const bandStr = team.bandColor ? team.bandColor.hex : '#ccc';
                        const bandName = team.bandColor ? team.bandColor.name : 'Unknown';
                        const bandBg = team.bandColor ? team.bandColor.bg : '#eee';

                        return (
                            <div key={team._id} className={`gate-team-card ${team.gateEntry?.isEntered ? 'entered' : ''}`} style={{ borderLeft: `6px solid ${bandStr}` }}>
                                <div className="team-details">
                                    <div className="team-header-gate" style={{ flexWrap: 'wrap', marginBottom: '8px' }}>
                                        <h3 style={{ margin: 0, fontSize: '1.25rem' }}>{team.teamName}</h3>
                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                                            <span className="room-badge" style={{ background: '#f3f4f6', border: '1px solid #d1d5db', color: '#374151', padding: '4px 10px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 600 }}>
                                                Room {team.roomNumber}
                                            </span>
                                            <span className="band-badge" style={{ background: bandBg, color: '#1f2937', border: `1px solid ${bandStr}`, padding: '4px 10px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: bandStr }}></span>
                                                Band: {bandName}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="members-list-check" style={{ marginTop: '12px' }}>
                                        {team.members.map(m => (
                                            <div key={m._id} style={{ display: 'flex', alignItems: 'center', marginBottom: '8px', cursor: 'pointer' }} onClick={() => handleToggleMember(team, m)}>
                                                <div style={{
                                                    width: '20px',
                                                    height: '20px',
                                                    borderRadius: '4px',
                                                    border: `2px solid ${m.gateEntry?.isEntered ? '#166534' : (m.currentStatus === 'absent' ? '#ef4444' : '#d1d5db')}`,
                                                    background: m.gateEntry?.isEntered ? '#166534' : (m.currentStatus === 'absent' ? '#fee2e2' : 'white'),
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    marginRight: '10px',
                                                    transition: 'all 0.2s'
                                                }}>
                                                    {m.gateEntry?.isEntered && <span style={{ color: 'white', fontSize: '14px' }}>✓</span>}
                                                    {!m.gateEntry?.isEntered && m.currentStatus === 'absent' && <span style={{ color: '#ef4444', fontSize: '14px', fontWeight: 800 }}>✕</span>}
                                                </div>
                                                <span style={{
                                                    color: m.gateEntry?.isEntered ? '#1f2937' : (m.currentStatus === 'absent' ? '#ef4444' : '#4b5563'),
                                                    fontWeight: (m.gateEntry?.isEntered || m.currentStatus === 'absent') ? 600 : 400,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '8px'
                                                }}>
                                                    {m.name}
                                                    {m.currentStatus === 'absent' && <span style={{ fontSize: '0.65rem', background: '#fee2e2', color: '#ef4444', padding: '1px 6px', borderRadius: '4px', fontWeight: 800 }}>ABSENT</span>}
                                                </span>
                                            </div>
                                        ))}
                                    </div>

                                    {team.gateEntry?.isEntered && (
                                        <p className="entry-meta" style={{ fontSize: '0.85rem', color: '#166534', margin: '8px 0 0 0' }}>
                                            All Members Checked In ✅
                                        </p>
                                    )}
                                </div>

                                <div className="entry-action-col" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '150px', borderLeft: '1px solid #f3f4f6', paddingLeft: '16px' }}>
                                    <div className="verification-toggle-container" style={{ marginBottom: '16px', width: '100%' }}>
                                        <label style={{ fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Verification Type</label>
                                        <div style={{ display: 'flex', gap: '6px', background: '#f1f5f9', padding: '4px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                            {[
                                                { id: 'Bonafide', label: 'Bonafide', color: '#10b981', bg: '#ecfdf5' },
                                                { id: 'ID Card', label: 'ID Card', color: '#3b82f6', bg: '#eff6ff' },
                                                { id: 'Nothing', label: 'None', color: '#64748b', bg: '#f8fafc' }
                                            ].map(opt => {
                                                const isSelected = (team.verificationType || team.gateEntry?.verificationType || 'Nothing') === opt.id;
                                                const Icon = VerificationIcons[opt.id.replace(' ', '')];

                                                return (
                                                    <button
                                                        key={opt.id}
                                                        onClick={() => handleVerificationChange(team, opt.id)}
                                                        className={`verification-opt ${isSelected ? 'active' : ''}`}
                                                        style={{
                                                            flex: 1,
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            alignItems: 'center',
                                                            gap: '4px',
                                                            padding: '8px 4px',
                                                            borderRadius: '8px',
                                                            border: 'none',
                                                            cursor: 'pointer',
                                                            background: isSelected ? 'white' : 'transparent',
                                                            color: isSelected ? opt.color : '#94a3b8',
                                                            boxShadow: isSelected ? '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)' : 'none',
                                                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                                            position: 'relative'
                                                        }}
                                                    >
                                                        <div style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            width: '32px',
                                                            height: '32px',
                                                            borderRadius: '50%',
                                                            background: isSelected ? opt.bg : 'transparent',
                                                            color: isSelected ? opt.color : 'inherit',
                                                            transition: 'all 0.3s'
                                                        }}>
                                                            <Icon />
                                                        </div>
                                                        <span style={{
                                                            fontSize: '0.65rem',
                                                            fontWeight: isSelected ? 700 : 500,
                                                        }}>
                                                            {opt.label}
                                                        </span>
                                                        {isSelected && (
                                                            <div style={{
                                                                position: 'absolute',
                                                                top: '-2px',
                                                                right: '-2px',
                                                                width: '8px',
                                                                height: '8px',
                                                                borderRadius: '50%',
                                                                background: opt.color,
                                                                border: '2px solid white'
                                                            }} />
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', alignItems: 'center' }}>
                                        <label className="switch">
                                            <input
                                                type="checkbox"
                                                checked={!!team.gateEntry?.isEntered}
                                                onChange={() => handleToggleTeam(team)}
                                            />
                                            <span className="slider round"></span>
                                        </label>
                                        <span className="entry-status-label" style={{ fontWeight: 600, fontSize: '0.75rem', color: team.gateEntry?.isEntered ? '#166534' : '#6b7280', textAlign: 'center', textTransform: 'uppercase' }}>
                                            {team.gateEntry?.isEntered ? 'TEAM ENTERED' : 'QUICK CHECK-IN'}
                                        </span>
                                    </div>

                                    {!team.gateEntry?.isEntered && (
                                        <button
                                            className="btn btn-primary finalize-btn"
                                            onClick={() => handleFinalizeTeam(team)}
                                            style={{
                                                marginTop: '16px',
                                                padding: '10px 16px',
                                                width: '100%',
                                                fontSize: '0.85rem',
                                                fontWeight: 700,
                                                background: '#1e293b',
                                                color: 'white',
                                                borderRadius: '8px',
                                                border: 'none',
                                                cursor: 'pointer',
                                                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                                            }}
                                        >
                                            MARK ENTRY
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    {filteredTeams.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                            <p style={{ fontSize: '1.2rem' }}>No teams matches your search.</p>
                        </div>
                    )}

                    {filteredTeams.length > itemsPerPage && (
                        <div className="pagination-controls" style={{
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            gap: '20px',
                            padding: '20px 0',
                            borderTop: '1px solid #e5e7eb',
                            marginTop: '20px'
                        }}>
                            <button
                                className="btn btn-secondary"
                                onClick={() => {
                                    setCurrentPage(curr => Math.max(1, curr - 1));
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                disabled={currentPage === 1}
                                style={{ opacity: currentPage === 1 ? 0.5 : 1, cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
                            >
                                ← Previous
                            </button>
                            <span style={{ fontWeight: 600, color: '#4b5563' }}>
                                Page {currentPage} of {Math.ceil(filteredTeams.length / itemsPerPage)}
                            </span>
                            <button
                                className="btn btn-secondary"
                                onClick={() => {
                                    setCurrentPage(curr => Math.min(Math.ceil(filteredTeams.length / itemsPerPage), curr + 1));
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                disabled={currentPage >= Math.ceil(filteredTeams.length / itemsPerPage)}
                                style={{ opacity: currentPage >= Math.ceil(filteredTeams.length / itemsPerPage) ? 0.5 : 1, cursor: currentPage >= Math.ceil(filteredTeams.length / itemsPerPage) ? 'not-allowed' : 'pointer' }}
                            >
                                Next →
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <Modal
                {...modalConfig}
                onClose={closeModal}
            />
        </div>
    );
};

export default GateEntryPage;
