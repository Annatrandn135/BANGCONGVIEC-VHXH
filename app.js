/**
 * FRONTEND – Bảng công việc phòng VH-XH
 * Đọc/ghi dùng /exec (hoạt động). Upload: tạm tắt nếu thiếu googleusercontent URL.
 */

/* URL Web App /exec (đã gắn của bạn) */
const GAS_BASE_URL = "https://script.google.com/macros/s/AKfycbzHeDlLSVw3cBwyy1-FicxbMeOSk1CUMNFO7TenF3BDMer2tkMbkHJ5dfemKVkXznUl/exec";

/* URL Upload (googleusercontent.com) – hiện để TRỐNG vì tài khoản của bạn chưa tạo được.
   Khi có URL đúng dạng:
   https://script.googleusercontent.com/macros/echo?user_content_key=...  => dán vào đây.
   Lập tức nút “Tải lên” sẽ bật và hoạt động. */
let GAS_UPLOAD_URL = "";   // <-- dán URL googleusercontent.com vào đây khi có

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
  if (v.includes("quá")) return '<span class="badge status-Qua">Quá hạn</span>';
  return '<span class="badge status-Cho">Chưa thực hiện</span>';
}
function formatDateForView(val) {
  if (!val) return "";
  const d = new Date(val);
  if (isNaN(d.getTime())) return String(val);
  // Chuẩn yyyy-MM-dd cho input[type=date]
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth()+1).padStart(2,"0");
  const dd = String(d.getDate()).padStart(2,"0");
  return `${dd}/${mm}/${yyyy}`;
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

  // Thông báo nếu thiếu Upload URL
  if (!GAS_UPLOAD_URL) document.getElementById("upload-tip").style.display = "inline";

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
    document.getElementById("error").textContent =
      "Không tải được dữ liệu: " + (e.message || e);
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
    ops.innerHTML = `
      <button class="btn" data-op="edit">Sửa</button>
      <button class="btn" data-op="del">Xóa</button>
    `;
    ops.querySelector('[data-op="edit"]').onclick = ()=>openEdit(r);
    ops.querySelector('[data-op="del"]').onclick = ()=>del(r);
    tr.appendChild(ops);
    body.appendChild(tr);
  });
}

/* ====================== UPLOAD (tạm tắt nếu thiếu URL hợp lệ) ====================== */
async function uploadFileViaGAS(file){
  if (!GAS_UPLOAD_URL) throw new Error("Thiếu Upload URL (googleusercontent.com)");
  const fd = new FormData();
  fd.append("action","upload");
  fd.append("file",file,file.name);
  const res = await fetch(GAS_UPLOAD_URL,{ method:"POST", body:fd });
  const data = await res.json();
  if (!data.success) throw new Error(data.message || "Upload lỗi");
  return data.url;
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

    if (isLong){
      input = `<textarea id="${id}" rows="3">${val}</textarea>`;
    }
    else if (isDate){
      // chuẩn yyyy-MM-dd cho input date
      let dateValue = "";
      if (val) {
        const d = new Date(val);
        if (!isNaN(d.getTime())){
          const yyyy = d.getFullYear();
          const mm = String(d.getMonth()+1).padStart(2,"0");
          const dd = String(d.getDate()).padStart(2,"0");
          dateValue = `${yyyy}-${mm}-${dd}`;
        }
      }
      input = `<input id="${id}" type="date" value="${dateValue}">`;
    }
    else if (isCanBo){
      input = `<select id="${id}">
        ${["",...cbccList].map(v=>`<option ${v===val?"selected":""}>${v}</option>`).join("")}
      </select>`;
    }
    else if (isLink){
      const disabled = GAS_UPLOAD_URL ? "" : "disabled";
      const tip = GAS_UPLOAD_URL ? "" : 'title="Chưa cấu hình Upload URL"';
      input = `
        <div class="file-row">
          <input type="url" id="${id}" value="${val}" placeholder="https://...">
          <input type="file" id="${id}_file" ${disabled}>
          <button type="button" id="${id}_btn" class="btn" ${disabled} ${tip}>Tải lên</button>
        </div>`;
    }
    else {
      input = `<input id="${id}" type="text" value="${val}">`;
    }

    fields.insertAdjacentHTML("beforeend",`
      <label>${col}</label>
      ${input}
    `);

    if (isLink && GAS_UPLOAD_URL){
      const btn = document.getElementById(`${id}_btn`);
      const file = document.getElementById(`${id}_file`);
      const urlBox = document.getElementById(id);

      btn.onclick = async ()=>{
        if (!file.files || !file.files[0]){ alert("Chọn tệp trước."); return; }
        btn.disabled = true; btn.textContent = "Đang tải...";
        try{
          const up = await uploadFileViaGAS(file.files[0]); // {url: ...}
          urlBox.value = up;
          alert("Đã tải lên xong!");
        } catch(e){
          alert("Upload lỗi: "+e.message);
        }
        btn.disabled = false; btn.textContent = "Tải lên";
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
async function saveUpdate(id){ await saveRecord("update",id); }

async function saveRecord(action,id=null){
  const meta = SHEETS[currentTab];
  const payload = { action, sheet:meta.sheetName, data:{} };
  if (id) payload.id = id;

  meta.columns.forEach(col=>{
    if (col==="ID"||col==="Cập nhật"||col==="Ngày cập nhật") return;
    const el = document.getElementById("fld-"+col.replace(/\s+/g,"_"));
    if (el) payload.data[col] = el.value || "";
  });

  const res = await fetch(GAS_BASE_URL,{
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body:JSON.stringify(payload)
  });

  const data = await res.json();
  if (!data.success){
    alert("Lỗi: "+data.message);
    return;
  }
  document.getElementById("dlg").close();
  loadData();
}

async function del(rec){
  if (!confirm("Xóa bản ghi này?")) return;

  const meta = SHEETS[currentTab];
  const res = await fetch(GAS_BASE_URL,{
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body:JSON.stringify({ action:"delete", sheet:meta.sheetName, id:rec.ID })
  });

  const data = await res.json();
  if (!data.success){
    alert("Lỗi: "+data.message);
    return;
  }
  loadData();
}

