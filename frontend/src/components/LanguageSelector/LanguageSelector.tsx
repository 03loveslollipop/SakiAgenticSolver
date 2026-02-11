import React from 'react';
import { useTranslation } from 'react-i18next';
import { Locale, localeNames, supportedLocales } from '../../config/i18n';

export const LanguageSelector: React.FC = () => {
  const { i18n } = useTranslation();
  const currentLocale = i18n.language as Locale;

  const handleLanguageChange = (locale: Locale) => {
    i18n.changeLanguage(locale);
  };

  return (
    <div className="relative inline-block">
      <select
        value={currentLocale}
        onChange={(e) => handleLanguageChange(e.target.value as Locale)}
        className="
          font-pixel text-sm px-sm py-xs
          border-4 border-solid border-neutral-teal
          bg-white text-neutral-darkPurple
          focus:outline-none focus:border-accent-cyan
          cursor-pointer
        "
        aria-label="Select language"
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