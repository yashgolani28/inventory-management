const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export type EntityName =
  | "regions"
  | "districts"
  | "landmarks"
  | "poles"
  | "junction-boxes"
  | "components"
  | "credentials";

export async function fetchEntities(entity: EntityName, skip: number = 0) {
  const limit = entity === "components" ? 200 : 500; // Reduce limit for components due to credentials join
  const res = await fetch(`${BASE_URL}/${entity}/?limit=${limit}&skip=${skip}`);
  if (!res.ok) throw new Error(`Failed to fetch ${entity}`);
  return res.json();
}

export async function createEntity(entity: EntityName, payload: unknown) {
  const res = await fetch(`${BASE_URL}/${entity}/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Create failed: ${entity}`);
  return res.json();
}

export async function updateEntity(entity: EntityName, id: number, payload: unknown) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${BASE_URL}/${entity}/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Update failed: ${entity} ${id}`);
  return res.json();
}

export async function patchEntity(entity: EntityName, id: number, payload: Record<string, unknown>) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${BASE_URL}/${entity}/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Patch failed: ${entity} ${id}`);
  return res.json();
}

export async function deleteEntity(entity: EntityName, id: number) {
  const res = await fetch(`${BASE_URL}/${entity}/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`Delete failed: ${entity} ${id}`);
  return true;
}

export async function importEnum1(filePath: string, sheetName?: string) {
  const res = await fetch(`${BASE_URL}/import/enum1`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ file_path: filePath, sheet_name: sheetName ?? "Enum-1" }),
  });
  if (!res.ok) throw new Error("Enum-1 import failed");
  return res.json();
}

export async function importIpSchemaPoles(filePath: string, sheetName?: string) {
  const res = await fetch(`${BASE_URL}/import/ip-schema/poles`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ file_path: filePath, sheet_name: sheetName }),
  });
  if (!res.ok) throw new Error("IP schema poles import failed");
  return res.json();
}

export async function importIpSchemaJbs(filePath: string, sheetName?: string) {
  const res = await fetch(`${BASE_URL}/import/ip-schema/jbs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ file_path: filePath, sheet_name: sheetName }),
  });
  if (!res.ok) throw new Error("IP schema JB import failed");
  return res.json();
}

export async function importCredentials(filePath: string, sheetName?: string) {
  const res = await fetch(`${BASE_URL}/import/credentials`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ file_path: filePath, sheet_name: sheetName }),
  });
  if (!res.ok) throw new Error("Credentials import failed");
  return res.json();
}

export async function importAll(payload: {
  enum1_path: string;
  enum1_sheet?: string;
  ip_path: string;
  ip_poles_sheet?: string;
  ip_jbs_sheet?: string;
  credentials_path: string;
  credentials_sheet?: string;
}) {
  const res = await fetch(`${BASE_URL}/import/all`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Import all failed");
  return res.json();
}

export async function importAuto() {
  const res = await fetch(`${BASE_URL}/import/auto`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error("Auto import failed");
  return res.json();
}

export async function login(username: string, password: string) {
  try {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ detail: "Login failed" }));
      throw new Error(errorData.detail || `Login failed: ${res.status} ${res.statusText}`);
    }
    const data = await res.json();
    localStorage.setItem("token", data.access_token);
    return data;
  } catch (error: any) {
    if (error.message) throw error;
    throw new Error(`Network error: ${error.message || "Failed to connect to server"}`);
  }
}

export async function register(username: string, password: string, email?: string) {
  try {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, email }),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ detail: "Registration failed" }));
      throw new Error(errorData.detail || `Registration failed: ${res.status} ${res.statusText}`);
    }
    return res.json();
  } catch (error: any) {
    if (error.message) throw error;
    throw new Error(`Network error: ${error.message || "Failed to connect to server"}`);
  }
}

export async function getCurrentUser() {
  const token = localStorage.getItem("token");
  if (!token) return null;
  const res = await fetch(`${BASE_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return res.json();
}

export function logout() {
  localStorage.removeItem("token");
}

export async function listSheets(filePath: string) {
  const res = await fetch(`${BASE_URL}/import/sheets?file_path=${encodeURIComponent(filePath)}`);
  if (!res.ok) throw new Error("Failed to list sheets");
  return res.json();
}

export function downloadCsv(filename: string, rows: unknown[]) {
  if (!rows.length) return;
  const keys = Array.from(
    rows.reduce((set, r) => {
      Object.keys(r as Record<string, unknown>).forEach((k) => set.add(k));
      return set;
    }, new Set<string>()),
  );
  const escape = (v: unknown) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [keys.join(","), ...rows.map((r) => keys.map((k) => escape((r as any)[k])).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Audit Log functions
export async function fetchAuditLogs(limit: number = 100, offset: number = 0, username?: string) {
  let url = `${BASE_URL}/audit-logs/?limit=${limit}&offset=${offset}`;
  if (username) {
    url += `&username=${encodeURIComponent(username)}`;
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch audit logs");
  return res.json();
}

export async function createAuditLog(payload: {
  username: string;
  action: string;
  entity_type: string;
  entity_id?: number;
  old_value?: string;
  new_value?: string;
  description?: string;
  timestamp: string;
  ip_address?: string;
}) {
  const res = await fetch(`${BASE_URL}/audit-logs/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to create audit log");
  return res.json();
}

// Global search function
export async function globalSearch(query: string, limit: number = 100) {
  const res = await fetch(`${BASE_URL}/search/global?q=${encodeURIComponent(query)}&limit=${limit}`);
  if (!res.ok) throw new Error("Search failed");
  return res.json();
}

// Search for a specific value across all Excel workbooks and sheets
export async function searchExcelByValue(query: string) {
  const res = await fetch(`${BASE_URL}/search/excel-by-value?q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error("Excel search failed");
  return res.json();
}

// File upload and import functions
export async function detectFileSchema(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  
  const res = await fetch(`${BASE_URL}/import/detect-schema`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error("Failed to detect file schema");
  return res.json();
}

export async function uploadAndImport(
  file: File,
  sheetName: string = "auto",
  importType: string = "auto"
) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("sheet_name", sheetName);
  formData.append("import_type", importType);
  
  const res = await fetch(`${BASE_URL}/import/upload-and-import`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: "Import failed" }));
    throw new Error(errorData.detail || "Import failed");
  }
  return res.json();
}

export async function getAvailableSheets(filePath: string) {
  const res = await fetch(`${BASE_URL}/import/available-sheets?file_path=${encodeURIComponent(filePath)}`);
  if (!res.ok) throw new Error("Failed to get sheets");
  return res.json();
}

// ----------------------------
// Raw Excel Workbook APIs
// ----------------------------

export type ExcelWorkbook = {
  id: number;
  filename: string;
  sha256?: string | null;
  imported_at: string;
};

export type ExcelSheet = {
  id: number;
  workbook_id: number;
  name: string;
  header_row?: number | null;
  max_row?: number | null;
  max_col?: number | null;
  columns: string[];
};

export type ExcelRow = {
  id: number;
  sheet_id: number;
  row_index: number;
  data: Record<string, any>;
};

export async function listExcelWorkbooks(limit: number = 200, offset: number = 0): Promise<ExcelWorkbook[]> {
  const res = await fetch(`${BASE_URL}/excel/workbooks?limit=${limit}&offset=${offset}`);
  if (!res.ok) throw new Error("Failed to list Excel workbooks");
  return res.json();
}

export async function listExcelSheets(workbookId: number): Promise<ExcelSheet[]> {
  const res = await fetch(`${BASE_URL}/excel/workbooks/${workbookId}/sheets`);
  if (!res.ok) throw new Error("Failed to list Excel sheets");
  return res.json();
}

export async function getExcelSheet(sheetId: number): Promise<ExcelSheet> {
  const res = await fetch(`${BASE_URL}/excel/sheets/${sheetId}`);
  if (!res.ok) throw new Error("Failed to get Excel sheet");
  return res.json();
}

export async function listExcelRows(args: {
  sheetId: number;
  limit?: number;
  offset?: number;
  q?: string;
  sortCol?: string;
  sortDir?: "asc" | "desc";
}): Promise<ExcelRow[]> {
  const p = new URLSearchParams();
  p.set("limit", String(args.limit ?? 200));
  p.set("offset", String(args.offset ?? 0));
  if (args.q) p.set("q", args.q);
  if (args.sortCol) p.set("sort_col", args.sortCol);
  if (args.sortDir) p.set("sort_dir", args.sortDir);

  const res = await fetch(`${BASE_URL}/excel/sheets/${args.sheetId}/rows?${p.toString()}`);
  if (!res.ok) throw new Error("Failed to list Excel rows");
  return res.json();
}

export async function patchExcelRow(rowId: number, payload: Record<string, any>): Promise<ExcelRow> {
  const token = localStorage.getItem("token");
  const res = await fetch(`${BASE_URL}/excel/rows/${rowId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Failed to update Excel row ${rowId}`);
  return res.json();
}
