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
//   photo-fit    ảnh hồ sơ hiện nguyên: tỉ lệ khung ảnh lệch tỉ lệ ảnh ≤ 0,08 (ảnh vuông thì khung vuông; ADR-035)
//   titleblock-fit khung bản vẽ của hero ôm sát nội dung: không dải trống dưới bảng tên (≤ 2 px) và không khe giữa ảnh và bảng tên (≤ 4 px)
//   nav-fit      (≤ 900) menu **một hàng**: đủ 4 mục, **không cuộn ngang**, không mục nào ngoài khung (ADR-039, W-32; thay 2 × 2 của ADR-037 a / ADR-038)
//   header-top-clear (≤ 900) chưa cuộn: header **trong suốt** (nền alpha 0, không bóng), lưới liền tới đỉnh trang (ADR-042)
//   header-frosted   (≤ 900) đã cuộn 700 px: nền **mờ** (alpha 0,8 – 0,95), có backdrop-filter blur, có bóng nhẹ (ADR-042)
//   header-sticky (≤ 900) header **dính trên cùng** khi cuộn: sau khi cuộn 700 px, đỉnh header = 0, nền không trong suốt, vẫn thấy menu (ADR-040, W-34)
//   nav-line     (≤ 900) menu **không đường kẻ** dưới cả hàng (border-bottom = 0; ADR-040)
//   anchor-clear (≤ 900) bấm một mục menu: tiêu đề section đích nằm **dưới** header dính, không bị che (ADR-040)
//   sheet-cell   (điện thoại ≤ 650, một cột) ô "SHEET 01 / 01" của khung bản vẽ **luôn hiện**, mọi chiều cao màn hình, cả EN và VI (Sổ #37, ADR-040; chỉ máy tính hai cột ≥ 651 px mới ẩn khi thấp hơn 821 px)
//   nav-flat     (≤ 900) menu **phẳng** như hình 2 của Sổ #33: mục không viền, nền trong suốt (chỉ được có một đường kẻ dưới cả hàng); mỗi mục cao ≥ 44 px, rộng ≥ 44 px, chữ ≥ 12 px (ADR-039)
//   buttons-equal (điện thoại ≤ 650) các nút hero cùng độ rộng, xếp 2 × 2 (ADR-037 c, W-28)
//   grid-alpha   độ đậm lưới `--grid-alpha` ≤ 8 % khi màn ≤ 650 px, 14 % ở máy tính (ADR-037 b, W-28)
//   cards-aligned (≥ 2 thẻ cùng hàng) tiêu đề, tóm tắt, thẻ công nghệ, link của các thẻ cùng hàng nằm đúng cùng một độ cao (subgrid; ADR-037, W-27, UI-08)
//   images       không ảnh hỏng
// Thoát mã 1 nếu có FAIL.
import { chromium } from "playwright";

const section = (process.argv.find((arg) => arg.startsWith("--section=")) ?? "--section=all").split("=")[1];
const origin = process.env.PF_ORIGIN ?? "http://localhost:5199";
const sets = {
  phone: [[320, 568], [360, 640], [360, 800], [375, 667], [390, 844], [393, 852], [412, 915], [430, 932]],
  desktop: [[1440, 731], [1920, 940], [2560, 1300]],
  preview: [[1440, 900], [1280, 800], [900, 800], [768, 1024], [651, 900], [390, 844]],
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
      const photo = document.querySelector("img.hero__photo");
      const photoGap = photo && photo.naturalWidth ? Math.round(Math.abs(photo.clientWidth / photo.clientHeight - photo.naturalWidth / photo.naturalHeight) * 100) / 100 : null;
      const sheet = document.querySelector(".hero__sheet");
      const photoBox = document.querySelector(".hero__viewport");
      const block = document.querySelector(".hero__titleblock");
      const stripGap = sheet && block ? Math.round(sheet.getBoundingClientRect().bottom - block.getBoundingClientRect().bottom) : null;
      const photoGapBelow = photoBox && block ? Math.round(block.getBoundingClientRect().top - photoBox.getBoundingClientRect().bottom) : null;
      const navCellEls = [...document.querySelectorAll(".site-nav__links a")].filter(visible);
      const bordered = (el) => { const s = getComputedStyle(el); return ["Top", "Right", "Bottom", "Left"].filter((side) => parseFloat(s["border" + side + "Width"]) >= 1 && s["border" + side + "Style"] !== "none" && !/rgba\(\s*\d+,\s*\d+,\s*\d+,\s*0\s*\)|transparent/.test(s["border" + side + "Color"])).length; };
      const navFlat = { count: navCellEls.length, bordered: navCellEls.filter((a) => bordered(a) + bordered(a.parentElement) > 0).length, filled: navCellEls.filter((a) => !/rgba\(\s*\d+,\s*\d+,\s*\d+,\s*0\s*\)|transparent/.test(getComputedStyle(a).backgroundColor)).length, small: navCellEls.filter((a) => { const b = a.getBoundingClientRect(); return b.width < 44 || b.height < 44; }).length };
      const navEls = [...document.querySelectorAll(".site-nav__links a")].filter(visible);
      const navBoxes = navEls.map((a) => a.getBoundingClientRect());
      const navList = document.querySelector(".site-nav__links");
      const navTops = [...new Set(navBoxes.map((b) => Math.round(b.top)))];
      const navWidths = navBoxes.map((b) => Math.round(b.width));
      const nav = { count: navEls.length, scrolls: navList ? navList.scrollWidth > navList.clientWidth + 1 : false, rows: navTops.length, widthSpread: navWidths.length ? Math.max(...navWidths) - Math.min(...navWidths) : 0, outside: navBoxes.filter((b) => b.right > innerWidth + 1 || b.left < -1).length };
      const btnBoxes = [...document.querySelectorAll(".hero__actions .button, .hero__actions a, .hero__actions button")].filter(visible).map((el) => el.getBoundingClientRect());
      const btnTops = [...new Set(btnBoxes.map((b) => Math.round(b.top)))];
      const btnWidths = btnBoxes.map((b) => Math.round(b.width));
      const buttons = { count: btnBoxes.length, rows: btnTops.length, widthSpread: btnWidths.length ? Math.max(...btnWidths) - Math.min(...btnWidths) : 0 };
      const alphaRaw = getComputedStyle(document.documentElement).getPropertyValue("--grid-alpha").trim() || getComputedStyle(document.body).getPropertyValue("--grid-alpha").trim();
      const gridAlpha = parseFloat(alphaRaw);
      const cards = [...document.querySelectorAll(".project-card")].filter(visible);
      const cardRows = new Map();
      for (const c of cards) { const k = Math.round(c.getBoundingClientRect().top); (cardRows.get(k) ?? cardRows.set(k, []).get(k)).push(c); }
      let cardSpread = 0; let cardRowsChecked = 0;
      for (const row of cardRows.values()) {
        if (row.length < 2) continue; cardRowsChecked += 1;
        for (const sel of [".project-card__title", ".project-card__meta", ".project-card__summary", ".tag-list", ".project-card__link"]) {
          const tops = row.map((c) => { const e = c.querySelector(sel); return e ? Math.round(e.getBoundingClientRect().top) : null; }).filter((v) => v !== null);
          if (tops.length > 1) cardSpread = Math.max(cardSpread, Math.max(...tops) - Math.min(...tops));
        }
      }
      const sheetEl = document.querySelector(".hero__cell--sheet");
      const sheetShown = sheetEl ? getComputedStyle(sheetEl).display !== "none" && sheetEl.getBoundingClientRect().height > 0 : null;
      const broken = [...document.images].filter((i) => i.complete && i.naturalWidth === 0).length;
      return { sheetShown, navFlat, nav, buttons, gridAlpha, alphaRaw, cardSpread, cardRowsChecked, photoGapBelow, stripGap, photoGap, hscroll: document.documentElement.scrollWidth > innerWidth + 1, overflow, ctaBottom, nextTop, navLinks, smallTargets, tinyText, smallParagraphs, broken, vh: innerHeight };
    }, { phone: isPhone });
    report(!r.hscroll && r.overflow.length === 0, `${tag}  no-hscroll`, r.overflow.length ? `(${r.overflow.join(", ")})` : "");
    report(r.ctaBottom !== null && r.ctaBottom <= r.vh, `${tag}  first-screen`, `(nút chính kết thúc ở ${r.ctaBottom} px / ${r.vh} px)`);
    if (!isPhone) report(r.nextTop !== null && r.nextTop <= r.vh - 24, `${tag}  peek`, `(tiêu đề section kế tiếp ở ${r.nextTop} px / ${r.vh} px)`);
    if (isPhone) {
      report(r.navLinks >= 3, `${tag}  nav`, `(${r.navLinks} link thấy được)`);
      report(r.smallTargets.length === 0, `${tag}  tap`, r.smallTargets.length ? `(${r.smallTargets.join("; ")})` : "");
    }
    report(r.tinyText.length === 0 && r.smallParagraphs === 0, `${tag}  font`, r.tinyText.length || r.smallParagraphs ? `(${[...r.tinyText, r.smallParagraphs ? `${r.smallParagraphs} đoạn văn < 14 px` : ""].filter(Boolean).join("; ")})` : "");
    if (r.photoGap !== null) report(r.photoGap <= 0.08, `${tag}  photo-fit`, `(tỉ lệ khung lệch tỉ lệ ảnh ${r.photoGap}; ảnh hồ sơ phải hiện nguyên, không bị cắt)`);
    if (r.stripGap !== null) report(r.stripGap <= 2 && r.photoGapBelow <= 4, `${tag}  titleblock-fit`, `(khung bản vẽ: dải trống ${r.stripGap} px dưới bảng tên, ${r.photoGapBelow} px giữa ảnh và bảng tên; phải ≤ 2 và ≤ 4)`);
    if (width <= 900) {
      report(r.nav.count >= 4 && !r.nav.scrolls && r.nav.outside === 0 && r.nav.rows === 1, `${tag}  nav-fit`, `(${r.nav.count} mục, ${r.nav.rows} hàng, ${r.nav.scrolls ? "còn cuộn ngang, " : ""}${r.nav.outside} mục ngoài khung; phải 4 mục, 1 hàng, không cuộn, không ngoài khung)`);
    }
    if (width <= 650) {
      if (r.buttons.count) report(r.buttons.count >= 4 ? r.buttons.rows === 2 && r.buttons.widthSpread <= 2 : r.buttons.widthSpread <= 2, `${tag}  buttons-equal`, `(${r.buttons.count} nút, ${r.buttons.rows} hàng, lệch độ rộng ${r.buttons.widthSpread} px; phải 2 × 2 và lệch ≤ 2)`);
    }
    if (width <= 900) report(r.navFlat.count >= 4 && r.navFlat.bordered === 0 && r.navFlat.filled === 0 && r.navFlat.small === 0, `${tag}  nav-flat`, `(${r.navFlat.count} mục; ${r.navFlat.bordered} mục còn viền, ${r.navFlat.filled} mục có nền, ${r.navFlat.small} mục nhỏ hơn 44 px; phải phẳng, không viền, không nền, ≥ 44 × 44)`);
    report(width <= 650 ? r.gridAlpha <= 8 : r.gridAlpha === 14, `${tag}  grid-alpha`, `(--grid-alpha = ${r.alphaRaw}; phải ≤ 8 % khi ≤ 650 px, 14 % ở máy tính)`);
    if (r.cardRowsChecked) report(r.cardSpread <= 1, `${tag}  cards-aligned`, `(${r.cardRowsChecked} hàng thẻ; lệch cao nhất ${r.cardSpread} px giữa các thẻ cùng hàng; phải ≤ 1)`);
    if (width <= 650 && r.sheetShown !== null) report(r.sheetShown, `${tag}  sheet-cell`, `(ô SHEET 01 / 01 ${r.sheetShown ? "hiện" : "bị ẩn"} ở ${width} × ${height}; phải luôn hiện ở ≤ 650 px)`);
    report(r.broken === 0, `${tag}  images`, r.broken ? `(${r.broken} ảnh hỏng)` : "");
    if (width <= 900) {
      await page.evaluate(() => window.scrollTo(0, 0));
      const line = await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector(".site-nav__links")).borderBottomWidth));
      report(line === 0, `${tag}  nav-line`, `(border-bottom của menu = ${line} px; phải 0)`);
      const look = () => page.evaluate(() => { const s = getComputedStyle(document.querySelector(".site-header")); const c = s.backgroundColor; let alpha = 1; let m = c.match(/\/\s*([\d.]+)(%?)\s*\)/); if (m) alpha = m[2] ? Number(m[1]) / 100 : Number(m[1]); else { m = c.match(/^rgba\([^,]+,[^,]+,[^,]+,\s*([\d.]+)\)/); if (m) alpha = Number(m[1]); else if (c === "transparent") alpha = 0; } return { alpha, blur: (s.backdropFilter || s.webkitBackdropFilter || "none"), shadow: s.boxShadow }; });
      await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(300);
      const atTop = await look();
      report(atTop.alpha === 0 && atTop.shadow === "none", `${tag}  header-top-clear`, `(chưa cuộn: alpha nền ${atTop.alpha}, bóng ${atTop.shadow === "none" ? "không" : "có"}; phải alpha 0, không bóng)`);
      await page.evaluate(() => window.scrollTo(0, 700)); await page.waitForTimeout(500);
      const moved = await look();
      report(moved.alpha >= 0.8 && moved.alpha <= 0.95 && /blur\(/.test(moved.blur) && moved.shadow !== "none", `${tag}  header-frosted`, `(đã cuộn: alpha ${moved.alpha}, backdrop-filter ${moved.blur}, bóng ${moved.shadow === "none" ? "không" : "có"}; phải alpha 0,8 – 0,95, có blur, có bóng)`);
      const st = await page.evaluate(() => { const h = document.querySelector(".site-header"); const r = h.getBoundingClientRect(); const s = getComputedStyle(h); const links = [...h.querySelectorAll(".site-nav__links a")].filter((a) => a.getBoundingClientRect().height > 0 && a.getBoundingClientRect().bottom > 0).length; return { top: Math.round(r.top), bottom: Math.round(r.bottom), bg: s.backgroundColor, links }; });
      const opaque = !/rgba\(\s*\d+,\s*\d+,\s*\d+,\s*0\s*\)|transparent/.test(st.bg);
      report(st.top === 0 && opaque && st.links >= 4, `${tag}  header-sticky`, `(sau khi cuộn 700 px: đỉnh header ${st.top} px, nền ${opaque ? "đặc" : "trong suốt"}, ${st.links} mục menu thấy được; phải 0, đặc, 4)`);
      const hrefs = await page.evaluate(() => [...document.querySelectorAll(".site-nav__links a")].map((a) => a.getAttribute("href")).filter((h) => h && h.startsWith("#")));
      let covered = 0;
      for (const href of hrefs) {
        await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(150);
        await page.evaluate((h) => { location.hash = ""; document.querySelector(`.site-nav__links a[href="${h}"]`).click(); }, href);
        await page.waitForTimeout(500);
        const gap = await page.evaluate((h) => { const sec = document.querySelector(h); const head = sec.querySelector(".section-heading, .section-kicker, h2") ?? sec; const hb = document.querySelector(".site-header").getBoundingClientRect().bottom; return Math.round(head.getBoundingClientRect().top - hb); }, href);
        if (gap < 0) covered += 1;
      }
      report(hrefs.length >= 4 && covered === 0, `${tag}  anchor-clear`, `(${hrefs.length} link, ${covered} tiêu đề section bị header che; phải 0)`);
    }
    await context.close();
  }
}
// Menu in Vietnamese (ADR-039): the longest labels must fit one row too (nav-fit, nav-flat).
if (wanted.includes("phone")) {
  for (const [width, height] of [[320, 568], [360, 800], [390, 844]]) {
    const tag = `phone ${width}×${height} vi`;
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion: "reduce", hasTouch: true, isMobile: true });
    const page = await context.newPage();
    await page.goto(`${origin}/?lang=vi`, { waitUntil: "networkidle", timeout: 60_000 });
    await page.waitForSelector(".hero, #top", { timeout: 30_000 });
    await page.waitForTimeout(1500);
    const r = await page.evaluate(() => {
      const links = [...document.querySelectorAll(".site-nav__links a")].filter((a) => a.getBoundingClientRect().width > 0);
      const list = document.querySelector(".site-nav__links");
      const boxes = links.map((a) => a.getBoundingClientRect());
      const side = (el) => ["Top", "Right", "Bottom", "Left"].some((x) => parseFloat(getComputedStyle(el)["border" + x + "Width"]) >= 1 && getComputedStyle(el)["border" + x + "Style"] !== "none");
      return {
        count: links.length,
        rows: new Set(boxes.map((b) => Math.round(b.top))).size,
        scrolls: list.scrollWidth > list.clientWidth + 1,
        outside: boxes.filter((b) => b.left < -0.5 || b.right > innerWidth + 0.5).length,
        textFit: links.filter((a) => a.scrollWidth > a.clientWidth + 1).length,
        bordered: links.filter(side).length,
        small: boxes.filter((b) => b.width < 44 || b.height < 44).length,
        font: getComputedStyle(links[0]).fontSize,
      };
    });
    report(r.count >= 4 && r.rows === 1 && !r.scrolls && r.outside === 0 && r.textFit === 0, `${tag}  nav-fit`, `(${r.count} mục, ${r.rows} hàng, ${r.scrolls ? "còn cuộn ngang, " : ""}${r.outside} mục ngoài khung, ${r.textFit} chữ bị cắt, chữ ${r.font})`);
    report(r.bordered === 0 && r.small === 0, `${tag}  nav-flat`, `(${r.bordered} mục còn viền, ${r.small} mục < 44 px)`);
    await context.close();
  }
}
await browser.close();
console.log(failures ? `\n${failures} FAIL` : "\nAll PASS");
process.exit(failures ? 1 : 0);
