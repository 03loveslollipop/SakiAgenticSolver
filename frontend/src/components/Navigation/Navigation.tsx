// Navigation.tsx - 8-bit styled navigation header component
import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../Button';

export interface NavigationItem {
  id: string;
  label: string;
  path: string;
  variant?: 'normal' | 'primary';
}

export interface NavigationProps {
  items?: NavigationItem[];
  logo?: React.ReactNode;
  showBackButton?: boolean;
}

const PlaceholderLogo: React.FC = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="40" height="40" fill="#DBC70F"/>
    <rect x="8" y="8" width="24" height="24" fill="#5C3947"/>
    <rect x="12" y="12" width="16" height="16" fill="#1ABBDB"/>
  </svg>
);

export const Navigation: React.FC<NavigationProps> = ({
  items = [],
  logo,
  showBackButton = false,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const handleBack = () => {
    navigate(-1);
  };
  
  const shouldShowBackButton = showBackButton && location.pathname !== '/';
  
  return (
    <header className="bg-neutral-darkPurple border-b-4 border-neutral-teal">
      <div className="container mx-auto px-md py-md flex items-center justify-between">
        {/* Left section: Logo and Back Button */}
        <div className="flex items-center gap-md">
          {shouldShowBackButton && (
            <Button variant="normal" onClick={handleBack} aria-label="Go back">
              ←
            </Button>
          )}
          
          <Link to="/" className="flex items-center">
            {logo || <PlaceholderLogo />}
          </Link>
        </div>
        
        {/* Right section: Navigation Items */}
        {items.length > 0 && (
          <nav>
            <ul className="flex items-center gap-md">
              {items.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <li key={item.id}>
                    <Link to={item.path}>
                      <Button 
                        variant={item.variant || 'normal'}
                        className={isActive ? 'border-primary-yellow' : ''}
                      >
                        {item.label}
                      </Button>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        )}
      </div>
    </header>
  );
};
