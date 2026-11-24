// Đo hàng dự án / công cụ ở Admin › Portfolio › Projects & tools (docs/admin-ui-guidelines.md §6.4, ADR-037, GD3-16, W-26).
// Chỉ đọc (không bấm công tắc nào, không ghi gì). Chạy:
//
//   1) npm run dev -- --port 5199 --strictPort        (một cửa sổ riêng)
//   2) node tools/portfolio-selection-check.mjs
//
// Cần phiên đăng nhập `.auth/admin.json` (npm run shots:login). Đo ở ba màn hình mục tiêu: 1440×731, 1920×940, 2560×1300.
//   row-height   mọi hàng dự án / công cụ (đã thu gọn) cao ≤ 72 px (mốc cũ: 109 – 130 px)
//   one-line     ô "In Portfolio" nằm cùng hàng với tên (cùng dải dọc), không xuống dòng riêng
//   no-overflow  không hàng nào tràn ngang; tên dài cắt gọn có tooltip (UI-14)
//   name-width   cột hẹp (1024, 768, 390): tên dự án hiện ra ≥ 128 px, hàng ≤ 72 px, meta không bắt đầu bằng "·" (UI-16, §14 mục 4)
//   target       vùng bấm (hộp nhãn quanh ô chọn, và chevron) ≥ 24 × 24 px (UI-17)
//   checkbox-size hộp chọn của hàng Portfolio bằng cỡ checkbox của hàng CV ± 1 px (UI-17)
//   state-style  mọi hàng .is-unavailable (Draft / archived) viền nét đứt như hàng CV (UI-16)
//   icon-square  nút chevron vuông: rộng = cao ± 1 px (UI-16)
// Thoát mã 1 nếu có FAIL.
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const origin = process.env.PF_ORIGIN ?? "http://localhost:5199";
const authFile = fileURLToPath(new URL("../.auth/admin.json", import.meta.url));
if (!existsSync(authFile)) throw new Error("Missing .auth/admin.json — run `npm run shots:login` once.");

let failures = 0;
const report = (ok, label, detail = "") => { if (!ok) failures += 1; console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `  ${detail}` : ""}`); };

const browser = await chromium.launch();
for (const [width, height] of [[1440, 731], [1920, 940], [2560, 1300]]) {
  const tag = `${width}×${height}`;
  const context = await browser.newContext({ viewport: { width, height }, storageState: authFile, reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto(`${origin}/admin/?view=portfolio`, { waitUntil: "networkidle" });
  await page.waitForSelector('[data-document-tab="selection"]', { timeout: 30_000 });
  await page.click('[data-document-tab="selection"]');
  await page.waitForTimeout(1200);
  const r = await page.evaluate(() => {
    const rows = [...document.querySelectorAll(".admin-portfolio-project, .admin-portfolio-tool, .admin-cv-selection__list > *")].filter((row) => row.getBoundingClientRect().height > 0);
    const unique = [...new Set(rows)];
    const heights = unique.map((row) => Math.round(row.getBoundingClientRect().height));
    const stacked = unique.filter((row) => {
      const toggle = row.querySelector("input[type=checkbox]");
      const title = row.querySelector("strong, h3, h4, .admin-truncate");
      if (!toggle || !title) return false;
      const t = toggle.getBoundingClientRect(); const h = title.getBoundingClientRect();
      return t.top > h.bottom - 2; // toggle sits below the title line
    }).length;
    const overflow = unique.filter((row) => row.scrollWidth > row.clientWidth + 1).length;
    const smallTargets = unique.filter((row) => [...row.querySelectorAll("button, .admin-portfolio-project__include")].some((el) => { const b = el.getBoundingClientRect(); return b.width > 0 && (b.height < 24 || b.width < 24); })).length;
    const unavailable = unique.filter((row) => row.classList.contains("is-unavailable"));
    const notDashed = unavailable.filter((row) => getComputedStyle(row).borderTopStyle !== "dashed").length;
    const toggles = unique.flatMap((row) => [...row.querySelectorAll(".admin-cv-project__toggle")]).filter((el) => el.getBoundingClientRect().width > 0);
    const notSquare = toggles.filter((el) => { const b = el.getBoundingClientRect(); return Math.abs(b.width - b.height) > 1; }).length;
    const box = document.querySelector(".admin-portfolio-project__include input[type=checkbox]")?.getBoundingClientRect();
    const pfBox = box ? { w: Math.round(box.width), h: Math.round(box.height) } : null;
    return { pfBox, unavailable: unavailable.length, notDashed, toggles: toggles.length, notSquare, n: unique.length, max: Math.max(0, ...heights), min: Math.min(...heights), stacked, overflow, smallTargets };
  });
  report(r.n > 0 && r.max <= 72, `${tag}  row-height`, `(${r.n} hàng, cao ${r.min} – ${r.max} px; phải ≤ 72)`);
  report(r.n > 0 && r.stacked === 0, `${tag}  one-line`, `(${r.stacked} hàng còn ô "In Portfolio" nằm riêng một dòng dưới tên)`);
  report(r.overflow === 0, `${tag}  no-overflow`, r.overflow ? `(${r.overflow} hàng tràn)` : "");
  report(r.smallTargets === 0, `${tag}  target`, r.smallTargets ? `(${r.smallTargets} hàng có nút / công tắc < 24 px)` : "");
  report(r.unavailable > 0 && r.notDashed === 0, `${tag}  state-style`, `(${r.unavailable} hàng Draft / archived, ${r.notDashed} không viền nét đứt)`);
  report(r.toggles > 0 && r.notSquare === 0, `${tag}  icon-square`, `(${r.toggles} chevron, ${r.notSquare} không vuông)`);
  await page.goto(`${origin}/admin/?view=cv`, { waitUntil: "networkidle" });
  await page.waitForSelector('[data-document-tab="selection"]', { timeout: 30_000 });
  await page.click('[data-document-tab="selection"]');
  await page.waitForTimeout(1200);
  const cvBox = await page.evaluate(() => { const b = [...document.querySelectorAll(".admin-cv-selection input[type=checkbox]")].map((el) => el.getBoundingClientRect()).find((box) => box.width > 0); return b ? { w: Math.round(b.width), h: Math.round(b.height) } : null; });
  report(Boolean(r.pfBox && cvBox) && Math.abs(r.pfBox.w - cvBox.w) <= 1 && Math.abs(r.pfBox.h - cvBox.h) <= 1, `${tag}  checkbox-size`, `(Portfolio ${r.pfBox?.w}×${r.pfBox?.h}, CV ${cvBox?.w}×${cvBox?.h}; phải bằng nhau ± 1 px)`);
  await context.close();
}
for (const [width, height] of [[1024, 768], [768, 1024], [390, 844]]) {
  const tag = `${width}×${height}`;
  const context = await browser.newContext({ viewport: { width, height }, storageState: authFile, reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto(`${origin}/admin/?view=portfolio`, { waitUntil: "networkidle" });
  await page.waitForSelector('[data-document-tab="selection"]', { timeout: 30_000 });
  await page.$eval('[data-document-tab="selection"]', (tab) => tab.click());
  await page.waitForTimeout(1200);
  const r = await page.evaluate(() => {
    const rows = [...document.querySelectorAll(".admin-portfolio-project")].filter((row) => row.getBoundingClientRect().height > 0);
    const names = rows.map((row) => Math.round(row.querySelector("strong").getBoundingClientRect().width));
    const heights = rows.map((row) => Math.round(row.getBoundingClientRect().height));
    const dot = rows.filter((row) => (row.querySelector("small")?.innerText ?? "").trim().startsWith("·")).length;
    const hits = rows.map((row) => row.querySelector(".admin-portfolio-project__include")?.getBoundingClientRect()).filter(Boolean);
    const minHit = Math.round(Math.min(...hits.map((box) => Math.min(box.width, box.height))));
    return { minHit, n: rows.length, minName: Math.min(...names), maxH: Math.max(...heights), dot, rowWidth: Math.round(rows[0]?.getBoundingClientRect().width ?? 0) };
  });
  report(r.n > 0 && r.minName >= 128 && r.maxH <= 72 && r.dot === 0 && r.minHit >= 24, `${tag}  name-width`, `(vùng bấm nhỏ nhất ${r.minHit} px, phải ≥ 24; hàng rộng ${r.rowWidth} px; tên hẹp nhất ${r.minName} px, phải ≥ 128; hàng cao nhất ${r.maxH} px; ${r.dot} meta bắt đầu bằng "·")`);
  await context.close();
}
await browser.close();
console.log(failures ? `\n${failures} FAIL` : "\nAll PASS");
process.exit(failures ? 1 : 0);
