import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const htmlPath = fileURLToPath(new URL("../dist/admin/index.html", import.meta.url));
const html = readFileSync(htmlPath, "utf8");
const assetPaths = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+\.(?:js|css))"/g)]
  .map((match) => match[1]);
const uniqueAssets = [...new Set(assetPaths)];

const totals = uniqueAssets.reduce((result, assetPath) => {
  const extension = assetPath.endsWith(".css") ? "css" : "js";
  const contents = readFileSync(`${root}dist${assetPath}`);
  result[extension] += gzipSync(contents).byteLength;
  return result;
}, { js: 0, css: 0 });

const budgets = { js: 115 * 1024, css: 18 * 1024 };
const format = (bytes) => `${(bytes / 1024).toFixed(1)} kB gzip`;

console.log(`Admin initial JavaScript: ${format(totals.js)} / ${format(budgets.js)}`);
console.log(`Admin initial CSS: ${format(totals.css)} / ${format(budgets.css)}`);

const failures = Object.entries(budgets)
  .filter(([kind, budget]) => totals[kind] > budget)
  .map(([kind, budget]) => `${kind.toUpperCase()} is ${format(totals[kind])}; budget is ${format(budget)}.`);

if (failures.length) {
  console.error(`Admin bundle budget exceeded:\n${failures.join("\n")}`);
  process.exitCode = 1;
}
