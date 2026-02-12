import React from 'react';
import { useTranslation } from 'react-i18next';
import { Locale, localeNames, supportedLocales } from '../../config/i18n';

export const LanguageSelector: React.FC = () => {
  const { i18n } = useTranslation();
  const currentLocale = supportedLocales.find((locale) =>
    i18n.resolvedLanguage?.toLowerCase().startsWith(locale)
    || i18n.language?.toLowerCase().startsWith(locale)
  ) || 'en';

  const handleLanguageChange = (locale: Locale) => {
    i18n.changeLanguage(locale);
  };

  return (
    <div className="relative inline-block">
      <select
        value={currentLocale}
        onChange={(e) => handleLanguageChange(e.target.value as Locale)}
        className="
          font-pixel text-sm px-md py-sm
          border-4 border-solid border-neutral-teal
          bg-white text-neutral-darkPurple
          transition-all hover:translate-y-[-2px] active:translate-y-[2px]
          focus:outline-none focus:border-accent-cyan
          focus:ring-2 focus:ring-accent-cyan focus:ring-offset-2
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
