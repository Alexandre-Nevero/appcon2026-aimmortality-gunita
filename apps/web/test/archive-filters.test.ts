import { describe, expect, it } from "vitest";
import { applyArchiveFilters, type ArchiveFilterId } from "../src/components/archive/archive-filters";

const items = [
  { id: "a", origin: "from_them", reviewState: "verified" },
  { id: "b", origin: "from_them", reviewState: "uncertain" },
  { id: "c", origin: "about_them", reviewState: "verified" },
  { id: "d", origin: "about_them", reviewState: "disputed" },
] as const;

const ids = (active: ArchiveFilterId[]) =>
  applyArchiveFilters([...items], new Set(active)).map((i) => i.id);

describe("applyArchiveFilters", () => {
  it("shows everything when no chip is active", () => {
    expect(ids([])).toEqual(["a", "b", "c", "d"]);
  });

  it("narrows to one origin", () => {
    expect(ids(["from_them"])).toEqual(["a", "b"]);
  });

  it("ORs chips in the same group, so both origins show items from either", () => {
    expect(ids(["from_them", "about_them"])).toEqual(["a", "b", "c", "d"]);
  });

  it("ANDs across groups", () => {
    expect(ids(["about_them", "verified"])).toEqual(["c"]);
    expect(ids(["from_them", "about_them", "verified"])).toEqual(["a", "c"]);
  });
});
