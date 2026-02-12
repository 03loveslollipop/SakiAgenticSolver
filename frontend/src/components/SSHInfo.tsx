import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import apiClient from '../services/api';
import { SSHConnectionInfo } from '../types';
import './SSHInfo.css';

interface SSHInfoProps {
  sessionId: string;
}

const SSHInfo = ({ sessionId }: SSHInfoProps) => {
  const { t } = useTranslation();
  const [sshInfo, setSSHInfo] = useState<SSHConnectionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    loadSSHInfo();
  }, [sessionId]);

  const loadSSHInfo = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getSSHInfo(sessionId);
      setSSHInfo(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.failedToLoadSshInfo'));
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadKey = async () => {
    try {
      setDownloading(true);
      const blob = await apiClient.downloadSSHKey(sessionId);

      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `ssh-key-${sessionId.substring(0, 8)}.pub`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : t('errors.failedToDownloadSshKey'));
    } finally {
      setDownloading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(
      () => {
        alert(t('sshInfo.copied'));
      },
      () => {
        alert(t('sshInfo.copyFailed'));
      }
    );
  };

  if (loading) {
    return (
      <div className="ssh-info">
        <div className="loading">
          <div className="spinner" />
          <p>{t('sshInfo.loading')}</p>
        </div>
      </div>
    );
  }

  if (error || !sshInfo) {
    return (
      <div className="ssh-info">
        <div className="error-container">
          <p className="error-message">{error || t('sshInfo.notAvailable')}</p>
          <button onClick={loadSSHInfo} className="btn btn-primary">
            {t('common.retry')}
          </button>
        </div>
      </div>
    );
  }

  const sshCommand = `ssh ${sshInfo.username}@${sshInfo.hostname} -p ${sshInfo.port}`;

  return (
    <div className="ssh-info">
      <div className="ssh-info-header">
        <h3>{t('sshInfo.title')}</h3>
        <p>{t('sshInfo.subtitle')}</p>
      </div>

      <div className="ssh-info-content">
        <div className="info-card">
          <div className="info-row">
            <span className="info-label">{t('sshInfo.labels.hostname')}</span>
            <div className="info-value-group">
              <code className="info-value">{sshInfo.hostname}</code>
              <button
                onClick={() => copyToClipboard(sshInfo.hostname)}
                className="btn btn-small btn-secondary"
              >
                {t('common.copy')}
              </button>
            </div>
          </div>

          <div className="info-row">
            <span className="info-label">{t('sshInfo.labels.port')}</span>
            <div className="info-value-group">
              <code className="info-value">{sshInfo.port}</code>
              <button
                onClick={() => copyToClipboard(sshInfo.port.toString())}
                className="btn btn-small btn-secondary"
              >
                {t('common.copy')}
              </button>
            </div>
          </div>

          <div className="info-row">
            <span className="info-label">{t('sshInfo.labels.username')}</span>
            <div className="info-value-group">
              <code className="info-value">{sshInfo.username}</code>
              <button
                onClick={() => copyToClipboard(sshInfo.username)}
                className="btn btn-small btn-secondary"
              >
                {t('common.copy')}
              </button>
            </div>
          </div>
        </div>

        <div className="ssh-command-section">
          <h4>{t('sshInfo.commandTitle')}</h4>
          <div className="command-box">
            <code>{sshCommand}</code>
            <button
              onClick={() => copyToClipboard(sshCommand)}
              className="btn btn-small btn-secondary"
            >
              {t('sshInfo.copyCommand')}
            </button>
          </div>
        </div>

        <div className="ssh-key-section">
          <h4>{t('sshInfo.publicKeyTitle')}</h4>
          <p>{t('sshInfo.publicKeyDescription')}</p>
          <button
            onClick={handleDownloadKey}
            className="btn btn-primary"
            disabled={downloading}
          >
            {downloading ? t('sshInfo.downloadingKey') : t('sshInfo.downloadKey')}
          </button>
        </div>

        <div className="ssh-instructions">
          <h4>{t('sshInfo.instructionsTitle')}</h4>
          <ol>
            <li>{t('sshInfo.instructions.step1')}</li>
            <li>{t('sshInfo.instructions.step2')}</li>
            <li>{t('sshInfo.instructions.step3')}</li>
            <li>
              {t('sshInfo.instructions.step4Prefix')}{' '}
              <code>ssh -i ~/.ssh/key-file {sshInfo.username}@{sshInfo.hostname} -p {sshInfo.port}</code>
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default SSHInfo;
