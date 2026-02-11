import React from 'react';
import { useTranslation } from 'react-i18next';
import './SetupModeSelector.css';

export type SetupMode = 'gemini' | 'manual';

export interface SetupModeSelectorProps {
  value: SetupMode;
  onChange: (mode: SetupMode) => void;
}

export const SetupModeSelector: React.FC<SetupModeSelectorProps> = ({
  value,
  onChange,
}) => {
  const { t } = useTranslation();

  const modes: Array<{ id: SetupMode; icon: string }> = [
    { id: 'gemini', icon: '🤖' },
    { id: 'manual', icon: '🔧' },
  ];

  return (
    <div className="setup-mode-selector">
      <label className="form-label">{t('vm.create.setupMode') || 'Setup Mode'}</label>
      <div className="modes-grid">
        {modes.map((mode) => (
          <button
            key={mode.id}
            type="button"
            onClick={() => onChange(mode.id)}
            className={`mode-button ${value === mode.id ? 'selected' : ''}`}
          >
            <div className="mode-content">
              <span className="mode-icon">{mode.icon}</span>
              <span className="mode-title">{t(`vm.create.setupMode${mode.id.charAt(0).toUpperCase() + mode.id.slice(1)}`) || mode.id}</span>
              <span className="mode-desc">{t(`vm.create.setupMode${mode.id.charAt(0).toUpperCase() + mode.id.slice(1)}Desc`) || ''}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default SetupModeSelector;
