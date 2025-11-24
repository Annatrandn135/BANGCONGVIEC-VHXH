body {
  font-family: system-ui, sans-serif;
  margin: 0;
  background: #f6f7fb;
  color: #222;
}

header {
  background: #007bff;
  padding: 16px;
  color: white;
  text-align: center;
}

h1 {
  margin: 0;
  font-size: 28px;
}

/* Tabs */
#tabs {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 12px;
}

#tabs button {
  padding: 8px 14px;
  border: 0;
  border-radius: 6px;
  cursor: pointer;
  background: #e4e4e4;
}

#tabs button.active {
  background: #ffc107;
  font-weight: bold;
}

/* Toolbar */
.toolbar {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 12px;
}

table {
  width: 100%;
  background: white;
  border-collapse: collapse;
  margin-top: 10px;
}

table th {
  background: #0069d9;
  color: white;
  padding: 8px;
}

table td {
  padding: 6px;
  border-bottom: 1px solid #ddd;
}

button {
  cursor: pointer;
}

button.primary {
  background: #007bff;
  color: white;
  padding: 8px 16px;
  border-radius: 6px;
  border: none;
}

/* Badge trạng thái */
.badge {
  padding: 4px 8px;
  border-radius: 4px;
  color: white;
  font-size: 12px;
}

.status-Cho { background: #6c757d; }
.status-Dang { background: #17a2b8; }
.status-Hoan { background: #28a745; }
.status-Qua { background: #dc3545; }

/* Dialog */
dialog {
  width: 420px;
  border: none;
  padding: 20px;
  border-radius: 8px;
}

dialog::backdrop {
  background: rgba(0,0,0,0.4);
}

.row {
  margin-bottom: 12px;
}

.row label {
  display: block;
  margin-bottom: 4px;
}

input, textarea, select {
  width: 100%;
  padding: 8px;
}

.file-row {
  display: flex;
  gap: 6px;
}
