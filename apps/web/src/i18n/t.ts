import type { Locale } from "@gunita/core";

import en from "../../../../content/i18n/en.json";
import fil from "../../../../content/i18n/fil.json";

const DICTS: Record<Locale, Record<string, unknown>> = { en, fil };

function lookup(dict: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((node, key) => {
    if (node && typeof node === "object" && key in node) {
      return (node as Record<string, unknown>)[key];
    }
    return undefined;
  }, dict);
}

// Dot-path i18n lookup against content/i18n/{locale}.json (ADR-005). Falls back to `en` if a key
// is missing in `fil`, then to the raw key itself (visible-but-safe, never throws).
export function t(key: string, locale: Locale, params?: Record<string, string | number>): string {
  const raw = lookup(DICTS[locale], key) ?? lookup(DICTS.en, key);
  let text = typeof raw === "string" ? raw : key;

  if (params) {
    for (const [name, value] of Object.entries(params)) {
      text = text.replace(new RegExp(`\\{${name}\\}`, "g"), String(value));
    }
  }

  return text;
}

// ICU-lite plural helper for the `_one`/`_other` key pairs in the copy pack (e.g. home.reviewCount).
export function tCount(baseKey: string, count: number, locale: Locale): string {
  const suffix = count === 1 ? "_one" : "_other";
  return t(`${baseKey}${suffix}`, locale, { count });
}
