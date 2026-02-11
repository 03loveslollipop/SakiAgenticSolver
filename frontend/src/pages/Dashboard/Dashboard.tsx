// Dashboard.tsx - Main dashboard with sidebar navigation
import React, { useState } from 'react';
import { Sidebar, SidebarItem } from '../../components/Sidebar';
import { Container } from '../../components/Container';
import { Button } from '../../components/Button';
import { useResponsive } from '../../hooks/useResponsive';

const sidebarItems: SidebarItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <span>📊</span>, path: '/dashboard' },
  { id: 'vms', label: 'Virtual Machines', icon: <span>💻</span>, path: '/vms' },
  { id: 'create-vm', label: 'Create VM', icon: <span>➕</span>, path: '/vms/create' },
  { id: 'writeups', label: 'Writeups', icon: <span>📝</span>, path: '/writeups' },
  { id: 'settings', label: 'Settings', icon: <span>⚙️</span>, path: '/settings' },
];

const logoPlaceholder = (
  <div className="flex items-center gap-xs">
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" fill="#DBC70F"/>
      <rect x="8" y="8" width="16" height="16" fill="#1ABBDB"/>
    </svg>
    <span className="font-pixel text-xs text-white">CTF</span>
  </div>
);

export const Dashboard: React.FC = () => {
  const { isMobile } = useResponsive();
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar - Desktop */}
      {!isMobile && (
        <Sidebar items={sidebarItems} logo={logoPlaceholder} collapsible={true} />
      )}

      {/* Mobile Sidebar Overlay */}
      {isMobile && showMobileSidebar && (
        <>
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setShowMobileSidebar(false)}
          />
          <div className="fixed left-0 top-0 h-full z-50">
            <Sidebar items={sidebarItems} logo={logoPlaceholder} collapsible={false} />
          </div>
        </>
      )}

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto bg-gray-100">
        {/* Mobile Header with Hamburger */}
        {isMobile && (
          <div className="bg-neutral-darkPurple border-b-4 border-neutral-teal p-md flex items-center justify-between">
            <button
              onClick={() => setShowMobileSidebar(true)}
              className="font-pixel text-white text-lg"
              aria-label="Open menu"
            >
              ☰
            </button>
            {logoPlaceholder}
          </div>
        )}

        {/* Dashboard Content */}
        <div className="p-lg">
          <Container variant="light" padding="lg" className="mb-lg">
            <h1 className="font-pixel text-xl text-neutral-darkPurple mb-md">
              Dashboard
            </h1>
            <p className="font-pixel text-sm text-neutral-darkPurple leading-relaxed">
              Welcome to your CTF automation platform dashboard
            </p>
          </Container>

          {/* Stats Grid */}
          <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-3'} gap-lg mb-lg`}>
            <Container variant="light" padding="md">
              <div className="text-center">
                <p className="font-pixel text-xs text-neutral-teal mb-xs">Active VMs</p>
                <p className="font-pixel text-2xl text-neutral-darkPurple">3</p>
              </div>
            </Container>

            <Container variant="light" padding="md">
              <div className="text-center">
                <p className="font-pixel text-xs text-neutral-teal mb-xs">Completed</p>
                <p className="font-pixel text-2xl text-neutral-darkPurple">12</p>
              </div>
            </Container>

            <Container variant="light" padding="md">
              <div className="text-center">
                <p className="font-pixel text-xs text-neutral-teal mb-xs">Writeups</p>
                <p className="font-pixel text-2xl text-neutral-darkPurple">8</p>
              </div>
            </Container>
          </div>

          {/* Recent Activity */}
          <Container variant="light" padding="lg" className="mb-lg">
            <h2 className="font-pixel text-lg text-neutral-darkPurple mb-md">
              Recent Activity
            </h2>
            <div className="space-y-md">
              <div className="border-b-2 border-neutral-olive pb-sm">
                <p className="font-pixel text-sm text-neutral-darkPurple">
                  VM "HackTheBox-Easy" started
                </p>
                <p className="font-pixel text-xs text-neutral-teal mt-xs">
                  2 hours ago
                </p>
              </div>
              <div className="border-b-2 border-neutral-olive pb-sm">
                <p className="font-pixel text-sm text-neutral-darkPurple">
                  Writeup submitted for "TryHackMe-Medium"
                </p>
                <p className="font-pixel text-xs text-neutral-teal mt-xs">
                  5 hours ago
                </p>
              </div>
              <div className="pb-sm">
                <p className="font-pixel text-sm text-neutral-darkPurple">
                  VM "PicoCTF-Beginner" completed
                </p>
                <p className="font-pixel text-xs text-neutral-teal mt-xs">
                  1 day ago
                </p>
              </div>
            </div>
          </Container>

          {/* Quick Actions */}
          <Container variant="light" padding="lg">
            <h2 className="font-pixel text-lg text-neutral-darkPurple mb-md">
              Quick Actions
            </h2>
            <div className={`flex ${isMobile ? 'flex-col' : 'flex-row'} gap-md`}>
              <Button variant="primary" fullWidth={isMobile}>
                Create New VM
              </Button>
              <Button variant="normal" fullWidth={isMobile}>
                Browse Writeups
              </Button>
              <Button variant="success" fullWidth={isMobile}>
                View Sessions
              </Button>
            </div>
          </Container>
        </div>
      </main>
    </div>
  );
};
