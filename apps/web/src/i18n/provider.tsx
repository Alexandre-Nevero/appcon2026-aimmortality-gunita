"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { getDictionary, type Locale } from "./dictionary";
import { t as tRaw } from "./t";

type Ctx = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (path: string, vars?: Record<string, string | number>) => string;
};

const I18nContext = createContext<Ctx | null>(null);

export function I18nProvider({
  initialLocale = "en",
  children,
}: {
  initialLocale?: Locale;
  children: React.ReactNode;
}) {
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const value = useMemo<Ctx>(() => {
    const dict = getDictionary(locale);
    return {
      locale,
      setLocale,
      t: (path, vars) => tRaw(dict, path, vars),
    };
  }, [locale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): Ctx {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
