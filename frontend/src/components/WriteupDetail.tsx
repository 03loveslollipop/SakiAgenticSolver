import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import apiClient from '../services/api';
import { Writeup } from '../types';
import './WriteupDetail.css';

const WriteupDetail = () => {
  const { t } = useTranslation();
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
      setError(err instanceof Error ? err.message : t('errors.failedToLoadWriteup'));
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
          <div className="spinner" />
          <p>{t('writeupDetail.loading')}</p>
        </div>
      </div>
    );
  }

  if (error || !writeup) {
    return (
      <div className="writeup-detail">
        <div className="error-container">
          <h2>{t('writeupDetail.errorTitle')}</h2>
          <p className="error-message">{error || t('writeupDetail.notFound')}</p>
          <button onClick={handleBack} className="btn btn-primary">
            {t('writeupDetail.backToWriteups')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="writeup-detail">
      <div className="detail-header">
        <div className="header-left">
          <button onClick={handleBack} className="btn btn-secondary btn-small">
            {t('writeupDetail.backToWriteups')}
          </button>
          <h2>{t('writeupDetail.title', { id: writeup.sessionId.substring(0, 8) })}</h2>
        </div>
        <button onClick={handleViewSession} className="btn btn-primary">
          {t('writeupDetail.viewSession')}
        </button>
      </div>

      <div className="metadata-section">
        <div className="metadata-grid">
          {writeup.category && (
            <div className="metadata-item">
              <span className="metadata-label">{t('writeupDetail.metadata.category')}</span>
              <span className={`category-badge category-${writeup.category}`}>
                {t(`writeups.categories.${writeup.category}`)}
              </span>
            </div>
          )}
          <div className="metadata-item">
            <span className="metadata-label">{t('writeupDetail.metadata.agent')}</span>
            <span className="metadata-value">
              {writeup.agentType} ({writeup.agentModel})
            </span>
          </div>
          <div className="metadata-item">
            <span className="metadata-label">{t('writeupDetail.metadata.completed')}</span>
            <span className="metadata-value">{formatDate(writeup.completionTimestamp)}</span>
          </div>
          <div className="metadata-item">
            <span className="metadata-label">{t('writeupDetail.metadata.sessionId')}</span>
            <span className="metadata-value">{writeup.sessionId}</span>
          </div>
        </div>

        {writeup.technologies.length > 0 && (
          <div className="technologies-section">
            <span className="metadata-label">{t('writeupDetail.metadata.technologies')}</span>
            <div className="tech-tags">
              {writeup.technologies.map((tech, index) => (
                <span key={index} className="tech-tag">
                  {tech}
                </span>
              ))}
            </div>
          </div>
        )}

        {writeup.challengeUrls.length > 0 && (
          <div className="challenges-section">
            <span className="metadata-label">{t('writeupDetail.metadata.challengeFiles')}</span>
            <ul className="challenge-urls">
              {writeup.challengeUrls.map((url, index) => (
                <li key={index}>
                  <a href={url} target="_blank" rel="noopener noreferrer">
                    {url}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="content-section">
        <h3>{t('writeupDetail.contentTitle')}</h3>
        <div className="content-container">
          <pre className="writeup-content">{writeup.content}</pre>
        </div>
      </div>
    </div>
  );
};

export default WriteupDetail;
