/**
 * FRONTEND – Bảng công việc phòng VH-XH
 * CRUD đọc/ghi vẫn qua GAS /exec của bạn.
 * Các cột liên kết/đính kèm dùng nút upload thẳng lên GitHub repo /files.
 */

/*** CẤU HÌNH ***/
const GAS_BASE_URL = "https://script.google.com/macros/s/AKfycbww9btbN6jilLIabRmojk3N0wUDznR9X3Es-lONDbmUjW2AY_yMRvhULl4Hiw6T_RAG/exec"; // CRUD
const GITHUB_UPLOAD_URL = "https://github.com/annatrandn135/BANGCONGVIEC-VHXH/upload/main/files"; // trang upload
const GH_PAGES_BASE = "https://annatrandn135.github.io/BANGCONGVIEC-VHXH/files/"; // base link sau upload

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

/*** TIỆN ÍCH ***/
function formatStatus(val) {
  if (!val) return "";
  const v = (""+val).toLowerCase();
  if (v.includes("hoàn")) return '<span class="badge status-Hoan">Hoàn thành</span>';
  if (v.includes("đang")) return '<span class="badge status-Dang">Đang thực hiện</span>';
  if (v.includes("quá"))  return '<span class="badge status-Qua">Quá hạn</span>';
  return '<span class="badge status-Cho">Chưa thực hiện</span>';
}
function fmtDate(val){
  if (!val) return "";
  const d = new Date(val);
  if (isNaN(d)) return val;
  return d.toLocaleDateString('vi-VN');
}

/*** STATE ***/
let currentTab = "lich_ubnd";
let cache = {};
let cbccList = ["Tú Anh","Nguyệt","Nhiên","Loan","L. Uyên","Hùng","Đào","Thúy","Ly","Hiền","Lưu","Thảo","Giang","Huy","Cường","Phong","Duy","Thân","Dung","T. Uyên","Văn","Trí","Phúc","Hân","Nguyên","Thành"];

/*** NẠP DM_CBCC (nếu có) ***/
async function loadCBCCFromSheetIfAny(){
  try{
    const url = new URL(GAS_BASE_URL);
    url.searchParams.set("action","list");
    url.searchParams.set("sheet","DM_CBCC");
    const r = await fetch(url);
    const j = await r.json();
    if (Array.isArray(j.records) && j.records.length){
      const first = Object.keys(j.records[0])[0];
      cbccList = j.records.map(x=>x[first]).filter(Boolean);
    }
  }catch(_){}
  const sel = document.getElementById("filter-canbo");
  sel.innerHTML = '<option value="">-- Lọc theo CBCC --</option>';
  cbccList.forEach(n=>{
    const o=document.createElement('option');o.value=n;o.textContent=n;sel.appendChild(o);
  });
}

/*** KHỞI TẠO ***/
document.addEventListener("DOMContentLoaded", async ()=>{
  await loadCBCCFromSheetIfAny();
  document.querySelectorAll("#tabs button").forEach(b=> b.addEventListener("click",()=>switchTab(b.dataset.tab)));
  document.getElementById("btn-add").addEventListener("click", openCreate);
  document.getElementById("search").addEventListener("input", renderTable);
  document.getElementById("filter-canbo").addEventListener("change", renderTable);
  document.getElementById("filter-status").addEventListener("change", renderTable);
  switchTab(currentTab);
});

function switchTab(tab){
  currentTab = tab;
  document.querySelectorAll("#tabs button").forEach(b=> b.classList.toggle("active", b.dataset.tab===tab));
  loadData();
}

/*** TẢI DỮ LIỆU ***/
async function loadData(){
  const meta = SHEETS[currentTab];
  document.getElementById("table-head").innerHTML =
    "<tr>"+meta.columns.map(c=>`<th>${c}</th>`).join("")+"<th>Thao tác</th></tr>";
  document.getElementById("table-body").innerHTML = "";
  document.getElementById("error").textContent = "";
  document.getElementById("empty").textContent = "";

  try{
    const url = new URL(GAS_BASE_URL);
    url.searchParams.set("action","list");
    url.searchParams.set("sheet",meta.sheetName);
    const r = await fetch(url);
    const j = await r.json();
    cache[currentTab] = Array.isArray(j.records)? j.records : [];
    renderTable();
  }catch(e){
    document.getElementById("error").textContent = "Không tải được dữ liệu: "+(e.message||e);
  }
}

/*** HIỂN THỊ ***/
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
  if (!rows.length){ document.getElementById("empty").textContent = "Chưa có dữ liệu."; return; }

  rows.forEach(r=>{
    const tr = document.createElement("tr");
    meta.columns.forEach(col=>{
      let val = r[col] ?? "";
      if (/Ngày|Hạn|Tháng/i.test(col)) val = fmtDate(val);
      if (/Trạng thái/i.test(col)) val = formatStatus(val);
      if (/(Liên kết|Đính kèm|Nguồn|Kết quả|Báo cáo|\(link\))/i.test(col) && val){
        val = `<a class="link" target="_blank" href="${val}">Mở liên kết</a>`;
      }
      tr.insertAdjacentHTML("beforeend", `<td>${val||""}</td>`);
    });
    const ops = document.createElement("td");
    ops.innerHTML = `<button data-op="edit">Sửa</button> <button data-op="del">Xóa</button>`;
    ops.querySelector('[data-op="edit"]').onclick = ()=>openEdit(r);
    ops.querySelector('[data-op="del"]').onclick = ()=>del(r);
    tr.appendChild(ops);
    body.appendChild(tr);
  });
}

/*** FORM ***/
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

    let input = "";
    if (isLong) input = `<textarea id="${id}" rows="3">${val}</textarea>`;
    else if (isDate) input = `<input id="${id}" type="date" value="${formatForInput(val)}">`;
    else if (isCanBo) {
      input = `<select id="${id}">${["",...cbccList].map(v=>`<option ${v===val?"selected":""}>${v}</option>`).join("")}</select>`;
    } else if (isLink){
      input = `
        <div>
          <input type="url" id="${id}" value="${val}" placeholder="https://annatrandn135.github.io/BANGCONGVIEC-VHXH/files/ten-file.pdf">
          <div class="file-tools">
            <button type="button" class="gh" id="${id}_gh">Tải lên GitHub</button>
            <button type="button" class="paste" id="${id}_paste">Dán link</button>
          </div>
        </div>`;
    } else input = `<input id="${id}" type="text" value="${val}">`;

    fields.insertAdjacentHTML("beforeend", `
      <div class="row">
        <label>${col}</label>
        ${input}
      </div>
    `);

    if (isLink){
      document.getElementById(`${id}_gh`).onclick = ()=>{
        window.open(GITHUB_UPLOAD_URL, "_blank", "noopener");
        alert("Đã mở trang Upload GitHub. Sau khi tải xong, bấm nút Copy path (hoặc Sao chép link), quay lại bấm 'Dán link'.\nMẹo: Link hợp lệ bắt đầu bằng:\n"+GH_PAGES_BASE);
      };
      document.getElementById(`${id}_paste`).onclick = async ()=>{
        try{
          const t = await navigator.clipboard.readText();
          if (t && /^https?:\/\//i.test(t)) {
            document.getElementById(id).value = t;
          } else {
            alert("Clipboard không có URL hợp lệ. Hãy dán thủ công (Ctrl+V).");
          }
        }catch(_){
          alert("Trình duyệt không cho truy cập clipboard. Hãy dán thủ công (Ctrl+V).");
        }
      };
    }
  });
}

function formatForInput(v){
  if (!v) return "";
  const d = new Date(v); if (isNaN(d)) return "";
  const m = String(d.getMonth()+1).padStart(2,"0");
  const da = String(d.getDate()).padStart(2,"0");
  return `${d.getFullYear()}-${m}-${da}`;
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

async function saveCreate(){ await saveRecord("create"); }
async function saveUpdate(id){ await saveRecord("update", id); }

async function saveRecord(action, id=null){
  const meta = SHEETS[currentTab];
  const payload = { action, sheet: meta.sheetName, data:{} };
  if (id) payload.id = id;

  meta.columns.forEach(col=>{
    if (col==="ID"||col==="Cập nhật"||col==="Ngày cập nhật") return;
    const el = document.getElementById("fld-"+col.replace(/\s+/g,"_"));
    if (el) payload.data[col] = el.value || "";
  });

  try{
    const r = await fetch(GAS_BASE_URL, {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify(payload)
    });
    const j = await r.json();
    if (!j.success) { alert("Lỗi: "+(j.message||"Không xác định")); return; }
    document.getElementById("dlg").close();
    loadData();
  }catch(e){
    alert("Lỗi: "+(e.message||e));
  }
}

async function del(rec){
  if (!confirm("Xóa bản ghi này?")) return;
  const meta = SHEETS[currentTab];
  try{
    const r = await fetch(GAS_BASE_URL, {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ action:"delete", sheet: meta.sheetName, id: rec.ID })
    });
    const j = await r.json();
    if (!j.success) { alert("Lỗi: "+(j.message||"Không xác định")); return; }
    loadData();
  }catch(e){
    alert("Lỗi: "+(e.message||e));
  }
}
