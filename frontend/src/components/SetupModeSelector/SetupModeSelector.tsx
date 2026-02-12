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

  const modes: Array<{ id: SetupMode; icon: string; title: string; description: string }> = [
    {
      id: 'gemini',
      icon: '[AI]',
      title: t('vm.create.setupModeGemini'),
      description: t('vm.create.setupModeGeminiDesc'),
    },
    {
      id: 'manual',
      icon: '[M]',
      title: t('vm.create.setupModeManual'),
      description: t('vm.create.setupModeManualDesc'),
    },
  ];

  return (
    <div className="setup-mode-selector">
      <div className="modes-grid">
        {modes.map((mode) => (
          <button
            key={mode.id}
            type="button"
            onClick={() => onChange(mode.id)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onChange(mode.id);
              }
            }}
            className={`mode-button ${value === mode.id ? 'selected' : ''} focus:outline-none focus:ring-2 focus:ring-accent-cyan focus:ring-offset-2`}
            aria-pressed={value === mode.id}
            tabIndex={0}
          >
            <div className="mode-content">
              <span className="mode-icon">{mode.icon}</span>
              <span className="mode-title">{mode.title}</span>
              <span className="mode-desc">{mode.description}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default SetupModeSelector;
