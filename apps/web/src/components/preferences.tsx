'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { translations } from '@/lib/translations';

export type Language = 'en' | 'ta' | 'si';
type Preferences = {
  language: Language;
  dark: boolean;
  setLanguage: (language: Language) => void;
  toggleTheme: () => void;
  tr: (text: string) => string;
};
const Context = createContext<Preferences>({
  language: 'en',
  dark: false,
  setLanguage: () => {},
  toggleTheme: () => {},
  tr: (text) => text,
});
export function PreferencesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [language, updateLanguage] = useState<Language>('en');
  const [dark, setDark] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let savedLanguage: string | null = null,
      savedTheme: string | null = null;
    try {
      savedLanguage = localStorage.getItem('wth-language');
      savedTheme = localStorage.getItem('wth-theme');
    } catch {
      /* Preferences still work when storage is unavailable. */
    }
    if (savedLanguage === 'ta' || savedLanguage === 'si')
      updateLanguage(savedLanguage);
    setDark(
      savedTheme === 'dark' ||
        (!savedTheme &&
          window.matchMedia('(prefers-color-scheme: dark)').matches),
    );
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    document.documentElement.lang = language;
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    try {
      localStorage.setItem('wth-language', language);
      localStorage.setItem('wth-theme', dark ? 'dark' : 'light');
    } catch {
      /* Storage is optional. */
    }
  }, [language, dark, ready]);
  const tr = (text: string) =>
    language === 'en' ? text : translations[text]?.[language] || text;
  return (
    <Context.Provider
      value={{
        language,
        dark,
        setLanguage: updateLanguage,
        toggleTheme: () => setDark((value) => !value),
        tr,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export const usePreferences = () => useContext(Context);
export function Text({ text }: { text: string }) {
  return usePreferences().tr(text);
}
