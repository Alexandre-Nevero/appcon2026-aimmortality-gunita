# ADR-005 — UI language: Filipino (Taglish-friendly) or English

- **Date:** 2026-09-23
- **Status:** Accepted
- **Owners / agents:** Alex (team lead)
- **Related:** BR-014; F-001, F-004; `docs/prd.md`, `docs/sitemap.md` (S-003, S-019)

### Context
GUNITA targets Filipino families. Interviews and recordings will often be Taglish. The product
must feel natural for elders (po/opo) while remaining usable for OFW or English-preferring relatives
and for AppCon judges who may be bilingual.

### Why now
PRD left UI language open; builders need a locked rule before shipping copy.

### Options considered
1. **English only.** Simple for judges; weak for elders.
2. **Filipino only.** Strong for elders; harder for some judges and diaspora relatives.
3. **Filipino (Taglish-friendly) or English, selectable per user/space.** Matches how Filipino
   families actually speak and how the team described the need.

### Decision
1. The product has a **language mode**: `fil` or `en`, stored on the space (steward-set) and
   overridable per signed-in user.
2. **`fil` mode:** UI copy in Filipino, with Taglish allowed in microcopy where it is clearer
   than forced pure Filipino. Interview prompts use respectful forms (po/opo).
3. **`en` mode:** UI copy in English.
4. **Fixed product terms stay Filipino in both modes** when they are part of the product identity
   or abstinence contract: e.g. **Hindi pa alam**, and Filipino category labels may appear beside
   English (Stories / Mga Kuwento) when space allows.
5. Transcription and Ask GUNITA accept **Filipino, English, and Taglish** input regardless of UI
   mode. Answers follow the asker's UI mode, with source clips in the original spoken language.

### Why this option
Matches the team's instruction and Filipino bilingual reality without building a third language
pack for the hackathon.

### Overrides
- **Prior ADRs:** none
- **Doc / plan truth:** Resolves PRD open question on UI language; expands BR-014.
- **Out of scope:** Regional languages beyond Filipino/Tagalog/English (Cebuano, Ilocano, …) stay
  post-MVP.

### Consequences
- **Easier:** clear copy ownership; demo can switch to English for judges if needed.
- **Harder / owed:** every screen ships both language strings; Taglish transcription still needs a
  spike on demo audio.
- **Follow-up:** sitemap open Q1 closed.
