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
      icon: '🤖',
      title: t('vm.create.setupModeGemini') || 'Gemini CLI',
      description: t('vm.create.setupModeGeminiDesc') || 'Pre-configured with Gemini CLI for AI-powered development'
    },
    { 
      id: 'manual', 
      icon: '🔧',
      title: t('vm.create.setupModeManual') || 'Manual',
      description: t('vm.create.setupModeManualDesc') || 'Basic tools and SSH access - configure your own environment'
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
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
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
