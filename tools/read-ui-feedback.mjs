// Đọc sổ lỗi UI/UX trên Google Docs (docs/93-workflow-friction.md, ADR-023).
// Tải Doc dạng .docx qua link "ai có link đều xem được", giải nén ra thư mục tạm NGOÀI repo
// (ảnh có thể chứa dữ liệu riêng), rồi in mỗi dòng bảng: STT · Màn hình · Nội dung · Trạng thái · ảnh.
//
//   node tools/read-ui-feedback.mjs          in mọi dòng có nội dung
//   node tools/read-ui-feedback.mjs --new    chỉ dòng có Trạng thái trống hoặc "Mới"
//
// Link lấy từ project-links.local (UI_FEEDBACK_DOC=...), file này không vào Git.
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const onlyNew = process.argv.includes("--new");
const links = readFileSync(new URL("../project-links.local", import.meta.url), "utf8");
const docUrl = links.match(/^UI_FEEDBACK_DOC=(.+)$/m)?.[1]?.trim();
const docId = docUrl?.match(/\/document\/d\/([^/]+)/)?.[1];
if (!docId) throw new Error("UI_FEEDBACK_DOC is missing in project-links.local.");

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const outDir = join(tmpdir(), "pf-ui-feedback", stamp);
const extractDir = join(outDir, "x");
mkdirSync(extractDir, { recursive: true });

const response = await fetch(`https://docs.google.com/document/d/${docId}/export?format=docx`);
if (!response.ok) throw new Error(`Download failed: HTTP ${response.status}. Is the Doc shared as "Anyone with the link can view"?`);
const zipPath = join(outDir, "feedback.docx");
writeFileSync(zipPath, Buffer.from(await response.arrayBuffer()));
// Windows: tar.exe của hệ thống (bsdtar) mở được zip; tar của Git Bash (GNU) thì không. Đường dẫn tương đối để "C:" không bị hiểu là máy chủ.
if (process.platform === "win32") execFileSync(join(process.env.SystemRoot ?? "C:\\Windows", "System32", "tar.exe"), ["-xf", "feedback.docx", "-C", "x"], { cwd: outDir });
else execFileSync("unzip", ["-q", "feedback.docx", "-d", "x"], { cwd: outDir });

const xml = readFileSync(join(extractDir, "word", "document.xml"), "utf8");
const rels = Object.fromEntries([...readFileSync(join(extractDir, "word", "_rels", "document.xml.rels"), "utf8").matchAll(/Id="([^"]+)"[^>]*Target="([^"]+)"/g)].map((m) => [m[1], m[2]]));
const decode = (s) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
const text = (cell) => cell.split("</w:p>").map((p) => decode([...p.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map((m) => m[1]).join(""))).filter(Boolean).join(" / ");
const images = (cell) => [...cell.matchAll(/r:embed="([^"]+)"/g)].map((m) => join(extractDir, "word", rels[m[1]]));

console.log(`Đã tải: ${outDir}`);
for (const table of xml.split("<w:tbl>").slice(1)) {
  const rows = table.split("</w:tbl>")[0].split("</w:tr>").filter((row) => row.includes("<w:tc"));
  for (const row of rows.slice(1)) {
    const cells = row.split("</w:tc>").filter((cell) => cell.includes("<w:tc"));
    const [no, screen, picture, content, status] = cells;
    if (!content || (!text(content) && !images(picture ?? "").length)) continue;
    const state = text(status ?? "");
    if (onlyNew && state && !/^mới$/i.test(state)) continue;
    console.log(`\n#${text(no).replace(/\.$/, "")} · ${text(screen) || "(không ghi màn hình)"} · Trạng thái: ${state || "(trống)"}`);
    console.log(`  Nội dung: ${text(content)}`);
    for (const image of images(picture ?? "")) console.log(`  Ảnh: ${image}`);
  }
}
