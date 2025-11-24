/**
 * FRONTEND – Bảng công việc phòng VH-XH
 * LƯU Ý: thay đúng URL Apps Script (dùng /exec hay /echo đều được để LIST/CRUD).
 */
const GAS_BASE_URL = "https://script.google.com/macros/s/AKfycbww9btbN6jilLIabRmojk3N0wUDznR9X3Es-lONDbmUjW2AY_yMRvhULl4Hiw6T_RAG/exec";

/* ====================== CẤU HÌNH SHEET ====================== */
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
  if (v.includes("trễ") || v.includes("quá")) return '<span class="badge status-Qua">Quá hạn</span>';
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
let cbccList = [
  "Tú Anh","Nguyệt","Nhiên","Loan","L. Uyên","Hùng","Đào","Thúy","Ly","Hiền","Lưu",
  "Thảo","Giang","Huy","Cường","Phong","Duy","Thân","Dung","T. Uyên","Văn","Trí",
  "Phúc","Hân","Nguyên","Thành"
];

/* ====================== NẠP CBCC TỪ SHEET ====================== */
async function loadCBCCFromSheetIfAny() {
  try {
    const url = new URL(GAS_BASE_URL);
    url.searchParams.set("action","list");
    url.searchParams.set("sheet","DM_CBCC");
    const res = await fetch(url);
    const data = await res.json();
    if (data.records?.length) {
      const firstCol = Object.keys(data.records[0])[0];
      cbccList = data.records.map(r => r[firstCol]).filter(Boolean);
    }
  } catch(e){}
  loadCBCCOptions();
}
function loadCBCCOptions() {
  const sel = document.getElementById("filter-canbo");
  if (!sel) return;
  sel.innerHTML = '<option value="">-- Lọc theo CBCC --</option>';
  cbccList.forEach(n=>{
    const opt = document.createElement("option");
    opt.value = n; opt.textContent = n;
    sel.appendChild(opt);
  });
}

/* ====================== KHỞI TẠO ====================== */
document.addEventListener("DOMContentLoaded", async ()=>{
  await loadCBCCFromSheetIfAny();

  document.querySelectorAll("#tabs button").forEach(btn=>{
    btn.addEventListener("click", ()=> switchTab(btn.dataset.tab));
  });
  document.getElementById("btn-add").addEventListener("click", openCreate);
  document.getElementById("search").addEventListener("input", renderTable);
  document.getElementById("filter-canbo").addEventListener("change", renderTable);
  document.getElementById("filter-status").addEventListener("change", renderTable);

  switchTab(currentTab);
});

function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll("#tabs button").forEach(b =>
    b.classList.toggle("active", b.dataset.tab === tab)
  );
  loadData();
}

/* ====================== TẢI DỮ LIỆU ====================== */
async function loadData(){
  const meta = SHEETS[currentTab];
  document.getElementById("table-head").innerHTML =
    "<tr>" + meta.columns.map(c=>`<th>${c}</th>`).join("") + "<th>Thao tác</th></tr>";

  document.getElementById("table-body").innerHTML = "";
  document.getElementById("error").textContent = "";
  document.getElementById("empty").textContent = "";

  try {
    const url = new URL(GAS_BASE_URL);
    url.searchParams.set("action","list");
    url.searchParams.set("sheet",meta.sheetName);
    const res = await fetch(url);
    const data = await res.json();
    cache[currentTab] = Array.isArray(data.records) ? data.records : [];
    renderTable();
  } catch(e){
    document.getElementById("error").textContent = "Không tải được dữ liệu: " + (e.message || e);
  }
}

/* ====================== HIỂN THỊ BẢNG ====================== */
function renderTable(){
  const meta = SHEETS[currentTab];
  const q = document.getElementById("search").value.trim().toLowerCase();
  const canbo = document.getElementById("filter-canbo").value;
  const st = document.getElementById("filter-status").value;

  let rows = (cache[currentTab]||[]).filter(r=>{
    const text = Object.values(r).join(" ").toLowerCase();
    const okQ = !q || text.includes(q);
    const okCB = !canbo || r["Cán bộ"]===canbo || r["Phụ trách"]===canbo;
    const okT = !st || r["Trạng thái"]===st;
    return okQ && okCB && okT;
  });

  const body = document.getElementById("table-body");
  body.innerHTML = "";

  if (!rows.length){
    document.getElementById("empty").textContent = "Chưa có dữ liệu.";
    return;
  }

  rows.forEach(r=>{
    const tr = document.createElement("tr");
    meta.columns.forEach(col=>{
      let val = r[col] ?? "";
      if (/Ngày|Hạn|Tháng/i.test(col)) val = formatDateForView(val);
      if (/Trạng thái/i.test(col)) val = formatStatus(val);
      if (/(Liên kết|Đính kèm|Nguồn|Kết quả|Báo cáo|\(link\))/i.test(col)){
        if (val) val = `<a class="link" target="_blank" href="${val}">Mở liên kết</a>`;
      }
      tr.insertAdjacentHTML("beforeend",`<td>${val}</td>`);
    });

    const ops = document.createElement("td");
    ops.innerHTML = `<button data-op="edit">Sửa</button><button data-op="del">Xóa</button>`;
    ops.querySelector('[data-op="edit"]').onclick = ()=>openEdit(r);
    ops.querySelector('[data-op="del"]').onclick = ()=>del(r);
    tr.appendChild(ops);
    body.appendChild(tr);
  });
}

/* ====================== FORM THÊM/SỬA ====================== */
function buildFields(record={}){
  const meta = SHEETS[currentTab];
  const fields = document.getElementById("form-fields");
  fields.innerHTML = "";

  meta.columns.forEach(col=>{
    if (col==="ID" || col==="Cập nhật" || col==="Ngày cập nhật") return;

    const id = "fld-"+col.replace(/\s+/g,"_");
    const val = record[col] || "";

    const isDate = /(Ngày|Hạn|Tháng)/i.test(col);
    const isLong = /(Nội dung|Ghi chú|Công việc|Tiêu đề)/i.test(col);
    const isCanBo = ["Cán bộ","Phụ trách","Người giao","Người nhập"].includes(col);
    const isLink = /(Liên kết|Đính kèm|Nguồn|Kết quả|Báo cáo|\(link\))/i.test(col);

    let input;
    if (isLong) {
      input = `<textarea id="${id}" rows="3">${val}</textarea>`;
    } else if (isDate) {
      // input type="date" yêu cầu yyyy-MM-dd
      let v = "";
      if (val) {
        const d = new Date(val);
        if (!isNaN(d.getTime())) {
          v = d.toISOString().slice(0,10);
        }
      }
      input = `<input id="${id}" type="date" value="${v}">`;
    } else if (isCanBo) {
      input = `<select id="${id}">
        ${["",...cbccList].map(v=>`<option ${v===val?"selected":""}>${v}</option>`).join("")}
      </select>`;
    } else if (isLink) {
      input = `
        <div class="file-row">
          <input type="url" id="${id}" value="${val}" placeholder="https://...">
          <button type="button" class="btn-open-upload" data-target="${id}">Tải lên GitHub</button>
          <button type="button" class="btn-paste-link" data-target="${id}">Dán link</button>
        </div>`;
    } else {
      input = `<input id="${id}" type="text" value="${val}">`;
    }

    fields.insertAdjacentHTML("beforeend",`
      <div class="row">
        <label>${col}</label>
        ${input}
      </div>
    `);
  });

  // Gắn sự kiện cho nút “Tải lên GitHub / Dán link”
  fields.querySelectorAll(".btn-open-upload").forEach(btn=>{
    btn.onclick = ()=>{
      const tgt = btn.dataset.target;
      const hint = window.open("./files/", "_blank"); // trang hướng dẫn upload trong repo
      alert("Đã mở trang Upload. Tải tệp xong, copy đường dẫn tệp trong /files rồi quay lại bấm 'Dán link'.");
    };
  });
  fields.querySelectorAll(".btn-paste-link").forEach(btn=>{
    btn.onclick = async ()=>{
      const tgtId = btn.dataset.target;
      try{
        const txt = await navigator.clipboard.readText();
        const ok = /^https?:\/\//i.test(txt);
        if (!ok) { alert("Clipboard không có URL hợp lệ. Vui lòng dán thủ công (Ctrl+V)."); return; }
        document.getElementById(tgtId).value = txt.trim();
      }catch(e){
        alert("Không đọc được clipboard. Dán thủ công (Ctrl+V) giúp nhé.");
      }
    };
  });
}

function openCreate(){
  document.getElementById("dlg-title").textContent = "Thêm mới";
  buildFields();
  const dlg = document.getElementById("dlg");
  dlg.showModal();
  document.getElementById("dlg-save").onclick = saveCreate;
  document.getElementById("dlg-cancel").onclick = ()=>dlg.close();
}
function openEdit(rec){
  document.getElementById("dlg-title").textContent = "Cập nhật";
  buildFields(rec);
  const dlg = document.getElementById("dlg");
  dlg.showModal();
  document.getElementById("dlg-save").onclick = ()=>saveUpdate(rec.ID);
  document.getElementById("dlg-cancel").onclick = ()=>dlg.close();
}

/* ======== GỬI CRUD BẰNG FORMDATA (TRÁNH PREFLIGHT/CORS) ======== */
async function postForm(action, sheet, dataObj, id){
  const fd = new FormData();
  fd.append("action", action);
  fd.append("sheet", sheet);
  if (id != null) fd.append("id", String(id));
  fd.append("data", JSON.stringify(dataObj)); // server parse JSON trong trường 'data'

  const res = await fetch(GAS_BASE_URL, { method:"POST", body: fd }); // KHÔNG đặt headers
  // Nếu Apps Script trả về text, cố gắng parse
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch(e) { json = { success:false, message:text }; }
  return json;
}

async function saveCreate(){ await saveRecord("create"); }
async function saveUpdate(id){ await saveRecord("update",id); }

async function saveRecord(action,id=null){
  const meta = SHEETS[currentTab];
  const payload = {};
  meta.columns.forEach(col=>{
    if (col==="ID"||col==="Cập nhật"||col==="Ngày cập nhật") return;
    const el = document.getElementById("fld-"+col.replace(/\s+/g,"_"));
    if (!el) return;
    let v = el.value || "";
    // chuẩn hoá yyyy-MM-dd -> Date ISO string để backend nhận
    if (/(Ngày|Hạn|Tháng)/i.test(col) && v) {
      // el.value đã ở dạng yyyy-MM-dd
      try { v = new Date(v).toISOString(); } catch(e){}
    }
    payload[col] = v;
  });

  try{
    const resp = await postForm(action, meta.sheetName, payload, id);
    if (!resp.success && !resp.id) throw new Error(resp.message || "Không lưu được");
    document.getElementById("dlg").close();
    loadData();
  }catch(e){
    alert("Lỗi: " + (e.message || e));
  }
}

async function del(rec){
  if (!confirm("Xóa bản ghi này?")) return;
  const meta = SHEETS[currentTab];
  try{
    const resp = await postForm("delete", meta.sheetName, {}, rec.ID);
    if (!resp.success) throw new Error(resp.message || "Xoá thất bại");
    loadData();
  }catch(e){
    alert("Lỗi: " + (e.message || e));
  }
}
