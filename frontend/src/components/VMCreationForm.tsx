import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { VMCreationRequest, VMSize, AgentType } from '../types';
import apiClient from '../services/api';
import './VMCreationForm.css';

interface FormErrors {
  challengeUrls?: string;
  instructions?: string;
  agentType?: string;
  agentModel?: string;
  vmSize?: string;
}

const VMCreationForm = () => {
  const navigate = useNavigate();
  const [challengeUrls, setChallengeUrls] = useState<string[]>(['']);
  const [instructions, setInstructions] = useState('');
  const [agentType, setAgentType] = useState<AgentType>('codex');
  const [agentModel, setAgentModel] = useState('gpt-4');
  const [vmSize, setVmSize] = useState<VMSize>('small');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const addUrlField = () => {
    setChallengeUrls([...challengeUrls, '']);
  };

  const removeUrlField = (index: number) => {
    const newUrls = challengeUrls.filter((_, i) => i !== index);
    setChallengeUrls(newUrls.length > 0 ? newUrls : ['']);
  };

  const updateUrl = (index: number, value: string) => {
    const newUrls = [...challengeUrls];
    newUrls[index] = value;
    setChallengeUrls(newUrls);
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Validate challenge URLs
    const validUrls = challengeUrls.filter((url) => url.trim() !== '');
    if (validUrls.length === 0) {
      newErrors.challengeUrls = 'At least one challenge URL is required';
    } else {
      // Validate URL format
      const urlPattern = /^https?:\/\/.+/;
      const invalidUrls = validUrls.filter((url) => !urlPattern.test(url));
      if (invalidUrls.length > 0) {
        newErrors.challengeUrls = 'All URLs must start with http:// or https://';
      }
    }

    // Validate instructions
    if (!instructions.trim()) {
      newErrors.instructions = 'Challenge instructions are required';
    }

    // Validate agent type
    if (!agentType) {
      newErrors.agentType = 'Agent type is required';
    }

    // Validate agent model
    if (!agentModel.trim()) {
      newErrors.agentModel = 'Agent model is required';
    }

    // Validate VM size
    if (!vmSize) {
      newErrors.vmSize = 'VM size is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!validateForm()) {
      return;
    }

    try {
      setSubmitting(true);
      const validUrls = challengeUrls.filter((url) => url.trim() !== '');

      const request: VMCreationRequest = {
        challengeUrls: validUrls,
        instructions: instructions.trim(),
        agentType,
        agentModel: agentModel.trim(),
        vmSize,
      };

      const session = await apiClient.createSession(request);
      navigate(`/sessions/${session.id}`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to create VM');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate('/dashboard');
  };

  return (
    <div className="vm-creation-form-container">
      <div className="form-header">
        <h2>Create New VM Session</h2>
        <p>Configure a new Azure VM for CTF challenge solving</p>
      </div>

      <form onSubmit={handleSubmit} className="vm-creation-form">
        {/* Challenge URLs */}
        <div className="form-section">
          <label className="form-label">
            Challenge File URLs *
            {errors.challengeUrls && (
              <span className="error-text">{errors.challengeUrls}</span>
            )}
          </label>
          {challengeUrls.map((url, index) => (
            <div key={index} className="url-input-group">
              <input
                type="text"
                value={url}
                onChange={(e) => updateUrl(index, e.target.value)}
                placeholder="https://example.com/challenge.bin"
                className={`form-input ${errors.challengeUrls ? 'input-error' : ''}`}
              />
              {challengeUrls.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeUrlField(index)}
                  className="btn btn-danger btn-small"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
          <button type="button" onClick={addUrlField} className="btn btn-secondary btn-small">
            Add Another URL
          </button>
        </div>

        {/* Instructions */}
        <div className="form-section">
          <label className="form-label">
            Challenge Instructions *
            {errors.instructions && (
              <span className="error-text">{errors.instructions}</span>
            )}
          </label>
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Describe the challenge and any specific instructions for the agent..."
            rows={6}
            className={`form-textarea ${errors.instructions ? 'input-error' : ''}`}
          />
        </div>

        {/* Agent Type */}
        <div className="form-section">
          <label className="form-label">
            Agent Type *
            {errors.agentType && <span className="error-text">{errors.agentType}</span>}
          </label>
          <select
            value={agentType}
            onChange={(e) => setAgentType(e.target.value as AgentType)}
            className={`form-select ${errors.agentType ? 'input-error' : ''}`}
          >
            <option value="codex">Codex</option>
            <option value="copilot">Copilot</option>
          </select>
        </div>

        {/* Agent Model */}
        <div className="form-section">
          <label className="form-label">
            Agent Model *
            {errors.agentModel && <span className="error-text">{errors.agentModel}</span>}
          </label>
          <input
            type="text"
            value={agentModel}
            onChange={(e) => setAgentModel(e.target.value)}
            placeholder="e.g., gpt-4, gpt-3.5-turbo"
            className={`form-input ${errors.agentModel ? 'input-error' : ''}`}
          />
        </div>

        {/* VM Size */}
        <div className="form-section">
          <label className="form-label">
            VM Size *
            {errors.vmSize && <span className="error-text">{errors.vmSize}</span>}
          </label>
          <div className="radio-group">
            <label className="radio-label">
              <input
                type="radio"
                value="small"
                checked={vmSize === 'small'}
                onChange={(e) => setVmSize(e.target.value as VMSize)}
              />
              <span className="radio-text">
                <strong>Small</strong> - 2 CPU cores, 2GB RAM, 30GB disk
              </span>
            </label>
            <label className="radio-label">
              <input
                type="radio"
                value="medium"
                checked={vmSize === 'medium'}
                onChange={(e) => setVmSize(e.target.value as VMSize)}
              />
              <span className="radio-text">
                <strong>Medium</strong> - 2 CPU cores, 4GB RAM, 30GB disk
              </span>
            </label>
            <label className="radio-label">
              <input
                type="radio"
                value="large"
                checked={vmSize === 'large'}
                onChange={(e) => setVmSize(e.target.value as VMSize)}
              />
              <span className="radio-text">
                <strong>Large</strong> - 2 CPU cores, 8GB RAM, 30GB disk
              </span>
            </label>
          </div>
        </div>

        {/* Submit Error */}
        {submitError && (
          <div className="form-error">
            <p>{submitError}</p>
          </div>
        )}

        {/* Form Actions */}
        <div className="form-actions">
          <button
            type="button"
            onClick={handleCancel}
            className="btn btn-secondary"
            disabled={submitting}
          >
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Creating VM...' : 'Create VM'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default VMCreationForm;
