// Captures the Admin at the owner's three target screens (docs/admin-ui-guidelines.md §11).
//   npm run shots:login              open a browser once, sign in, save the session
//   npm run shots                    capture every view on every screen
//   npm run shots -- --views=cv,portfolio --screens=laptop
//   npm run shots -- --path="/admin/?view=projects&item=new"
import { mkdirSync, existsSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createLogger, createServer } from "vite";
import { chromium } from "playwright";

const root = fileURLToPath(new URL("../", import.meta.url));
const authFile = `${root}.auth/admin.json`;
const outDir = `${root}tmp/screenshots`;
// A fixed port keeps the saved Supabase session (stored per origin) valid between runs.
const port = 5199;

const screens = {
  laptop: { width: 1440, height: 731 },
  monitor1: { width: 2560, height: 1300 },
  monitor2: { width: 1920, height: 940 },
};

const views = ["overview", "homepage", "projects", "tools", "profile", "cv", "portfolio", "cover-letters", "trash"];

const args = Object.fromEntries(process.argv.slice(2)
  .filter((arg) => arg.startsWith("--"))
  .map((arg) => {
    const [key, ...rest] = arg.slice(2).split("=");
    return [key, rest.join("=") || "true"];
  }));

const list = (value, fallback) => (value ? value.split(",").map((item) => item.trim()).filter(Boolean) : fallback);

// Chromium reports this benign ResizeObserver notice as an error; hide it so real errors stay visible.
const logger = createLogger("error");
const logError = logger.error;
logger.error = (message, options) => {
  if (!String(message).includes("ResizeObserver loop")) logError(message, options);
};

const server = await createServer({ root, customLogger: logger, server: { port, strictPort: true } });
await server.listen();
const origin = `http://localhost:${port}`;

const stop = async (browser, code = 0) => {
  await browser?.close();
  await server.close();
  process.exit(code);
};

if (args.login) {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ viewport: null });
  const page = await context.newPage();
  await page.goto(`${origin}/admin/`);
  console.log("Sign in to the Admin in the opened window. Waiting up to 5 minutes…");
  try {
    await page.locator(".admin-shell").waitFor({ timeout: 5 * 60_000 });
  } catch {
    console.error("Timed out before the Admin loaded.");
    await stop(browser, 1);
  }
  mkdirSync(`${root}.auth`, { recursive: true });
  await context.storageState({ path: authFile });
  console.log(`Session saved to .auth/admin.json`);
  await stop(browser);
}

if (!existsSync(authFile)) {
  console.error("No saved session. Run `npm run shots:login` first.");
  await stop(undefined, 1);
}

const screenNames = list(args.screens, Object.keys(screens));
const unknownScreen = screenNames.find((name) => !screens[name]);
if (unknownScreen) {
  console.error(`Unknown screen "${unknownScreen}". Use: ${Object.keys(screens).join(", ")}`);
  await stop(undefined, 1);
}

const targets = args.path
  ? [{ name: args.name ?? "custom", path: args.path }]
  : list(args.views, views).map((view) => ({ name: view, path: `/admin/?view=${view}` }));

const slug = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const visibleTabs = (page) => page.locator(".admin-workspace [role='tab']:visible");

const settle = async (page) => {
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(250);
};

const inspect = async (page, label) => {
  const found = await page.evaluate(() => {
    const width = document.documentElement.clientWidth;
    const describe = (element) => {
      const className = typeof element.className === "string" ? element.className.trim().split(/\s+/)[0] : "";
      return `${element.tagName.toLowerCase()}${className ? `.${className}` : ""}`;
    };
    const visible = (element) => {
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < window.innerHeight;
    };
    const elements = [...document.querySelectorAll(".admin-shell *")].filter(visible);
    const pastEdge = elements
      .filter((element) => element.getBoundingClientRect().right > width + 1)
      .slice(0, 5)
      .map(describe);
    // Text the user cannot read: a clipped single line wider than its box (with or without an ellipsis).
    const truncated = elements
      .filter((element) => !element.matches("input, select, textarea, option, svg, svg *, .sr-only"))
      .filter((element) => {
        const style = getComputedStyle(element);
        if (style.overflowX === "visible") return false;
        if (style.whiteSpace !== "nowrap" && style.textOverflow !== "ellipsis") return false;
        return element.textContent.trim() && element.scrollWidth > element.clientWidth + 1;
      })
      .map((element) => {
        const text = element.textContent.trim().replace(/\s+/g, " ");
        // Clipped user data is fine with a full-value tooltip (docs/admin-ui-guidelines.md §6.2); anything else must be fixed.
        const tooltip = (element.closest("[title]")?.getAttribute("title") ?? "").replace(/\s+/g, " ").trim();
        const label = tooltip && tooltip.startsWith(text.replace(/…$/, "").slice(0, 24)) ? "with tooltip" : "NO TOOLTIP";
        return `${label} ${describe(element)} "${text.slice(0, 70)}"`;
      });
    // Uneven rows: fields that share a grid row must start their control at the same height (docs §6.3).
    const controlOf = (cell) => cell.querySelector("input:not([type='checkbox']):not([type='radio']):not([type='hidden']), select, textarea, .admin-field-static:not([hidden]), .admin-year-picker__control");
    const misaligned = [...document.querySelectorAll(".admin-shell :is(.admin-form-grid, .admin-site-bilingual)")]
      .filter(visible)
      .flatMap((grid) => {
        const rows = new Map();
        [...grid.children].filter(visible).forEach((cell) => {
          const control = controlOf(cell);
          if (!control) return;
          const rowTop = Math.round(cell.getBoundingClientRect().top);
          rows.set(rowTop, [...(rows.get(rowTop) ?? []), control.getBoundingClientRect().top]);
        });
        return [...rows.values()]
          .filter((tops) => tops.length > 1 && Math.max(...tops) - Math.min(...tops) > 1)
          .map((tops) => `${describe(grid)} (${Math.round(Math.max(...tops) - Math.min(...tops))}px)`);
      });
    // A checkbox option must stay on one line with its text, never stacked above it.
    const stackedOptions = [...document.querySelectorAll(".admin-shell .admin-inline-check")]
      .filter(visible)
      .filter((option) => {
        const box = option.querySelector("input")?.getBoundingClientRect();
        const text = option.querySelector("span")?.getBoundingClientRect();
        return box && text && Math.abs((box.top + box.height / 2) - (text.top + text.height / 2)) > 2;
      })
      .map(describe);
    return {
      horizontal: document.documentElement.scrollWidth > width,
      pastEdge,
      truncated: [...new Set(truncated)],
      misaligned: [...new Set(misaligned)],
      stackedOptions,
    };
  });
  const report = (message) => issues.set(message, [...(issues.get(message) ?? []), label]);
  if (found.horizontal) report("page scrolls horizontally");
  if (found.pastEdge.length) report(`past right edge → ${found.pastEdge.join(", ")}`);
  for (const text of found.truncated) report(`truncated ${text}`);
  for (const grid of found.misaligned) report(`uneven field row → ${grid}`);
  for (const option of found.stackedOptions) report(`checkbox stacked above its text → ${option}`);
};

rmSync(outDir, { recursive: true, force: true });
const browser = await chromium.launch();
const issues = new Map();

for (const screenName of screenNames) {
  const context = await browser.newContext({
    viewport: screens[screenName],
    storageState: authFile,
    colorScheme: "light",
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  mkdirSync(`${outDir}/${screenName}`, { recursive: true });

  for (const target of targets) {
    await page.goto(`${origin}${target.path}`);
    try {
      await page.locator(".admin-shell").waitFor({ timeout: 20_000 });
    } catch {
      console.error(`${screenName}/${target.name}: Admin did not load. The session may have expired; run \`npm run shots:login\`.`);
      await stop(browser, 1);
    }
    await settle(page);

    // Visit every workspace tab (Overview, Media, Background, Appearance…) so hidden panels are checked too.
    const tabCount = args["no-tabs"] ? 0 : await visibleTabs(page).count();
    for (let index = 0; index <= Math.max(0, tabCount - 1); index += 1) {
      let shotName = target.name;
      if (tabCount > 1) {
        const tab = visibleTabs(page).nth(index);
        const label = (await tab.innerText()).replace(/\(\d+\)/g, "").trim();
        await tab.click();
        await settle(page);
        shotName = `${target.name}-${slug(label)}`;
      }
      await inspect(page, `${screenName}/${shotName}`);
      await page.screenshot({ path: `${outDir}/${screenName}/${shotName}.png` });
      console.log(`✓ tmp/screenshots/${screenName}/${shotName}.png`);
    }
  }
  await context.close();
}

if (issues.size) {
  console.warn("\nLayout warnings:");
  for (const [message, labels] of issues) console.warn(`  - ${message}\n      on ${labels.join(", ")}`);
}
await stop(browser);
