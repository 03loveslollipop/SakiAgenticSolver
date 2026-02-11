// VMCreatePage.tsx - VM creation interface with 8-bit styling
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Button, Input, Loading, SetupModeSelector, SetupMode } from '../../components';
import { useResponsive } from '../../hooks/useResponsive';

export const VMCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const { isMobile } = useResponsive();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const [formData, setFormData] = useState({
    name: '',
    os: 'ubuntu',
    cpu: '2',
    ram: '4',
    storage: '20',
    networkType: 'public',
    sshKey: '',
    tags: '',
    setupMode: 'gemini' as SetupMode,
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    
    // Clear error when user starts typing
    if (error && (name === 'name' || name === 'cpu' || name === 'ram' || name === 'storage')) {
      setError('');
    }
  };

  const handleSetupModeChange = (mode: SetupMode) => {
    setFormData(prev => ({
      ...prev,
      setupMode: mode,
    }));
  };

  const validateForm = (): boolean => {
    let isValid = true;
    const errors: string[] = [];

    if (!formData.name.trim()) {
      errors.push('VM name is required');
      isValid = false;
    } else if (formData.name.length < 3 || formData.name.length > 50) {
      errors.push('VM name must be between 3 and 50 characters');
      isValid = false;
    }

    const cpu = parseInt(formData.cpu);
    if (isNaN(cpu) || cpu < 1 || cpu > 8) {
      errors.push('CPU cores must be between 1 and 8');
      isValid = false;
    }

    const ram = parseInt(formData.ram);
    if (isNaN(ram) || ram < 1 || ram > 32) {
      errors.push('RAM must be between 1 and 32 GB');
      isValid = false;
    }

    const storage = parseInt(formData.storage);
    if (isNaN(storage) || storage < 10 || storage > 500) {
      errors.push('Storage must be between 10 and 500 GB');
      isValid = false;
    }

    if (errors.length > 0) {
      setError(errors.join('. '));
    }

    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // Clear any previous errors since validation passed
    setError('');
    setIsLoading(true);

    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      navigate('/dashboard');
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-darkPurple to-accent-pink p-lg">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-lg flex items-center gap-md">
          <Button variant="normal" onClick={() => navigate(-1)}>
            ← Back
          </Button>
          <h1 className="font-pixel text-xl text-white">
            Create Virtual Machine
          </h1>
        </div>

        {error && (
          <Container variant="dark" padding="md" className="mb-lg border-accent-pink">
            <p className="font-pixel text-sm text-accent-pink">{error}</p>
          </Container>
        )}

        <form onSubmit={handleSubmit}>
          {/* Basic Information */}
          <Container variant="light" padding="lg" className="mb-lg">
            <h2 className="font-pixel text-lg text-neutral-darkPurple mb-md">
              Basic Information
            </h2>
            
            <div className="space-y-md">
              <Input
                label="VM Name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleInputChange}
                required
                disabled={isLoading}
                helperText="Choose a unique name for your VM"
              />

              <div>
                <label htmlFor="os-select" className="font-pixel text-sm text-neutral-darkPurple block mb-xs">
                  Operating System
                </label>
                <select
                  id="os-select"
                  name="os"
                  value={formData.os}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  className="w-full px-sm py-sm font-pixel text-sm border-4 border-solid border-neutral-teal bg-white focus:outline-none focus:border-accent-cyan disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="ubuntu">Ubuntu 22.04</option>
                  <option value="debian">Debian 11</option>
                  <option value="kali">Kali Linux</option>
                  <option value="parrot">Parrot OS</option>
                </select>
              </div>
            </div>
          </Container>

          {/* Resources */}
          <Container variant="light" padding="lg" className="mb-lg">
            <h2 className="font-pixel text-lg text-neutral-darkPurple mb-md">
              Resources
            </h2>
            
            <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-3'} gap-md`}>
              <Input
                label="CPU Cores"
                name="cpu"
                type="number"
                min="1"
                max="8"
                value={formData.cpu}
                onChange={handleInputChange}
                required
                disabled={isLoading}
                helperText="1-8 cores"
              />

              <Input
                label="RAM (GB)"
                name="ram"
                type="number"
                min="1"
                max="32"
                value={formData.ram}
                onChange={handleInputChange}
                required
                disabled={isLoading}
                helperText="1-32 GB"
              />

              <Input
                label="Storage (GB)"
                name="storage"
                type="number"
                min="10"
                max="500"
                value={formData.storage}
                onChange={handleInputChange}
                required
                disabled={isLoading}
                helperText="10-500 GB"
              />
            </div>
          </Container>

          {/* Network Configuration */}
          <Container variant="light" padding="lg" className="mb-lg">
            <h2 className="font-pixel text-lg text-neutral-darkPurple mb-md">
              Network Configuration
            </h2>
            
            <div className="space-y-md">
              <div>
                <label htmlFor="network-type-select" className="font-pixel text-sm text-neutral-darkPurple block mb-xs">
                  Network Type
                </label>
                <select
                  id="network-type-select"
                  name="networkType"
                  value={formData.networkType}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  className="w-full px-sm py-sm font-pixel text-sm border-4 border-solid border-neutral-teal bg-white focus:outline-none focus:border-accent-cyan disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="public">Public Network</option>
                  <option value="private">Private Network</option>
                  <option value="isolated">Isolated Network</option>
                </select>
              </div>

              <Input
                label="SSH Public Key"
                name="sshKey"
                type="text"
                value={formData.sshKey}
                onChange={handleInputChange}
                disabled={isLoading}
                helperText="Optional: Paste your SSH public key for direct access"
                placeholder="ssh-rsa AAAAB3NzaC1yc2E..."
              />
            </div>
          </Container>

          {/* Setup Mode Selection */}
          <Container variant="light" padding="lg" className="mb-lg">
            <h2 className="font-pixel text-lg text-neutral-darkPurple mb-md">
              Setup Mode
            </h2>
            
            <SetupModeSelector
              value={formData.setupMode}
              onChange={handleSetupModeChange}
            />
          </Container>

          {/* Advanced Options */}
          <Container variant="light" padding="lg" className="mb-lg">
            <h2 className="font-pixel text-lg text-neutral-darkPurple mb-md">
              Advanced Options
            </h2>
            
            <div className="space-y-md">
              <Input
                label="Tags"
                name="tags"
                type="text"
                value={formData.tags}
                onChange={handleInputChange}
                disabled={isLoading}
                helperText="Comma-separated tags for organization"
                placeholder="ctf,web,pentest"
              />

              <div className="flex items-center gap-sm">
                <input
                  type="checkbox"
                  id="enableMonitoring"
                  name="enableMonitoring"
                  disabled={isLoading}
                  className="w-4 h-4 border-2 border-neutral-teal"
                />
                <label htmlFor="enableMonitoring" className="font-pixel text-sm text-neutral-darkPurple">
                  Enable monitoring and logging
                </label>
              </div>

              <div className="flex items-center gap-sm">
                <input
                  type="checkbox"
                  id="autoBackup"
                  name="autoBackup"
                  disabled={isLoading}
                  className="w-4 h-4 border-2 border-neutral-teal"
                />
                <label htmlFor="autoBackup" className="font-pixel text-sm text-neutral-darkPurple">
                  Enable automatic daily backups
                </label>
              </div>
            </div>
          </Container>

          {/* Actions */}
          <Container variant="light" padding="lg">
            {isLoading ? (
              <div className="flex justify-center py-md">
                <Loading size="lg" text="Creating VM..." />
              </div>
            ) : (
              <div className={`flex ${isMobile ? 'flex-col' : 'flex-row'} gap-md justify-end`}>
                <Button 
                  type="button" 
                  variant="normal" 
                  onClick={() => navigate(-1)}
                  fullWidth={isMobile}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  variant="primary"
                  fullWidth={isMobile}
                >
                  Create VM
                </Button>
              </div>
            )}
          </Container>
        </form>
      </div>
    </div>
  );
};
