import type { DatePrecision } from "./enums";

export interface ItemDate {
  text: string;
  precision: DatePrecision;
}

// Methods EQ-005: dates are shown verbatim from the cited source with a precision label, and are
// never computed from other facts (no ages from birth years). `unknown` renders nothing.
export function formatItemDate(date: ItemDate): string | null {
  switch (date.precision) {
    case "exact":
      return date.text;
    case "approximate":
      return `c. ${date.text}`;
    case "unknown":
      return null;
  }
}
