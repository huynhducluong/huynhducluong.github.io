import { describe, expect, it } from "vitest";
import { renderDocumentPrintStatus, renderDocumentPrintToolbar } from "./documentPrintPreview";

describe("document print preview chrome", () => {
  it("renders one focused back action and a disabled print action while readiness is checked", () => {
    const markup = renderDocumentPrintToolbar({
      backHref: "/admin/?view=cv&item=cv-1",
      backLabel: "CVs",
      state: "draft",
      title: "General CV",
      meta: "A4 portrait · 2 pages",
    });

    expect(markup).toContain("CVs");
    expect(markup).toContain("Print / Save PDF");
    expect(markup).toContain("data-document-print disabled");
    expect(markup).not.toContain("Edit draft");
  });

  it("places PDF readiness in a live status region", () => {
    const markup = renderDocumentPrintStatus({
      kind: "success",
      title: "Ready for one-page A4 PDF",
      detail: "Selectable text · saved theme",
    });

    expect(markup).toContain('data-print-status');
    expect(markup).toContain('role="status"');
    expect(markup).toContain("Ready for one-page A4 PDF");
  });
});
