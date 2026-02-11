// Sidebar.tsx - 8-bit styled sidebar navigation component
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

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
}

export const Sidebar: React.FC<SidebarProps> = ({
  items,
  logo,
  collapsible = true,
}) => {
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
    >
      {/* Logo Section */}
      <div className="p-md border-b-4 border-neutral-teal flex items-center justify-between">
        {logo && (
          <div className={`${isCollapsed ? 'hidden' : 'block'}`}>
            {logo}
          </div>
        )}
        {collapsible && (
          <button
            onClick={toggleCollapse}
            className="p-xs hover:bg-neutral-teal transition-colors"
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <span className="text-white font-pixel text-xs">
              {isCollapsed ? '>' : '<'}
            </span>
          </button>
        )}
      </div>
      
      {/* Navigation Items */}
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
    </aside>
  );
};
