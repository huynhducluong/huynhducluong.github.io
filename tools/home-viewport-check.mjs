// Đo trang chủ công khai trên ma trận màn hình của dự án (docs/ui-guidelines.md §2.2, ADR-034; GD3-12, GD3-13).
// Chỉ đọc: không đăng nhập, không ghi gì. Chạy với trang đang chạy:
//
//   node tools/home-viewport-check.mjs                       (mặc định http://localhost:5199 — npm run dev -- --port 5199 --strictPort)
//   PF_ORIGIN=https://huynhducluong.github.io node tools/home-viewport-check.mjs   (đo trang đã deploy)
//   node tools/home-viewport-check.mjs --section=phone|desktop|preview|all
//
// Ma trận (CSS px): ĐIỆN THOẠI 320×568, 360×640, 375×667, 390×844, 393×852, 412×915, 430×932 (tối ưu đẹp nhất, ưu tiên số 1);
// MÁY TÍNH 1440×731 (laptop), 1920×940, 2560×1300 (ba màn hình mục tiêu); PREVIEW ADMIN 1440×900, 1280×800, 768×1024, 390×844
// (độ rộng của bộ chọn viewport Website trong Admin: desktop 1440, laptop 1280, tablet 768, mobile 390).
// Mỗi dòng in PASS / FAIL:
//   no-hscroll   không cuộn ngang, không phần tử nào tràn mép phải (trừ vùng tự cuộn ngang)
//   first-screen nút chính của hero (View projects) nằm trọn trong màn hình đầu tiên
//   peek         (không phải điện thoại) **nội dung** đầu của section kế tiếp (kicker / tiêu đề) lộ ra ≥ 24 px ở đáy màn hình đầu: hero không che hết màn hình (Sổ #24)
//   nav          (điện thoại, kể cả preview 390) có đường tới các mục (≥ 3 link điều hướng thấy được hoặc cuộn được)
//   tap          (điện thoại, kể cả preview 390) link / nút trong header, hero, chip, nút ≥ 44 px mỗi chiều
//   font         chữ nào cũng ≥ 12 px, đoạn văn (p) ≥ 14 px trên điện thoại
//   images       không ảnh hỏng
// Thoát mã 1 nếu có FAIL.
import { chromium } from "playwright";

const section = (process.argv.find((arg) => arg.startsWith("--section=")) ?? "--section=all").split("=")[1];
const origin = process.env.PF_ORIGIN ?? "http://localhost:5199";
const sets = {
  phone: [[320, 568], [360, 640], [375, 667], [390, 844], [393, 852], [412, 915], [430, 932]],
  desktop: [[1440, 731], [1920, 940], [2560, 1300]],
  preview: [[1440, 900], [1280, 800], [768, 1024], [390, 844]],
};
const wanted = section === "all" ? Object.keys(sets) : [section];

let failures = 0;
const report = (ok, label, detail = "") => { if (!ok) failures += 1; console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `  ${detail}` : ""}`); };

const browser = await chromium.launch();
for (const kind of wanted) {
  for (const [width, height] of sets[kind]) {
    const tag = `${kind} ${width}×${height}`;
    const isPhone = kind === "phone" || width <= 430;
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion: "reduce", hasTouch: isPhone, isMobile: isPhone });
    const page = await context.newPage();
    await page.goto(origin + "/", { waitUntil: "networkidle", timeout: 60_000 });
    await page.waitForSelector(".hero, #top", { timeout: 30_000 });
    await page.waitForTimeout(1500);
    const r = await page.evaluate(({ phone }) => {
      const visible = (el) => { const b = el.getBoundingClientRect(); const s = getComputedStyle(el); return b.width > 0 && b.height > 0 && s.visibility !== "hidden" && s.display !== "none"; };
      const inScroller = (el) => { for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) { const o = getComputedStyle(n).overflowX; if ((o === "auto" || o === "scroll") && n.scrollWidth > n.clientWidth) return true; } return false; };
      const overflow = [...document.querySelectorAll("body *")].filter((el) => visible(el) && !inScroller(el) && el.getBoundingClientRect().right > innerWidth + 1 && getComputedStyle(el).position !== "fixed").map((el) => `${el.tagName.toLowerCase()}.${String(el.className).split(" ")[0]}`).slice(0, 4);
      const cta = document.querySelector(".hero__actions .button, .hero .button, #top .button");
      const ctaBottom = cta ? Math.round(cta.getBoundingClientRect().bottom) : null;
      const sections = [...document.querySelectorAll("main > section")];
      const next = sections[1];
      const nextHeading = next ? next.querySelector(".section-heading, .section-kicker, h2") : null;
      const nextTop = nextHeading ? Math.round(nextHeading.getBoundingClientRect().top) : null;
      const navLinks = [...document.querySelectorAll(".site-nav__links a")].filter((a) => { const b = a.getBoundingClientRect(); return b.width > 0 && b.height > 0 && getComputedStyle(a).visibility !== "hidden"; }).length;
      const tapSelectors = ".site-header a, .site-header button, #top a, #top button, .chip, .button, .section-more, .text-link";
      const smallTargets = [...document.querySelectorAll(tapSelectors)].filter((el) => visible(el) && !inScroller(el) && (el.getBoundingClientRect().width < 44 || el.getBoundingClientRect().height < 44)).map((el) => `${(el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 14)} ${Math.round(el.getBoundingClientRect().width)}×${Math.round(el.getBoundingClientRect().height)}`).slice(0, 5);
      const tinyText = [...document.querySelectorAll("p, li, a, button, span, dd, dt, small, label, h1, h2, h3, h4")].filter((el) => visible(el) && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())).filter((el) => parseFloat(getComputedStyle(el).fontSize) < 12).map((el) => `${el.tagName.toLowerCase()} ${parseFloat(getComputedStyle(el).fontSize).toFixed(1)}px`).slice(0, 4);
      const smallParagraphs = phone ? [...document.querySelectorAll("p")].filter((el) => visible(el) && el.textContent.trim().length > 40 && parseFloat(getComputedStyle(el).fontSize) < 14).length : 0;
      const broken = [...document.images].filter((i) => i.complete && i.naturalWidth === 0).length;
      return { hscroll: document.documentElement.scrollWidth > innerWidth + 1, overflow, ctaBottom, nextTop, navLinks, smallTargets, tinyText, smallParagraphs, broken, vh: innerHeight };
    }, { phone: isPhone });
    report(!r.hscroll && r.overflow.length === 0, `${tag}  no-hscroll`, r.overflow.length ? `(${r.overflow.join(", ")})` : "");
    report(r.ctaBottom !== null && r.ctaBottom <= r.vh, `${tag}  first-screen`, `(nút chính kết thúc ở ${r.ctaBottom} px / ${r.vh} px)`);
    if (!isPhone) report(r.nextTop !== null && r.nextTop <= r.vh - 24, `${tag}  peek`, `(tiêu đề section kế tiếp ở ${r.nextTop} px / ${r.vh} px)`);
    if (isPhone) {
      report(r.navLinks >= 3, `${tag}  nav`, `(${r.navLinks} link thấy được)`);
      report(r.smallTargets.length === 0, `${tag}  tap`, r.smallTargets.length ? `(${r.smallTargets.join("; ")})` : "");
    }
    report(r.tinyText.length === 0 && r.smallParagraphs === 0, `${tag}  font`, r.tinyText.length || r.smallParagraphs ? `(${[...r.tinyText, r.smallParagraphs ? `${r.smallParagraphs} đoạn văn < 14 px` : ""].filter(Boolean).join("; ")})` : "");
    report(r.broken === 0, `${tag}  images`, r.broken ? `(${r.broken} ảnh hỏng)` : "");
    await context.close();
  }
}
await browser.close();
console.log(failures ? `\n${failures} FAIL` : "\nAll PASS");
process.exit(failures ? 1 : 0);
