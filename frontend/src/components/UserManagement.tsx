// User Management component (admin only)
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import apiClient from '../services/api';
import { UserRole } from '../types';
import './UserManagement.css';

interface UserData {
  id: string;
  email: string;
  role: UserRole;
  is_2fa_enabled: boolean;
  is_active: boolean;
  created_at: string;
  last_login: string | null;
  created_by: string | null;
}

const UserManagement: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createEmail, setCreateEmail] = useState('');
  const [createRole, setCreateRole] = useState<UserRole>('user');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Redirect if not admin
  useEffect(() => {
    if (user && user.role !== 'admin') {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.getUsers();
      setUsers(response.users);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setCreateLoading(true);

    try {
      const response = await apiClient.createUser({ email: createEmail, role: createRole });
      setSuccessMessage(response.message);
      setShowCreateModal(false);
      setCreateEmail('');
      setCreateRole('user');
      await loadUsers();
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDisableUser = async (userId: string, userEmail: string) => {
    if (!window.confirm(`Are you sure you want to disable user ${userEmail}?`)) {
      return;
    }

    try {
      await apiClient.disableUser(userId);
      setSuccessMessage(`User ${userEmail} has been disabled`);
      await loadUsers();
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disable user');
    }
  };

  const handleToggleRole = async (userId: string, currentRole: UserRole, userEmail: string) => {
    const newRole: UserRole = currentRole === 'admin' ? 'user' : 'admin';
    
    if (!window.confirm(`Change ${userEmail} role from ${currentRole} to ${newRole}?`)) {
      return;
    }

    try {
      await apiClient.updateUser(userId, { role: newRole });
      setSuccessMessage(`User ${userEmail} role updated to ${newRole}`);
      await loadUsers();
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user role');
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  if (loading) {
    return (
      <div className="user-management">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="user-management">
      <div className="user-management-header">
        <div>
          <h2>User Management</h2>
          <p className="subtitle">Manage user accounts and permissions</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
          Create New User
        </button>
      </div>

      {error && (
        <div className="alert alert-error">
          <span className="alert-icon">⚠️</span>
          {error}
          <button onClick={() => setError(null)} className="alert-close">×</button>
        </div>
      )}

      {successMessage && (
        <div className="alert alert-success">
          <span className="alert-icon">✓</span>
          {successMessage}
          <button onClick={() => setSuccessMessage(null)} className="alert-close">×</button>
        </div>
      )}

      <div className="users-table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Role</th>
              <th>2FA Status</th>
              <th>Status</th>
              <th>Created</th>
              <th>Last Login</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((userData) => (
              <tr key={userData.id} className={!userData.is_active ? 'user-disabled' : ''}>
                <td className="user-email">{userData.email}</td>
                <td>
                  <span className={`role-badge role-${userData.role}`}>
                    {userData.role}
                  </span>
                </td>
                <td>
                  <span className={`status-badge ${userData.is_2fa_enabled ? 'status-enabled' : 'status-disabled'}`}>
                    {userData.is_2fa_enabled ? 'Enabled' : 'Not Set Up'}
                  </span>
                </td>
                <td>
                  <span className={`status-badge ${userData.is_active ? 'status-active' : 'status-inactive'}`}>
                    {userData.is_active ? 'Active' : 'Disabled'}
                  </span>
                </td>
                <td className="date-cell">{formatDate(userData.created_at)}</td>
                <td className="date-cell">{formatDate(userData.last_login)}</td>
                <td className="actions-cell">
                  {userData.is_active && userData.id !== user?.id && (
                    <>
                      <button
                        onClick={() => handleToggleRole(userData.id, userData.role, userData.email)}
                        className="btn btn-small btn-secondary"
                        title={`Change role to ${userData.role === 'admin' ? 'user' : 'admin'}`}
                      >
                        {userData.role === 'admin' ? '→ User' : '→ Admin'}
                      </button>
                      <button
                        onClick={() => handleDisableUser(userData.id, userData.email)}
                        className="btn btn-small btn-danger"
                        title="Disable user"
                      >
                        Disable
                      </button>
                    </>
                  )}
                  {userData.id === user?.id && (
                    <span className="current-user-label">You</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create New User</h3>
              <button onClick={() => setShowCreateModal(false)} className="modal-close">×</button>
            </div>

            {createError && (
              <div className="alert alert-error">
                <span className="alert-icon">⚠️</span>
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="create-user-form">
              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <input
                  type="email"
                  id="email"
                  value={createEmail}
                  onChange={(e) => setCreateEmail(e.target.value)}
                  required
                  placeholder="user@example.com"
                  disabled={createLoading}
                />
                <p className="form-help">
                  A temporary password will be generated and sent to this email address.
                </p>
              </div>

              <div className="form-group">
                <label htmlFor="role">Role</label>
                <select
                  id="role"
                  value={createRole}
                  onChange={(e) => setCreateRole(e.target.value as UserRole)}
                  disabled={createLoading}
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
                <p className="form-help">
                  Admins can manage users and have full access to all features.
                </p>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn btn-secondary"
                  disabled={createLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={createLoading}
                >
                  {createLoading ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
