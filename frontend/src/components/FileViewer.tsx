import { useState, useEffect, useRef } from 'react';
import apiClient from '../services/api';
import './FileViewer.css';

interface FileViewerProps {
  sessionId: string;
  fileType: 'base-prompt' | 'tools-md' | 'changelog' | 'discoveries';
  title: string;
  description: string;
  autoRefresh?: boolean;
}

const FileViewer = ({
  sessionId,
  fileType,
  title,
  description,
  autoRefresh = false,
}: FileViewerProps) => {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(autoRefresh);
  const refreshIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    loadContent();

    // Set up auto-refresh if enabled
    if (autoRefreshEnabled) {
      refreshIntervalRef.current = setInterval(() => {
        loadContent(true); // Silent refresh
      }, 5000); // Refresh every 5 seconds
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [sessionId, fileType, autoRefreshEnabled]);

  const loadContent = async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      setError(null);

      let data: string;
      switch (fileType) {
        case 'base-prompt':
          data = await apiClient.getBasePrompt(sessionId);
          break;
        case 'tools-md':
          data = await apiClient.getToolsMd(sessionId);
          break;
        case 'changelog':
          data = await apiClient.getChangelog(sessionId);
          break;
        case 'discoveries':
          data = await apiClient.getDiscoveries(sessionId);
          break;
        default:
          throw new Error('Unknown file type');
      }

      setContent(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to load ${fileType}`);
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  const handleRefresh = () => {
    loadContent();
  };

  const toggleAutoRefresh = () => {
    setAutoRefreshEnabled(!autoRefreshEnabled);
  };

  if (loading) {
    return (
      <div className="file-viewer">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading {title}...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="file-viewer">
        <div className="error-container">
          <p className="error-message">{error}</p>
          <button onClick={handleRefresh} className="btn btn-primary">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="file-viewer">
      <div className="viewer-header">
        <div className="viewer-title">
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
        <div className="viewer-actions">
          {autoRefresh && (
            <label className="auto-refresh-toggle">
              <input
                type="checkbox"
                checked={autoRefreshEnabled}
                onChange={toggleAutoRefresh}
              />
              <span>Auto-refresh</span>
            </label>
          )}
          <button onClick={handleRefresh} className="btn btn-secondary btn-small">
            Refresh
          </button>
        </div>
      </div>

      <div className="viewer-content">
        <pre className="viewer-text">{content || 'No content yet.'}</pre>
      </div>
    </div>
  );
};

export default FileViewer;
