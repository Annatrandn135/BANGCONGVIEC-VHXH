/* ========================= CONFIG ======================== */
const GAS_BASE_URL = "https://script.google.com/macros/s/AKfycbwHII2N6Tc3ekRCfwvTXJ8CgbeV6s3XeD_trsWfbh6fFtgfxHnRyowKQMdc7onIn2zZ/exec"; // ← dán URL Web App của anh

const SHEETS = {
  lich_ubnd: {
    title: "Lịch công tác UBND",
    sheetName: "1_LICH_UBND",
    columns: ["ID","Ngày","Giờ","Nội dung","Địa điểm","Thành phần","Chủ trì","Liên hệ","Ghi chú","Nguồn/Tệp","Người nhập","Cập nhật"]
  },
  lich_vhxh: {
    title: "Lịch phòng VH-XH",
    sheetName: "2_LICH_VH_XH",
    columns: ["ID","Ngày","Giờ","Công việc","Địa điểm/Đơn vị","Phụ trách","Thành phần","Ghi chú","Nguồn/Tệp","Người nhập","Cập nhật"]
  },
  trong_tam_thang: {
    title: "Nhiệm vụ trọng tâm",
    sheetName: "3_TRONG_TAM_THANG",
    columns: ["ID","Tháng","Nội dung nhiệm vụ","Đơn vị phối hợp","Phụ trách","Hạn hoàn thành","Trạng thái","Kết quả/Báo cáo (link)","Ghi chú","Người nhập","Cập nhật"]
  },
  nhiem_vu_cbcc: {
    title: "Nhiệm vụ CBCC",
    sheetName: "4_NHIEM_VU_CBCC",
    columns: ["ID","Cán bộ","Nhiệm vụ","Hạn xử lý","Trạng thái","Mức ưu tiên","Liên kết/Đính kèm","Ghi chú","Ngày giao","Người giao","Ngày cập nhật","Kết quả (link)","Nhắc trước (ngày)"]
  },
  bao_cao: {
    title: "Báo cáo",
    sheetName: "5_BAO_CAO",
    columns: ["ID","Kỳ báo cáo","Tiêu đề","Phụ trách","Hạn nộp","Trạng thái","Liên kết/Đính kèm","Ghi chú","Ngày cập nhật"]
  }
};

/* ========================= SUPPORT ======================== */
function formatStatus(val){
  if(!val) return "";
  val = val.toLowerCase();
  if(val.includes("hoàn")) return `<span class="badge status-Hoan">Hoàn thành</span>`;
  if(val.includes("đang")) return `<span class="badge status-Dang">Đang thực hiện</span>`;
  if(val.includes("quá"))  return `<span class="badge status-Qua">Quá hạn</span>`;
  return `<span class="badge status-Cho">Chưa thực hiện</span>`;
}

function formatDate(val){
  if(!val) return "";
  const d = new Date(val);
  if(isNaN(d.getTime())) return val;
  return d.toLocaleDateString("vi-VN");
}

let currentTab = "lich_ubnd";
let cache = {};
let cbccList = ["Tú Anh","Nguyệt","Nhiên","Loan","L. Uyên","Hùng","Đào","Thúy","Ly"];

/* ========================= INIT ======================== */
document.addEventListener("DOMContentLoaded", ()=>{
  document.querySelectorAll("#tabs button").forEach(b=>{
    b.onclick = ()=>switchTab(b.dataset.tab);
  });

  document.getElementById("btn-add").onclick = openCreate;
  document.getElementById("search").oninput = renderTable;
  document.getElementById("filter-canbo").onchange = renderTable;
  document.getElementById("filter-status").onchange = renderTable;

  switchTab("lich_vhxh");
});

/* ========================= LOAD DATA ======================== */
async function switchTab(tab){
  currentTab = tab;
  document.querySelectorAll("#tabs button").forEach(b=>{
    b.classList.toggle("active", b.dataset.tab===tab);
  });
  await loadData();
}

async function loadData(){
  const meta = SHEETS[currentTab];

  document.getElementById("table-head").innerHTML =
    "<tr>"+ meta.columns.map(c=>`<th>${c}</th>`).join("") +"<th>Thao tác</th></tr>";

  document.getElementById("table-body").innerHTML = "";

  const url = new URL(GAS_BASE_URL);
  url.searchParams.set("action","list");
  url.searchParams.set("sheet",meta.sheetName);

  const res = await fetch(url);
  const json = await res.json();
  cache[currentTab] = json.records ?? [];
  renderTable();
}

/* ========================= TABLE ======================== */
function renderTable(){
  const rows = cache[currentTab];
  if(!rows.length){
    document.getElementById("table-body").innerHTML = "";
    document.getElementById("empty").textContent = "Chưa có dữ liệu.";
    return;
  }

  document.getElementById("empty").textContent = "";

  const meta = SHEETS[currentTab];
  const body = document.getElementById("table-body");
  body.innerHTML="";

  rows.forEach(r=>{
    const tr = document.createElement("tr");

    meta.columns.forEach(col=>{
      let val = r[col] ?? "";
      if(/Ngày|Hạn|Tháng/.test(col)) val = formatDate(val);
      if(/Trạng thái/.test(col)) val = formatStatus(val);
      if(/Liên|Kết quả|Đính kèm/.test(col) && val)
        val = `<a target="_blank" href="${val}">Mở</a>`;
      tr.insertAdjacentHTML("beforeend", `<td>${val}</td>`);
    });

    const ops = document.createElement("td");
    ops.innerHTML = `
      <button onclick="openEdit(${r.ID})">Sửa</button>
      <button onclick="deleteRecord(${r.ID})">Xóa</button>`;
    tr.appendChild(ops);

    body.appendChild(tr);
  });
}

/* ========================= FORM ======================== */
function openCreate(){
  buildForm({});
}

function openEdit(id){
  const rec = cache[currentTab].find(x=>x.ID==id);
  buildForm(rec);
}

function buildForm(rec){
  const meta = SHEETS[currentTab];
  const f = document.getElementById("form-fields");
  f.innerHTML = "";

  meta.columns.forEach(col=>{
    if(col==="ID" || col==="Cập nhật" || col==="Ngày cập nhật") return;

    const id = "fld-"+col.replace(/\s+/g,"_");
    const val = rec[col] ?? "";

    let html = `<input id="${id}" value="${val}">`;

    if(/Nội dung|Ghi chú|Công việc/.test(col))
      html = `<textarea id="${id}" rows="3">${val}</textarea>`;

    if(/Ngày|Hạn/.test(col))
      html = `<input id="${id}" type="date" value="${val}">`;

    if(/(Liên kết|Đính kèm)/.test(col))
      html = `
      <div class="file-row">
        <input id="${id}" value="${val}" placeholder="https://...">
        <button onclick="openUploader('${id}')">Tải file</button>
        <button onclick="pasteUrl('${id}')">Dán link</button>
      </div>`;

    f.insertAdjacentHTML("beforeend",`
      <div class="row"><label>${col}</label>${html}</div>
    `);
  });

  const dlg = document.getElementById("dlg");
  dlg.showModal();

  document.getElementById("dlg-save").onclick = ()=>saveRecord(rec.ID);
  document.getElementById("dlg-cancel").onclick = ()=>dlg.close();
}

/* ===== Upload mở trang exec ===== */
function openUploader(targetId){
  alert("Đã mở trang Upload. Tải tệp xong, bấm 'Copy link', quay lại đây và bấm 'Dán link'.");
  window.open(GAS_BASE_URL+"?upload=1",'_blank');
}

async function pasteUrl(targetId){
  try{
    const txt = await navigator.clipboard.readText();
    if(!txt.startsWith("http")) throw 0;
    document.getElementById(targetId).value = txt;
  } catch(e){
    alert("Clipboard không có URL hợp lệ. Dán thủ công bằng Ctrl+V.");
  }
}

/* ========================= SAVE ======================== */
async function saveRecord(id){
  const meta = SHEETS[currentTab];
  const payload = { action: id?"update":"create", sheet: meta.sheetName, id, data:{} };

  meta.columns.forEach(col=>{
    if(col==="ID"||col==="Cập nhật"||col==="Ngày cập nhật") return;
    payload.data[col] = document.getElementById("fld-"+col.replace(/\s+/g,"_"))?.value ?? "";
  });

  const res = await fetch(GAS_BASE_URL,{
    method:"POST",
    body: JSON.stringify(payload)   // KHÔNG đặt Content-Type
  });

  const json = await res.json();
  if(!json.success){
    alert("Lỗi: "+json.message);
    return;
  }

  document.getElementById("dlg").close();
  loadData();
}

/* ========================= DELETE ======================== */
async function deleteRecord(id){
  if(!confirm("Xóa bản ghi?")) return;

  const meta = SHEETS[currentTab];

  const res = await fetch(GAS_BASE_URL,{
    method:"POST",
    body: JSON.stringify({
      action:"delete",
      sheet: meta.sheetName,
      id
    })
  });

  const json = await res.json();
  if(!json.success){
    alert("Lỗi: "+json.message);
    return;
  }

  loadData();
}
