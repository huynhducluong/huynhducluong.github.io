/**
 * Cầu ghi cột "Trạng thái" của sổ lỗi UI/UX (Google Docs) — docs/ui-feedback-bridge.md.
 *
 * Dán file này vào Apps Script của chính Google Doc "CAREER HUB" (Tiện ích mở rộng → Apps Script), đặt hai
 * "Thuộc tính tập lệnh": DOC_ID (mã tài liệu trong link) và TOKEN (một chuỗi bí mật dài, ngẫu nhiên), rồi
 * Triển khai → Ứng dụng web: "Thực thi bằng: Tôi", "Ai có quyền truy cập: Bất kỳ ai". Tài liệu vẫn để chế độ
 * "Viewer" (ai có link chỉ xem được); chỉ script này, chạy bằng tài khoản của bạn, mới ghi được, và chỉ ghi
 * khi nhận đúng TOKEN. Script chỉ đọc bảng và sửa chữ trong ô Trạng thái; không xóa dòng, không đổi nội dung.
 *
 * Mã dòng (id) trùng với tools/read-ui-feedback.mjs: 8 ký tự đầu SHA-1 của "Màn hình\nNội dung",
 * nhiều đoạn trong một ô nối bằng " / ".
 */

function doPost(e) {
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    var props = PropertiesService.getScriptProperties();
    var token = props.getProperty("TOKEN");
    if (!token || body.token !== token) return out_({ ok: false, error: "unauthorized" });
    var doc = DocumentApp.openById(props.getProperty("DOC_ID"));
    var rows = readRows_(doc);
    if (body.action === "list") {
      return out_({ ok: true, rows: rows.map(function (r) { return { no: r.no, id: r.id, screen: r.screen, content: r.content.slice(0, 120), status: r.status }; }) });
    }
    if (body.action === "set") {
      var status = String(body.status || "").slice(0, 200);
      var target = rows.filter(function (r) { return (body.id && r.id === body.id) || (!body.id && body.no && String(r.no) === String(body.no)); })[0];
      if (!target) return out_({ ok: false, error: "row not found" });
      target.statusCell.setText(status);
      return out_({ ok: true, no: target.no, id: target.id, status: status });
    }
    return out_({ ok: false, error: "unknown action" });
  } catch (error) {
    return out_({ ok: false, error: String(error) });
  }
}

function out_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}

function paragraphs_(cell) {
  return cell.getText().split("\n").filter(function (p) { return p; }).join(" / ");
}

function sha1Short_(text) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_1, text, Utilities.Charset.UTF_8);
  return bytes.map(function (b) { var v = (b < 0 ? b + 256 : b).toString(16); return v.length === 1 ? "0" + v : v; }).join("").slice(0, 8);
}

function readRows_(doc) {
  var table = doc.getBody().getTables()[0];
  var header = table.getRow(0);
  var find = function (word) {
    for (var i = 0; i < header.getNumCells(); i++) if (header.getCell(i).getText().toLowerCase().indexOf(word) !== -1) return i;
    return -1;
  };
  var iNo = Math.max(find("stt"), 0);
  var iScreen = find("màn hình");
  var iContent = find("nội dung");
  var iStatus = find("trạng thái");
  if (iContent < 0 || iStatus < 0) throw new Error("header not found");
  var rows = [];
  for (var r = 1; r < table.getNumRows(); r++) {
    var row = table.getRow(r);
    var screen = iScreen >= 0 ? paragraphs_(row.getCell(iScreen)) : "";
    var content = paragraphs_(row.getCell(iContent));
    if (!content) continue;
    rows.push({
      no: paragraphs_(row.getCell(iNo)).replace(/\.$/, ""),
      screen: screen,
      content: content,
      id: sha1Short_(screen.trim() + "\n" + content.trim()),
      status: paragraphs_(row.getCell(iStatus)),
      statusCell: row.getCell(iStatus),
    });
  }
  return rows;
}
