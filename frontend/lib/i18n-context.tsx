"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import {
  type Locale,
  type TranslationKey,
  getActiveLocale,
  setLocale as persistLocale,
  t as translate,
} from "./i18n";

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey) => string;
};

const I18nContext = createContext<I18nContextValue>({
  locale: "tr",
  setLocale: () => {},
  t: (key) => key,
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("tr");

  useEffect(() => {
    setLocaleState(getActiveLocale());
  }, []);

  const setLocale = useCallback((l: Locale) => {
    persistLocale(l);
    setLocaleState(l);
  }, []);

  const t = useCallback(
    (key: TranslationKey) => translate(key, locale),
    [locale],
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}

export function useT() {
  const { t } = useContext(I18nContext);
  return t;
}
