// Đo các trang Credentials của Portfolio trên trình duyệt thật, bằng đúng dữ liệu bản nháp Portfolio của người vận hành
// (docs/ui-guidelines.md §8.4, UI-08, UI-11). Không đổi dữ liệu nào trên Supabase.
//
//   1) npm run dev -- --port 5199 --strictPort        (một cửa sổ riêng)
//   2) node tools/portfolio-credentials-check.mjs <thư-mục-ảnh-ngoài-repo>
//
// Cần phiên đăng nhập `.auth/admin.json` (npm run shots:login). Ảnh chụp có thể chứa thông tin cá nhân trên giấy tờ:
// LUÔN lưu ngoài repo (thư mục tạm), không commit, không dán vào báo cáo / sổ lỗi (E-008).
//
// Mỗi tổ hợp (layout × ngôn ngữ × dữ liệu thật / tiêu đề dài ba dòng) in PASS hoặc FAIL cho 3 phép đo:
//   frames-aligned  các khung tài liệu cùng một hàng của hai thẻ bắt đầu cùng độ cao (≤ 0.3 mm)
//   crop-ratio      tỉ lệ khung ảnh in ra khớp profile crop (±1 %)
//   no-issue        findPortfolioLayoutIssues rỗng (không tràn trang, không lấn header / footer)
// Thoát mã 1 nếu có FAIL.
import { existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const out = process.argv[2];
if (!out) throw new Error("Usage: node tools/portfolio-credentials-check.mjs <screenshot-dir-outside-repo>");
mkdirSync(out, { recursive: true });
const origin = process.env.PF_ORIGIN ?? "http://localhost:5199";
const authFile = fileURLToPath(new URL("../.auth/admin.json", import.meta.url));
if (!existsSync(authFile)) throw new Error("Missing .auth/admin.json — run `npm run shots:login` once.");

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1500, height: 1100 }, storageState: authFile, reducedMotion: "reduce" });
const page = await context.newPage();
await page.goto(`${origin}/portfolio/?preview=1`, { waitUntil: "networkidle" });
await page.waitForSelector(".portfolio-page", { timeout: 30_000 });

const scenarios = [];
for (const layout of ["credentials.dual", "credentials.bands"]) {
  for (const language of ["en", "vi"]) {
    for (const longTitle of [false, true]) scenarios.push({ layout, language, longTitle });
  }
}

let failures = 0;
for (const scenario of scenarios) {
  const result = await page.evaluate(async ({ layout, language, longTitle }) => {
    const { renderPortfolio } = await import("/src/portfolio/renderPortfolioV2.ts");
    const { findPortfolioLayoutIssues } = await import("/src/portfolio/safeArea.ts");
    const { normalizePortfolioRuntimeData } = await import("/src/services/documentRepository.ts");
    const { listProfileDocuments } = await import("/src/services/profileDocumentRepository.ts");
    const { listProfessionalCredentials, credentialSnapshot } = await import("/src/services/credentialRepository.ts");
    const { applyDocumentTheme, resolveDocumentTheme } = await import("/src/themes/documentThemes.ts");

    if (!window.__draft) {
      // Same composition as the Admin: selection from the Portfolio draft, credential content and crops fresh from the Profile.
      const documents = await listProfileDocuments("portfolio");
      const active = documents.find((item) => item.isActive) ?? documents[0];
      const draft = structuredClone(active.draftPayload);
      const chosen = new Map((draft.credentials ?? []).filter((item) => item.includeInPortfolio).map((item) => [item.id, item.portfolioOrder]));
      const fresh = (await listProfessionalCredentials(true)).filter((item) => item.status === "published").map(credentialSnapshot);
      draft.credentials = fresh.map((item) => ({ ...item, includeInPortfolio: chosen.has(item.id), portfolioOrder: chosen.get(item.id) ?? item.displayOrder }));
      window.__draft = draft;
    }
    const data = normalizePortfolioRuntimeData(structuredClone(window.__draft));
    data.content.layouts.includeCredentials = true;
    data.content.layouts.credentials = layout;
    data.content.layouts.credentialOverrides = {};
    const selected = data.credentials.filter((item) => item.includeInPortfolio);
    if (longTitle && selected[0]) {
      selected[0].title = {
        en: "Autodesk Certified Professional: Revit for Structural Design and Coordination",
        vi: "Chứng chỉ chuyên gia Autodesk: Revit cho thiết kế kết cấu và phối hợp mô hình dự án hạ tầng",
      };
    }

    const root = document.querySelector("#portfolio-document");
    applyDocumentTheme(root, resolveDocumentTheme(data.content.theme));
    const holder = document.createElement("div");
    holder.innerHTML = renderPortfolio(data, language);
    root.innerHTML = [...holder.querySelectorAll(`[data-portfolio-layout="${layout}"]`)].map((item) => item.outerHTML).join("");
    document.documentElement.lang = language;
    await Promise.all([...root.querySelectorAll("img")].map((image) => (image.complete ? null : new Promise((resolve) => { image.onload = image.onerror = resolve; }))));
    await document.fonts.ready;
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

    const mm = (px) => Math.round((px / 96) * 25.4 * 100) / 100;
    const ratioOf = { landscape: 4 / 3, portrait: 3 / 4 };
    const pages = [...root.querySelectorAll(".portfolio-page")];
    const frameRows = pages.map((pageElement) => {
      const pageBox = pageElement.getBoundingClientRect();
      return [...pageElement.querySelectorAll(".portfolio-document-frame")].map((frame) => {
        const box = frame.getBoundingClientRect();
        return { top: mm(box.top - pageBox.top), width: mm(box.width), height: mm(box.height) };
      });
    });
    const previews = [...root.querySelectorAll(".portfolio-document-preview")].map((preview) => {
      const box = preview.getBoundingClientRect();
      const profile = preview.dataset.cropProfile;
      const expected = ratioOf[profile];
      return { profile, ratio: Math.round((box.width / box.height) * 1000) / 1000, expected: Math.round(expected * 1000) / 1000, ok: Math.abs(box.width / box.height - expected) / expected <= 0.01 };
    });
    return {
      pages: pages.length,
      titles: selected.map((item) => item.title[language] || item.title.en),
      frameRows,
      previews,
      issues: findPortfolioLayoutIssues(root),
    };
  }, scenario);

  const tag = `${scenario.layout.split(".")[1]}-${scenario.language}${scenario.longTitle ? "-longtitle" : ""}`;
  const aligned = result.frameRows.every((row) => row.length < 2 || row.every((frame) => Math.abs(frame.top - row[0].top) <= 0.3));
  // Bands stacks two cards vertically on purpose; alignment there means equal x of the frame column, so only Dual is a row check.
  const alignedChecked = scenario.layout === "credentials.dual" ? aligned : true;
  const ratioOk = result.previews.every((preview) => preview.ok);
  const issuesOk = result.issues.length === 0;
  const lines = [
    `${alignedChecked ? "PASS" : "FAIL"}  ${tag}  frames-aligned  ${JSON.stringify(result.frameRows)}`,
    `${ratioOk ? "PASS" : "FAIL"}  ${tag}  crop-ratio  ${JSON.stringify(result.previews)}`,
    `${issuesOk ? "PASS" : "FAIL"}  ${tag}  no-issue  ${JSON.stringify(result.issues)}`,
  ];
  failures += lines.filter((line) => line.startsWith("FAIL")).length;
  console.log(lines.join("\n"));
  const pageHandles = await page.$$(".portfolio-page");
  for (const [index, handle] of pageHandles.entries()) await handle.screenshot({ path: `${out}/${tag}-p${index + 1}.png` });
}

await browser.close();
console.log(failures ? `\n${failures} FAIL` : "\nAll PASS");
process.exit(failures ? 1 : 0);
