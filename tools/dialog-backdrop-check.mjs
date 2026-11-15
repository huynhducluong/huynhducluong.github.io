// Kiểm tra hành vi "bấm ra ngoài vùng hộp thoại" của mọi dialog Admin (docs/admin-ui-guidelines.md §8.1, W-07).
// Chỉ mở, bấm và đóng; không lưu gì.
//
//   1) npm run dev -- --port 5199 --strictPort        (một cửa sổ riêng)
//   2) node tools/dialog-backdrop-check.mjs
//
// Cần phiên đăng nhập `.auth/admin.json` (npm run shots:login). Mỗi ca in PASS / FAIL; thoát mã 1 nếu có FAIL.
//   backdrop-closes    bấm vào nền tối bên ngoài đóng hộp (hộp chỉ đọc, hộp một ô ngắn)
//   inside-stays       bấm trong hộp không đóng
//   drag-out-stays     nhấn trong ô nhập, kéo ra ngoài rồi thả (bôi đen chữ) không đóng nhầm
//   dirty-asks         hộp nhiều trường đã gõ dở: bấm ra ngoài hỏi "Discard changes"; Keep editing giữ nguyên, Discard mới đóng
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const origin = process.env.PF_ORIGIN ?? "http://localhost:5199";
const authFile = fileURLToPath(new URL("../.auth/admin.json", import.meta.url));
if (!existsSync(authFile)) throw new Error("Missing .auth/admin.json — run `npm run shots:login` once.");

const readOnly = [
  ["Website › History", "homepage", "[data-website-history-open]"],
  ["Website › Pre-publish check", "homepage", "[data-website-validation-open]"],
  ["CV › History", "cv", "[data-document-history-open]"],
  ["CV › Pre-publish check", "cv", "[data-document-validation-open]"],
  ["Portfolio › History", "portfolio", "[data-document-history-open]"],
  ["Portfolio › Pre-publish check", "portfolio", "[data-document-validation-open]"],
  ["Cover letters › Check", "cover-letters", "[data-cl-validation-open]"],
  ["Security (password)", "overview", "[data-password-open]"],
];

const browser = await chromium.launch();
let failures = 0;
const report = (ok, label, detail = "") => { if (!ok) failures += 1; console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `  ${detail}` : ""}`); };
const session = async (view) => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, storageState: authFile, reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto(`${origin}/admin/?view=${view}`, { waitUntil: "networkidle" });
  await page.locator(".admin-shell").waitFor({ timeout: 30_000 });
  return { context, page };
};
const openCount = (page) => page.locator("dialog[open]").count();
// Leave nothing open between checks (Esc, then "Discard changes" if a confirmation appears), so one failing case cannot block the next.
const closeAll = async (page) => {
  for (let i = 0; i < 4 && (await openCount(page)); i += 1) {
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    const discard = page.locator("[data-admin-confirm-submit]");
    if (await discard.count()) { await discard.first().click().catch(() => undefined); await page.waitForTimeout(300); }
  }
};

for (const [name, view, opener] of readOnly) {
  const { context, page } = await session(view);
  const button = page.locator(opener).first();
  if (!(await button.count())) { report(false, `${name}: opener not found`, `(${opener})`); await context.close(); continue; }
  await button.click();
  await page.waitForTimeout(400);
  const dialog = page.locator("dialog[open]").first();
  const box = await dialog.boundingBox();
  // inside: the middle of the dialog's heading area, never on a control
  await page.mouse.click(box.x + box.width / 2, box.y + 24);
  await page.waitForTimeout(250);
  report((await openCount(page)) === 1, `${name}: click inside stays open`);
  await page.mouse.click(8, 8);
  await page.waitForTimeout(400);
  report((await openCount(page)) === 0, `${name}: click outside closes`);
  await context.close();
}

// Dialog with a form: Profile › Credentials › Add credential (also the drag-out and dirty checks).
{
  const { context, page } = await session("profile");
  await page.getByRole("tab", { name: "Credentials" }).first().click();
  await page.waitForTimeout(700);
  await page.getByRole("button", { name: /Add credential/ }).first().click();
  await page.waitForTimeout(500);
  // pristine form: outside click closes without asking
  await page.mouse.click(8, 8);
  await page.waitForTimeout(400);
  report((await openCount(page)) === 0, "Add credential: pristine form, click outside closes");
  await closeAll(page);
  // dirty form
  await page.getByRole("button", { name: /Add credential/ }).first().click();
  await page.waitForTimeout(500);
  const field = page.locator("dialog[open]").first().locator("input:not([type]), input[type=text]").first();
  await field.fill("Review test (never saved)");
  const fieldBox = await field.boundingBox();
  await page.mouse.move(fieldBox.x + 20, fieldBox.y + fieldBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(8, 8, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(400);
  report((await openCount(page)) === 1, "Add credential: dragging a text selection out of the field does not close it");
  await page.mouse.click(8, 8);
  await page.waitForTimeout(500);
  const asked = (await openCount(page)) === 2 && (await page.locator("[data-admin-confirm-submit]").count()) > 0;
  report(asked, "Add credential: typed text, click outside asks before closing");
  if (asked) {
    await page.locator("[data-admin-confirm-cancel]").first().click();
    await page.waitForTimeout(400);
    report((await openCount(page)) === 1, "Add credential: \"Keep editing\" keeps the form open");
    await page.mouse.click(8, 8);
    await page.waitForTimeout(500);
    await page.locator("[data-admin-confirm-submit]").first().click();
    await page.waitForTimeout(500);
    report((await openCount(page)) === 0, "Add credential: \"Discard changes\" closes everything");
  }
  await context.close();
}

await browser.close();
console.log(failures ? `\n${failures} FAIL` : "\nAll PASS");
process.exit(failures ? 1 : 0);
