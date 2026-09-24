import { fixtures } from "./fixtures";

const AUTH_KEY = "himmel.demo.authenticated";
const SPACE_ID_KEY = "himmel.demo.spaceId";
const FEATURED_KEY = "himmel.demo.featuredName";
const CONSENT_KEY = "himmel.demo.consentSaved";
const ROLE_KEY = "himmel.demo.role";
const OFFLINE_BANNER_KEY = "himmel.demo.offlineBanner";

export type DemoRole = "steward" | "member";

export function enableDemoAuth() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AUTH_KEY, "1");
}

export function isDemoAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(AUTH_KEY) === "1";
}

export function clearDemoAuth() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(AUTH_KEY);
  window.localStorage.removeItem(SPACE_ID_KEY);
  window.localStorage.removeItem(FEATURED_KEY);
  window.localStorage.removeItem(CONSENT_KEY);
  window.localStorage.removeItem(ROLE_KEY);
}

export function saveDemoSpace(featuredPersonName: string, spaceId?: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SPACE_ID_KEY, spaceId ?? fixtures.space.id);
  window.localStorage.setItem(FEATURED_KEY, featuredPersonName);
  window.localStorage.setItem(CONSENT_KEY, "0");
}

export function markDemoConsentSaved() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CONSENT_KEY, "1");
}

export function setDemoOfflineBanner(show: boolean) {
  if (typeof window === "undefined") return;
  if (show) window.sessionStorage.setItem(OFFLINE_BANNER_KEY, "1");
  else window.sessionStorage.removeItem(OFFLINE_BANNER_KEY);
}

export function shouldShowDemoOfflineBanner(): boolean {
  if (typeof window === "undefined") return false;
  return window.sessionStorage.getItem(OFFLINE_BANNER_KEY) === "1";
}

export function readDemoSpace(): {
  id: string;
  featuredName: string;
  consentSaved: boolean;
  role: DemoRole;
} {
  if (typeof window === "undefined") {
    return {
      id: fixtures.space.id,
      featuredName: fixtures.space.featuredName,
      consentSaved: fixtures.space.consentSaved,
      role: fixtures.space.role,
    };
  }
  const role = (window.localStorage.getItem(ROLE_KEY) as DemoRole | null) ?? fixtures.space.role;
  return {
    id: window.localStorage.getItem(SPACE_ID_KEY) ?? fixtures.space.id,
    featuredName: window.localStorage.getItem(FEATURED_KEY) ?? fixtures.space.featuredName,
    consentSaved:
      window.localStorage.getItem(CONSENT_KEY) === "1" || fixtures.space.consentSaved,
    role,
  };
}

export function demoSpaceId(): string {
  return readDemoSpace().id;
}
