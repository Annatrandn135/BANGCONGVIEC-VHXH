/**
 * FRONTEND – Bảng công việc phòng VH-XH
 * Cần khai báo:
 *  - GAS_BASE_URL   : Web App /exec phục vụ LIST/CREATE/UPDATE/DELETE
 *  - GAS_UPLOAD_URL : Web App /exec hiển thị form Upload (mở TAB MỚI)
 *
 * Gợi ý: bạn đang dùng URL:
 * https://script.google.com/macros/s/AKfycb.../exec
 * -> Dán đúng vào 2 biến dưới đây.
 */
const GAS_BASE_URL   = "https://script.google.com/macros/s/AKfycbw1nSaUIyVOijZMWr-8-Jhgw32s-D7ps87g5cOASmcc_tkt1QZrlV7942AwLXt7Knr4/exec";
const GAS_UPLOAD_URL = "https://script.google.com/macros/s/AKfycbymXO6kOFiVhgmjWxS3AxmmkPxYIfnybrkfQXscr1UV-AWbCO8Q_FFglwQsQpENMbyw/exec";

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
function pad2(n){ return String(n).padStart(2,'0'); }
/** chuyển mọi chuỗi ngày -> yyyy-MM-dd cho input[type=date] */
function toDateInputValue(val){
  if(!val) return "";
  const d = new Date(val);
  if (isNaN(d)) return "";
  return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
}
function formatDateForView(val){
  if(!val) return "";
  const d = new Date(val);
  if (isNaN(d)) return String(val);
  return d.toLocaleDateString('vi-VN');
}
function formatStatus(val){
  if(!val) return "";
  const v = (""+val).toLowerCase();
  if (v.includes("hoàn")) return '<span class="badge status-Hoan">Hoàn thành</span>';
  if (v.includes("đang"))  return '<span class="badge status-Dang">Đang thực hiện</span>';
  if (v.includes("quá"))   return '<span class="badge status-Qua">Quá hạn</span>';
  return '<span class="badge status-Cho">Chưa thực hiện</span>';
}

/* ====================== STATE ====================== */
let currentTab = "lich_ubnd";
let cache = {};
let cbccList = [
  "Tú Anh","Nguyệt","Nhiên","Loan","L. Uyên","Hùng","Đào","Thúy","Ly","Hiền","Lưu",
  "Thảo","Giang","Huy","Cường","Phong","Duy","Thân","Dung","T. Uyên","Văn","Trí","Phúc","Hân","Nguyên","Thành"
];

/* ====================== LẤY DM CBCC (nếu có) ====================== */
async function loadCBCCFromSheetIfAny(){
  try{
    const u = new URL(GAS_BASE_URL);
    u.searchParams.set("action","list");
    u.searchParams.set("sheet","DM_CBCC");
    const res = await fetch(u);
    const data = await res.json();
    if (data.records?.length){
      const first = Object.keys(data.records[0])[0];
      cbccList = data.records.map(r=>r[first]).filter(Boolean);
    }
  }catch(e){}
  const sel = document.getElementById("filter-canbo");
  sel.innerHTML = '<option value="">-- Lọc theo CBCC --</option>' +
    cbccList.map(n=>`<option>${n}</option>`).join('');
}

/* ====================== INIT ====================== */
document.addEventListener("DOMContentLoaded", async () => {
  await loadCBCCFromSheetIfAny();

  document.querySelectorAll("#tabs .tab").forEach(b=>{
    b.addEventListener("click", ()=>switchTab(b.dataset.tab));
  });

  document.getElementById("btn-add").addEventListener("click", openCreate);
  document.getElementById("search").addEventListener("input", renderTable);
  document.getElementById("filter-canbo").addEventListener("change", renderTable);
  document.getElementById("filter-status").addEventListener("change", renderTable);

  // Lắng nghe postMessage từ trang Upload (khác origin)
  window.addEventListener("message", ev=>{
    try{
      const msg = ev.data || {};
      if (msg.type === "uploaded" && msg.url){
        // tìm ô URL đang focus (nếu có)
        const box = document.querySelector('.form-fields input[data-accept-link="1"]');
        if (box) {
          box.value = msg.url;
          alert("Đã nhận link từ trang Upload.");
        }
      }
    }catch(_){}
  });

  switchTab(currentTab);
});

function switchTab(tab){
  currentTab = tab;
  document.querySelectorAll("#tabs .tab").forEach(b=>b.classList.toggle("active", b.dataset.tab===tab));
  loadData();
}

/* ====================== LOAD DATA ====================== */
async function loadData(){
  const meta = SHEETS[currentTab];
  document.getElementById("error").textContent = "";
  document.getElementById("empty").textContent = "";

  // header
  document.getElementById("table-head").innerHTML =
    "<tr>" + meta.columns.map(c=>`<th>${c}</th>`).join("") + "<th>Thao tác</th></tr>";
  document.getElementById("table-body").innerHTML = "";

  try{
    const u = new URL(GAS_BASE_URL);
    u.searchParams.set("action","list");
    u.searchParams.set("sheet", meta.sheetName);
    const res = await fetch(u);
    const data = await res.json();
    cache[currentTab] = Array.isArray(data.records) ? data.records : [];
    renderTable();
  }catch(e){
    document.getElementById("error").textContent = "Không tải được dữ liệu: " + (e.message || e);
  }
}

/* ====================== RENDER ====================== */
function renderTable(){
  const meta = SHEETS[currentTab];
  const q  = document.getElementById("search").value.trim().toLowerCase();
  const cb = document.getElementById("filter-canbo").value;
  const st = document.getElementById("filter-status").value;

  let rows = (cache[currentTab]||[]).filter(r=>{
    const text = Object.values(r).join(" ").toLowerCase();
    const okQ = !q || text.includes(q);
    const okCB = !cb || r["Cán bộ"]===cb || r["Phụ trách"]===cb;
    const okS = !st || r["Trạng thái"]===st;
    return okQ && okCB && okS;
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
      if (/Trạng thái/i.test(col))     val = formatStatus(val);
      if (/(Liên kết|Đính kèm|Nguồn|Kết quả|Báo cáo|\(link\))/i.test(col)){
        if (val) val = `<a class="link" href="${val}" target="_blank">Mở liên kết</a>`;
      }
      tr.insertAdjacentHTML("beforeend", `<td>${val}</td>`);
    });

    const ops = document.createElement("td");
    ops.innerHTML = `<button class="btn btn-light" data-op="edit">Sửa</button>
                     <button class="btn btn-light" data-op="del">Xóa</button>`;
    ops.querySelector('[data-op="edit"]').onclick = ()=>openEdit(r);
    ops.querySelector('[data-op="del"]').onclick  = ()=>del(r);
    tr.appendChild(ops);
    body.appendChild(tr);
  });
}

/* ====================== FORM ====================== */
function buildFields(record={}){
  const meta = SHEETS[currentTab];
  const wrap = document.getElementById("form-fields");
  wrap.innerHTML = "";

  meta.columns.forEach(col=>{
    if (col==="ID" || col==="Cập nhật" || col==="Ngày cập nhật") return;

    const id = "fld-"+col.replace(/\s+/g,"_");
    const val = record[col] || "";

    const isDate = /(Ngày|Hạn|Tháng)/i.test(col);
    const isLong = /(Nội dung|Ghi chú|Công việc|Tiêu đề)/i.test(col);
    const isCanBo = ["Cán bộ","Phụ trách","Người giao","Người nhập"].includes(col);
    const isLink = /(Liên kết|Đính kèm|Nguồn|Kết quả|Báo cáo|\(link\))/i.test(col);

    let inputHTML = "";

    if (isLong){
      inputHTML = `<textarea id="${id}">${val}</textarea>`;
    } else if (isDate){
      inputHTML = `<input id="${id}" type="date" value="${toDateInputValue(val)}">`;
    } else if (isCanBo){
      inputHTML = `<select id="${id}">
        ${["",...cbccList].map(v=>`<option ${v===val?"selected":""}>${v}</option>`).join("")}
      </select>`;
    } else if (isLink){
      inputHTML = `
        <div class="file-row">
          <input id="${id}" type="url" value="${val}" placeholder="https://..." data-accept-link="1">
          <button type="button" class="btn btn-light" id="${id}_open">Tải file</button>
          <button type="button" class="btn btn-primary" id="${id}_paste">Dán link</button>
        </div>`;
    } else {
      inputHTML = `<input id="${id}" type="text" value="${val}">`;
    }

    wrap.insertAdjacentHTML("beforeend", `
      <div class="row">
        <label>${col}</label>
        ${inputHTML}
      </div>
    `);

    if (isLink){
      const openBtn  = document.getElementById(`${id}_open`);
      const pasteBtn = document.getElementById(`${id}_paste`);
      const urlBox   = document.getElementById(id);

      // Mở trang Upload ở TAB MỚI
      openBtn.onclick = ()=>{
        alert('Đã mở trang Upload. Tải tệp xong, bấm "Copy link" ở trang Upload rồi quay lại bấm "Dán link".');
        window.open(GAS_UPLOAD_URL, "_blank", "noopener");
      };

      // Dán từ clipboard (yêu cầu user gesture)
      pasteBtn.onclick = async ()=>{
        try{
          const t = await navigator.clipboard.readText();
          try{ new URL(t); }catch{ throw new Error("Clipboard không có URL hợp lệ. Dán thủ công bằng Ctrl+V."); }
          urlBox.value = t;
        }catch(err){
          alert(err.message || "Không đọc được clipboard. Vui lòng Ctrl+V vào ô URL.");
        }
      };
    }
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

async function saveCreate(){ await saveRecord("create"); }
async function saveUpdate(id){ await saveRecord("update", id); }

async function saveRecord(action, id=null){
  const meta = SHEETS[currentTab];
  const payload = { action, sheet: meta.sheetName, data:{} };
  if (id) payload.id = id;

  meta.columns.forEach(col=>{
    if (col==="ID" || col==="Cập nhật" || col==="Ngày cập nhật") return;
    const el = document.getElementById("fld-"+col.replace(/\s+/g,"_"));
    if (el) payload.data[col] = el.value || "";
  });

  try{
    const res = await fetch(GAS_BASE_URL, {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify(payload)
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message || "Lỗi lưu dữ liệu");
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
    const res = await fetch(GAS_BASE_URL, {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify({ action:"delete", sheet:meta.sheetName, id:rec.ID })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message || "Xóa không thành công");
    loadData();
  }catch(e){
    alert("Lỗi: " + (e.message || e));
  }
}

