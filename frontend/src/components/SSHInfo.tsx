import { useState, useEffect } from 'react';
import { SSHConnectionInfo } from '../types';
import apiClient from '../services/api';
import './SSHInfo.css';

interface SSHInfoProps {
  sessionId: string;
}

const SSHInfo = ({ sessionId }: SSHInfoProps) => {
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
      setError(err instanceof Error ? err.message : 'Failed to load SSH info');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadKey = async () => {
    try {
      setDownloading(true);
      const blob = await apiClient.downloadSSHKey(sessionId);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ssh-key-${sessionId.substring(0, 8)}.pub`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to download SSH key');
    } finally {
      setDownloading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(
      () => {
        alert('Copied to clipboard!');
      },
      () => {
        alert('Failed to copy to clipboard');
      }
    );
  };

  if (loading) {
    return (
      <div className="ssh-info">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading SSH information...</p>
        </div>
      </div>
    );
  }

  if (error || !sshInfo) {
    return (
      <div className="ssh-info">
        <div className="error-container">
          <p className="error-message">{error || 'SSH info not available'}</p>
          <button onClick={loadSSHInfo} className="btn btn-primary">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const sshCommand = `ssh ${sshInfo.username}@${sshInfo.hostname} -p ${sshInfo.port}`;

  return (
    <div className="ssh-info">
      <div className="ssh-info-header">
        <h3>SSH Connection Information</h3>
        <p>Use these credentials to connect to your VM via SSH</p>
      </div>

      <div className="ssh-info-content">
        <div className="info-card">
          <div className="info-row">
            <span className="info-label">Hostname:</span>
            <div className="info-value-group">
              <code className="info-value">{sshInfo.hostname}</code>
              <button
                onClick={() => copyToClipboard(sshInfo.hostname)}
                className="btn btn-small btn-secondary"
              >
                Copy
              </button>
            </div>
          </div>

          <div className="info-row">
            <span className="info-label">Port:</span>
            <div className="info-value-group">
              <code className="info-value">{sshInfo.port}</code>
              <button
                onClick={() => copyToClipboard(sshInfo.port.toString())}
                className="btn btn-small btn-secondary"
              >
                Copy
              </button>
            </div>
          </div>

          <div className="info-row">
            <span className="info-label">Username:</span>
            <div className="info-value-group">
              <code className="info-value">{sshInfo.username}</code>
              <button
                onClick={() => copyToClipboard(sshInfo.username)}
                className="btn btn-small btn-secondary"
              >
                Copy
              </button>
            </div>
          </div>
        </div>

        <div className="ssh-command-section">
          <h4>SSH Command</h4>
          <div className="command-box">
            <code>{sshCommand}</code>
            <button
              onClick={() => copyToClipboard(sshCommand)}
              className="btn btn-small btn-secondary"
            >
              Copy Command
            </button>
          </div>
        </div>

        <div className="ssh-key-section">
          <h4>SSH Public Key</h4>
          <p>Download the SSH public key to authenticate with the VM</p>
          <button
            onClick={handleDownloadKey}
            className="btn btn-primary"
            disabled={downloading}
          >
            {downloading ? 'Downloading...' : 'Download SSH Key'}
          </button>
        </div>

        <div className="ssh-instructions">
          <h4>Connection Instructions</h4>
          <ol>
            <li>Download the SSH public key using the button above</li>
            <li>Save the key to your <code>~/.ssh/</code> directory</li>
            <li>Set appropriate permissions: <code>chmod 600 ~/.ssh/key-file</code></li>
            <li>
              Connect using: <code>ssh -i ~/.ssh/key-file {sshInfo.username}@{sshInfo.hostname} -p {sshInfo.port}</code>
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default SSHInfo;
