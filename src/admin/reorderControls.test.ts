import { describe, expect, it } from "vitest";
import css from "../styles/admin.css?raw";
import { renderReorderControls } from "./reorderControls";

const item = { type: "project", id: "p1", name: "Bridge & <Road>" };
const button = (html: string, selector: string): string => html.split("<button").find((part) => part.includes(selector)) ?? "";

describe("Reorder controls", () => {
  it("renders four named navigation buttons and no popover menu", () => {
    const html = renderReorderControls(item, { first: false, last: false });
    expect(html).toContain('aria-label="Move Bridge &amp; &lt;Road&gt; to first"');
    expect(html).toContain('aria-label="Move Bridge &amp; &lt;Road&gt; to last"');
    expect(html).toContain('aria-label="Move Bridge &amp; &lt;Road&gt; earlier"');
    expect(html).toContain('aria-label="Move Bridge &amp; &lt;Road&gt; later"');
    expect(html.match(/<button/g)).toHaveLength(4);
    expect(html).not.toMatch(/data-reorder-menu|popover|aria-haspopup/);
    expect(html).not.toContain("disabled");
  });
  it("orders the grid: first, up, last, down", () => {
    const html = renderReorderControls(item, { first: false, last: false });
    const order = ['data-reorder-edge="first"', 'data-reorder-direction="up"', 'data-reorder-edge="last"', 'data-reorder-direction="down"'].map((key) => html.indexOf(key));
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });
  it("disables the edge and step buttons that cannot move", () => {
    const first = renderReorderControls(item, { first: true, last: false });
    expect(button(first, 'edge="first"')).toContain("disabled");
    expect(button(first, 'direction="up"')).toContain("disabled");
    expect(button(first, 'edge="last"')).not.toContain("disabled");
    expect(button(first, 'direction="down"')).not.toContain("disabled");
    const last = renderReorderControls(item, { first: false, last: true });
    expect(button(last, 'edge="last"')).toContain("disabled");
    expect(button(last, 'direction="down"')).toContain("disabled");
    expect(button(last, 'edge="first"')).not.toContain("disabled");
    const only = renderReorderControls(item, { first: true, last: true });
    expect(only.match(/ disabled/g)).toHaveLength(4);
  });
});

describe("Reorder controls CSS", () => {
  it("lays the four buttons out as a two-column grid and drops the popover menu rules", () => {
    expect(css).toMatch(/\.admin-content-item__reorder-grid\s*\{[^}]*display:\s*grid;[^}]*repeat\(2,/);
    expect(css).toContain(".admin-content-item__reorder button:focus-visible");
    expect(css).not.toContain(".admin-reorder-menu");
  });
});
