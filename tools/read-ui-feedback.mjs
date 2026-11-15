// Đọc sổ lỗi UI/UX trên Google Docs (docs/93-workflow-friction.md, ADR-023).
// Tải Doc dạng .docx qua link "ai có link đều xem được", giải nén ra thư mục tạm NGOÀI repo
// (ảnh có thể chứa dữ liệu riêng), rồi in mỗi dòng bảng: STT · Màn hình · Nội dung · Trạng thái · ảnh.
//
//   node tools/read-ui-feedback.mjs                in mọi dòng có nội dung (kèm mã dòng)
//   node tools/read-ui-feedback.mjs --new          chỉ dòng CHƯA xử lý (mã dòng chưa có trong tools/ui-feedback-seen.txt)
//   node tools/read-ui-feedback.mjs --mark <mã> "<W-xx / UI-xx>"   ghi một dòng là đã xử lý
//
// Mã dòng = 8 ký tự đầu SHA-1 của "Màn hình + Nội dung", nên chèn / xóa dòng (STT đổi) không làm nhầm.
// Người vận hành sửa nội dung một dòng đã xử lý → mã đổi → dòng hiện lại như dòng mới (đúng ý: có ý mới).
// Link lấy từ project-links.local (UI_FEEDBACK_DOC=...), file này không vào Git.
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const seenFile = new URL("./ui-feedback-seen.txt", import.meta.url);
const markIndex = process.argv.indexOf("--mark");
if (markIndex !== -1) {
  const [id, ref] = process.argv.slice(markIndex + 1);
  if (!/^[0-9a-f]{8}$/.test(id ?? "") || !ref) throw new Error('Usage: --mark <8-hex row id> "<W-xx / UI-xx>"');
  appendFileSync(seenFile, `${id} ${ref} ${new Date().toISOString().slice(0, 10)}\n`);
  console.log(`Đã ghi ${id} → ${ref}`);
  process.exit(0);
}

const onlyNew = process.argv.includes("--new");
const seen = new Map(existsSync(seenFile)
  ? readFileSync(seenFile, "utf8").split("\n").filter((line) => /^[0-9a-f]{8} /.test(line)).map((line) => [line.slice(0, 8), line.slice(9)])
  : []);
const links = readFileSync(new URL("../project-links.local", import.meta.url), "utf8");
const docUrl = links.match(/^UI_FEEDBACK_DOC=(.+)$/m)?.[1]?.trim();
const docId = docUrl?.match(/\/document\/d\/([^/]+)/)?.[1];
if (!docId) throw new Error("UI_FEEDBACK_DOC is missing in project-links.local.");

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const outDir = join(tmpdir(), "pf-ui-feedback", stamp);
mkdirSync(join(outDir, "x"), { recursive: true });

const response = await fetch(`https://docs.google.com/document/d/${docId}/export?format=docx`);
if (!response.ok) throw new Error(`Download failed: HTTP ${response.status}. Is the Doc shared as "Anyone with the link can view"?`);
writeFileSync(join(outDir, "feedback.docx"), Buffer.from(await response.arrayBuffer()));
// Windows: tar.exe của hệ thống (bsdtar) mở được zip; tar của Git Bash (GNU) thì không. Đường dẫn tương đối để "C:" không bị hiểu là máy chủ.
if (process.platform === "win32") execFileSync(join(process.env.SystemRoot ?? "C:\\Windows", "System32", "tar.exe"), ["-xf", "feedback.docx", "-C", "x"], { cwd: outDir });
else execFileSync("unzip", ["-q", "feedback.docx", "-d", "x"], { cwd: outDir });

const extractDir = join(outDir, "x");
const xml = readFileSync(join(extractDir, "word", "document.xml"), "utf8");
const rels = Object.fromEntries([...readFileSync(join(extractDir, "word", "_rels", "document.xml.rels"), "utf8").matchAll(/Id="([^"]+)"[^>]*Target="([^"]+)"/g)].map((m) => [m[1], m[2]]));
const decode = (s) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
const text = (cell) => cell.split("</w:p>").map((p) => decode([...p.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map((m) => m[1]).join(""))).filter(Boolean).join(" / ");
const images = (cell) => [...cell.matchAll(/r:embed="([^"]+)"/g)].map((m) => join(extractDir, "word", rels[m[1]]));
const rowId = (screen, content) => createHash("sha1").update(`${screen.trim()}\n${content.trim()}`).digest("hex").slice(0, 8);

console.log(`Đã tải: ${outDir}`);
let shown = 0, skipped = 0;
for (const table of xml.split("<w:tbl>").slice(1)) {
  const rows = table.split("</w:tbl>")[0].split("</w:tr>").filter((row) => row.includes("<w:tc"));
  for (const row of rows.slice(1)) {
    const [no, screen = "", picture = "", content = "", status = ""] = row.split("</w:tc>").filter((cell) => cell.includes("<w:tc"));
    if (!text(content) && !images(picture).length) continue;
    const id = rowId(text(screen), text(content));
    if (onlyNew && seen.has(id)) { skipped++; continue; }
    shown++;
    console.log(`\n#${text(no ?? "").replace(/\.$/, "")} [${id}]${seen.has(id) ? ` (đã xử lý: ${seen.get(id)})` : ""} · ${text(screen) || "(không ghi màn hình)"} · Trạng thái: ${text(status) || "(trống)"}`);
    console.log(`  Nội dung: ${text(content)}`);
    for (const image of images(picture)) console.log(`  Ảnh: ${image}`);
  }
}
console.log(`\n${shown} dòng${onlyNew ? ` mới, bỏ qua ${skipped} dòng đã xử lý` : ""}.`);
