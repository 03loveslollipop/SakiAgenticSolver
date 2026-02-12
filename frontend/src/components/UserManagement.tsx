// User Management component (admin only)
import React, { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
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
  const { t, i18n } = useTranslation();
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
      setError(err instanceof Error ? err.message : t('errors.failedToLoadUsers'));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (event: React.FormEvent) => {
    event.preventDefault();
    setCreateError(null);
    setCreateLoading(true);

    try {
      const currentLocale = i18n.language as 'en' | 'ja' | 'es';
      const response = await apiClient.createUser({
        email: createEmail,
        role: createRole,
        locale: currentLocale,
      });
      setSuccessMessage(response.message || t('userManagement.success.userCreated'));
      setShowCreateModal(false);
      setCreateEmail('');
      setCreateRole('user');
      await loadUsers();
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : t('errors.failedToCreateUser'));
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDisableUser = async (userId: string, userEmail: string) => {
    if (!window.confirm(t('userManagement.confirm.disableUser', { email: userEmail }))) {
      return;
    }

    try {
      await apiClient.disableUser(userId);
      setSuccessMessage(t('userManagement.success.userDisabled', { email: userEmail }));
      await loadUsers();
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.failedToDisableUser'));
    }
  };

  const handleToggleRole = async (userId: string, currentRole: UserRole, userEmail: string) => {
    const newRole: UserRole = currentRole === 'admin' ? 'user' : 'admin';

    if (
      !window.confirm(
        t('userManagement.confirm.changeRole', {
          email: userEmail,
          currentRole: t(`userManagement.roles.${currentRole}`),
          newRole: t(`userManagement.roles.${newRole}`),
        })
      )
    ) {
      return;
    }

    try {
      await apiClient.updateUser(userId, { role: newRole });
      setSuccessMessage(
        t('userManagement.success.roleUpdated', {
          email: userEmail,
          role: t(`userManagement.roles.${newRole}`),
        })
      );
      await loadUsers();
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.failedToUpdateUserRole'));
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return t('common.never');
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  if (loading) {
    return (
      <div className="user-management">
        <div className="loading">
          <div className="spinner" />
          <p>{t('userManagement.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="user-management">
      <div className="user-management-header">
        <div>
          <h2>{t('userManagement.title')}</h2>
          <p className="subtitle">{t('userManagement.subtitle')}</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
          {t('userManagement.actions.createNewUser')}
        </button>
      </div>

      {error && (
        <div className="alert alert-error">
          <span className="alert-icon">!</span>
          {error}
          <button onClick={() => setError(null)} className="alert-close">
            X
          </button>
        </div>
      )}

      {successMessage && (
        <div className="alert alert-success">
          <span className="alert-icon" aria-hidden="true"><Check size={14} /></span>
          {successMessage}
          <button onClick={() => setSuccessMessage(null)} className="alert-close">
            X
          </button>
        </div>
      )}

      <div className="users-table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>{t('userManagement.table.email')}</th>
              <th>{t('userManagement.table.role')}</th>
              <th>{t('userManagement.table.twoFactorStatus')}</th>
              <th>{t('userManagement.table.status')}</th>
              <th>{t('userManagement.table.created')}</th>
              <th>{t('userManagement.table.lastLogin')}</th>
              <th>{t('userManagement.table.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {users.map((userData) => (
              <tr key={userData.id} className={!userData.is_active ? 'user-disabled' : ''}>
                <td className="user-email">{userData.email}</td>
                <td>
                  <span className={`role-badge role-${userData.role}`}>
                    {t(`userManagement.roles.${userData.role}`)}
                  </span>
                </td>
                <td>
                  <span className={`status-badge ${userData.is_2fa_enabled ? 'status-enabled' : 'status-disabled'}`}>
                    {userData.is_2fa_enabled
                      ? t('userManagement.status.twoFactorEnabled')
                      : t('userManagement.status.twoFactorNotSetUp')}
                  </span>
                </td>
                <td>
                  <span className={`status-badge ${userData.is_active ? 'status-active' : 'status-inactive'}`}>
                    {userData.is_active
                      ? t('userManagement.status.active')
                      : t('userManagement.status.disabled')}
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
                        title={t('userManagement.actions.changeRoleTitle', {
                          role: t(
                            `userManagement.roles.${userData.role === 'admin' ? 'user' : 'admin'}`
                          ),
                        })}
                      >
                        {userData.role === 'admin'
                          ? t('userManagement.actions.makeUser')
                          : t('userManagement.actions.makeAdmin')}
                      </button>
                      <button
                        onClick={() => handleDisableUser(userData.id, userData.email)}
                        className="btn btn-small btn-danger"
                        title={t('userManagement.actions.disableUser')}
                      >
                        {t('userManagement.actions.disable')}
                      </button>
                    </>
                  )}
                  {userData.id === user?.id && (
                    <span className="current-user-label">{t('userManagement.currentUser')}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h3>{t('userManagement.createModal.title')}</h3>
              <button onClick={() => setShowCreateModal(false)} className="modal-close">
                X
              </button>
            </div>

            {createError && (
              <div className="alert alert-error">
                <span className="alert-icon">!</span>
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="create-user-form">
              <div className="form-group">
                <label htmlFor="email">{t('userManagement.createModal.emailLabel')}</label>
                <input
                  type="email"
                  id="email"
                  value={createEmail}
                  onChange={(event) => setCreateEmail(event.target.value)}
                  required
                  placeholder={t('userManagement.createModal.emailPlaceholder')}
                  disabled={createLoading}
                />
                <p className="form-help">{t('userManagement.createModal.emailHelp')}</p>
              </div>

              <div className="form-group">
                <label htmlFor="role">{t('userManagement.createModal.roleLabel')}</label>
                <select
                  id="role"
                  value={createRole}
                  onChange={(event) => setCreateRole(event.target.value as UserRole)}
                  disabled={createLoading}
                >
                  <option value="user">{t('userManagement.roles.user')}</option>
                  <option value="admin">{t('userManagement.roles.admin')}</option>
                </select>
                <p className="form-help">{t('userManagement.createModal.roleHelp')}</p>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn btn-secondary"
                  disabled={createLoading}
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={createLoading}
                >
                  {createLoading
                    ? t('userManagement.actions.creating')
                    : t('userManagement.actions.createUser')}
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
