// Đo phân trang Project index của Portfolio trên trình dựng thật (docs/ui-guidelines.md §8.4, ADR-043, W-39).
// Dữ liệu **giả** (seed công khai, nhân bản) dựng trong bộ nhớ trình duyệt; không đọc hay đổi dữ liệu Supabase.
//
//   1) npm run dev -- --port 5199 --strictPort        (một cửa sổ riêng)
//   2) node tools/portfolio-index-check.mjs [thư-mục-ảnh-ngoài-repo]
//      node tools/portfolio-index-check.mjs --probe    (dò số mục tối đa một trang chịu được, trường hợp xấu nhất)
//
// Cần phiên đăng nhập `.auth/admin.json` (npm run shots:login) để mở trang preview (chỉ dùng CSS của nó).
// Ba layout index × EN / VI × 1, 8, 9, 12, 13, 19, 40 dự án (một số mục tên ~100 ký tự, thiếu ảnh / địa điểm / vai trò),
// và "worst": 40 dự án mà mục nào cũng tên dài, địa điểm + vai trò dài, có video. Mỗi tổ hợp:
//   once       mỗi dự án đúng một lần trong các trang index, đúng thứ tự, số thứ tự 01 … N
//   pages      số trang index = trần(N / sức chứa) theo PORTFOLIO_INDEX_CAPACITY
//   no-issue   findPortfolioLayoutIssues không báo trang index nào
//   band       mục thấp nhất nằm trên dải dưới (198 mm; Editorial full-bleed: 192 mm, --pf-bottom)
//   numbering  chân trang NN / TT liên tục, TT = tổng số trang = portfolioPageCount
// Ảnh chụp (19 dự án) và PDF kiểm số trang được ghi khi có thư mục. Thoát mã 1 nếu có FAIL.
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const probe = process.argv.includes("--probe");
const out = process.argv.slice(2).find((arg) => !arg.startsWith("--"));
if (out) mkdirSync(out, { recursive: true });
const origin = process.env.PF_ORIGIN ?? "http://localhost:5199";
const authFile = fileURLToPath(new URL("../.auth/admin.json", import.meta.url));
if (!existsSync(authFile)) throw new Error("Missing .auth/admin.json — run `npm run shots:login` once.");

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1500, height: 1100 }, storageState: authFile, reducedMotion: "reduce" });
const page = await context.newPage();
await page.goto(`${origin}/portfolio/?preview=1`, { waitUntil: "load", timeout: 90_000 });
await page.waitForSelector(".portfolio-page", { timeout: 60_000 });

const measure = (options) => page.evaluate(async ({ layout, language, count, worst }) => {
  const { renderPortfolio } = await import("/src/portfolio/renderPortfolioV2.ts");
  const { findPortfolioLayoutIssues } = await import("/src/portfolio/safeArea.ts");
  const layoutsModule = await import("/src/portfolio/layouts.ts");
  const { portfolioContentSeed, portfolioProjectSeed } = await import("/src/data/portfolioSeed.ts");
  const { applyDocumentTheme, resolveDocumentTheme } = await import("/src/themes/documentThemes.ts");

  const longName = { en: "Interchange and elevated viaduct BIM coordination for the northern ring road expansion, package 03B", vi: "Điều phối BIM nút giao và cầu cạn trên cao thuộc dự án mở rộng đường vành đai phía bắc, gói thầu 03B" };
  const longPlace = { en: "Thu Duc City, Ho Chi Minh City, Vietnam", vi: "Thành phố Thủ Đức, TP. Hồ Chí Minh, Việt Nam" };
  const longRole = { en: "BIM Coordinator and Model Quality Lead", vi: "Điều phối viên BIM, phụ trách chất lượng mô hình" };
  const content = structuredClone(portfolioContentSeed);
  content.layouts.index = layout;
  content.layouts.includeCredentials = false;
  const projects = Array.from({ length: count }, (_, index) => {
    const project = structuredClone(portfolioProjectSeed[index % portfolioProjectSeed.length]);
    project.id = `index-check-${index}`;
    project.includeInPortfolio = true;
    project.portfolioOrder = index;
    const tag = `P${String(index + 1).padStart(2, "0")}`;
    const long = worst || index % 3 === 0;
    project.name = long ? { en: `${tag} ${longName.en}`, vi: `${tag} ${longName.vi}` } : { en: `${tag} Bridge model`, vi: `${tag} Mô hình cầu` };
    if (worst) {
      project.location = longPlace;
      project.role = longRole;
      project.youtubeUrl = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
    } else {
      if (index % 4 === 1) project.images = [];
      if (index % 5 === 2) project.location = { en: "", vi: "" };
      if (index % 5 === 3) project.role = undefined;
      if (index % 6 === 4) project.youtubeUrl = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
    }
    return project;
  });
  const data = { content, projects, tools: [], credentials: [] };

  const root = document.querySelector("#portfolio-document");
  applyDocumentTheme(root, resolveDocumentTheme(content.theme));
  root.innerHTML = renderPortfolio(data, language);
  document.documentElement.lang = language;
  root.querySelectorAll("img").forEach((image) => { image.loading = "eager"; });
  await Promise.all([...root.querySelectorAll("img")].map((image) => (image.complete ? null : new Promise((resolve) => { image.onload = image.onerror = resolve; }))));
  await document.fonts.ready;
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

  const all = [...root.querySelectorAll(".portfolio-page")];
  const indexPages = all.filter((item) => item.dataset.portfolioLayout?.startsWith("index."));
  const itemSelector = ".portfolio-index > li, .portfolio-index-visual > article, .portfolio-index-editorial li";
  const entries = indexPages.flatMap((pageElement) => [...pageElement.querySelectorAll(itemSelector)].map((item) => ({
    name: (item.querySelector("h3, strong")?.textContent ?? "").slice(0, 3),
    number: item.querySelector(":scope > span, :scope > div > span:not(.portfolio-media)")?.textContent ?? "",
  })));
  const lowest = indexPages.map((pageElement) => {
    const box = pageElement.getBoundingClientRect();
    const bottoms = [...pageElement.querySelectorAll(`${itemSelector}, .portfolio-index-visual p, .portfolio-index-visual h3`)].map((item) => item.getBoundingClientRect().bottom);
    return Math.round(((Math.max(box.top, ...bottoms) - box.top) / box.height) * 2100) / 10;
  });
  const indexNumbers = new Set(indexPages.map((pageElement) => all.indexOf(pageElement) + 1));
  const issues = findPortfolioLayoutIssues(root);
  return {
    pages: indexPages.length,
    perPage: indexPages.map((pageElement) => pageElement.querySelectorAll(itemSelector).length),
    capacity: layoutsModule.PORTFOLIO_INDEX_CAPACITY?.[layout],
    entries,
    lowest,
    issues: issues.filter((issue) => indexNumbers.has(Number(/Page (\d+)/.exec(issue)?.[1]))),
    footers: all.map((pageElement) => (pageElement.querySelector(".portfolio-page-footer, .portfolio-page-number")?.textContent ?? "").match(/\d{2} \/ \d{2}/)?.[0] ?? ""),
    total: all.length,
    expectedTotal: layoutsModule.portfolioPageCount(data),
  };
}, options);

let failures = 0;
const report = (ok, label, detail = "") => { if (!ok) failures += 1; console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `  ${detail}` : ""}`); };
const two = (value) => String(value).padStart(2, "0");
const layoutIds = ["index.classic", "index.visual", "index.editorial"];
const bottomLimit = (layout) => (layout === "index.editorial" ? 192 : 198);

if (probe) {
  for (const layout of layoutIds) {
    for (const language of ["en", "vi"]) {
      const rows = [];
      for (let count = 1; count <= 24; count += 1) {
        const r = await measure({ layout, language, count, worst: true });
        const fits = r.pages === 1 && r.issues.length === 0 && r.lowest[0] <= bottomLimit(layout);
        rows.push(`${count}:${fits ? "ok" : "x"}(${r.lowest[0]})`);
        if (!fits) break;
      }
      console.log(`${layout} ${language}  ${rows.join(" ")}`);
    }
  }
} else {
  const cases = [...[1, 8, 9, 12, 13, 19, 40].map((count) => ({ count, worst: false })), { count: 40, worst: true }];
  for (const layout of layoutIds) {
    for (const language of ["en", "vi"]) {
      for (const { count, worst } of cases) {
        const r = await measure({ layout, language, count, worst });
        const tag = `${layout} ${language} ${worst ? "worst" : count}`;
        const expected = Array.from({ length: count }, (_, index) => `P${two(index + 1)}|${two(index + 1)}`);
        const got = r.entries.map((entry) => `${entry.name}|${entry.number}`);
        const once = got.join() === expected.join();
        const wanted = r.capacity ? Math.ceil(count / r.capacity) : undefined;
        const pagesOk = r.pages === wanted;
        const noIssue = r.issues.length === 0;
        const band = r.lowest.every((value) => value <= bottomLimit(layout));
        const numbering = r.total === r.expectedTotal && r.footers.slice(1, -1).every((text, index) => text === `${two(index + 2)} / ${two(r.total)}`);
        const failed = [!once && "once", !pagesOk && "pages", !noIssue && "no-issue", !band && "band", !numbering && "numbering"].filter(Boolean);
        report(!failed.length, tag, `(${r.pages} trang index [${r.perPage.join(", ")}], cần ${wanted ?? "? (chưa có sức chứa)"}; đáy ${Math.max(...r.lowest)} mm; tổng ${r.total}${failed.length ? `; hỏng: ${failed.join(", ")}` : ""})`);
        if (out && count === 19 && language === "en") {
          const handles = await page.$$('.portfolio-page[data-portfolio-layout^="index."]');
          for (const [index, handle] of handles.entries()) await handle.screenshot({ path: `${out}/${layout}-19-${index + 1}.png` });
        }
      }
    }
    if (out) {
      const r = await measure({ layout, language: "en", count: 19, worst: false });
      const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
      writeFileSync(`${out}/${layout}-19.pdf`, pdf);
      const printed = (pdf.toString("latin1").match(/\/Type\s*\/Page(?![s\w])/g) ?? []).length;
      report(printed === r.total, `${layout}  PDF page count`, `(${printed} trang in, ${r.total} trang dựng)`);
    }
  }
}

await browser.close();
if (!probe) console.log(failures ? `\n${failures} FAIL` : "\nAll PASS");
process.exit(failures ? 1 : 0);
