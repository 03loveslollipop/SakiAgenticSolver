// Navigation.tsx - 8-bit styled navigation header component
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../Button';
import { LanguageSelector } from '../LanguageSelector';

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
  showLanguageSelector?: boolean;
}

const PlaceholderLogo: React.FC<{ 'aria-label'?: string }> = ({ 'aria-label': ariaLabel }) => (
  <svg
    width="40"
    height="40"
    viewBox="0 0 40 40"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-label={ariaLabel}
    role="img"
  >
    <title>{ariaLabel}</title>
    <rect width="40" height="40" fill="#DBC70F" />
    <rect x="8" y="8" width="24" height="24" fill="#5C3947" />
    <rect x="12" y="12" width="16" height="16" fill="#1ABBDB" />
  </svg>
);

export const Navigation: React.FC<NavigationProps> = ({
  items = [],
  logo,
  showBackButton = false,
  showLanguageSelector = true,
}) => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  const handleBack = () => {
    navigate(-1);
  };

  const shouldShowBackButton = showBackButton && location.pathname !== '/';
  const logoAriaLabel = t('nav.appLogo');

  return (
    <header className="bg-neutral-darkPurple border-b-4 border-neutral-teal" role="banner">
      <div className="container mx-auto px-md py-md flex items-center justify-between">
        <div className="flex items-center gap-md">
          {shouldShowBackButton && (
            <Button
              variant="normal"
              onClick={handleBack}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  handleBack();
                }
              }}
              aria-label={t('common.goBack')}
            >
              {t('common.backArrow')}
            </Button>
          )}

          <Link to="/" className="flex items-center" aria-label={t('nav.home')}>
            {logo || <PlaceholderLogo aria-label={logoAriaLabel} />}
          </Link>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-sm">
          {items.length > 0 && (
            <nav aria-label={t('nav.mainNavigation')}>
              <ul className="flex items-center gap-sm" role="menubar">
                {items.map((item) => {
                  const isActive = location.pathname === item.path;
                  return (
                    <li key={item.id} role="none">
                      <Link to={item.path}>
                        <Button
                          variant={item.variant || 'normal'}
                          className={isActive ? 'border-primary-yellow' : ''}
                          role="menuitem"
                          aria-current={isActive ? 'page' : undefined}
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
          {showLanguageSelector && <LanguageSelector />}
        </div>
      </div>
    </header>
  );
};
