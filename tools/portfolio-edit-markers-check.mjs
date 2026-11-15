// Đo bút chì "Edit markers" trên preview Portfolio của Admin (ADR-030, docs/admin-ui-guidelines.md §7.2, GD3-09).
// Không ghi gì lên Supabase (chỉ bật công tắc, bấm bút chì, không bấm Save).
//
//   1) npm run dev -- --port 5199 --strictPort        (một cửa sổ riêng)
//   2) node tools/portfolio-edit-markers-check.mjs
//
// Cần phiên đăng nhập `.auth/admin.json` (npm run shots:login). Mỗi màn hình mục tiêu (1024, 1440 × 731, 1920) in PASS / FAIL:
//   default-off   công tắc mặc định tắt, chưa có bút chì nào
//   size          bút chì ≈ 22 px trên màn hình ở Fit và sau Zoom in / Zoom out (±1 px)
//   no-overlap    không hai bút chì nào chồng lên nhau (EN và VI)
//   near-text     bút chì cách cuối chữ của khối ≤ 48 px trên màn hình (biết bút chì nào của chữ nào)
//   jump          bấm từng bút chì: tab Content, đúng ô theo ngôn ngữ preview, nằm dưới thanh tab dính, trong khung nhìn
//   off-clean     tắt công tắc thì không còn bút chì hay data-edit-field
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
for (const [width, height] of [[1024, 768], [1440, 731], [1920, 1080]]) {
  const tag = `${width}×${height}`;
  const context = await browser.newContext({ viewport: { width, height }, storageState: authFile, reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto(`${origin}/admin/?view=portfolio`, { waitUntil: "networkidle" });
  await page.waitForSelector("[data-document-edit-markers]", { timeout: 30_000 });
  await page.evaluate(() => { try { localStorage.removeItem("hdl.admin.portfolio.editMarkers"); } catch { /* ignore */ } });
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector("[data-document-edit-markers]", { timeout: 30_000 });
  await page.waitForTimeout(1500);

  const count = () => page.evaluate(() => document.querySelector("iframe").contentDocument.querySelectorAll(".portfolio-edit-marker").length);
  report((await page.locator("[data-document-edit-markers]").getAttribute("aria-pressed")) === "false" && (await count()) === 0, `${tag}  default-off`);

  await page.locator("[data-document-edit-markers]").click();
  await page.waitForTimeout(1500);

  const sizeNow = () => page.evaluate(() => {
    const frame = document.querySelector("iframe");
    const k = frame.getBoundingClientRect().width / frame.clientWidth;
    const sizes = [...frame.contentDocument.querySelectorAll(".portfolio-edit-marker")].map((button) => button.getBoundingClientRect().width * k);
    return sizes.length ? [Math.min(...sizes), Math.max(...sizes)] : [0, 0];
  });
  const sizes = [];
  sizes.push(["fit", await sizeNow()]);
  await page.locator('[data-admin-preview-zoom="in"]').click(); await page.waitForTimeout(800); sizes.push(["zoom in", await sizeNow()]);
  await page.locator('[data-admin-preview-zoom="out"]').click(); await page.locator('[data-admin-preview-zoom="out"]').click(); await page.waitForTimeout(800); sizes.push(["zoom out", await sizeNow()]);
  await page.locator('[data-admin-preview-zoom="fit"]').click(); await page.waitForTimeout(800);
  report(sizes.every(([, [lo, hi]]) => lo >= 21 && hi <= 23), `${tag}  size`, sizes.map(([name, [lo, hi]]) => `${name} ${lo.toFixed(1)}–${hi.toFixed(1)}px`).join(", "));

  for (const language of ["en", "vi"]) {
    if (language === "vi") { await page.locator("[data-document-language-toggle]").click(); await page.waitForTimeout(1800); }
    const geometry = await page.evaluate(() => {
      const frame = document.querySelector("iframe");
      const doc = frame.contentDocument;
      const k = frame.getBoundingClientRect().width / frame.clientWidth;
      const markers = [...doc.querySelectorAll(".portfolio-edit-marker")].filter((button) => !button.hidden);
      const blocks = [...doc.querySelectorAll("[data-edit-field]")];
      const boxes = markers.map((button, index) => ({ label: button.getAttribute("aria-label"), rect: button.getBoundingClientRect(), block: blocks[index] }));
      const overlaps = [];
      for (let i = 0; i < boxes.length; i += 1) for (let j = i + 1; j < boxes.length; j += 1) {
        const a = boxes[i].rect; const b = boxes[j].rect;
        if (a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom) overlaps.push(`${boxes[i].label} / ${boxes[j].label}`);
      }
      const far = boxes.flatMap(({ label, rect, block }) => {
        if (!block) return [];
        const range = doc.createRange(); range.selectNodeContents(block);
        const text = range.getBoundingClientRect();
        const centre = rect.left + rect.width / 2;
        const gap = Math.abs(centre - text.right) * k;
        return gap > 48 ? [`${label} (${Math.round(gap)}px)`] : [];
      });
      return { overlaps, far, total: boxes.length };
    });
    report(geometry.total > 0 && geometry.overlaps.length === 0, `${tag} ${language}  no-overlap`, geometry.overlaps.length ? geometry.overlaps.join("; ") : `(${geometry.total} pencils)`);
    report(geometry.total > 0 && geometry.far.length === 0, `${tag} ${language}  near-text`, geometry.far.join("; "));
  }

  // jump: every pencil, in the language being previewed (now VI)
  const labels = await page.evaluate(() => [...document.querySelector("iframe").contentDocument.querySelectorAll(".portfolio-edit-marker")].map((button) => button.getAttribute("aria-label")));
  const failures_ = [];
  for (let index = 0; index < labels.length; index += 1) {
    const result = await page.evaluate(async (position) => {
      const doc = document.querySelector("iframe").contentDocument;
      const button = doc.querySelectorAll(".portfolio-edit-marker")[position];
      const field = doc.querySelectorAll("[data-edit-field]")[position].dataset.editField;
      document.querySelector('[data-document-tab="appearance"]')?.click();
      button.click();
      await new Promise((resolve) => setTimeout(resolve, 600));
      const active = document.activeElement;
      const rect = active.getBoundingClientRect();
      const tabs = document.querySelector(".admin-document-tabs")?.getBoundingClientRect();
      return {
        field, name: active.name ?? "", tab: document.querySelector("[data-document-tab][aria-selected=true]")?.textContent,
        covered: tabs ? rect.top < tabs.bottom : false, inView: rect.top >= 0 && rect.bottom <= innerHeight,
      };
    }, index);
    const wanted = new Set([`${result.field}_vi`, result.field]);
    if (!wanted.has(result.name) || result.tab !== "Content" || result.covered || !result.inView) failures_.push(`${labels[index]} → ${result.name || "?"}${result.covered ? " (under sticky)" : ""}${result.inView ? "" : " (off screen)"}`);
  }
  report(labels.length > 0 && failures_.length === 0, `${tag}  jump`, failures_.join("; ") || `(${labels.length} pencils)`);

  await page.locator("[data-document-edit-markers]").click();
  await page.waitForTimeout(1200);
  const left = await page.evaluate(() => document.querySelector("iframe").contentDocument.querySelectorAll(".portfolio-edit-marker, [data-edit-field]").length);
  report(left === 0, `${tag}  off-clean`);
  await context.close();
}
await browser.close();
console.log(failures ? `\n${failures} FAIL` : "\nAll PASS");
process.exit(failures ? 1 : 0);
