// Đo các chi tiết trình bày của Portfolio trên trình dựng thật, bằng dữ liệu bản nháp của người vận hành
// (docs/ui-guidelines.md §8.4 "Chi tiết trình bày", ADR-031; GD3-10 = N11, GD3-11 = N9). Không ghi gì lên Supabase;
// gán `youtubeUrl` giả lập trong bộ nhớ để đo nút Video.
//
//   1) npm run dev -- --port 5199 --strictPort        (một cửa sổ riêng)
//   2) node tools/portfolio-detail-check.mjs [--section=n11|n9|all]
//
// Cần phiên đăng nhập `.auth/admin.json` (npm run shots:login). Mỗi dòng in PASS / FAIL:
//   [N11] pill     tâm nút Video lệch ≤ 0,5 px so với tâm chữ vai trò (nút cùng hàng với vai trò)
//   [N11] numbers  tâm số 01 / 02 / 03 lệch ≤ 0,5 px so với tâm dòng đầu của đoạn chữ
//   [N11] frame    ảnh Automation nằm trong khung nền trắng (--document-surface) có viền
//   [N11] meta     index lưới ảnh: địa điểm và vai trò là hai khối riêng (hai dòng)
//   [N11] tags     Balanced: thẻ công nghệ ngay dưới danh sách đóng góp (cách ≤ 12 mm), không ở đáy cột
//   [N9]  facts    chỉ số của dự án không xuống dòng và không tràn ngang (Technical, Balanced, Editorial)
//   [ALL] no-issue findPortfolioLayoutIssues rỗng
// Thoát mã 1 nếu có FAIL.
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const section = (process.argv.find((arg) => arg.startsWith("--section=")) ?? "--section=all").split("=")[1];
const wants = (name) => section === "all" || section === name;
const origin = process.env.PF_ORIGIN ?? "http://localhost:5199";
const authFile = fileURLToPath(new URL("../.auth/admin.json", import.meta.url));
if (!existsSync(authFile)) throw new Error("Missing .auth/admin.json — run `npm run shots:login` once.");

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1500, height: 1100 }, storageState: authFile, reducedMotion: "reduce" });
const page = await context.newPage();
await page.goto(`${origin}/portfolio/?preview=1`, { waitUntil: "networkidle" });
await page.waitForSelector(".portfolio-page", { timeout: 30_000 });

const measure = (options) => page.evaluate(async ({ layoutKey, layoutId, language }) => {
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
  layouts[layoutKey] = layoutId;
  data.projects.filter((project) => project.includeInPortfolio).forEach((project, index) => { delete project.youtubeUrl; if ([0, 1, 3, 5].includes(index)) project.youtubeUrl = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"; });

  const root = document.querySelector("#portfolio-document");
  applyDocumentTheme(root, resolveDocumentTheme(data.content.theme));
  root.innerHTML = renderPortfolio(data, language);
  document.documentElement.lang = language;
  root.querySelectorAll("img").forEach((image) => { image.loading = "eager"; });
  await Promise.all([...root.querySelectorAll("img")].map((image) => (image.complete ? null : new Promise((resolve) => { image.onload = image.onerror = resolve; }))));
  await document.fonts.ready;
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

  const px = (value) => Math.round(value * 100) / 100;
  const center = (rect) => rect.top + rect.height / 2;
  const result = { issues: findPortfolioLayoutIssues(root) };

  // pill: only where the pill shares a line with the role text.
  result.pill = [...root.querySelectorAll(".portfolio-project-heading")].flatMap((heading) => {
    const pill = heading.querySelector(".portfolio-video-link"); const role = heading.querySelector("strong");
    if (!pill || !role) return [];
    const a = pill.getBoundingClientRect();
    const range = document.createRange(); range.selectNodeContents(role);
    const lines = [...range.getClientRects()];
    const line = lines.find((rect) => a.top < rect.bottom && a.bottom > rect.top);
    return line ? [px(center(a) - center(line))] : [];
  });

  // numbers: centre of the numeral against the centre of the first line of its paragraph.
  result.numbers = [...root.querySelectorAll(".portfolio-contributions article")].flatMap((article) => {
    const number = article.querySelector(":scope > span"); const text = article.querySelector(":scope > p");
    if (!number || !text) return [];
    const range = document.createRange(); range.selectNodeContents(text);
    const first = [...range.getClientRects()][0];
    return first ? [px(center(number.getBoundingClientRect()) - center(first))] : [];
  });

  // frame: automation figures that hold an image.
  const surface = (() => { const probe = document.createElement("i"); probe.style.background = "var(--document-surface)"; root.append(probe); const value = getComputedStyle(probe).backgroundColor; probe.remove(); return value; })();
  result.frames = [...root.querySelectorAll(".portfolio-automation figure")].filter((figure) => figure.querySelector("img, .portfolio-media")).map((figure) => {
    const style = getComputedStyle(figure);
    return { white: style.backgroundColor === surface, border: parseFloat(style.borderTopWidth) > 0 };
  });

  // meta: index.visual paragraphs.
  result.meta = [...root.querySelectorAll(".portfolio-index-visual article > p")].map((p) => {
    const blocks = [...p.children];
    if (blocks.length < 2) return { two: !/·/.test(p.textContent), text: p.textContent.trim() };
    return { two: blocks[1].getBoundingClientRect().top >= blocks[0].getBoundingClientRect().bottom - 1, text: p.textContent.trim() };
  });

  // tags: Balanced.
  result.tags = [...root.querySelectorAll(".portfolio-project--balanced aside")].map((aside) => {
    const last = [...aside.querySelectorAll(".portfolio-contributions article")].at(-1);
    const tags = aside.querySelector(".portfolio-tags");
    if (!last || !tags) return null;
    return px(((tags.getBoundingClientRect().top - last.getBoundingClientRect().bottom) / 96) * 25.4);
  }).filter((value) => value !== null);

  // facts: no wrapping, no horizontal overflow.
  result.facts = [...root.querySelectorAll(".portfolio-project-facts > div strong")].map((strong) => {
    const style = getComputedStyle(strong);
    const lineHeight = parseFloat(style.lineHeight) || parseFloat(style.fontSize);
    return { wrapped: strong.getBoundingClientRect().height > lineHeight * 1.5, overflow: strong.scrollWidth > strong.clientWidth + 1, text: strong.textContent.trim() };
  });
  return result;
}, options);

let failures = 0;
const report = (ok, label, detail = "") => { if (!ok) failures += 1; console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `  ${detail}` : ""}`); };
const within = (values, limit) => values.length > 0 && values.every((value) => Math.abs(value) <= limit);

const projectLayouts = ["project.classic", "project.balanced", "project.editorial", "project.technical", "project.portrait", "project.evidence"];
const runs = [
  ...projectLayouts.map((id) => ({ key: "projectDefault", id })),
  { key: "index", id: "index.visual" },
  { key: "automationDefault", id: "automation.workflow" },
  { key: "automationDefault", id: "automation.input-geometry" },
];

for (const run of runs) {
  for (const language of ["en", "vi"]) {
    const r = await measure({ layoutKey: run.key, layoutId: run.id, language });
    const tag = `${run.id} ${language}`;
    report(r.issues.length === 0, `${tag}  no-issue`, r.issues.length ? JSON.stringify(r.issues) : "");
    if (wants("n11")) {
      if (run.key === "projectDefault") {
        report(r.pill.length > 0 && within(r.pill, 0.5), `${tag}  [N11] pill`, `(${r.pill.join(", ") || "no pill"} px)`);
        if (run.id !== "project.editorial" && run.id !== "project.classic") report(within(r.numbers, 0.5), `${tag}  [N11] numbers`, `(${[...new Set(r.numbers)].join(", ") || "none"} px)`);
      }
      if (run.id === "project.balanced") report(r.tags.length > 0 && r.tags.every((gap) => gap <= 12), `${tag}  [N11] tags`, `(gap ${r.tags.join(", ")} mm)`);
      if (run.id === "index.visual") report(r.meta.length > 0 && r.meta.every((m) => m.two), `${tag}  [N11] meta`, r.meta.filter((m) => !m.two).map((m) => m.text).join(" | "));
      if (run.key === "automationDefault") report(r.frames.length > 0 && r.frames.every((f) => f.white && f.border), `${tag}  [N11] frame`, `(${r.frames.filter((f) => f.white && f.border).length}/${r.frames.length} framed)`);
    }
    if (wants("n9") && ["project.technical", "project.balanced", "project.editorial"].includes(run.id)) {
      const bad = r.facts.filter((f) => f.wrapped || f.overflow).map((f) => f.text);
      report(r.facts.length > 0 && bad.length === 0, `${tag}  [N9] facts`, bad.length ? `(wrapped or overflowing: ${bad.join(" | ")})` : `(${r.facts.length} facts)`);
    }
  }
}

await browser.close();
console.log(failures ? `\n${failures} FAIL` : "\nAll PASS");
process.exit(failures ? 1 : 0);
