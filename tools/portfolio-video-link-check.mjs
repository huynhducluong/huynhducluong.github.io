// Đo link "▶ Video" của Portfolio trên trình dựng thật, bằng dữ liệu bản nháp Portfolio của người vận hành
// (docs/ui-guidelines.md §8.4 "Link video", ADR-029, W-08). Gán `youtubeUrl` giả lập **trong bộ nhớ** cho vài dự án và công cụ;
// không đổi dữ liệu nào trên Supabase.
//
//   1) npm run dev -- --port 5199 --strictPort        (một cửa sổ riêng)
//   2) node tools/portfolio-video-link-check.mjs <thư-mục-ảnh-ngoài-repo>
//
// Cần phiên đăng nhập `.auth/admin.json` (npm run shots:login). Ảnh chụp có thể chứa dữ liệu riêng: lưu ngoài repo.
// Mỗi tổ hợp (12 layout × EN / VI) in PASS / FAIL cho:
//   count        đúng số link: mỗi dự án có video ở index và ở trang dự án, công cụ có video ở trang Automation; mục không có thì không có link
//   anchor       href YouTube chuẩn hóa, rel noopener noreferrer, aria-label nêu tên (Watch video / Xem video)
//   no-stretch   nút co theo chữ (không giãn thành thanh dài)
//   contrast     chữ trên nền nút đạt 4,5:1
//   no-issue     findPortfolioLayoutIssues rỗng (không tràn trang, không lấn header / footer)
// Cuối cùng in ra PDF bằng Chrome và đếm hành động /URI: phải bằng số link (link sống sót trong PDF).
// Thoát mã 1 nếu có FAIL.
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const out = process.argv[2];
if (!out) throw new Error("Usage: node tools/portfolio-video-link-check.mjs <screenshot-dir-outside-repo>");
mkdirSync(out, { recursive: true });
const origin = process.env.PF_ORIGIN ?? "http://localhost:5199";
const authFile = fileURLToPath(new URL("../.auth/admin.json", import.meta.url));
if (!existsSync(authFile)) throw new Error("Missing .auth/admin.json — run `npm run shots:login` once.");

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1500, height: 1100 }, storageState: authFile, reducedMotion: "reduce" });
const page = await context.newPage();
await page.goto(`${origin}/portfolio/?preview=1`, { waitUntil: "networkidle" });
await page.waitForSelector(".portfolio-page", { timeout: 30_000 });

const variants = [
  ...["index.classic", "index.visual", "index.editorial"].map((id) => ({ id, key: "index" })),
  ...["project.classic", "project.balanced", "project.editorial", "project.technical", "project.portrait", "project.evidence"].map((id) => ({ id, key: "projectDefault" })),
  ...["automation.classic", "automation.workflow", "automation.input-geometry"].map((id) => ({ id, key: "automationDefault" })),
];
const WITH_VIDEO = [0, 1, 3, 5]; // selected-project indexes that get a (fake, in-memory) video

const measure = (options) => page.evaluate(async ({ layout, language, withVideo }) => {
  const { renderPortfolio } = await import("/src/portfolio/renderPortfolioV2.ts");
  const { findPortfolioLayoutIssues } = await import("/src/portfolio/safeArea.ts");
  const { normalizePortfolioRuntimeData } = await import("/src/services/documentRepository.ts");
  const { listProfileDocuments } = await import("/src/services/profileDocumentRepository.ts");
  const { applyDocumentTheme, resolveDocumentTheme } = await import("/src/themes/documentThemes.ts");
  if (!window.__draft) {
    const documents = await listProfileDocuments("portfolio");
    window.__draft = structuredClone((documents.find((item) => item.isActive) ?? documents[0]).draftPayload);
  }
  const data = normalizePortfolioRuntimeData(structuredClone(window.__draft));
  const layouts = data.content.layouts;
  layouts.index = "index.classic"; layouts.projectDefault = "project.technical"; layouts.automationDefault = "automation.workflow";
  layouts.projectOverrides = {}; layouts.automationOverrides = {}; layouts.includeCredentials = false;
  layouts[layout.key] = layout.id;
  const selected = data.projects.filter((project) => project.includeInPortfolio);
  const ids = ["CD33-gZyJB4", "dQw4w9WgXcQ", "aqz-KE-bpKQ", "9bZkp7q19f0", "kJQP7kiw5Fk", "RgKAFK5djSk"];
  selected.forEach((project, index) => { delete project.youtubeUrl; if (withVideo.includes(index)) project.youtubeUrl = `https://www.youtube.com/watch?v=${ids[index % ids.length]}`; });
  const tool = data.tools.find((item) => item.includeInPortfolio);
  if (tool) tool.youtubeUrl = `https://www.youtube.com/watch?v=${ids[2]}`;

  const root = document.querySelector("#portfolio-document");
  applyDocumentTheme(root, resolveDocumentTheme(data.content.theme));
  root.innerHTML = renderPortfolio(data, language);
  document.documentElement.lang = language;
  root.querySelectorAll("img").forEach((image) => { image.loading = "eager"; });
  await Promise.all([...root.querySelectorAll("img")].map((image) => (image.complete ? null : new Promise((resolve) => { image.onload = image.onerror = resolve; }))));
  await document.fonts.ready;
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

  const family = (selector) => [...root.querySelectorAll(`.portfolio-page:has(${selector})`)];
  const linksIn = (pages) => pages.flatMap((pageElement) => [...pageElement.querySelectorAll(".portfolio-video-link")]);
  const indexLinks = linksIn(family(".portfolio-index, .portfolio-index-visual, .portfolio-index-editorial"));
  const projectLinks = linksIn(family(".portfolio-project"));
  const automationLinks = linksIn(family(".portfolio-automation"));
  const all = [...root.querySelectorAll(".portfolio-video-link")];

  const parse = (value) => { const m = /rgba?\(([^)]+)\)/.exec(value); if (!m) return null; const [r, g, b, a = 1] = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r, g, b, a }; };
  const channel = (v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
  const luminance = ({ r, g, b }) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  const backdrop = (element) => { for (let node = element; node; node = node.parentElement) { const c = parse(getComputedStyle(node).backgroundColor); if (c && c.a > 0.99) return c; } return { r: 255, g: 255, b: 255, a: 1 }; };
  const contrast = (element) => { const fg = parse(getComputedStyle(element).color); const bg = backdrop(element); const [hi, lo] = [luminance(fg), luminance(bg)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };
  const mm = (px) => (px / 96) * 25.4;

  const expectedProject = withVideo.length;
  return {
    counts: { index: indexLinks.length, project: projectLinks.length, automation: automationLinks.length, all: all.length },
    expected: { index: expectedProject, project: expectedProject, automation: tool ? 1 : 0 },
    anchors: all.map((a) => ({ href: a.getAttribute("href") ?? "", rel: a.getAttribute("rel") ?? "", label: a.getAttribute("aria-label") ?? "" })),
    sizes: all.map((a) => { const b = a.getBoundingClientRect(); return { w: Math.round(mm(b.width) * 10) / 10, h: Math.round(mm(b.height) * 10) / 10 }; }),
    contrasts: all.map((a) => Math.round(contrast(a) * 10) / 10),
    issues: findPortfolioLayoutIssues(root),
  };
}, options);

let failures = 0;
const report = (ok, label, detail = "") => { if (!ok) failures += 1; console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `  ${detail}` : ""}`); };

for (const layout of variants) {
  for (const language of ["en", "vi"]) {
    const r = await measure({ layout, language, withVideo: WITH_VIDEO });
    const tag = `${layout.id} ${language}`;
    const countOk = r.counts.index === r.expected.index && r.counts.project === r.expected.project && r.counts.automation === r.expected.automation;
    report(countOk, `${tag}  count`, `(index ${r.counts.index}/${r.expected.index}, project ${r.counts.project}/${r.expected.project}, automation ${r.counts.automation}/${r.expected.automation})`);
    const label = language === "vi" ? "Xem video" : "Watch video";
    report(r.anchors.length > 0 && r.anchors.every((a) => /^https:\/\/www\.youtube\.com\/watch\?v=[\w-]{11}$/.test(a.href) && /noopener/.test(a.rel) && a.label.startsWith(label)), `${tag}  anchor`);
    report(r.sizes.length > 0 && r.sizes.every((s) => s.w <= 30 && s.h <= 8), `${tag}  no-stretch`, `(max ${Math.max(0, ...r.sizes.map((s) => s.w))} × ${Math.max(0, ...r.sizes.map((s) => s.h))} mm)`);
    report(r.contrasts.length > 0 && r.contrasts.every((c) => c >= 4.5), `${tag}  contrast`, `(min ${r.contrasts.length ? Math.min(...r.contrasts) : "n/a"})`);
    report(r.issues.length === 0, `${tag}  no-issue`, r.issues.length ? JSON.stringify(r.issues) : "");
    if (language === "en") {
      const handles = await page.$$(".portfolio-page");
      const interesting = layout.key === "index" ? ".portfolio-page:has(.portfolio-index, .portfolio-index-visual, .portfolio-index-editorial)" : layout.key === "projectDefault" ? ".portfolio-page:has(.portfolio-project)" : ".portfolio-page:has(.portfolio-automation)";
      const target = await page.$(interesting);
      if (target && handles.length) await target.screenshot({ path: `${out}/${layout.id}.png` });
    }
  }
}

// PDF: Chrome keeps each link as a /URI action.
const final = await measure({ layout: variants[1], language: "en", withVideo: WITH_VIDEO });
const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
writeFileSync(`${out}/video-links.pdf`, pdf);
const uriActions = (pdf.toString("latin1").match(/\/URI\s*\(https:\/\/www\.youtube\.com\/watch\?v=/g) ?? []).length;
report(final.counts.all > 0 && uriActions === final.counts.all, "PDF  every link survives as a /URI action", `(${uriActions} actions, ${final.counts.all} links)`);

await browser.close();
console.log(failures ? `\n${failures} FAIL` : "\nAll PASS");
process.exit(failures ? 1 : 0);
