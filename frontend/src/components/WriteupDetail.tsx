import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Writeup } from '../types';
import apiClient from '../services/api';
import './WriteupDetail.css';

const WriteupDetail = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [writeup, setWriteup] = useState<Writeup | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (sessionId) {
      loadWriteup();
    }
  }, [sessionId]);

  const loadWriteup = async () => {
    if (!sessionId) return;

    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getWriteup(sessionId);
      setWriteup(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load writeup');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/writeups');
  };

  const handleViewSession = () => {
    if (sessionId) {
      navigate(`/sessions/${sessionId}`);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  if (loading) {
    return (
      <div className="writeup-detail">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading writeup...</p>
        </div>
      </div>
    );
  }

  if (error || !writeup) {
    return (
      <div className="writeup-detail">
        <div className="error-container">
          <h2>Error Loading Writeup</h2>
          <p className="error-message">{error || 'Writeup not found'}</p>
          <button onClick={handleBack} className="btn btn-primary">
            Back to Writeups
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="writeup-detail">
      {/* Header */}
      <div className="detail-header">
        <div className="header-left">
          <button onClick={handleBack} className="btn btn-secondary btn-small">
            ← Back to Writeups
          </button>
          <h2>Writeup - Session {writeup.sessionId.substring(0, 8)}</h2>
        </div>
        <button onClick={handleViewSession} className="btn btn-primary">
          View Session
        </button>
      </div>

      {/* Metadata */}
      <div className="metadata-section">
        <div className="metadata-grid">
          {writeup.category && (
            <div className="metadata-item">
              <span className="metadata-label">Category:</span>
              <span className={`category-badge category-${writeup.category}`}>
                {writeup.category}
              </span>
            </div>
          )}
          <div className="metadata-item">
            <span className="metadata-label">Agent:</span>
            <span className="metadata-value">
              {writeup.agentType} ({writeup.agentModel})
            </span>
          </div>
          <div className="metadata-item">
            <span className="metadata-label">Completed:</span>
            <span className="metadata-value">{formatDate(writeup.completionTimestamp)}</span>
          </div>
          <div className="metadata-item">
            <span className="metadata-label">Session ID:</span>
            <span className="metadata-value">{writeup.sessionId}</span>
          </div>
        </div>

        {writeup.technologies.length > 0 && (
          <div className="technologies-section">
            <span className="metadata-label">Technologies & Techniques:</span>
            <div className="tech-tags">
              {writeup.technologies.map((tech, idx) => (
                <span key={idx} className="tech-tag">
                  {tech}
                </span>
              ))}
            </div>
          </div>
        )}

        {writeup.challengeUrls.length > 0 && (
          <div className="challenges-section">
            <span className="metadata-label">Challenge Files:</span>
            <ul className="challenge-urls">
              {writeup.challengeUrls.map((url, idx) => (
                <li key={idx}>
                  <a href={url} target="_blank" rel="noopener noreferrer">
                    {url}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="content-section">
        <h3>Writeup Content</h3>
        <div className="content-container">
          <pre className="writeup-content">{writeup.content}</pre>
        </div>
      </div>
    </div>
  );
};

export default WriteupDetail;
