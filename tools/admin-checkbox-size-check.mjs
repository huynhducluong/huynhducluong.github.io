// Đo kích thước mọi checkbox nhìn thấy được của Admin (docs/92 UI-17, GD3-21). Chỉ đọc, không bấm công tắc nào. Chạy:
//
//   1) npm run dev -- --port 5199 --strictPort        (một cửa sổ riêng)
//   2) node tools/admin-checkbox-size-check.mjs
//
// Cần phiên đăng nhập `.auth/admin.json` (npm run shots:login). Ở 1440×731 (thêm 1180×800, 768×1024, 390×844 bằng --all-widths):
// mọi `input[type=checkbox]` nhìn thấy (rộng và cao ≥ 4 px, bỏ ô ẩn thị giác 1 × 1 của segmented / layout option) phải 16 × 16 ± 1.
// Màn hình: Homepage (Content selection), CV (Projects & tools, Background), Portfolio (Projects & tools có mở một hàng,
// Background, Appearance). In số lượng theo kích thước. Thoát mã 1 nếu có FAIL.
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const origin = process.env.PF_ORIGIN ?? "http://localhost:5199";
const authFile = fileURLToPath(new URL("../.auth/admin.json", import.meta.url));
if (!existsSync(authFile)) throw new Error("Missing .auth/admin.json — run `npm run shots:login` once.");
const widths = process.argv.includes("--all-widths") ? [[1440, 731], [1180, 800], [768, 1024], [390, 844]] : [[1440, 731]];

let failures = 0;
const report = (ok, label, detail = "") => { if (!ok) failures += 1; console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `  ${detail}` : ""}`); };

const screens = [
  { name: "Homepage › Content selection", view: "homepage", tab: "Content selection" },
  { name: "CV › Projects & tools", view: "cv", tab: "selection", open: true },
  { name: "CV › Background", view: "cv", tab: "background" },
  { name: "Portfolio › Projects & tools", view: "portfolio", tab: "selection", open: true },
  { name: "Portfolio › Background", view: "portfolio", tab: "background" },
  { name: "Portfolio › Appearance", view: "portfolio", tab: "appearance" },
  { name: "Cover letters › Evidence", view: "cover-letters", tab: "Evidence" },
];

const browser = await chromium.launch();
for (const [width, height] of widths) {
  const context = await browser.newContext({ viewport: { width, height }, storageState: authFile, reducedMotion: "reduce" });
  const page = await context.newPage();
  for (const screen of screens) {
    const tag = `${width}×${height}  ${screen.name}`;
    await page.goto(`${origin}/admin/?view=${screen.view}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(800);
    await page.evaluate((tab) => {
      const tabs = [...document.querySelectorAll("[role=tab]")];
      const hit = tabs.find((el) => (el.getAttribute("data-document-tab") || el.textContent.trim()) === tab);
      hit?.click();
    }, screen.tab);
    await page.waitForTimeout(700);
    if (screen.open) {
      await page.evaluate(() => document.querySelector(".admin-cv-project__toggle:not([hidden])")?.click());
      await page.waitForTimeout(300);
    }
    const r = await page.evaluate(() => {
      const sizes = {};
      for (const el of document.querySelectorAll("input[type=checkbox]")) {
        const b = el.getBoundingClientRect();
        if (b.width < 4 || b.height < 4) continue;
        const key = `${Math.round(b.width)}×${Math.round(b.height)}`;
        sizes[key] = (sizes[key] ?? 0) + 1;
      }
      return sizes;
    });
    const total = Object.values(r).reduce((a, b) => a + b, 0);
    const bad = Object.entries(r).filter(([key]) => key.split("×").some((n) => Math.abs(Number(n) - 16) > 1));
    const detail = `(${Object.entries(r).map(([k, n]) => `${n} ô ${k}`).join(", ") || "không có checkbox"})`;
    report(total > 0 && bad.length === 0, tag, detail);
  }
  await context.close();
}
await browser.close();
console.log(failures ? `\n${failures} FAIL` : "\nAll PASS");
process.exit(failures ? 1 : 0);
