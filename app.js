/****************************************************
 * BẢNG CÔNG VIỆC PHÒNG VH-XH – GOOGLE APPS SCRIPT
 * Backend: LIST, CREATE, UPDATE, DELETE + Upload file (My Drive)
 * Triển khai: Web App (Anyone with the link)
 ****************************************************/

/* ========== CẤU HÌNH TÊN CÁC TAB ========== */
const SHEET_NAMES = {
  LICH_UBND:        "1_LICH_UBND",
  LICH_VH_XH:       "2_LICH_VH_XH",
  TRONG_TAM_THANG:  "3_TRONG_TAM_THANG",
  NHIEM_VU_CBCC:    "4_NHIEM_VU_CBCC",
  BAO_CAO:          "5_BAO_CAO",
  DM_CBCC:          "DM_CBCC"
};

/* ========== CẤU HÌNH UPLOAD – KHÔNG DÙNG THƯ MỤC ========== */
const ALLOW_PUBLIC_LINK = true; // true: mở Anyone-with-link Viewer

/* ========== TIỆN ÍCH CHUNG ========== */
function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
function getSheet_(name) {
  const sh = SpreadsheetApp.getActive().getSheetByName(name);
  if (!sh) throw new Error("Không tìm thấy sheet: " + name);
  return sh;
}

/* ========== ĐỌC BẢNG: an toàn bằng getDataRange() ========== */
function readTable_(sheet) {
  const data = sheet.getDataRange().getValues();
  if (!data || data.length < 2) return { headers: [], rows: [] };
  const headers = data[0].map(h => String(h).trim());
  const rows = data.slice(1).filter(r => r.some(v => String(v).trim() !== ""));
  return { headers, rows };
}
function rowsToObjects_(headers, rows) {
  return rows.map(r => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = (r[i] === undefined ? "" : r[i]));
    return obj;
  });
}
function listRecords_(sheetName) {
  const sh = getSheet_(sheetName);
  const { headers, rows } = readTable_(sh);
  return rowsToObjects_(headers, rows);
}

/* ========== ID, TÌM DÒNG, CRUD ========== */
function nextId_(sheet) {
  const n = Math.max(0, sheet.getLastRow() - 1);
  if (!n) return 1;
  const ids = sheet.getRange(2, 1, n, 1).getValues()
    .map(r => parseInt(r[0], 10)).filter(x => !isNaN(x));
  return ids.length ? Math.max.apply(null, ids) + 1 : 1;
}
function findRowById_(sheet, id) {
  const n = Math.max(0, sheet.getLastRow() - 1);
  if (!n) return -1;
  const col = sheet.getRange(2, 1, n, 1).getValues();
  for (let i = 0; i < col.length; i++) if (String(col[i][0]) === String(id)) return i + 2;
  return -1;
}

function createRecord_(sheetName, data) {
  const lock = LockService.getScriptLock(); lock.waitLock(30000);
  try {
    const sh = getSheet_(sheetName);
    const { headers } = readTable_(sh);
    if (!headers.length || headers[0] !== "ID") throw new Error('Cột đầu tiên phải là "ID".');

    const colUpdate = headers.indexOf("Ngày cập nhật") !== -1 ? "Ngày cập nhật"
                    : (headers.indexOf("Cập nhật") !== -1 ? "Cập nhật" : null);
    if (colUpdate) data[colUpdate] = new Date();

    const id = nextId_(sh);
    const row = headers.map(h => h === "ID" ? id : (Object.prototype.hasOwnProperty.call(data, h) ? data[h] : ""));
    sh.appendRow(row);
    return id;
  } finally { lock.releaseLock(); }
}

function updateRecord_(sheetName, id, data) {
  if (!id) throw new Error("Thiếu ID để cập nhật.");
  const lock = LockService.getScriptLock(); lock.waitLock(30000);
  try {
    const sh = getSheet_(sheetName);
    const { headers } = readTable_(sh);
    const rowIndex = findRowById_(sh, id);
    if (rowIndex === -1) throw new Error("Không tìm thấy bản ghi ID=" + id);

    const colUpdate = headers.indexOf("Ngày cập nhật") !== -1 ? "Ngày cập nhật"
                    : (headers.indexOf("Cập nhật") !== -1 ? "Cập nhật" : null);
    if (colUpdate) data[colUpdate] = new Date();

    const cur = sh.getRange(rowIndex, 1, 1, headers.length).getValues()[0];
    const upd = headers.map((h, i) => h === "ID" ? cur[i]
      : (Object.prototype.hasOwnProperty.call(data, h) ? data[h] : cur[i]));
    sh.getRange(rowIndex, 1, 1, headers.length).setValues([upd]);
  } finally { lock.releaseLock(); }
}

function deleteRecord_(sheetName, id) {
  if (!id) throw new Error("Thiếu ID để xóa.");
  const lock = LockService.getScriptLock(); lock.waitLock(30000);
  try {
    const sh = getSheet_(sheetName);
    const rowIndex = findRowById_(sh, id);
    if (rowIndex === -1) throw new Error("Không tìm thấy bản ghi ID=" + id);
    sh.deleteRow(rowIndex);
  } finally { lock.releaseLock(); }
}

/* ========== UPLOAD VÀO MY DRIVE (KHÔNG THƯ MỤC) ========== */
function uploadFileFromPostToMyDrive_(e) {
  if (!e || !e.files) throw new Error("Không nhận được multipart/form-data.");
  const f = e.files.file || e.files["file"];
  if (!f) throw new Error("Thiếu trường file (name='file').");

  const blob = Utilities.newBlob(f.contents, f.type || MimeType.BINARY, f.name || "upload.bin");
  const file = DriveApp.createFile(blob);

  if (ALLOW_PUBLIC_LINK) {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  }
  return {
    success: true,
    fileId: file.getId(),
    name: file.getName(),
    size: file.getSize(),
    mimeType: file.getMimeType(),
    url: file.getUrl()
  };
}

/* ========== HTTP HANDLERS ========== */
function doGet(e) {
  const p = (e && e.parameter) ? e.parameter : {};
  try {
    if (p.action === "list" && p.sheet) return json_({ records: listRecords_(p.sheet) });
    return json_({ ok: true, message: "VHXH API ready" });
  } catch (err) { return json_({ success:false, message:String(err) }); }
}

function doPost(e) {
  try {
    if (e && e.postData && /^multipart\/form-data/i.test(e.postData.type || "")) {
      const action = (e.parameter && e.parameter.action) ? e.parameter.action : "";
      if (action === "upload") {
        const info = uploadFileFromPostToMyDrive_(e);
        return json_(info);
      }
    }

    const body = (e && e.postData && e.postData.contents) ? e.postData.contents : "{}";
    const payload = JSON.parse(body);
    const { action, sheet, id, data = {} } = payload || {};
    if (!action) return json_({ success:false, message:"Thiếu action" });

    if (action === "create") return json_({ success:true, id: createRecord_(sheet, data) });
    if (action === "update") { updateRecord_(sheet, id, data); return json_({ success:true }); }
    if (action === "delete") { deleteRecord_(sheet, id);       return json_({ success:true }); }

    return json_({ success:false, message:"Action không được hỗ trợ" });
  } catch (err) {
    return json_({ success:false, message:String(err) });
  }
}






