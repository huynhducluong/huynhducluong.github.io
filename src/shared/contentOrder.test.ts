import { describe, expect, it } from "vitest";
import { sortByMasterContentOrder } from "./contentOrder";

describe("sortByMasterContentOrder", () => {
  it("uses the master display order without grouping by publication status", () => {
    const items = [
      { id: "ready-first", displayOrder: 1, status: "published" },
      { id: "draft-second", displayOrder: 2, status: "draft" },
      { id: "ready-third", displayOrder: 3, status: "published" },
    ];

    expect(sortByMasterContentOrder(items, (item) => item.displayOrder).map((item) => item.id)).toEqual([
      "ready-first",
      "draft-second",
      "ready-third",
    ]);
  });

  it("uses the id as a deterministic tie-breaker and does not mutate the source", () => {
    const items = [
      { id: "tool-b", displayOrder: 10 },
      { id: "tool-a", displayOrder: 10 },
    ];

    const ordered = sortByMasterContentOrder(items, (item) => item.displayOrder);

    expect(ordered.map((item) => item.id)).toEqual(["tool-a", "tool-b"]);
    expect(items.map((item) => item.id)).toEqual(["tool-b", "tool-a"]);
  });
});
