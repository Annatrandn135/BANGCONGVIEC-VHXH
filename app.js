const GAS_BASE_URL = "https://script.google.com/macros/s/AKfycbzSdy-EqOoprnnmmpTOjshGXU3Thv2KUKqQQnIXafmaqV3RQzuR3Xzp8wSng9JUfXT_/exec";

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

function formatStatus(val) {
  if (!val) return "";
  const v = val.toLowerCase();
  if (v.includes("hoàn")) return '<span class="badge status-Hoan">Hoàn thành</span>';
  if (v.includes("đang")) return '<span class="badge status-Dang">Đang thực hiện</span>';
  if (v.includes("quá")) return '<span class="badge status-Qua">Quá hạn</span>';
  return '<span class="badge status-Cho">Chưa thực hiện</span>';
}

let currentTab = "lich_ubnd";
let cache = {};
let cbccList = ["Tú Anh","Nguyệt","Nhiên","Loan","L. Uyên","Hùng","Đào","Thúy","Ly","Hiền","Lưu","Thảo","Giang","Huy","Cường","Phong","Duy","Thân","Dung","T. Uyên","Văn","Trí","Phúc","Hân","Nguyên","Thành"];

document.addEventListener("DOMContentLoaded", () => {
  const tabs = document.querySelectorAll("#tabs button");
  tabs.forEach(btn => btn.addEventListener("click", () => switchTab(btn.dataset.tab)));
  document.getElementById("btn-add").addEventListener("click", openCreate);
  document.getElementById("search").addEventListener("input", renderTable);
  document.getElementById("filter-canbo").addEventListener("change", renderTable);
  document.getElementById("filter-status").addEventListener("change", renderTable);
  const f = document.getElementById("filter-canbo");
  cbccList.forEach(n => { const opt = document.createElement("option"); opt.value = n; opt.textContent = n; f.appendChild(opt); });
  switchTab(currentTab);
});
function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll("#tabs button").forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
  loadData();
}

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
    const res = await fetch(url, {method: "GET"});
    const data = await res.json();
    cache[currentTab] = data.records || [];
    renderTable();
  } catch (e) {
    document.getElementById("error").textContent = "Không tải được dữ liệu. Kiểm tra quyền truy cập Web App.";
  }
}

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
      let val = r[col] || "";
      if (col.toLowerCase().includes("trạng thái")) val = formatStatus(val);
      if (col.toLowerCase().includes("liên") || col.toLowerCase().includes("tệp") || col.toLowerCase().includes("kết quả") || col.toLowerCase().includes("nguồn")) {
        if (val) val = `<a class="link" href="${val}" target="_blank">Mở liên kết</a>`;
      }
      tr.insertAdjacentHTML("beforeend", `<td>${val}</td>`);
    });
    const ops = document.createElement("td");
    ops.innerHTML = `<button data-op="edit">Sửa</button> <button data-op="del">Xóa</button>`;
    ops.querySelector('[data-op="edit"]').addEventListener("click", ()=> openEdit(r));
    ops.querySelector('[data-op="del"]').addEventListener("click", ()=> del(r));
    tr.appendChild(ops);
    body.appendChild(tr);
  });
}
// 1) Đặt mảng tên (nếu chưa có)
let cbccList = [
  "Tú Anh","Nguyệt","Nhiên","Loan","L. Uyên","Hùng","Đào","Thúy","Ly","Hiền","Lưu",
  "Thảo","Giang","Huy","Cường","Phong","Duy","Thân","Dung","T. Uyên","Văn","Trí","Phúc","Hân","Nguyên","Thành"
];

// 2) Hàm nạp option vào select
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

// 3) Gọi ngay khi DOM sẵn sàng
document.addEventListener("DOMContentLoaded", () => {
  loadCBCCOptions();                 // <— thêm dòng này lên đầu
  // ...giữ nguyên các lệnh sự kiện khác...
});




