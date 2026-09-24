import en from "../../../../content/i18n/en.json";
import fil from "../../../../content/i18n/fil.json";

export type Locale = "fil" | "en";
export const dictionaries = { en, fil } as const;
export function getDictionary(locale: Locale) {
  return dictionaries[locale] ?? dictionaries.en;
}
