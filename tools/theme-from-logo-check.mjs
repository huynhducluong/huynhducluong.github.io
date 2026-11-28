// Đo nút "Pick colors from logo" ở Admin › Appearance (GD3-23, ADR-040, W-33). Chạy:
//
//   1) npm run dev -- --port 5199 --strictPort        (một cửa sổ riêng)
//   2) node tools/theme-from-logo-check.mjs
//
// Cần phiên đăng nhập `.auth/admin.json` (npm run shots:login). Chỉ đọc: chọn logo tổng hợp vẽ bằng canvas (đỏ + xanh dương;
// trắng + một màu lục; đen trắng), KHÔNG bấm Save. Với CV và Cover Letter:
//   button       có nút "Pick colors from logo" và ô file ẩn (không file input nhìn thấy)
//   pairs        đỏ + xanh → 2 – 3 cặp; một màu lục (ô vuông, hình tròn khử răng cưa trên nền trắng) → đúng 2 cặp (không cặp xám xanh); đen trắng → 0 cặp và dòng "No prominent color"
//   pressed      sau khi bấm cặp đầu: aria-pressed = true chỉ ở cặp đó
//   apply        bấm cặp đầu: preset = Custom, hai ô màu đổi đúng mã của cặp, dòng tương phản ≥ 4,5 : 1
//   no-network   chọn file không gửi request nào ra ngoài trang (logo không được tải lên đâu cả)
//   pairs-aligned ở 1440, 1180, 768 (logo ba màu): nút chọn logo ở hàng riêng; các cặp rộng và cao bằng nhau (±1 px), thẳng cột,
//                nằm trong khung theme, mép trái / phải khớp lưới theme, chữ không tràn
// Thoát mã 1 nếu có FAIL.
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const origin = process.env.PF_ORIGIN ?? "http://localhost:5199";
const authFile = fileURLToPath(new URL("../.auth/admin.json", import.meta.url));
if (!existsSync(authFile)) throw new Error("Missing .auth/admin.json — run `npm run shots:login` once.");

let failures = 0;
const report = (ok, label, detail = "") => { if (!ok) failures += 1; console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `  ${detail}` : ""}`); };

const logos = [
  { name: "red-blue", shapes: [["#d62828", 0, 0, 64, 128], ["#145ac8", 64, 0, 64, 128]], expectPairs: [2, 3] },
  { name: "white-green", shapes: [["#ffffff", 0, 0, 128, 128], ["#1ea050", 40, 40, 48, 48]], expectPairs: [2, 2] },
  { name: "green-circle", shapes: [["#ffffff", 0, 0, 128, 128], ["circle", "#1ea050"]], expectPairs: [2, 2] },
  { name: "black-white", shapes: [["#ffffff", 0, 0, 128, 128], ["#000000", 30, 30, 68, 68]], expectPairs: [0, 0] },
];
const screens = [
  { name: "CV", url: `${origin}/admin/?view=cv`, tab: "appearance" },
  { name: "Cover Letter", url: `${origin}/admin/?view=cover-letters`, tab: "Appearance" },
];

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, storageState: authFile, reducedMotion: "reduce" });
for (const screen of screens) {
  const page = await context.newPage();
  const requests = [];
  page.on("request", (request) => { if (!/^(data|blob):/.test(request.url()) && !["script", "stylesheet", "font"].includes(request.resourceType())) requests.push(request.url()); });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(screen.url, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.evaluate((tab) => [...document.querySelectorAll("[role=tab]")].find((el) => (el.getAttribute("data-document-tab") || el.textContent.trim()) === tab)?.click(), screen.tab);
  await page.waitForTimeout(600);
  const trigger = page.locator("[data-theme-logo-trigger]").first();
  const hasButton = await trigger.count() > 0;
  const visibleFileInputs = await page.evaluate(() => [...document.querySelectorAll("input[type=file]")].filter((el) => el.closest("[data-theme-logo]") && el.getBoundingClientRect().width > 0).length);
  report(hasButton && (await trigger.innerText()).includes("Pick colors from logo") && visibleFileInputs === 0, `${screen.name}  button`, `(nút ${hasButton ? "có" : "chưa có"}, ${visibleFileInputs} file input nhìn thấy)`);
  if (!hasButton) continue;
  for (const logo of logos) {
    const dataUrl = await page.evaluate(async ({ shapes }) => {
      const canvas = document.createElement("canvas");
      canvas.width = 128; canvas.height = 128;
      const context = canvas.getContext("2d");
      for (const [color, x, y, w, h] of shapes) {
        if (color === "circle") { context.fillStyle = x; context.beginPath(); context.arc(64, 64, 40, 0, Math.PI * 2); context.fill(); continue; }
        context.fillStyle = color; context.fillRect(x, y, w, h);
      }
      return canvas.toDataURL("image/png");
    }, logo);
    const buffer = Buffer.from(dataUrl.split(",")[1], "base64");
    const before = requests.length;
    await page.locator("[data-theme-logo-input]").first().setInputFiles({ name: `${logo.name}.png`, mimeType: "image/png", buffer });
    await page.waitForTimeout(700);
    const state = await page.evaluate(() => {
      const block = document.querySelector("[data-theme-logo]");
      return { pairs: [...block.querySelectorAll("[data-pair]")].map((b) => `${b.textContent.trim()}|${b.getAttribute("aria-pressed")}`), hint: block.querySelector("[data-theme-logo-hint]").textContent, live: block.querySelector("[data-theme-logo-hint]").getAttribute("aria-live") };
    });
    const [min, max] = logo.expectPairs;
    report(state.pairs.length >= min && state.pairs.length <= max && state.live === "polite" && (max > 0 || /No prominent color/.test(state.hint)), `${screen.name}  pairs  ${logo.name}`, `(${state.pairs.length} cặp; phải ${min === max ? min : `${min} – ${max}`}; hint "${state.hint}")`);
    report(requests.length === before, `${screen.name}  no-network  ${logo.name}`, `(${requests.length - before} request mới)`);
    if (!state.pairs.length || logo.name !== "red-blue") continue;
    const [, primary, accent] = state.pairs[0].match(/(#[0-9a-f]{6}) \+ (#[0-9a-f]{6})\|false/i);
    await page.locator("[data-pair]").first().click();
    await page.waitForTimeout(300);
    const after = await page.evaluate(() => {
      const root = document.querySelector(".admin-document-theme-field");
      const [p, a] = [...root.querySelectorAll('input[type="color"]')];
      return { preset: root.querySelector("select").value, primary: p.value, accent: a.value, hint: root.querySelector("[data-theme-logo-hint]").textContent };
    });
    const ratio = Number(after.hint.match(/Text on primary ([0-9.]+) : 1/)?.[1] ?? 0);
    const pressed = await page.evaluate(() => [...document.querySelectorAll("[data-pair]")].map((b) => b.getAttribute("aria-pressed")).join(","));
    report(pressed.startsWith("true") && !pressed.slice(4).includes("true"), `${screen.name}  pressed`, `(aria-pressed: ${pressed}; chỉ cặp vừa chọn là true)`);
    report(after.preset === "custom" && after.primary === primary.toLowerCase() && after.accent === accent.toLowerCase() && ratio >= 4.5, `${screen.name}  apply`, `(preset ${after.preset}, ${after.primary} / ${after.accent}, "${after.hint}")`);
  }
  const threeColors = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 128; canvas.height = 128;
    const context = canvas.getContext("2d");
    for (const [color, x, w] of [["#d62828", 0, 64], ["#145ac8", 64, 40], ["#1ea050", 104, 24]]) { context.fillStyle = color; context.fillRect(x, 0, w, 128); }
    return canvas.toDataURL("image/png");
  });
  await page.locator("[data-theme-logo-input]").first().setInputFiles({ name: "three-colors.png", mimeType: "image/png", buffer: Buffer.from(threeColors.split(",")[1], "base64") });
  await page.waitForTimeout(700);
  for (const width of [1440, 1180, 768]) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(400);
    const { grid, button, pairs, clipped } = await page.evaluate(() => {
      const root = document.querySelector(".admin-document-theme-field");
      const rect = (el) => { const r = el.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height }; };
      const buttons = [...root.querySelectorAll("[data-pair]")];
      return { grid: rect(root.querySelector(".admin-document-theme")), button: rect(root.querySelector("[data-theme-logo-trigger]")), pairs: buttons.map(rect), clipped: buttons.filter((b) => b.scrollWidth > b.clientWidth + 1 || b.querySelector("span:last-child").getClientRects().length > 1).length };
    });
    const near = (a, b) => Math.abs(a - b) <= 1;
    const columns = pairs.filter((p) => near(p.top, pairs[0]?.top)).length;
    const ok = pairs.length === 3
      && pairs.every((p, i) => near(p.width, pairs[0].width) && near(p.height, pairs[0].height) && near(p.left, pairs[i % columns].left))
      && pairs.every((p) => p.top >= button.bottom && p.left >= grid.left - 1 && p.right <= grid.right + 1)
      && near(pairs[0].left, grid.left) && near(pairs[columns - 1].right, grid.right) && clipped === 0;
    report(ok, `${screen.name}  pairs-aligned  ${width}`, `(khung ${Math.round(grid.width)} px, ${columns} cột; x/y/rộng/cao: ${pairs.map((p) => [p.left, p.top, p.width, p.height].map(Math.round).join("/")).join(" · ")}; nút chọn logo đáy ${Math.round(button.bottom)}; ${clipped} nút tràn chữ)`);
  }
  await page.close();
}
await browser.close();
console.log(failures ? `\n${failures} FAIL` : "\nAll PASS");
process.exit(failures ? 1 : 0);
