import type { MembershipRole, Visibility, VisibilitySetBy } from "./enums";

const VISIBILITY_RANK: Record<Visibility, number> = { private: 0, family: 1, memorial: 2 };

// PRD BR-030/BR-033: a Family member never sees Private items; a steward sees everything in their
// own space. (Memorial visitors never call this — the public page only reads a published snapshot.)
export function canViewerSeeVisibility(visibility: Visibility, viewerRole: MembershipRole): boolean {
  if (visibility === "private") return viewerRole === "steward";
  return true;
}

// PRD BR-031: Memorial visibility is only available if the featured person's consent allowed it.
export function canSetMemorialVisibility(consent: { memorialUseAllowed: boolean }): boolean {
  return consent.memorialUseAllowed;
}

export interface VisibilityChangeRequest {
  currentVisibility: Visibility | null;
  currentVisibilitySetBy: VisibilitySetBy | null;
  nextVisibility: Visibility;
  withFeaturedPerson: boolean;
}

// PRD BR-032 consent ceiling: once the featured person sets an item Private, the steward alone can
// never raise it again — before or after Memorial Mode activation. The featured person themself
// still can, recorded via `withFeaturedPerson` (BR-021's "with the person" flag).
//
// This is a pure function: it trusts `withFeaturedPerson` rather than verifying it. The caller
// (TASK-011's review/access module) is responsible for only ever setting it true when the featured
// person is actually present in the session — in practice this can only be true during a live
// interview, since the featured person has no account and no way to act after death (PRD Personas).
// If a future flow needs to *verify* presence rather than trust a flag, that check belongs in the
// caller, not here.
export function canChangeVisibility(request: VisibilityChangeRequest): boolean {
  const { currentVisibility, currentVisibilitySetBy, nextVisibility, withFeaturedPerson } = request;
  if (currentVisibility == null) return true;
  const isRaise = VISIBILITY_RANK[nextVisibility] > VISIBILITY_RANK[currentVisibility];
  if (!isRaise) return true;
  const ceilingApplies = currentVisibility === "private" && currentVisibilitySetBy === "featured_person";
  return !ceilingApplies || withFeaturedPerson;
}
