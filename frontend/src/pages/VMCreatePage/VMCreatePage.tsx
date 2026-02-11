// VMCreatePage.tsx - VM creation interface with 8-bit styling
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container } from '../../components/Container';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Loading } from '../../components/Loading';
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
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      navigate('/dashboard');
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-lg">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-lg flex items-center gap-md">
          <Button variant="normal" onClick={() => navigate(-1)}>
            ← Back
          </Button>
          <h1 className="font-pixel text-xl text-neutral-darkPurple">
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
                <label className="font-pixel text-sm text-neutral-darkPurple block mb-xs">
                  Operating System
                </label>
                <select
                  name="os"
                  value={formData.os}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  className="w-full px-sm py-sm font-pixel text-sm border-4 border-solid border-neutral-teal bg-white focus:outline-none focus:border-accent-cyan"
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
              />
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
