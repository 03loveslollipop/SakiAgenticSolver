import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import apiClient from '../services/api';
import './AgentMdEditor.css';

interface AgentMdEditorProps {
  sessionId: string;
}

const AgentMdEditor = ({ sessionId }: AgentMdEditorProps) => {
  const { t } = useTranslation();
  const [content, setContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadContent();
  }, [sessionId]);

  const loadContent = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getAgentMd(sessionId);
      setContent(data);
      setOriginalContent(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.failedToLoadAgentMd'));
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setEditing(true);
  };

  const handleCancel = () => {
    setContent(originalContent);
    setEditing(false);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await apiClient.updateAgentMd(sessionId, content);
      setOriginalContent(content);
      setEditing(false);
      alert(t('agentMdEditor.saveSuccessAlert'));
    } catch (err) {
      alert(err instanceof Error ? err.message : t('errors.failedToSaveAgentMd'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="agent-md-editor">
        <div className="loading">
          <div className="spinner" />
          <p>{t('agentMdEditor.loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="agent-md-editor">
        <div className="error-container">
          <p className="error-message">{error}</p>
          <button onClick={loadContent} className="btn btn-primary">
            {t('common.retry')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="agent-md-editor">
      <div className="editor-header">
        <div className="editor-title">
          <h3>{t('agentMdEditor.title')}</h3>
          <p>{t('agentMdEditor.subtitle')}</p>
        </div>
        <div className="editor-actions">
          {!editing ? (
            <button onClick={handleEdit} className="btn btn-primary">
              {t('common.edit')}
            </button>
          ) : (
            <>
              <button onClick={handleCancel} className="btn btn-secondary" disabled={saving}>
                {t('common.cancel')}
              </button>
              <button onClick={handleSave} className="btn btn-primary" disabled={saving}>
                {saving ? t('agentMdEditor.saving') : t('agentMdEditor.saveChanges')}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="editor-content">
        {editing ? (
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            className="editor-textarea"
            placeholder={t('agentMdEditor.placeholder')}
          />
        ) : (
          <pre className="editor-preview">{content || t('agentMdEditor.noContent')}</pre>
        )}
      </div>

      {editing && (
        <div className="editor-info">
          <p>
            <strong>{t('auth.note.title')}</strong> {t('agentMdEditor.editingNote')}
          </p>
        </div>
      )}
    </div>
  );
};

export default AgentMdEditor;
