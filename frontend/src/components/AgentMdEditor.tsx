import { useState, useEffect } from 'react';
import apiClient from '../services/api';
import './AgentMdEditor.css';

interface AgentMdEditorProps {
  sessionId: string;
}

const AgentMdEditor = ({ sessionId }: AgentMdEditorProps) => {
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
      setError(err instanceof Error ? err.message : 'Failed to load AGENT.md');
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
      alert('AGENT.md updated successfully! The agent has been notified of the changes.');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save AGENT.md');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="agent-md-editor">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading AGENT.md...</p>
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
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="agent-md-editor">
      <div className="editor-header">
        <div className="editor-title">
          <h3>AGENT.md</h3>
          <p>User-modifiable rules and preferences for the AI agent</p>
        </div>
        <div className="editor-actions">
          {!editing ? (
            <button onClick={handleEdit} className="btn btn-primary">
              Edit
            </button>
          ) : (
            <>
              <button onClick={handleCancel} className="btn btn-secondary" disabled={saving}>
                Cancel
              </button>
              <button onClick={handleSave} className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="editor-content">
        {editing ? (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="editor-textarea"
            placeholder="Enter agent rules and preferences..."
          />
        ) : (
          <pre className="editor-preview">{content || 'No content yet.'}</pre>
        )}
      </div>

      {editing && (
        <div className="editor-info">
          <p>
            <strong>Note:</strong> Changes to AGENT.md will be applied immediately and the agent
            will be notified of the configuration update.
          </p>
        </div>
      )}
    </div>
  );
};

export default AgentMdEditor;
