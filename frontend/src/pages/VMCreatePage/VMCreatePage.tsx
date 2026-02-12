import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { AppShell, Button, Container, Input, Loading } from '../../components';
import apiClient from '../../services/api';
import { AgentType, SetupMode, VMCreationRequest, VMSize } from '../../types';

type AgentPreset = 'manual' | 'codexCli' | 'copilotCli' | 'geminiCli' | 'mixtralVibeCli';

interface FormState {
  challengeUrls: string[];
  instructions: string;
  agentPreset: AgentPreset;
  agentType: AgentType;
  agentModel: string;
  vmSize: VMSize;
  deployAgent: boolean;
}

export const VMCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState<FormState>({
    challengeUrls: [''],
    instructions: '',
    agentPreset: 'codexCli',
    agentType: 'codex',
    agentModel: 'gpt-4',
    vmSize: 'small',
    deployAgent: true,
  });

  const vmSizeOptions: Array<{ value: VMSize; label: string; details: string }> = useMemo(
    () => [
      {
        value: 'small',
        label: t('vm.create.sizeOptions.small.label'),
        details: t('vm.create.sizeOptions.small.details'),
      },
      {
        value: 'medium',
        label: t('vm.create.sizeOptions.medium.label'),
        details: t('vm.create.sizeOptions.medium.details'),
      },
      {
        value: 'large',
        label: t('vm.create.sizeOptions.large.label'),
        details: t('vm.create.sizeOptions.large.details'),
      },
    ],
    [t]
  );

  const updateChallengeUrl = (index: number, value: string) => {
    setFormData((previous) => {
      const nextUrls = [...previous.challengeUrls];
      nextUrls[index] = value;
      return {
        ...previous,
        challengeUrls: nextUrls,
      };
    });
    setError('');
  };

  const addChallengeUrl = () => {
    setFormData((previous) => ({
      ...previous,
      challengeUrls: [...previous.challengeUrls, ''],
    }));
  };

  const removeChallengeUrl = (index: number) => {
    setFormData((previous) => {
      const nextUrls = previous.challengeUrls.filter((_, currentIndex) => currentIndex !== index);
      return {
        ...previous,
        challengeUrls: nextUrls.length > 0 ? nextUrls : [''],
      };
    });
    setError('');
  };

  const handleInputChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target;
    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
    setError('');
  };

  const handleAgentPresetChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const preset = event.target.value as AgentPreset;

    setFormData((previous) => {
      switch (preset) {
        case 'manual':
          return {
            ...previous,
            agentPreset: preset,
            deployAgent: false,
            // Backend schema still requires these fields; they are ignored when deployAgent=false.
            agentType: 'codex',
            agentModel: 'manual',
          };
        case 'codexCli':
          return {
            ...previous,
            agentPreset: preset,
            deployAgent: true,
            agentType: 'codex',
            agentModel: previous.agentModel && previous.agentModel !== 'manual' ? previous.agentModel : 'gpt-4',
          };
        case 'copilotCli':
          return {
            ...previous,
            agentPreset: preset,
            deployAgent: true,
            agentType: 'copilot',
            agentModel: previous.agentModel && previous.agentModel !== 'manual' ? previous.agentModel : 'gpt-4',
          };
        case 'geminiCli':
          return {
            ...previous,
            agentPreset: preset,
            deployAgent: true,
            agentType: 'codex',
            agentModel: 'gemini',
          };
        case 'mixtralVibeCli':
          return {
            ...previous,
            agentPreset: preset,
            deployAgent: true,
            agentType: 'codex',
            agentModel: 'mixtral-vibe',
          };
        default:
          return { ...previous, agentPreset: preset };
      }
    });

    setError('');
  };

  const validateForm = (): string | null => {
    const validUrls = formData.challengeUrls.map((url) => url.trim()).filter(Boolean);
    if (validUrls.length === 0) {
      return t('errors.vmCreate.challengeUrlRequired');
    }

    const hasInvalidUrl = validUrls.some((url) => !/^https?:\/\//i.test(url));
    if (hasInvalidUrl) {
      return t('errors.vmCreate.invalidChallengeUrl');
    }

    if (!formData.instructions.trim()) {
      return t('errors.vmCreate.instructionsRequired');
    }

    if (formData.deployAgent && !formData.agentModel.trim()) {
      return t('errors.vmCreate.agentModelRequired');
    }

    return null;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const setupMode: SetupMode = formData.agentPreset === 'geminiCli' ? 'gemini' : 'manual';
      const request: VMCreationRequest = {
        challengeUrls: formData.challengeUrls.map((url) => url.trim()).filter(Boolean),
        instructions: formData.instructions.trim(),
        agentType: formData.agentType,
        agentModel: formData.agentModel.trim(),
        vmSize: formData.vmSize,
        setupMode,
        deployAgent: formData.deployAgent,
      };

      const session = await apiClient.createSession(request);
      navigate(`/sessions/${session.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.failedToCreateVm'));
    } finally {
      setIsLoading(false);
    }
  };

  const headerActions = (
    <Button type="button" variant="normal" onClick={() => navigate('/dashboard')}>
      {t('vm.create.backToDashboard')}
    </Button>
  );

  return (
    <AppShell
      title={t('vm.create.title')}
      subtitle={t('vm.create.subtitle')}
      headerActions={headerActions}
    >
      {error && (
        <Container variant="light" padding="md" className="mb-lg border-accent-pink">
          <p className="font-pixel text-sm text-accent-pink">{error}</p>
        </Container>
      )}

      <form onSubmit={handleSubmit} className="space-y-lg">
        <Container variant="light" padding="lg">
          <h2 className="font-pixel text-lg text-neutral-darkPurple mb-md">
            {t('vm.create.challengeUrlsTitle')}
          </h2>
          <div className="space-y-md">
            {formData.challengeUrls.map((url, index) => (
              <div key={`url-${index}`} className="flex flex-col tablet:flex-row gap-sm">
                <Input
                  label={t('vm.create.challengeUrlLabel', { index: index + 1 })}
                  name={`challenge-url-${index}`}
                  type="url"
                  placeholder={t('vm.create.challengeUrlPlaceholder')}
                  value={url}
                  onChange={(event) => updateChallengeUrl(index, event.target.value)}
                  disabled={isLoading}
                  required={index === 0}
                  className="flex-1"
                />
                {formData.challengeUrls.length > 1 && (
                  <Button
                    type="button"
                    variant="error"
                    onClick={() => removeChallengeUrl(index)}
                    disabled={isLoading}
                  >
                    {t('vm.create.removeUrl')}
                  </Button>
                )}
              </div>
            ))}
            <Button type="button" variant="normal" onClick={addChallengeUrl} disabled={isLoading}>
              {t('vm.create.addUrl')}
            </Button>
          </div>
        </Container>

        <Container variant="light" padding="lg">
          <h2 className="font-pixel text-lg text-neutral-darkPurple mb-md">
            {t('vm.create.instructionsTitle')}
          </h2>
          <label htmlFor="instructions" className="font-pixel text-sm text-neutral-darkPurple block mb-xs">
            {t('vm.create.instructionsLabel')}
          </label>
          <textarea
            id="instructions"
            name="instructions"
            rows={6}
            value={formData.instructions}
            onChange={handleInputChange}
            disabled={isLoading}
            required
            className="w-full px-sm py-sm font-pixel text-sm border-4 border-solid border-neutral-teal bg-white focus:outline-none focus:border-accent-cyan disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder={t('vm.create.instructionsPlaceholder')}
          />
        </Container>

        <Container variant="light" padding="lg">
          <h2 className="font-pixel text-lg text-neutral-darkPurple mb-md">
            {t('vm.create.agentConfigTitle')}
          </h2>
          <div className="grid grid-cols-1 tablet:grid-cols-2 gap-md">
            <div className="space-y-md">
              <div>
                <label htmlFor="agentPreset" className="font-pixel text-sm text-neutral-darkPurple block mb-xs">
                  {t('vm.create.agentType')}
                </label>
                <select
                  id="agentPreset"
                  name="agentPreset"
                  value={formData.agentPreset}
                  onChange={handleAgentPresetChange}
                  disabled={isLoading}
                  className="w-full px-sm py-sm font-pixel text-sm border-4 border-solid border-neutral-teal bg-white focus:outline-none focus:border-accent-cyan disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="codexCli">{t('vm.create.agentPresets.codexCli')}</option>
                  <option value="copilotCli">{t('vm.create.agentPresets.copilotCli')}</option>
                  <option value="geminiCli">{t('vm.create.agentPresets.geminiCli')}</option>
                  <option value="mixtralVibeCli">{t('vm.create.agentPresets.mixtralVibeCli')}</option>
                  <option value="manual">{t('vm.create.agentPresets.manual')}</option>
                </select>
              </div>

              <div className="space-y-xs">
                <p className="font-pixel text-xs text-neutral-olive">
                  {formData.agentPreset === 'manual'
                    ? t('vm.create.agentPresets.manualDesc')
                    : formData.agentPreset === 'codexCli'
                      ? t('vm.create.agentPresets.codexCliDesc')
                      : formData.agentPreset === 'copilotCli'
                        ? t('vm.create.agentPresets.copilotCliDesc')
                        : formData.agentPreset === 'geminiCli'
                          ? t('vm.create.agentPresets.geminiCliDesc')
                          : t('vm.create.agentPresets.mixtralVibeCliDesc')}
                </p>
                {formData.deployAgent ? (
                  <p className="font-pixel text-xs text-neutral-olive">
                    {t('vm.create.agentPresets.bootstrapScriptNote')}
                  </p>
                ) : null}
              </div>
            </div>

            {formData.deployAgent ? (
              <Input
                label={t('vm.create.agentModelLabel')}
                name="agentModel"
                type="text"
                value={formData.agentModel}
                onChange={handleInputChange}
                disabled={isLoading || formData.agentPreset === 'geminiCli' || formData.agentPreset === 'mixtralVibeCli'}
                required
                placeholder={t('vm.create.agentModelPlaceholder')}
              />
            ) : (
              <div className="p-md border-4 border-neutral-olive bg-white">
                <p className="font-pixel text-xs text-neutral-darkPurple">
                  {t('vm.create.agentPresets.manualToolsOnlyNote')}
                </p>
              </div>
            )}
          </div>
        </Container>

        <Container variant="light" padding="lg">
          <h2 className="font-pixel text-lg text-neutral-darkPurple mb-md">
            {t('vm.create.infrastructureSizeTitle')}
          </h2>
          <label htmlFor="vmSize" className="font-pixel text-sm text-neutral-darkPurple block mb-xs">
            {t('vm.create.vmSizeLabel')}
          </label>
          <select
            id="vmSize"
            name="vmSize"
            value={formData.vmSize}
            onChange={handleInputChange}
            disabled={isLoading}
            className="w-full px-sm py-sm font-pixel text-sm border-4 border-solid border-neutral-teal bg-white focus:outline-none focus:border-accent-cyan disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {vmSizeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label} ({option.details})
              </option>
            ))}
          </select>
        </Container>

        <Container variant="light" padding="lg">
          {isLoading ? (
            <div className="flex justify-center py-md">
              <Loading size="lg" text={t('vm.create.creating')} />
            </div>
          ) : (
            <div className="flex flex-col tablet:flex-row gap-md justify-end">
              <Button type="button" variant="normal" onClick={() => navigate('/dashboard')} fullWidth>
                {t('vm.create.cancel')}
              </Button>
              <Button type="submit" variant="primary" fullWidth>
                {t('vm.create.submit')}
              </Button>
            </div>
          )}
        </Container>
      </form>
    </AppShell>
  );
};
