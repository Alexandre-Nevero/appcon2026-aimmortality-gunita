import type { LifecycleMode, RecapStatus } from "./enums";

export interface MemorialAccessState {
  lifecycleMode: LifecycleMode;
  memorialLinkDisabled: boolean;
  recapStatus: RecapStatus | null;
}

// PRD BR-051/BR-052/BR-055, F-018: public /m/[token] surfaces (S-030–S-033) show content only after
// the steward activated Memorial Mode, published the recap, and left the link enabled. Anything
// else renders S-034.
export function isMemorialPublic(state: MemorialAccessState): boolean {
  return (
    state.lifecycleMode === "memorial" &&
    !state.memorialLinkDisabled &&
    state.recapStatus === "published"
  );
}
