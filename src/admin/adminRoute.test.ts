import { describe, expect, it } from "vitest";
import { buildAdminRoute, parseAdminRoute } from "./adminRoute";

describe("Admin deep links", () => {
  it("reads canonical view, item and tab values", () => {
    expect(parseAdminRoute("https://example.test/admin/?view=projects&item=bridge&tab=media")).toEqual({
      view: "projects",
      item: "bridge",
      tab: "media",
    });
  });

  it("keeps old item links working during migration", () => {
    expect(parseAdminRoute("https://example.test/admin/?view=cv&document=legacy-document").item).toBe("legacy-document");
    expect(parseAdminRoute("https://example.test/admin/?view=tools&id=legacy-tool").item).toBe("legacy-tool");
  });

  it("builds a canonical link without discarding unrelated query values or the hash", () => {
    const route = buildAdminRoute(
      "https://example.test/admin/?view=projects&id=legacy&preview=1#workspace",
      { view: "tools", item: "dynamo-kit", tab: "content" },
    );
    expect(route).toBe("/admin/?view=tools&preview=1&item=dynamo-kit&tab=content#workspace");
  });
});
