/**
 * FRONTEND – Bảng công việc phòng VH-XH
 * LƯU Ý: Nhớ thay GAS_BASE_URL = Web App URL (đuôi /exec)
 */
const GAS_BASE_URL =
  "https://script.google.com/macros/s/AKfycbxbyYMbbqK2bKxVRPa0M1HTsrW_GYRzD3HtXPiW7G3z8ze9cSMQLtgQddhADf0UuqtJ/exec";

/* ====================== CẤU HÌNH SHEET ====================== */
const SHEETS = {
  lich_ubnd: {
    title: "Lịch công tác UBND phường",
    sheetName: "1_LICH_UBND",
    columns: ["ID", "Ngày", "Giờ", "Nội dung", "Địa điểm", "Thành phần", "Chủ trì", "Liên hệ", "Ghi chú", "Nguồn/Tệp", "Người nhập", "Cập nhật"]
  },
  lich_vhxh: {
    title: "Lịch công tác phòng VH-XH",
    sheetName: "2_LICH_VH_XH",
    columns: ["ID", "Ngày", "Giờ", "Công việc", "Địa điểm/Đơn vị", "Phụ trách", "Thành phần", "Ghi chú", "Nguồn/Tệp", "Người nhập", "Cập nhật"]
  },
  trong_tam_thang: {
    title: "Nhiệm vụ trọng tâm tháng",
    sheetName: "3_TRONG_TAM_THANG",
    columns: ["ID", "Tháng", "Nội dung nhiệm vụ", "Đơn vị phối hợp", "Phụ trách", "Hạn hoàn thành", "Trạng thái", "Kết quả/Báo cáo (link)", "Ghi chú", "Người nhập", "Cập nhật"]
  },
  nhiem_vu_cbcc: {
    title: "Nhiệm vụ từng CBCC",
    sheetName: "4_NHIEM_VU_CBCC",
    columns: [
      "ID", "Cán bộ", "Nhiệm vụ", "Hạn xử lý", "Trạng thái", "Mức ưu tiên",
      "Liên kết/Đính kèm", "Ghi chú", "Ngày giao", "Người giao",
      "Ngày cập nhật", "Kết quả (link)", "Nhắc trước (ngày)"
    ]
  },
  bao_cao: {
    title: "Báo cáo tuần/tháng/quý",
    sheetName: "5_BAO_CAO",
    columns: ["ID", "Kỳ báo cáo", "Tiêu đề", "Phụ trách", "Hạn nộp", "Trạng thái", "Liên kết/Đính kèm", "Ghi chú", "Ngày cập nhật"]
  }
};

/* ====================== TIỆN ÍCH ====================== */
function formatStatus(val) {
  if (!val) return "";
  const v = String(val).trim().toLowerCase();
  if (v.includes("hoàn")) return '<span class="badge status-Hoan">Hoàn thành</span>';
  if (v.includes("đang")) return '<span class="badge status-Dang">Đang thực hiện</span>';
  if (v.includes("quá")) return '<span class="badge status-Qua">Quá hạn</span>';
  return '<span class="badge status-Cho">Chưa thực hiện</span>';
}

function formatDate(val) {
  if (!val) return "";
  const d = new Date(val);
  if (isNaN(d)) return val;
  return d.toLocaleDateString("vi-VN");
}

/* ====================== STATE ====================== */
let currentTab = "lich_ubnd";
let cache = {};
let cbccList = [];

/* ====================== LOAD DM CBCC ====================== */
async function loadCBCC() {
  try {
    const url = `${GAS_BASE_URL}?action=list&sheet=DM_CBCC`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.records?.length) {
      const firstCol = Object.keys(data.records[0])[0];
      cbccList = data.records.map(r => r[firstCol]).filter(Boolean);
    }
  } catch (e) {
    console.warn("Không tải được DM_CBCC");
  }
}

/* ====================== TABS ====================== */
document.addEventListener("DOMContentLoaded", async () => {
  await loadCBCC();

  document.querySelectorAll("#tabs button").forEach(b => {
    b.addEventListener("click", () => switchTab(b.dataset.tab));
  });

  document.getElementById("btn-add").onclick = openCreate;
  document.getElementById("search").oninput = renderTable;
  document.getElementById("filter-canbo").onchange = renderTable;
  document.getElementById("filter-status").onchange = renderTable;

  switchTab(currentTab);
});

/* ====================== LOAD DATA ====================== */
function switchTab(tab) {
  currentTab = tab;

  document.querySelectorAll("#tabs button")
    .forEach(b => b.classList.toggle("active", b.dataset.tab === tab));

  loadData();
}

async function loadData() {
  const meta = SHEETS[currentTab];

  document.getElementById("table-head").innerHTML =
    `<tr>${meta.columns.map(c => `<th>${c}</th>`).join("")}<th>Thao tác</th></tr>`;

  try {
    const res = await fetch(`${GAS_BASE_URL}?action=list&sheet=${meta.sheetName}`);
    const data = await res.json();
    cache[currentTab] = data.records || [];
    renderTable();
  } catch (e) {
    document.getElementById("error").textContent = "Không tải được dữ liệu.";
  }
}

/* ====================== RENDER TABLE ====================== */
function renderTable() {
  const meta = SHEETS[currentTab];
  const rows = cache[currentTab] || [];

  const q = document.getElementById("search").value.toLowerCase();
  const cb = document.getElementById("filter-canbo").value;
  const st = document.getElementById("filter-status").value;

  const filtered = rows.filter(r => {
    const join = Object.values(r).join(" ").toLowerCase();
    const okQ = !q || join.includes(q);
    const okCB = !cb || r["Cán bộ"] === cb || r["Phụ trách"] === cb;
    const okS = !st || r["Trạng thái"] === st;
    return okQ && okCB && okS;
  });

  const body = document.getElementById("table-body");
  body.innerHTML = "";

  if (!filtered.length) {
    document.getElementById("empty").textContent = "Chưa có dữ liệu.";
    return;
  }

  document.getElementById("empty").textContent = "";

  filtered.forEach(r => {
    const tr = document.createElement("tr");

    SHEETS[currentTab].columns.forEach(col => {
      let v = r[col] || "";

      if (/Ngày|Hạn|Tháng/i.test(col)) v = formatDate(v);
      if (/Trạng thái/i.test(col)) v = formatStatus(v);
      if (/link|đính|tệp/i.test(col) && v)
        v = `<a class="link" href="${v}" target="_blank">Mở liên kết</a>`;

      tr.insertAdjacentHTML("beforeend", `<td>${v}</td>`);
    });

    const td = document.createElement("td");
    td.innerHTML = `
      <button class="btn-edit">Sửa</button>
      <button class="btn-del">Xóa</button>
    `;
    td.querySelector(".btn-edit").onclick = () => openEdit(r);
    td.querySelector(".btn-del").onclick = () => delRecord(r);
    tr.appendChild(td);

    body.appendChild(tr);
  });
}

/* ====================== UPLOAD FILE ====================== */
async function uploadFile(file) {
  const fd = new FormData();
  fd.append("action", "upload");
  fd.append("file", file, file.name);

  const res = await fetch(GAS_BASE_URL, {
    method: "POST",
    body: fd
  });

  const data = await res.json();
  if (!data.success) throw new Error(data.message);
  return data.url;
}

/* ====================== FORM ====================== */
function buildForm(rec = {}) {
  const meta = SHEETS[currentTab];
  const form = document.getElementById("form-fields");
  form.innerHTML = "";

  meta.columns.forEach(col => {
    if (col === "ID" || col === "Ngày cập nhật" || col === "Cập nhật") return;

    const id = "fld-" + col.replace(/\s+/g, "_");
    const val = rec[col] || "";

    let html = "";

    const isDate = /(Ngày|Hạn|Tháng)/i.test(col);
    const isLong = /(Nội dung|Ghi chú|Công việc|Tiêu đề)/i.test(col);
    const isCB = ["Cán bộ", "Phụ trách", "Người giao", "Người nhập"].includes(col);
    const isFile = /(link|đính|tệp)/i.test(col);

    if (isLong)
      html = `<textarea id="${id}">${val}</textarea>`;
    else if (isDate) {
      const iso = val ? new Date(val).toISOString().substring(0, 10) : "";
      html = `<input type="date" id="${id}" value="${iso}">`;
    } else if (isCB)
      html =
        `<select id="${id}">
          <option value=""></option>
          ${cbccList.map(c => `<option ${c === val ? "selected" : ""}>${c}</option>`)}
        </select>`;
    else if (isFile)
      html =
        `<div class="file-row">
          <input id="${id}" type="url" placeholder="https://..." value="${val}">
          <input id="${id}_file" type="file">
          <button type="button" id="${id}_btn">Tải lên</button>
        </div>`;
    else
      html = `<input id="${id}" value="${val}">`;

    form.insertAdjacentHTML(
      "beforeend",
      `<div class="row"><label>${col}</label>${html}</div>`
    );

    if (isFile) {
      document.getElementById(`${id}_btn`).onclick = async () => {
        const f = document.getElementById(`${id}_file`).files[0];
        if (!f) return alert("Chọn tệp trước.");

        try {
          const url = await uploadFile(f);
          document.getElementById(id).value = url;
          alert("Đã tải lên!");
        } catch (e) {
          alert("Upload lỗi: " + e.message);
        }
      };
    }
  });
}

function openCreate() {
  document.getElementById("dlg-title").textContent = "Thêm mới";
  buildForm();
  dlg.showModal();

  document.getElementById("dlg-save").onclick = saveCreate;
  document.getElementById("dlg-cancel").onclick = () => dlg.close();
}

function openEdit(rec) {
  document.getElementById("dlg-title").textContent = "Cập nhật";
  buildForm(rec);
  dlg.showModal();

  document.getElementById("dlg-save").onclick = () => saveUpdate(rec.ID);
  document.getElementById("dlg-cancel").onclick = () => dlg.close();
}

/* ====================== SAVE ====================== */
async function saveCreate() {
  await saveRecord("create");
}
async function saveUpdate(id) {
  await saveRecord("update", id);
}

async function saveRecord(action, id) {
  const meta = SHEETS[currentTab];
  const payload = { action, sheet: meta.sheetName, data: {} };
  if (id) payload.id = id;

  meta.columns.forEach(col => {
    if (["ID", "Ngày cập nhật", "Cập nhật"].includes(col)) return;
    const el = document.getElementById("fld-" + col.replace(/\s+/g, "_"));
    if (el) payload.data[col] = el.value;
  });

  const res = await fetch(GAS_BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  if (!data.success) return alert("Lỗi: " + data.message);

  dlg.close();
  loadData();
}

/* ====================== DELETE ====================== */
async function delRecord(rec) {
  if (!confirm("Xóa bản ghi này?")) return;

  const meta = SHEETS[currentTab];

  const res = await fetch(GAS_BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "delete",
      sheet: meta.sheetName,
      id: rec.ID
    })
  });

  const data = await res.json();
  if (!data.success) return alert("Lỗi: " + data.message);

  loadData();
}
