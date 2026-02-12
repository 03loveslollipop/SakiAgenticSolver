import React, { useMemo, useState } from 'react';
import {
  FileText,
  LayoutDashboard,
  Menu,
  Monitor,
  PlusSquare,
  Settings,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useResponsive } from '../../hooks/useResponsive';
import { Sidebar, SidebarItem } from '../Sidebar';

interface AppShellProps {
  title: string;
  subtitle?: string;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
}

const shellLogo = (
  <div className="flex items-center gap-xs">
    <div className="h-6 w-6 border-2 border-primary-yellow bg-accent-cyan" />
    <span className="font-pixel text-xs text-white">SAKI</span>
  </div>
);

export const AppShell: React.FC<AppShellProps> = ({
  title,
  subtitle,
  headerActions,
  children,
}) => {
  const { t } = useTranslation();
  const { isMobile } = useResponsive();
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  const sidebarItems: SidebarItem[] = useMemo(
    () => [
      { id: 'dashboard', label: t('nav.dashboard'), icon: <LayoutDashboard size={16} />, path: '/dashboard' },
      { id: 'vms', label: t('nav.vms'), icon: <Monitor size={16} />, path: '/vms' },
      { id: 'create-vm', label: t('nav.createVm'), icon: <PlusSquare size={16} />, path: '/vms/create' },
      { id: 'writeups', label: t('nav.writeups'), icon: <FileText size={16} />, path: '/writeups' },
      { id: 'settings', label: t('nav.settings'), icon: <Settings size={16} />, path: '/settings' },
    ],
    [t]
  );

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      {!isMobile && (
        <Sidebar items={sidebarItems} logo={shellLogo} collapsible showLanguageSelector />
      )}

      {isMobile && showMobileSidebar && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/50"
            aria-label={t('nav.closeMenu')}
            onClick={() => setShowMobileSidebar(false)}
          />
          <div className="fixed left-0 top-0 z-50 h-full">
            <Sidebar items={sidebarItems} logo={shellLogo} collapsible={false} showLanguageSelector />
          </div>
        </>
      )}

      <main className="flex-1 h-screen overflow-y-auto">
        {isMobile && (
          <div className="bg-neutral-darkPurple border-b-4 border-neutral-teal p-md flex items-center justify-between">
            <button
              type="button"
              className="text-white"
              aria-label={t('nav.openMenu')}
              onClick={() => setShowMobileSidebar(true)}
            >
              <Menu size={20} />
            </button>
            {shellLogo}
          </div>
        )}

        <div className="mx-auto w-full max-w-screen-wide p-lg">
          <div className="mb-lg flex flex-col gap-sm tablet:flex-row tablet:items-start tablet:justify-between">
            <div>
              <h1 className="font-pixel text-xl text-neutral-darkPurple">{title}</h1>
              {subtitle && (
                <p className="mt-xs font-pixel text-xs text-neutral-teal">{subtitle}</p>
              )}
            </div>
            {headerActions && (
              <div className="flex flex-wrap gap-sm">{headerActions}</div>
            )}
          </div>
          {children}
        </div>
      </main>
    </div>
  );
};
