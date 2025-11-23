
/**
 * BẢNG CÔNG VIỆC PHÒNG VH-XH – Frontend (GitHub Pages)
 * LƯU Ý: Thay GAS_BASE_URL bằng Web App URL (kết thúc bằng /exec) từ Apps Script.
 */
const GAS_BASE_URL = "https://script.google.com/macros/s/AKfycbzSdy-EqOoprnnmmpTOjshGXU3Thv2KUKqQQnIXafmaqV3RQzuR3Xzp8wSng9JUfXT_/exec";

/* ====================== CẤU HÌNH SHET ====================== */
const SHEETS = {
  lich_ubnd: {
    title: "Lịch công tác UBND phường",
    sheetName: "1_LICH_UBND",
    columns: ["ID","Ngày","Giờ","Nội dung","Địa điểm","Thành phần","Chủ trì","Liên hệ","Ghi chú","Nguồn/Tệp","Người nhập","Cập nhật"]
  },
  lich_vhxh: {
    title: "Lịch công tác phòng VH-XH",
    sheetName: "2_LICH_VH_XH",
    columns: ["ID","Ngày","Giờ","Công việc","Địa điểm/Đơn vị","Phụ trách","Thành phần","Ghi chú","Nguồn/Tệp","Người nhập","Cập nhật"]
  },
  trong_tam_thang: {
    title: "Nhiệm vụ trọng tâm tháng",
    sheetName: "3_TRONG_TAM_THANG",
    columns: ["ID","Tháng","Nội dung nhiệm vụ","Đơn vị phối hợp","Phụ trách","Hạn hoàn thành","Trạng thái","Kết quả/Báo cáo (link)","Ghi chú","Người nhập","Cập nhật"]
  },
  nhiem_vu_cbcc: {
    title: "Nhiệm vụ từng CBCC",
    sheetName: "4_NHIEM_VU_CBCC",
    columns: ["ID","Cán bộ","Nhiệm vụ","Hạn xử lý","Trạng thái","Mức ưu tiên","Liên kết/Đính kèm","Ghi chú","Ngày giao","Người giao","Ngày cập nhật","Kết quả (link)","Nhắc trước (ngày)"]
  },
  bao_cao: {
    title: "Báo cáo tuần/tháng/quý",
    sheetName: "5_BAO_CAO",
    columns: ["ID","Kỳ báo cáo","Tiêu đề","Phụ trách","Hạn nộp","Trạng thái","Liên kết/Đính kèm","Ghi chú","Ngày cập nhật"]
  }
};

/* ====================== TIỆN ÍCH ====================== */
function formatStatus(val) {
  if (!val) return "";
  const v = String(val).toLowerCase();
  if (v.includes("hoàn")) return '<span class="badge status-Hoan">Hoàn thành</span>';
  if (v.includes("đang")) return '<span class="badge status-Dang">Đang thực hiện</span>';
  if (v.includes("quá")) return '<span class="badge status-Qua">Quá hạn</span>';
  return '<span class="badge status-Cho">Chưa thực hiện</span>';
}

function formatDateForView(val) {
  if (!val) return "";
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val);
    return d.toLocaleDateString('vi-VN');
  } catch(e){ return String(val); }
}

/* ====================== TRẠNG THÁI TOÀN CỤC ====================== */
let currentTab = "lich_ubnd";
let cache = {};

// Khai báo DUY NHẤT – KHÔNG lặp lại ở nơi khác
let cbccList = [
  "Tú Anh","Nguyệt","Nhiên","Loan","L. Uyên","Hùng","Đào","Thúy","Ly","Hiền","Lưu",
  "Thảo","Giang","Huy","Cường","Phong","Duy","Thân","Dung","T. Uyên","Văn","Trí","Phúc","Hân","Nguyên","Thành"
];

/* ====================== NẠP DANH SÁCH CBCC ====================== */
function loadCBCCOptions() {
  const sel = document.getElementById("filter-canbo");
  if (!sel) return;
  sel.innerHTML = '<option value="">-- Lọc theo CBCC --</option>';
  cbccList.forEach(n => {
    const opt = document.createElement("option");
    opt.value = n; opt.textContent = n;
    sel.appendChild(opt);
  });
}

// Thử lấy danh sách từ sheet DM_CBCC (cột A) – nếu thất bại dùng mảng mặc định
async function loadCBCCFromSheetIfAny() {
  try {
    const url = new URL(GAS_BASE_URL);
    url.searchParams.set("action", "list");
    url.searchParams.set("sheet", "DM_CBCC");
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      const firstKey = data.records && data.records[0] ? Object.keys(data.records[0])[0] : null;
      if (firstKey) {
        const names = (data.records || []).map(r => r[firstKey]).filter(Boolean);
        if (names.length) cbccList = names;
      }
    }
  } catch(e) { /* giữ mặc định nếu lỗi */ }
  loadCBCCOptions();
}

/* ====================== KHỞI TẠO ====================== */
document.addEventListener("DOMContentLoaded", async () => {
  await loadCBCCFromSheetIfAny();

  // Tabs
  document.querySelectorAll("#tabs button").forEach(btn => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });

  // Toolbar
  document.getElementById("btn-add").addEventListener("click", openCreate);
  document.getElementById("search").addEventListener("input", renderTable);
  document.getElementById("filter-canbo").addEventListener("change", renderTable);
  document.getElementById("filter-status").addEventListener("change", renderTable);

  switchTab(currentTab);
});

function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll("#tabs button").forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
  loadData();
}

/* ====================== TẢI DỮ LIỆU ====================== */
async function loadData() {
  const meta = SHEETS[currentTab];
  document.getElementById("table-head").innerHTML = "<tr>" + meta.columns.map(c=>`<th>${c}</th>`).join("") + "<th>Thao tác</th></tr>";
  document.getElementById("table-body").innerHTML = "";
  document.getElementById("error").textContent = "";
  document.getElementById("empty").textContent = "";

  try {
    const url = new URL(GAS_BASE_URL);
    url.searchParams.set("action","list");
    url.searchParams.set("sheet", meta.sheetName);
    const res = await fetch(url, { method: "GET" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    cache[currentTab] = Array.isArray(data.records) ? data.records : [];
    renderTable();
  } catch (e) {
    document.getElementById("error").textContent =
      "Không tải được dữ liệu. Kiểm tra GAS_BASE_URL, tên sheet và quyền Web App. Chi tiết: " + (e.message || e);
  }
}

/* ====================== HIỂN THỊ BẢNG ====================== */
function renderTable() {
  const meta = SHEETS[currentTab];
  const q = document.getElementById("search").value.trim().toLowerCase();
  const canbo = document.getElementById("filter-canbo").value;
  const st = document.getElementById("filter-status").value;

  let rows = (cache[currentTab] || []).filter(r => {
    const text = Object.values(r).join(" ").toLowerCase();
    const okQ = !q || text.includes(q);
    const okCanbo = !canbo || (r["Cán bộ"] === canbo || r["Phụ trách"] === canbo);
    const okSt = !st || (r["Trạng thái"] === st);
    return okQ && okCanbo && okSt;
  });

  const body = document.getElementById("table-body");
  body.innerHTML = "";

  if (!rows.length) { document.getElementById("empty").textContent = "Chưa có dữ liệu."; return; }
  document.getElementById("empty").textContent = "";

  rows.forEach(r => {
    const tr = document.createElement("tr");
    meta.columns.forEach(col => {
      let val = r[col] ?? "";
      if (/(Ngày|Hạn xử lý|Hạn hoàn thành|Hạn nộp|Ngày giao|Cập nhật|Ngày cập nhật|Tháng)/i.test(col)) {
        val = formatDateForView(val);
      }
      if (/trạng thái/i.test(col)) val = formatStatus(val);
      if (/liên|tệp|kết quả|nguồn/i.test(col)) {
        if (val) val = `<a class="link" href="${val}" target="_blank" rel="noopener">Mở liên kết</a>`;
      }
      tr.insertAdjacentHTML("beforeend", `<td>${val}</td>`);
    });
    const ops = document.createElement("td");
    ops.innerHTML = '<button data-op="edit">Sửa</button> <button data-op="del">Xóa</button>';
    ops.querySelector('[data-op="edit"]').addEventListener("click", ()=> openEdit(r));
    ops.querySelector('[data-op="del"]').addEventListener("click", ()=> del(r));
    tr.appendChild(ops);
    body.appendChild(tr);
  });
}

/* ====================== FORM THÊM/SỬA ====================== */
function buildFields(record = {}) {
  const meta = SHEETS[currentTab];
  const container = document.getElementById("form-fields");
  container.innerHTML = "";
  meta.columns.forEach(col => {
    if (col === "ID" || col === "Cập nhật" || col === "Ngày cập nhật") return;
    const id = "fld-" + col.replaceAll(" ","_");
    const isLong = ["Nội dung","Ghi chú","Công việc","Tiêu đề","Nội dung nhiệm vụ"].some(k => col.includes(k));
    const isDate = ["Ngày","Hạn xử lý","Hạn hoàn thành","Hạn nộp","Tháng","Ngày giao"].some(k => col.includes(k));
    const isCanBo = ["Cán bộ","Phụ trách","Người giao","Người nhập"].includes(col);
    const isLink = /liên|tệp|kết quả|nguồn/i.test(col);
    let input;
    if (isLong)      input = `<textarea id="${id}" rows="3">${record[col]||""}</textarea>`;
    else if (isDate) input = `<input type="date" id="${id}" value="${record[col]||""}">`;
    else if (isCanBo){
      const opts = ["", ...cbccList].map(v => `<option ${record[col]==v?"selected":""}>${v}</option>`).join("");
      input = `<select id="${id}">${opts}</select>`;
    }
    else if (isLink) input = `<input type="url" id="${id}" value="${record[col]||""}" placeholder="https://...">`;
    else             input = `<input type="text" id="${id}" value="${record[col]||""}">`;
    container.insertAdjacentHTML("beforeend", `<div class="row"><label for="${id}">${col}</label>${input}</div>`);
  });
}

function openCreate(){
  const dlg=document.getElementById("dlg");
  document.getElementById("dlg-title").textContent="Thêm mới";
  buildFields();
  dlg.showModal();
  document.getElementById("dlg-save").onclick=saveCreate;
  document.getElementById("dlg-cancel").onclick=()=>dlg.close();
}
function openEdit(record){
  const dlg=document.getElementById("dlg");
  document.getElementById("dlg-title").textContent="Cập nhật";
  buildFields(record);
  dlg.showModal();
  document.getElementById("dlg-save").onclick=()=>saveUpdate(record.ID);
  document.getElementById("dlg-cancel").onclick=()=>dlg.close();
}

async function saveCreate(){ await saveRecord("create"); }
async function saveUpdate(id){ await saveRecord("update", id); }

async function saveRecord(action, id=null) {
  const meta = SHEETS[currentTab];
  const payload = { action, sheet: meta.sheetName, data: {} };
  if (id) payload.id = id;
  meta.columns.forEach(col => {
    if (col === "ID" || col === "Cập nhật" || col === "Ngày cập nhật") return;
    const el = document.getElementById("fld-" + col.replaceAll(" ","_"));
    if (el) payload.data[col] = el.value || "";
  });
  try {
    const res = await fetch(GAS_BASE_URL, {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify(payload)
    });
    const ret = await res.json();
    if (ret.success) { document.getElementById("dlg").close(); loadData(); }
    else alert("Lỗi: " + (ret.message || "Không xác định"));
  } catch (e) {
    alert("Không thể lưu. Kiểm tra URL GAS và quyền truy cập.");
  }
}

async function del(record) {
  if (!confirm("Xóa bản ghi này?")) return;
  const meta = SHEETS[currentTab];
  try {
    const res = await fetch(GAS_BASE_URL, {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ action: "delete", sheet: meta.sheetName, id: record.ID })
    });
    const ret = await res.json();
    if (ret.success) loadData(); else alert("Lỗi: " + (ret.message || ""));
  } catch (e) { alert("Không thể xóa."); }
}







