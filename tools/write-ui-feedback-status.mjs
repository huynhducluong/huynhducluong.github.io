// Ghi cột "Trạng thái" của sổ lỗi UI/UX trên Google Docs qua cầu Apps Script (docs/ui-feedback-bridge.md).
// Chữ ghi vào ngắn gọn: một biểu tượng + 2 – 3 chữ, dòng thứ hai là mã đề bài / W-xx.
//
//   node tools/write-ui-feedback-status.mjs --plan                 in những gì SẼ ghi (không cần mạng, không ghi)
//   node tools/write-ui-feedback-status.mjs --list                 đọc bảng qua cầu: STT · mã dòng · trạng thái hiện tại
//   node tools/write-ui-feedback-status.mjs --sync                 ghi trạng thái cho mọi dòng đã có mã trong tools/ui-feedback-seen.txt
//   node tools/write-ui-feedback-status.mjs <mức> <mã dòng | #STT> ["ghi chú ngắn"]
//        mức: done ✅ Đã sửa · coding 🛠 Đang làm · review ⏳ Chờ bạn duyệt · talking 💬 Đang bàn · noted 📝 Đã ghi nhận · hold ⏸ Hoãn · no ❌ Không làm
//
// Cần trong project-links.local (không vào Git): UI_FEEDBACK_BRIDGE_URL=<địa chỉ /exec> và UI_FEEDBACK_BRIDGE_TOKEN=<TOKEN>.
import { existsSync, readFileSync } from "node:fs";

const levels = {
  done: "✅ Đã sửa",
  coding: "🛠 Đang làm",
  review: "⏳ Chờ bạn duyệt",
  talking: "💬 Đang bàn",
  noted: "📝 Đã ghi nhận",
  hold: "⏸ Hoãn",
  no: "❌ Không làm",
};

const read = (path) => (existsSync(new URL(path, import.meta.url)) ? readFileSync(new URL(path, import.meta.url), "utf8") : "");
const links = read("../project-links.local");
const setting = (key) => links.match(new RegExp(`^${key}=(.+)$`, "m"))?.[1]?.trim();

// W-xx trong docs/93 → mức. Dòng "Trạng thái" cuối bảng ghi `ĐÃ XỬ LÝ`, `GIAO CODE`, `GHI NHẬN` … (kèm mã đề bài).
const statusOfWorkflowRow = (cell) => {
  const ref = cell.match(/GD\d-\d+/)?.[0] ?? "";
  if (/rút lại|`GIỮ`/i.test(cell)) return { level: "no", note: "Không cần làm" };
  if (/ĐÃ XỬ LÝ/.test(cell)) return { level: "done", note: ref };
  if (/CHỜ DUYỆT/.test(cell)) return { level: "review", note: ref };
  if (/GIAO CODE/.test(cell)) return { level: "coding", note: ref };
  if (/GHI NHẬN/.test(cell)) return { level: "noted", note: ref };
  return { level: "noted", note: ref };
};

const workflow = new Map();
for (const line of read("../docs/93-workflow-friction.md").split("\n")) {
  const cells = line.split("|").map((cell) => cell.trim());
  if (/^W-\d+$/.test(cells[1] ?? "")) workflow.set(cells[1], statusOfWorkflowRow(cells[cells.length - 2] ?? ""));
}

// STT của dòng trong sổ, ghi trong docs/93 (W-xx) và docs/92 (UI-xx) dạng "(Sổ #n)": dự phòng khi mã dòng không khớp
const logNumber = new Map();
for (const line of [...read("../docs/93-workflow-friction.md").split("\n"), ...read("../docs/92-ui-rules.md").split("\n")]) {
  const ref = line.match(/\b(W-\d+|UI-\d+)\b/)?.[1];
  const number = line.match(/Sổ #(\d+)/)?.[1];
  if (ref && number && !logNumber.has(ref)) logNumber.set(ref, number);
}

const seen = new Map();
for (const line of read("./ui-feedback-seen.txt").split("\n")) {
  const match = line.match(/^([0-9a-f]{8}) (\S+)/);
  if (match) seen.set(match[1], match[2]);
}

const render = (level, note) => (note ? `${levels[level]}\n${note}` : levels[level]);
const planned = [...seen].map(([id, ref]) => {
  const info = /^W-/.test(ref) ? workflow.get(ref) : { level: "done", note: ref };
  return { id, ref, no: logNumber.get(ref), level: info?.level ?? "noted", note: [ref, info?.note].filter((part, index, all) => part && all.indexOf(part) === index).join(" · ") };
});

const args = process.argv.slice(2);
if (args.includes("--plan")) {
  for (const row of planned) console.log(`${row.id}  #${row.no ?? "?"}  ${render(row.level, row.note).replace("\n", "  |  ")}`);
  console.log(`\n${planned.length} dòng (chưa ghi gì).`);
  process.exit(0);
}

const url = setting("UI_FEEDBACK_BRIDGE_URL");
const token = setting("UI_FEEDBACK_BRIDGE_TOKEN");
if (!url || !token) throw new Error("Thiếu UI_FEEDBACK_BRIDGE_URL / UI_FEEDBACK_BRIDGE_TOKEN trong project-links.local (xem docs/ui-feedback-bridge.md).");
const call = async (payload) => {
  const response = await fetch(url, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ token, ...payload }), redirect: "follow" });
  const result = await response.json().catch(() => ({ ok: false, error: `HTTP ${response.status}, không phải JSON` }));
  if (!result.ok) throw new Error(`Cầu báo lỗi: ${result.error}`);
  return result;
};

if (args.includes("--list")) {
  const { rows } = await call({ action: "list" });
  for (const row of rows) console.log(`#${row.no}  [${row.id}]  ${row.status.replace(/\n/g, " ") || "(trống)"}  — ${row.content.slice(0, 60)}`);
  console.log(`\n${rows.length} dòng.`);
} else if (args.includes("--sync")) {
  const { rows } = await call({ action: "list" });
  const live = new Map(rows.map((row) => [row.id, row]));
  let written = 0;
  for (const row of planned) {
    const current = live.get(row.id) ?? rows.find((item) => row.no && String(item.no) === String(row.no));
    if (!current) continue; // dòng đã bị xóa khỏi sổ: bỏ qua
    const text = render(row.level, row.note);
    if (current.status.replace(/\s+/g, " ") === text.replace(/\s+/g, " ")) continue;
    await call({ action: "set", id: current.id, status: text });
    written += 1;
    console.log(`#${current.no} [${current.id}] ${live.has(row.id) ? "" : "(khớp theo STT) "}→ ${text.replace("\n", " | ")}`);
  }
  console.log(`\nĐã ghi ${written} dòng (${planned.length - written} dòng giữ nguyên hoặc không còn trong sổ).`);
} else {
  const [level, key, note = ""] = args;
  if (!levels[level] || !key) throw new Error(`Cách dùng: <${Object.keys(levels).join("|")}> <mã dòng | #STT> ["ghi chú ngắn"]`);
  const target = key.startsWith("#") ? { no: key.slice(1) } : { id: key };
  const result = await call({ action: "set", ...target, status: render(level, note) });
  console.log(`#${result.no} [${result.id}] → ${result.status.replace("\n", " | ")}`);
}
