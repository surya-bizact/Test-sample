import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import './AdminPanel.css';
import AlertModal from './AlertModal';
import { useNavigate } from 'react-router-dom';
import {
  useGetAdminStatsQuery,
  useGetAdminUsersQuery,
  useCreateAdminUserMutation,
  useDeleteAdminUserMutation,
  usePromoteAdminUserMutation,
  useDemoteAdminUserMutation
} from '../redux/apiSlice';

const AdminPanel = ({ user, onClose }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  // RTK Query hooks
  const { data: statsData, isLoading: isLoadingStats, refetch: refetchStats } = useGetAdminStatsQuery();
  const { data: usersData = [], isLoading: isLoadingUsers, refetch: refetchUsers } = useGetAdminUsersQuery();
  const [createAdminUser] = useCreateAdminUserMutation();
  const [deleteAdminUser] = useDeleteAdminUserMutation();
  const [promoteAdminUser] = usePromoteAdminUserMutation();
  const [demoteAdminUser] = useDemoteAdminUserMutation();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Set stats and users from RTK Query data
  const stats = statsData?.stats || null;
  const users = usersData.users || [];

  // Alert modal state
  const [alertModal, setAlertModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
    onConfirm: null,
    onCancel: null,
    confirmText: 'OK',
    cancelText: 'Cancel',
    showCancel: false
  });

  // Stats are automatically fetched by RTK Query
  useEffect(() => {
    if (statsData?.error) {
      setError(statsData.error);
    }
  }, [statsData]);

  // Users are automatically fetched by RTK Query
  useEffect(() => {
    if (usersData?.error) {
      setError(usersData.error);
    }
  }, [usersData]);

  // Show alert modal
  const showAlert = (title, message, type = 'info', onConfirm = null) => {
    setAlertModal({
      isOpen: true,
      title,
      message,
      type,
      onConfirm: () => {
        setAlertModal(prev => ({ ...prev, isOpen: false }));
        if (onConfirm) onConfirm();
      },
      onCancel: () => setAlertModal(prev => ({ ...prev, isOpen: false })),
      confirmText: 'OK',
      showCancel: false
    });
  };

  // Show confirmation dialog
  const showConfirmation = (title, message, onConfirm, type = 'warning') => {
    setAlertModal({
      isOpen: true,
      title,
      message,
      type,
      onConfirm: async () => {
        setAlertModal(prev => ({ ...prev, isOpen: false }));
        if (onConfirm) await onConfirm();
      },
      onCancel: () => setAlertModal(prev => ({ ...prev, isOpen: false })),
      confirmText: 'Confirm',
      cancelText: 'Cancel',
      showCancel: true
    });
  };

  // Delete user
  const handleDeleteUser = (userId, username) => {
    showConfirmation(
      'Delete User',
      `Are you sure you want to delete user ${username}? This action cannot be undone.`,
      async () => {
        try {
          await deleteAdminUser(userId).unwrap();
          showAlert('Success', 'User deleted successfully', 'success');
          refetchUsers();
        } catch (err) {
          showAlert('Error', err.data?.message || 'Failed to delete user', 'error');
        }
      }
    );
  };

  // Create admin user
  const handleCreateAdmin = async (userData) => {
    try {
      await createAdminUser(userData).unwrap();
      showAlert('Success', 'Admin user created successfully', 'success');
      refetchUsers();
      return { success: true };
    } catch (err) {
      showAlert('Error', err.data?.message || 'Failed to create admin user', 'error');
      return { success: false, error: err.data?.message };
    }
  };

  // Toggle admin status
  const handleToggleAdmin = (userId, currentStatus, username) => {
    showConfirmation(
      currentStatus ? 'Revoke Admin Access' : 'Grant Admin Access',
      `Are you sure you want to ${currentStatus ? 'revoke' : 'grant'} admin access for ${username}?`,
      async () => {
        try {
          if (currentStatus) {
            await demoteAdminUser(userId).unwrap();
          } else {
            await promoteAdminUser(userId).unwrap();
          }
          showAlert('Success', `User ${currentStatus ? 'demoted' : 'promoted'} successfully`, 'success');
          refetchUsers();
        } catch (err) {
          showAlert('Error', err.data?.message || 'Failed to update user role', 'error');
        }
      }
    );
  };

  // Filter users based on search term
  const filteredUsers = users.filter(user => 
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Refetch data when tab changes
  useEffect(() => {
    if (activeTab === 'dashboard') {
      refetchStats();
    } else if (activeTab === 'users') {
      refetchUsers();
    }
  }, [activeTab, refetchStats, refetchUsers]);

  const renderDashboard = () => {
    console.log('Stats data:', statsData);
    
    // The stats data comes directly in statsData, not in statsData.stats
    const stats = statsData || {};
    
    return (
      <div className="admin-dashboard">
        <h3>📊 System Statistics</h3>
        {isLoadingStats ? (
          <div className="loading">Loading statistics...</div>
        ) : statsData?.error ? (
          <div className="error">
            <p>Error loading statistics:</p>
            <p>{statsData.error.message || 'Unknown error occurred'}</p>
            <button onClick={() => refetchStats()} className="retry-button">
              Retry
            </button>
          </div>
        ) : statsData ? (
          <div className="stats-grid">
            <div className="stat-card">
              <h4>👥 Total Users</h4>
              <div className="stat-value">{stats.total_users || 0}</div>
            </div>
            <div className="stat-card">
              <h4>🎨 Total Sessions</h4>
              <div className="stat-value">{stats.total_sessions || 0}</div>
            </div>
            <div className="stat-card">
              <h4>🔧 Admin Users</h4>
              <div className="stat-value">{stats.admin_users || 0}</div>
            </div>
            <div className="stat-card">
              <h4>👤 Regular Users</h4>
              <div className="stat-value">
                {(stats.total_users - (stats.admin_users || 0)) || 0}
              </div>
            </div>
          </div>
        ) : (
          <div className="no-data">No statistics data available</div>
        )}
      </div>
    );
  };

  const renderUsers = () => (
    <div className="admin-users">
      <div className="users-header">
        <h3>👥 User Management</h3>
        <div className="search-container">
          <input
            type="text"
            placeholder="Search users by name, email, or role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <span className="search-icon">🔍</span>
        </div>
      </div>
      {searchTerm && (
        <div className="search-results-info">
          Showing {filteredUsers.length} of {users.length} users
        </div>
      )}
      {isLoading ? (
        <div className="loading">Loading users...</div>
      ) : error ? (
        <div className="error">{error}</div>
      ) : (
        <div className="users-list">
          {filteredUsers.length === 0 ? (
            <div className="no-results">
              {searchTerm ? `No users found matching "${searchTerm}"` : 'No users found'}
            </div>
          ) : (
            filteredUsers.map(userItem => (
              <div key={userItem._id} className="user-card">
                <div className="user-info">
                  <h4>{userItem.username}</h4>
                  <p>Email: {userItem.email}</p>
                  <p>Role: <span className={`role-badge ${userItem.role}`}>{userItem.role}</span></p>
                  <p>Created: {new Date(userItem.created_at).toLocaleDateString()}</p>
                  {userItem.last_login && (
                    <p>Last Login: {new Date(userItem.last_login).toLocaleDateString()}</p>
                  )}
                  <p>Sessions: {stats?.recent_sessions?.filter(s => s.user_id === userItem._id).length || 0}</p>
                </div>
                <div className="user-actions">
                  <button
                    className="delete-user-btn"
                    onClick={() => handleDeleteUser(userItem._id, userItem.username)}
                    title="Delete user"
                    disabled={userItem.role === 'admin'}
                  >
                    🗑️ Delete {userItem.role === 'admin' ? '(Protected)' : ''}
                  </button>
                  {userItem.role !== 'admin' ? (
                    <button
                      className="promote-user-btn"
                      onClick={() => handleToggleAdmin(userItem._id, false, userItem.username)}
                      title="Promote to Admin"
                    >
                      👑 Make Admin
                    </button>
                  ) : (
                    <button
                      className="demote-user-btn"
                      onClick={() => handleToggleAdmin(userItem._id, true, userItem.username)}
                      title="Demote from Admin"
                      disabled={userItem._id === user._id}
                    >
                      👤 Demote Admin {userItem._id === user._id ? '(You)' : ''}
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="admin-panel-overlay" onClick={onClose}>
      <div className="admin-panel" onClick={(e) => e.stopPropagation()}>
        <div className="admin-panel-header">
          <h2>🔧 Admin Panel</h2>
          <button className="close-button" onClick={onClose}>close</button>
        </div>
        
        <div className="admin-panel-tabs">
          <button
            className={`tab-button ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            📊 Dashboard
          </button>
          <button
            className={`tab-button ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            👥 Users
          </button>
        </div>
        
        <div className="admin-panel-content">
          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'users' && renderUsers()}
        </div>
        
        <div className="admin-panel-footer">
          <p>Logged in as: <strong>{user.username}</strong> ({user.role})</p>
        </div>

        {/* Alert Modal */}
        <AlertModal
          isOpen={alertModal.isOpen}
          title={alertModal.title}
          message={alertModal.message}
          type={alertModal.type}
          onConfirm={alertModal.onConfirm}
          onCancel={alertModal.onCancel}
          confirmText={alertModal.confirmText}
          cancelText={alertModal.cancelText}
          showCancel={alertModal.showCancel}
        />
      </div>
    </div>
  );
};

export default AdminPanel; 