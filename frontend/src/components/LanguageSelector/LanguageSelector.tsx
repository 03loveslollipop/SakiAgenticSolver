import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Locale, localeNames, supportedLocales } from '../../config/i18n';

export interface LanguageSelectorProps {
  variant?: 'full' | 'icon';
  className?: string;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  variant = 'full',
  className,
}) => {
  const { i18n, t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const currentLocale = useMemo(
    () =>
      supportedLocales.find((locale) =>
        i18n.resolvedLanguage?.toLowerCase().startsWith(locale) ||
        i18n.language?.toLowerCase().startsWith(locale)
      ) || 'en',
    [i18n.language, i18n.resolvedLanguage]
  );

  const handleLanguageChange = (locale: Locale) => {
    i18n.changeLanguage(locale);
    setMenuOpen(false);
  };

  useEffect(() => {
    if (!menuOpen) return;

    const onMouseDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) {
        return;
      }
      setMenuOpen(false);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  if (variant === 'icon') {
    return (
      <div className={`relative ${className || ''}`.trim()}>
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setMenuOpen((previous) => !previous)}
          className="flex h-10 w-10 items-center justify-center border-4 border-solid border-neutral-teal bg-white text-neutral-darkPurple transition-all hover:translate-y-[-2px] active:translate-y-[2px] focus:outline-none focus:border-accent-cyan focus:ring-2 focus:ring-accent-cyan focus:ring-offset-2"
          aria-label={t('common.selectLanguage')}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
        >
          <Languages size={16} />
        </button>

        {menuOpen && (
          <div
            ref={menuRef}
            className="absolute bottom-12 left-0 z-50 min-w-[120px] border-4 border-neutral-teal bg-white p-1 shadow-pixel-md"
            role="menu"
            aria-label={t('common.selectLanguage')}
          >
            {supportedLocales.map((locale) => (
              <button
                key={locale}
                type="button"
                role="menuitemradio"
                aria-checked={currentLocale === locale}
                onClick={() => handleLanguageChange(locale)}
                className={`w-full px-sm py-xs text-left font-pixel text-xs ${
                  currentLocale === locale
                    ? 'bg-accent-cyan text-white'
                    : 'text-neutral-darkPurple hover:bg-neutral-lightGray'
                }`}
              >
                {localeNames[locale]}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`relative inline-block ${className || ''}`.trim()}>
      <select
        value={currentLocale}
        onChange={(event) => handleLanguageChange(event.target.value as Locale)}
        className="w-full font-pixel text-sm px-md py-sm border-4 border-solid border-neutral-teal bg-white text-neutral-darkPurple transition-all hover:translate-y-[-2px] active:translate-y-[2px] focus:outline-none focus:border-accent-cyan focus:ring-2 focus:ring-accent-cyan focus:ring-offset-2 cursor-pointer"
        aria-label={t('common.selectLanguage')}
      >
        {supportedLocales.map((locale) => (
          <option key={locale} value={locale}>
            {localeNames[locale]}
          </option>
        ))}
      </select>
    </div>
  );
};
