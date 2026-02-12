// Sidebar.tsx - 8-bit styled sidebar navigation component
import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import { LanguageSelector } from '../LanguageSelector';

export interface SidebarItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
}

export interface SidebarProps {
  items: SidebarItem[];
  logo?: React.ReactNode;
  collapsible?: boolean;
  showLanguageSelector?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  items,
  logo,
  collapsible = true,
  showLanguageSelector = true,
}) => {
  const { t } = useTranslation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();

  const toggleCollapse = () => {
    if (collapsible) {
      setIsCollapsed(!isCollapsed);
    }
  };

  return (
    <aside
      className={`
        h-screen bg-neutral-darkPurple border-r-4 border-neutral-teal
        transition-all duration-300
        ${isCollapsed ? 'w-16' : 'w-64'}
        flex flex-col
      `}
      aria-label={t('nav.mainNavigation')}
    >
      <div className="p-md border-b-4 border-neutral-teal flex items-center justify-between">
        {logo && (
          <div className={`${isCollapsed ? 'hidden' : 'block'}`}>
            {logo}
          </div>
        )}
        {collapsible && (
          <button
            type="button"
            onClick={toggleCollapse}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                toggleCollapse();
              }
            }}
            className="p-xs text-white hover:bg-neutral-teal transition-colors focus:outline-none focus:ring-2 focus:ring-accent-cyan focus:ring-offset-2"
            aria-label={isCollapsed ? t('nav.expandSidebar') : t('nav.collapseSidebar')}
          >
            {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto">
        <ul className="flex flex-col">
          {items.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <li key={item.id}>
                <Link
                  to={item.path}
                  className={`
                    flex items-center gap-md p-md
                    font-pixel text-sm
                    transition-colors
                    ${isActive
                      ? 'bg-accent-cyan text-white border-l-4 border-primary-yellow'
                      : 'text-white hover:bg-neutral-teal'
                    }
                  `}
                >
                  <span className="flex-shrink-0">{item.icon}</span>
                  {!isCollapsed && <span>{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {showLanguageSelector && (
        <div className="mt-auto border-t-4 border-neutral-teal p-sm flex justify-center">
          {isCollapsed ? (
            <LanguageSelector variant="icon" />
          ) : (
            <LanguageSelector variant="full" className="w-full" />
          )}
        </div>
      )}
    </aside>
  );
};
