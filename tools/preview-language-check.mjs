// Kiểm tra công tắc EN/VI của mọi vùng preview trong Admin (Sổ #11, W-09): bấm VI rồi đo trang trong iframe có đổi
// ngôn ngữ và nội dung thật không. Chỉ mở và đọc, không lưu gì.
//
//   1) npm run dev -- --port 5199 --strictPort        (một cửa sổ riêng)
//   2) node tools/preview-language-check.mjs
//
// Cần phiên đăng nhập `.auth/admin.json` (npm run shots:login). PASS / FAIL cho từng ca; INFO là quan sát chưa phải quy tắc.
// Thoát mã 1 nếu có FAIL.
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const origin = process.env.PF_ORIGIN ?? "http://localhost:5199";
const authFile = fileURLToPath(new URL("../.auth/admin.json", import.meta.url));
if (!existsSync(authFile)) throw new Error("Missing .auth/admin.json — run `npm run shots:login` once.");

const areas = [
  { name: "Website", view: "homepage", toggle: "[data-website-language-toggle]", frame: "[data-website-iframe]", pages: "[data-website-preview-page]" },
  { name: "CV", view: "cv", toggle: "[data-document-language-toggle]", frame: "[data-document-iframe]" },
  { name: "Portfolio", view: "portfolio", toggle: "[data-document-language-toggle]", frame: "[data-document-iframe]" },
];

const browser = await chromium.launch();
let failures = 0;
const report = (ok, label, detail = "") => { if (!ok) failures += 1; console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `  ${detail}` : ""}`); };
const info = (label, detail) => console.log(`INFO  ${label}  ${detail}`);

const newPage = async (view) => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, storageState: authFile, reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto(`${origin}/admin/?view=${view}`, { waitUntil: "domcontentloaded" });
  await page.locator(".admin-shell").waitFor({ timeout: 30_000 });
  return { context, page };
};
const state = (page, frame) => page.evaluate((selector) => {
  const doc = document.querySelector(selector)?.contentDocument;
  return { lang: doc?.documentElement.lang ?? "", ready: doc?.readyState ?? "", text: (doc?.body?.innerText ?? "").replace(/\s+/g, " ").slice(0, 300) };
}, frame);
// Waits until the preview iframe has a loaded document in `lang` with some content; returns ms or null.
const until = async (page, frame, lang, ms = 12_000) => {
  const start = Date.now();
  while (Date.now() - start < ms) {
    const current = await state(page, frame);
    if (current.lang === lang && current.ready === "complete" && current.text.length > 20) return Date.now() - start;
    await page.waitForTimeout(150);
  }
  return null;
};
const label = async (page, toggle) => (await page.locator(toggle).first().textContent())?.trim();

for (const area of areas) {
  // 1) A click switches the preview, both when the page has settled and when it is clicked right after load.
  for (const settleMs of [0, 2500]) {
    const { context, page } = await newPage(area.view);
    await page.locator(area.toggle).first().waitFor();
    await page.locator(area.frame).waitFor();
    if (settleMs) await page.waitForTimeout(settleMs);
    const before = await state(page, area.frame);
    await page.locator(area.toggle).first().click();
    const took = await until(page, area.frame, "vi");
    const after = await state(page, area.frame);
    const changed = after.text !== before.text || before.lang !== after.lang;
    report(took !== null && changed, `${area.name}: click VI ${settleMs ? "after the page settled" : "right after load"}`, took !== null ? `(${took} ms, button now "${await label(page, area.toggle)}")` : `(iframe still lang="${after.lang}")`);
    await context.close();
  }
  // 1b) Rapid clicks: two clicks 150 ms apart must leave the preview in the right language quickly. The preview used to
  //     wait up to 4 s for lazy images before taking the next update (W-09), so the second click showed up seconds late.
  {
    const { context, page } = await newPage(area.view);
    await page.locator(area.frame).waitFor();
    if (area.pages) await page.locator(area.pages).selectOption("projects");
    await page.waitForTimeout(5000); // first render and its image wait are over
    await page.locator(area.toggle).first().click();
    await page.waitForTimeout(150);
    await page.locator(area.toggle).first().click();
    const clickedAt = Date.now();
    let took = null;
    while (Date.now() - clickedAt < 8000) {
      if ((await state(page, area.frame)).lang === "en") { took = Date.now() - clickedAt; break; }
      await page.waitForTimeout(50);
    }
    report(took !== null && took <= 1500, `${area.name}: two quick clicks (VI then EN) settle within 1.5 s`, took !== null ? `(${took} ms)` : "(never settled within 8 s)");
    await context.close();
  }
  // 2) Website only: changing the preview page while VI is on keeps VI.
  if (area.pages) {
    const { context, page } = await newPage(area.view);
    await page.locator(area.pages).waitFor();
    await page.locator(area.toggle).first().click();
    await until(page, area.frame, "vi");
    const options = await page.$$eval(`${area.pages} option`, (list) => list.map((option) => option.value));
    for (const value of [options[1], options.find((option) => option.startsWith("project:")), options.find((option) => option.startsWith("tool:")), options[0]].filter(Boolean)) {
      await page.locator(area.pages).selectOption(value);
      await page.waitForTimeout(400); // let the old document unload so we never read it
      const took = await until(page, area.frame, "vi");
      report(took !== null, `Website: VI stays on after choosing "${value.split(":")[0]}" page`, took !== null ? `(${took} ms)` : "(page loaded in English)");
    }
    await context.close();
  }
  // 3) Observation only: is the choice remembered after leaving the workspace and coming back?
  {
    const { context, page } = await newPage(area.view);
    await page.locator(area.toggle).first().waitFor();
    await page.locator(area.toggle).first().click();
    await until(page, area.frame, "vi");
    await page.getByRole("button", { name: area.view === "homepage" ? /^Projects$/ : /^Dashboard$/ }).first().click();
    await page.waitForTimeout(800);
    await page.getByRole("button", { name: area.view === "homepage" ? /^Homepage$/ : area.view === "cv" ? /^Curriculum Vitae$/ : /^Portfolio$/ }).first().click();
    await page.locator(area.frame).waitFor();
    await page.waitForTimeout(3000);
    const back = await state(page, area.frame);
    info(`${area.name}: after leaving and returning`, `preview lang="${back.lang}", button shows "${await label(page, area.toggle)}" (${back.lang === "vi" ? "choice remembered" : "reset to EN"})`);
    await context.close();
  }
}
await browser.close();
console.log(failures ? `\n${failures} FAIL` : "\nAll PASS");
process.exit(failures ? 1 : 0);
