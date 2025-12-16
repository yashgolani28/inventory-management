import { useEffect, useMemo, useState } from "react";
import Login from "./Login";
import essiLogo from "./essi_logo.jpeg";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  EntityName,
  createEntity,
  deleteEntity,
  downloadCsv,
  fetchEntities,
  updateEntity,
  patchEntity,
  getCurrentUser,
  logout,
  importAuto,
  fetchAuditLogs,
  createAuditLog,
  globalSearch,
  searchExcelByValue,
  detectFileSchema,
  uploadAndImport,
  listExcelWorkbooks,
  listExcelSheets,
  listExcelRows,
  patchExcelRow,
  type ExcelWorkbook,
  type ExcelSheet,
  type ExcelRow,

} from "./api";

const entities: { label: string; name: EntityName; icon: string }[] = [
  { label: "Regions", name: "regions", icon: "🌍" },
  { label: "Districts", name: "districts", icon: "🗺️" },
  { label: "Landmarks", name: "landmarks", icon: "📍" },
  { label: "Poles", name: "poles", icon: "⚡" },
  { label: "Junction Boxes", name: "junction-boxes", icon: "📦" },
  { label: "Components", name: "components", icon: "🔧" },
  { label: "Credentials", name: "credentials", icon: "🔐" },
];

type Row = Record<string, unknown>;
type EditingCell = { rowIndex: number; column: string } | null;

function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [selected, setSelected] = useState<EntityName>("components");
  const [data, setData] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalRecords, setTotalRecords] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize] = useState(200);
  const [jsonInput, setJsonInput] = useState("{}");
  const [updateId, setUpdateId] = useState("");
  const [deleteId, setDeleteId] = useState("");
  const [activeTab, setActiveTab] = useState<"data" | "excel" | "import" | "users" | "charts">("data");
  const [editingCell, setEditingCell] = useState<EditingCell>(null);
  const [editValue, setEditValue] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchBy, setSearchBy] = useState<string>("any");
  const [globalSearchTerm, setGlobalSearchTerm] = useState("");
  const [globalSearchResults, setGlobalSearchResults] = useState<any>(null);
  const [excelSearchResults, setExcelSearchResults] = useState<any>(null);
  const [selectedObjectData, setSelectedObjectData] = useState<any>(null);
  const [inlineEditRow, setInlineEditRow] = useState<any>(null);
  const [inlineEditData, setInlineEditData] = useState<any>(null);
  const [editMode, setEditMode] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  
  // Audit/Users state
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  
  // Import state
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);
  const [importStarted, setImportStarted] = useState(false);

  // File upload state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileSchema, setFileSchema] = useState<any>(null);
  const [selectedSheet, setSelectedSheet] = useState<string>("auto");
  const [importType, setImportType] = useState<string>("auto");
  const [fileImportLoading, setFileImportLoading] = useState(false);
  const [fileImportResult, setFileImportResult] = useState<any>(null);

  // Excel (raw workbook viewer) state
  const [excelWorkbooks, setExcelWorkbooks] = useState<ExcelWorkbook[]>([]);
  const [excelWorkbookId, setExcelWorkbookId] = useState<number | null>(null);
  const [excelSheets, setExcelSheets] = useState<ExcelSheet[]>([]);
  const [excelSheetId, setExcelSheetId] = useState<number | null>(null);
  const [excelRows, setExcelRows] = useState<ExcelRow[]>([]);
  const [excelLoading, setExcelLoading] = useState(false);
  const [excelQ, setExcelQ] = useState("");
  const [excelSortCol, setExcelSortCol] = useState<string>("");
  const [excelSortDir, setExcelSortDir] = useState<"asc" | "desc">("asc");
  const [excelOffset, setExcelOffset] = useState(0);
  const [excelLimit, setExcelLimit] = useState(() => {
    const stored = localStorage.getItem("excelLimit");
    return stored ? parseInt(stored) : 200;
  });
  const [excelActiveCell, setExcelActiveCell] = useState<{ rowId: number; col: string } | null>(null);
  const [excelEditValue, setExcelEditValue] = useState<string>("");
  const [excelPasteText, setExcelPasteText] = useState<string>("");
  
  // Entity stats state
  const [entityStats, setEntityStats] = useState<Record<string, number>>({
    regions: 0,
    districts: 0,
    landmarks: 0,
    poles: 0,
    "junction-boxes": 0,
    components: 0,
    credentials: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);

  const filteredData = useMemo(() => {
    if (!searchTerm) return data;
    const term = searchTerm.toLowerCase();
    return data.filter((row) => {
      if (searchBy === "any") {
        return Object.values(row).some((v) => (v ?? "").toString().toLowerCase().includes(term));
      }
      const val = (row as any)[searchBy];
      return (val ?? "").toString().toLowerCase().includes(term);
    });
  }, [data, searchTerm, searchBy]);

  useEffect(() => {
    checkAuth();
  }, []);

  // Load stats for all entities
  useEffect(() => {
    const loadAllStats = async () => {
      setStatsLoading(true);
      try {
        const statsCopy: Record<string, number> = { ...entityStats };
        const entityList: EntityName[] = ["regions", "districts", "landmarks", "poles", "junction-boxes", "components", "credentials"];
        
        for (const entity of entityList) {
          try {
            // Fetch with high limit to get total count
            const result = await fetch(`${import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000"}/${entity}/?limit=50000&skip=0`);
            if (!result.ok) throw new Error(`Failed to fetch ${entity}`);
            const data = await result.json();
            const count = Array.isArray(data) ? data.length : (data?.items?.length || 0);
            statsCopy[entity] = count;
          } catch (e) {
            console.error(`Failed to load stats for ${entity}:`, e);
            statsCopy[entity] = 0;
          }
        }
        
        setEntityStats(statsCopy);
      } finally {
        setStatsLoading(false);
      }
    };

    if (authenticated) {
      loadAllStats();
    }
  }, [authenticated]);

  useEffect(() => {
    if (authenticated) {
      setLoading(true);
      setError(null);
      fetchEntities(selected, 0)
        .then((data) => {
          setData(data);
          setTotalRecords(data.length);
        })
        .catch((e) => setError(String(e)))
        .finally(() => setLoading(false));
    }
  }, [selected, authenticated]);

  // Load more data handler
  const handleLoadMore = async () => {
    try {
      setLoadingMore(true);
      const moreData = await fetchEntities(selected, data.length);
      setData([...data, ...moreData]);
      setTotalRecords(data.length + moreData.length);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoadingMore(false);
    }
  };

  // Reset page when changing selected entity
  useEffect(() => {
    setCurrentPage(0);
  }, [selected]);

  // Load audit logs when users tab is opened
  useEffect(() => {
    if (activeTab === "users" && authenticated) {
      loadAuditLogs();
    }
  }, [activeTab, authenticated]);

  // NOTE: Auto-import on startup has been disabled
  // Data will only be imported when explicitly requested via the Import tab
  // This prevents unnecessary data loading on every app launch

  useEffect(() => {
  if (activeTab === "excel" && authenticated) loadExcelWorkbooks();
}, [activeTab, authenticated]);

useEffect(() => {
  if (!authenticated) return;
  if (!excelWorkbookId) {
    setExcelSheets([]);
    setExcelSheetId(null);
    setExcelRows([]);
    return;
  }
  loadExcelSheets(excelWorkbookId);
}, [excelWorkbookId, authenticated]);

  useEffect(() => {
    if (!authenticated) return;
    if (!excelSheetId) {
      setExcelRows([]);
      return;
    }
    loadExcelRows(excelSheetId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [excelSheetId, excelOffset, excelLimit, excelQ, excelSortCol, excelSortDir, authenticated]);

  // Save excelLimit to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("excelLimit", String(excelLimit));
  }, [excelLimit]);

  const loadAuditLogs = async () => {
    setAuditLoading(true);
    try {
      const logs = await fetchAuditLogs(200, 0);
      setAuditLogs(logs);
    } catch (e: any) {
      setError("Failed to load audit logs: " + e.message);
    } finally {
      setAuditLoading(false);
    }
  };

  const loadExcelWorkbooks = async () => {
    setExcelLoading(true);
    try {
      const books = await listExcelWorkbooks(200, 0);
      setExcelWorkbooks(books);
      if (!excelWorkbookId && books.length) setExcelWorkbookId(books[0].id);
    } catch (e: any) {
      setError("Failed to load Excel workbooks: " + (e.message || String(e)));
    } finally {
      setExcelLoading(false);
    }
  };

  const loadExcelSheets = async (workbookId: number) => {
    setExcelLoading(true);
    try {
      const sheets = await listExcelSheets(workbookId);
      setExcelSheets(sheets);
      if (!sheets.length) {
        setExcelSheetId(null);
        setExcelRows([]);
        return;
      }
      const current = sheets.find((s) => s.id === excelSheetId);
      if (!current) setExcelSheetId(sheets[0].id);
    } catch (e: any) {
      setError("Failed to load Excel sheets: " + (e.message || String(e)));
    } finally {
      setExcelLoading(false);
    }
  };

  const loadExcelRows = async (sheetId: number) => {
    setExcelLoading(true);
    try {
      const rows = await listExcelRows({
        sheetId,
        limit: excelLimit,
        offset: excelOffset,
        q: excelQ || undefined,
        sortCol: excelSortCol || undefined,
        sortDir: excelSortDir,
      });
      setExcelRows(rows);
    } catch (e: any) {
      setError("Failed to load Excel rows: " + (e.message || String(e)));
    } finally {
      setExcelLoading(false);
    }
  };

  const loadAllExcelRows = async (sheetId: number) => {
    setExcelLoading(true);
    try {
      setSuccess("Loading all rows from sheet...");
      const rows = await listExcelRows({
        sheetId,
        limit: 5000,  // Fetch maximum allowed rows
        offset: 0,
        q: excelQ || undefined,
        sortCol: excelSortCol || undefined,
        sortDir: excelSortDir,
      });
      setExcelRows(rows);
      setExcelOffset(0);
      setExcelLimit(5000);
      setSuccess(`Loaded ${rows.length} rows successfully`);
    } catch (e: any) {
      setError("Failed to load all Excel rows: " + (e.message || String(e)));
    } finally {
      setExcelLoading(false);
    }
  };

  const excelActiveSheet = useMemo(() => {
    if (!excelSheetId) return null;
    return excelSheets.find((s) => s.id === excelSheetId) || null;
  }, [excelSheets, excelSheetId]);

  const excelColumns = useMemo(() => {
    const cols = (excelActiveSheet?.columns || []).filter(Boolean);
    if (cols.length) return cols;
    const keys = new Set<string>();
    excelRows.forEach((r) => Object.keys(r.data || {}).forEach((k) => keys.add(k)));
    return Array.from(keys).sort();
  }, [excelActiveSheet, excelRows]);

  const handleExcelCellSelect = (rowId: number, col: string) => {
    setExcelActiveCell({ rowId, col });
    const row = excelRows.find((r) => r.id === rowId);
    const v = (row?.data || {})[col];
    setExcelEditValue(v === null || v === undefined ? "" : String(v));
  };

  const handleExcelCellSave = async () => {
    if (!excelActiveCell) return;
    try {
      setError(null);
      await patchExcelRow(excelActiveCell.rowId, { [excelActiveCell.col]: excelEditValue });
      logAction("UPDATE", "excel", `Updated Excel row ${excelActiveCell.rowId}`);
      if (excelSheetId) await loadExcelRows(excelSheetId);
      setSuccess("Excel cell updated");
      setTimeout(() => setSuccess(null), 1500);
    } catch (e: any) {
      setError(e.message || "Failed to update Excel cell");
    }
  };

  const copyExcelVisibleAsTSV = async () => {
    if (!excelRows.length || !excelColumns.length) return;
    const header = excelColumns.join("\t");
    const lines = excelRows.map((r) =>
      excelColumns
        .map((c) => {
          const v = (r.data || {})[c];
          return v === null || v === undefined ? "" : String(v).replace(/\r?\n/g, " ");
        })
        .join("\t"),
    );
    const tsv = [header, ...lines].join("\n");
    try {
      await navigator.clipboard.writeText(tsv);
      setSuccess("Copied visible rows as TSV");
      setTimeout(() => setSuccess(null), 1500);
    } catch {
      setExcelPasteText(tsv);
      setSuccess("Clipboard blocked - TSV placed in Paste box");
      setTimeout(() => setSuccess(null), 2000);
    }
  };

  const applyExcelPasteTSV = async () => {
    const text = (excelPasteText || "").trim();
    if (!text) return;
    if (!excelRows.length || !excelColumns.length) return;

    const lines = text.split(/\r?\n/).filter(Boolean);
    if (!lines.length) return;
    const grid = lines.map((ln) => ln.split("\t"));

    const startRowIndex = excelActiveCell ? Math.max(0, excelRows.findIndex((r) => r.id === excelActiveCell.rowId)) : 0;
    const startColIndex = excelActiveCell ? Math.max(0, excelColumns.findIndex((c) => c === excelActiveCell.col)) : 0;

    setExcelLoading(true);
    try {
      for (let r = 0; r < grid.length; r++) {
        const targetRow = excelRows[startRowIndex + r];
        if (!targetRow) break;
        const patch: Record<string, any> = {};
        for (let c = 0; c < grid[r].length; c++) {
          const key = excelColumns[startColIndex + c];
          if (!key) break;
          patch[key] = grid[r][c];
        }
        if (Object.keys(patch).length) await patchExcelRow(targetRow.id, patch);
      }
      if (excelSheetId) await loadExcelRows(excelSheetId);
      logAction("UPDATE", "excel", "Bulk paste TSV");
      setSuccess("Pasted TSV into visible rows");
      setTimeout(() => setSuccess(null), 2000);
    } catch (e: any) {
      setError(e.message || "Paste failed");
    } finally {
      setExcelLoading(false);
    }
  };

  const checkAuth = async () => {
    const currentUser = await getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
      setAuthenticated(true);
    }
  };

  const handleLogin = () => {
    checkAuth();
  };

  const handleLogout = () => {
    logout();
    setAuthenticated(false);
    setUser(null);
  };

  const handleGlobalSearch = async () => {
    if (!globalSearchTerm.trim()) {
      setGlobalSearchResults(null);
      setExcelSearchResults(null);
      setShowGlobalSearch(false);
      return;
    }
    try {
      setLoading(true);
      const [results, excelResults] = await Promise.all([
        globalSearch(globalSearchTerm),
        searchExcelByValue(globalSearchTerm)
      ]);
      setGlobalSearchResults(results);
      setExcelSearchResults(excelResults);
      setShowGlobalSearch(true);
      logAction("SEARCH", "global", globalSearchTerm);
    } catch (e: any) {
      setError("Search failed: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const logAction = async (action: string, entityType: string, description?: string) => {
    try {
      await createAuditLog({
        username: user?.username || "unknown",
        action,
        entity_type: entityType,
        description,
        timestamp: new Date().toISOString(),
      });
    } catch (e) {
      // Silently fail audit logging
      console.log("Audit log failed:", e);
    }
  };

  const columns = useMemo(() => {
    const keys = new Set<string>();
    data.forEach((row) => Object.keys(row).forEach((k) => keys.add(k)));
    return Array.from(keys).sort();
  }, [data]);

  const chartData = useMemo(() => {
    const entityStats: Record<string, number> = {
      regions: 0,
      districts: 0,
      landmarks: 0,
      poles: 0,
      "junction-boxes": 0,
      components: 0,
      credentials: 0,
    };

    if (selected === "regions") {
      entityStats.regions = data.length;
    } else if (selected === "districts") {
      entityStats.districts = data.length;
    } else if (selected === "landmarks") {
      entityStats.landmarks = data.length;
    } else if (selected === "poles") {
      entityStats.poles = data.length;
    } else if (selected === "junction-boxes") {
      entityStats["junction-boxes"] = data.length;
    } else if (selected === "components") {
      entityStats.components = data.length;
      entityStats.credentials = data.filter((r: any) => r.credentials).length;
    } else if (selected === "credentials") {
      entityStats.credentials = data.length;
    }

    return Object.entries(entityStats)
      .filter(([, v]) => v > 0)
      .map(([name, count]) => ({
        name: name.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
        count,
      }));
  }, [data, selected]);

  const fieldDistribution = useMemo(() => {
    const distribution: Record<string, number> = {};
    
    // Count non-null/non-empty fields
    if (selected === "components" && data.length > 0) {
      const fields = ["id", "name", "component_code", "lat", "lng", "credentials"];
      fields.forEach((field) => {
        const count = data.filter((r: any) => r[field] && String(r[field]).trim()).length;
        if (count > 0) {
          distribution[field.replace(/_/g, " ")] = count;
        }
      });
    }

    return Object.entries(distribution).map(([field, count]) => ({
      field: field.replace(/\b\w/g, (l) => l.toUpperCase()),
      count,
    }));
  }, [data, selected]);

  const COLORS = ["#2563eb", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4"];

  const stats = useMemo(() => {
    const getCountForEntity = (entityName: EntityName) => {
      if (entityName === "components") {
        return data.length;
      }
      return data.length;
    };

    return {
      total: data.length,
      withLocation: selected === "components" ? data.filter((r: any) => r.location_name || (r.lat && r.lng)).length : 0,
      withCredentials: selected === "components" ? data.filter((r: any) => r.credentials && r.credentials.length > 0).length : 0,
    };
  }, [data, selected]);

  const handleCellEdit = (rowIndex: number, column: string, currentValue: unknown) => {
    setEditingCell({ rowIndex, column });
    setEditValue(currentValue === null || currentValue === undefined ? "" : String(currentValue));
  };

  const handleCellSave = async () => {
    if (!editingCell) return;
    const { rowIndex, column } = editingCell;
    const row = data[rowIndex] as any;
    const id = row.id;

    if (!id) {
      setError("Cannot edit row without ID");
      setEditingCell(null);
      return;
    }

    try {
      setError(null);
      // Convert value to appropriate type
      let value: any = editValue;
      const originalValue = row[column];
      if (originalValue !== null && originalValue !== undefined) {
        if (typeof originalValue === "number") {
          value = editValue === "" ? null : Number(editValue);
        } else if (typeof originalValue === "boolean") {
          value = editValue === "true" || editValue === "1";
        }
      }

      await patchEntity(selected, id, { [column]: value });
      logAction("UPDATE", selected, `Updated ${column} for ID ${id}`);
      const refreshed = await fetchEntities(selected);
      setData(refreshed);
      setEditingCell(null);
      setSuccess("Cell updated successfully!");
      setTimeout(() => setSuccess(null), 2000);
    } catch (e: any) {
      setError(e.message || "Failed to update cell");
    }
  };

  const handleCellCancel = () => {
    setEditingCell(null);
    setEditValue("");
  };

  const handleCreate = async () => {
    try {
      setError(null);
      const parsed = JSON.parse(jsonInput || "{}");
      await createEntity(selected, parsed);
      logAction("CREATE", selected, JSON.stringify(parsed));
      const refreshed = await fetchEntities(selected);
      setData(refreshed);
      setJsonInput("{}");
      setSuccess("Entity created successfully!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      setError(e.message || "Failed to create entity");
    }
  };

  const handleUpdate = async () => {
    if (!updateId) {
      setError("Please provide an ID to update");
      return;
    }
    try {
      setError(null);
      const parsed = JSON.parse(jsonInput || "{}");
      await updateEntity(selected, Number(updateId), parsed);
      logAction("UPDATE", selected, `Updated ID ${updateId}`);
      const refreshed = await fetchEntities(selected);
      setData(refreshed);
      setJsonInput("{}");
      setUpdateId("");
      setSuccess("Entity updated successfully!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      setError(e.message || "Failed to update entity");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) {
      setError("Please provide an ID to delete");
      return;
    }
    if (!confirm(`Are you sure you want to delete ${selected} with ID ${deleteId}?`)) {
      return;
    }
    try {
      setError(null);
      await deleteEntity(selected, Number(deleteId));
      logAction("DELETE", selected, `Deleted ID ${deleteId}`);
      const refreshed = await fetchEntities(selected);
      setData(refreshed);
      setDeleteId("");
      setSuccess("Entity deleted successfully!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      setError(e.message || "Failed to delete entity");
    }
  };

  const handleFileSelect = async (file: File | null) => {
    if (!file) {
      setUploadedFile(null);
      setFileSchema(null);
      setFileImportResult(null);
      return;
    }

    setUploadedFile(file);
    setError(null);
    setFileSchema(null);

    try {
      const schema = await detectFileSchema(file);
      setFileSchema(schema);
      setImportType(schema.detected_type);
      setSelectedSheet(schema.sheets[0] || "auto");
    } catch (e: any) {
      setError(`Failed to detect schema: ${e.message}`);
    }
  };

  const handleFileImport = async () => {
    if (!uploadedFile) {
      setError("No file selected");
      return;
    }

    setFileImportLoading(true);
    setError(null);
    setFileImportResult(null);

    try {
      const result = await uploadAndImport(uploadedFile, selectedSheet, importType);
      setFileImportResult(result);
      setSuccess("File imported successfully!");
      
      // Refresh data after import
      setTimeout(() => {
        fetchEntities(selected)
          .then(setData)
          .catch((e) => setError(String(e)));
      }, 500);

      // Reset file input
      setUploadedFile(null);
      setFileSchema(null);
    } catch (e: any) {
      setError(`Import failed: ${e.message}`);
    } finally {
      setFileImportLoading(false);
    }
  };

  const handleShowObjectData = async (id: number) => {
    try {
      const objectData = data.find((r: any) => r.id === id);
      setSelectedObjectData(objectData);
    } catch (e: any) {
      setError("Failed to load object data");
    }
  };

  const handleOpenInlineEdit = (row: any) => {
    setEditMode(`edit-${row.id}`);
    setInlineEditRow(row);
    setInlineEditData({ ...row });
  };

  const handleCloseInlineEdit = () => {
    setEditMode(null);
    setInlineEditRow(null);
    setInlineEditData(null);
  };

  const handleInlineEditChange = (field: string, value: any) => {
    setInlineEditData((prev: any) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleInlineEditSave = async () => {
    if (!inlineEditRow || !inlineEditData) return;
    
    try {
      setError(null);
      
      // Check if this is a new row (temp ID) or existing
      const isNewRow = inlineEditRow.id && inlineEditRow.id > 0 && !data.find((r: any) => r.id === inlineEditRow.id);
      
      if (isNewRow) {
        // Create new row
        const dataToCreate = { ...inlineEditData };
        delete dataToCreate.id; // Remove temp ID for creation
        
        await createEntity(selected, dataToCreate);
        logAction("CREATE", selected, `Created new ${selected}`);
      } else {
        // Update existing row
        const changes: any = {};
        Object.keys(inlineEditData).forEach((key) => {
          if (inlineEditData[key] !== inlineEditRow[key]) {
            changes[key] = inlineEditData[key];
          }
        });

        if (Object.keys(changes).length === 0) {
          setSuccess("No changes made");
          setTimeout(() => setSuccess(null), 2000);
          handleCloseInlineEdit();
          return;
        }

        await patchEntity(selected, inlineEditRow.id, changes);
        logAction("UPDATE", selected, `Updated ID ${inlineEditRow.id}`);
      }
      
      const refreshed = await fetchEntities(selected);
      setData(refreshed);
      handleCloseInlineEdit();
      setSuccess(isNewRow ? "Entity created successfully!" : "Entity updated successfully!");
      setTimeout(() => setSuccess(null), 2000);
    } catch (e: any) {
      setError(e.message || "Failed to save entity");
    }
  };

  const handleInlineDelete = async (row: any) => {
    setDeleteConfirmId(String(row.id));
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    
    try {
      setError(null);
      const id = parseInt(deleteConfirmId);
      await deleteEntity(selected, id);
      logAction("DELETE", selected, `Deleted ID ${deleteConfirmId}`);
      const refreshed = await fetchEntities(selected);
      setData(refreshed);
      setSuccess("Entity deleted successfully!");
      setTimeout(() => setSuccess(null), 2000);
      setDeleteConfirmId(null);
      setDeleteId("");
    } catch (e: any) {
      setError(e.message || "Failed to delete entity");
    }
  };

  const cancelDelete = () => {
    setDeleteConfirmId(null);
  };

  if (!authenticated) {
    return <Login onLogin={handleLogin} />;
  }

  const selectedEntity = entities.find((e) => e.name === selected);
  const uniqueUsers = Array.from(new Set(auditLogs.map((log: any) => log.username)));

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <img src={essiLogo} alt="ESSI" className="header-logo" />
            <div>
              <h1>Inventory Management System</h1>
              <div className="header-subtitle">
                Network Infrastructure & Component Tracking
                {user && ` • Logged in as ${user.username}`}
              </div>
            </div>
          </div>
          <div className="row">
            {loading && (
              <div className="loading" style={{ marginRight: "1rem" }}>
                <div className="spinner"></div>
              </div>
            )}
            <button className="btn btn-secondary btn-sm" onClick={handleLogout}>
              🚪 Logout
            </button>
          </div>
        </div>
      </header>

      <main className="main-content">
        {/* Global Search */}
        <div className="card">
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-end" }}>
            <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
              <label>Global Search</label>
              <input
                type="text"
                placeholder="Search components, poles, credentials, etc..."
                value={globalSearchTerm}
                onChange={(e) => setGlobalSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleGlobalSearch()}
              />
            </div>
            <button
              className="btn btn-primary"
              onClick={handleGlobalSearch}
              disabled={!globalSearchTerm.trim()}
            >
              🔍 Search
            </button>
          </div>

          {showGlobalSearch && globalSearchResults && (
            <div style={{ marginTop: "1.5rem", padding: "1rem", background: "rgba(59, 130, 246, 0.05)", borderRadius: "var(--radius-lg)", border: "2px solid var(--primary)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <p style={{ color: "var(--text-secondary)", margin: 0 }}>
                  Found <strong>{globalSearchResults.total_results}</strong> results for "<strong>{globalSearchResults.query}</strong>"
                </p>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setShowGlobalSearch(false);
                    setGlobalSearchResults(null);
                    setExcelSearchResults(null);
                    setGlobalSearchTerm("");
                  }}
                >
                  ← Back
                </button>
              </div>
              <div className="grid grid-3">
                {Object.entries(globalSearchResults.results).map(([type, items]: [string, any]) => {
                  if (!items.length) return null;
                  return (
                    <div key={type} style={{
                      background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
                      padding: "1rem",
                      borderRadius: "var(--radius-lg)",
                      border: "1px solid var(--border)",
                    }}>
                      <h4 style={{ margin: "0 0 0.75rem 0", color: "var(--primary)" }}>
                        {type.replace(/_/g, " ").toUpperCase()} ({items.length})
                      </h4>
                      <ul style={{ margin: 0, paddingLeft: "1rem" }}>
                        {items.slice(0, 5).map((item: any, idx: number) => (
                          <li key={idx} style={{ fontSize: "0.85rem", marginBottom: "0.25rem" }}>
                            {item.name || item.code || item.component_code || item.username || `ID: ${item.id}`}
                          </li>
                        ))}
                        {items.length > 5 && <li style={{ opacity: 0.6 }}>... and {items.length - 5} more</li>}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Excel Search Results */}
          {excelSearchResults && excelSearchResults.workbooks && excelSearchResults.workbooks.length > 0 && (
            <div style={{ marginTop: "2rem", padding: "1rem", background: "rgba(59, 130, 246, 0.05)", borderRadius: "var(--radius-lg)", border: "1px solid rgba(59, 130, 246, 0.2)" }}>
              <h3 style={{ marginTop: 0, marginBottom: "1rem", color: "var(--primary)" }}>
                📊 Excel Data Found in {excelSearchResults.workbooks.length} Workbook(s)
              </h3>
              {excelSearchResults.workbooks.map((workbook: any, wbIdx: number) => (
                <div key={wbIdx} style={{ marginBottom: "1.5rem", padding: "1rem", background: "white", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
                  <h4 style={{ margin: "0 0 0.75rem 0", color: "var(--primary)" }}>
                    📁 {workbook.workbook}
                  </h4>
                  {workbook.sheets.map((sheet: any, shIdx: number) => (
                    <div key={shIdx} style={{ marginBottom: "1rem", paddingLeft: "1rem" }}>
                      <h5 style={{ margin: "0 0 0.5rem 0", color: "var(--text-secondary)" }}>
                        📄 {sheet.sheet} ({sheet.rows.length} row{sheet.rows.length !== 1 ? "s" : ""})
                      </h5>
                      <div style={{ overflowX: "auto", marginTop: "0.5rem" }}>
                        <table style={{ width: "100%", fontSize: "0.85rem", borderCollapse: "collapse" }}>
                          <thead>
                            <tr style={{ background: "var(--surface-secondary)" }}>
                              {sheet.columns && sheet.columns.length > 0 ? (
                                sheet.columns.map((col: string, cIdx: number) => (
                                  <th key={cIdx} style={{ 
                                    padding: "0.5rem", 
                                    textAlign: "left", 
                                    borderBottom: "1px solid var(--border)",
                                    fontWeight: 600,
                                    fontSize: "0.8rem"
                                  }}>
                                    {col}
                                  </th>
                                ))
                              ) : (
                                sheet.rows.length > 0 && Object.keys(sheet.rows[0].data || {}).map((key: string, kIdx: number) => (
                                  <th key={kIdx} style={{ 
                                    padding: "0.5rem", 
                                    textAlign: "left", 
                                    borderBottom: "1px solid var(--border)",
                                    fontWeight: 600,
                                    fontSize: "0.8rem"
                                  }}>
                                    {key}
                                  </th>
                                ))
                              )}
                            </tr>
                          </thead>
                          <tbody>
                            {sheet.rows.map((row: any, rIdx: number) => (
                              <tr key={rIdx} style={{ background: rIdx % 2 === 0 ? "var(--surface)" : "white" }}>
                                {sheet.columns && sheet.columns.length > 0 ? (
                                  sheet.columns.map((col: string, cIdx: number) => (
                                    <td key={cIdx} style={{ 
                                      padding: "0.5rem", 
                                      borderBottom: "1px solid var(--border)",
                                      maxWidth: "150px",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpace: "nowrap"
                                    }}>
                                      {row.data && row.data[col] !== undefined && row.data[col] !== null ? String(row.data[col]) : "-"}
                                    </td>
                                  ))
                                ) : (
                                  Object.entries(row.data || {}).map(([key, val]: [string, any], kIdx: number) => (
                                    <td key={kIdx} style={{ 
                                      padding: "0.5rem", 
                                      borderBottom: "1px solid var(--border)",
                                      maxWidth: "150px",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpace: "nowrap"
                                    }}>
                                      {val !== undefined && val !== null ? String(val) : "-"}
                                    </td>
                                  ))
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Loaded Data Rows Info & Entity Stats */}
        <div style={{ marginTop: "2rem" }}>
          <div style={{ 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center",
            marginBottom: "2rem",
            padding: "1rem",
            backgroundColor: "rgba(37, 99, 235, 0.1)",
            borderRadius: "8px",
            border: "1px solid rgba(37, 99, 235, 0.2)"
          }}>
            <span style={{ fontSize: "1.1rem", fontWeight: "600", color: "#2563eb" }}>
              📊 Loaded Rows: <strong>{data.length}</strong> / {totalRecords > 0 ? totalRecords : "loading..."}
            </span>
            {data.length < totalRecords && (
              <button 
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="btn btn-primary btn-sm"
                style={{ marginLeft: "1rem" }}
              >
                {loadingMore ? "Loading..." : "Load More"}
              </button>
            )}
          </div>

          <h3 style={{ marginBottom: "1.5rem", fontSize: "1.3rem", fontWeight: "600" }}>📊 Entity Overview</h3>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: "1.2rem"
          }}>
            {entities.map((entity) => (
              <div 
                key={entity.name} 
                style={{
                  padding: "1.5rem",
                  backgroundColor: "#f8fafc",
                  border: "2px solid #e2e8f0",
                  borderRadius: "10px",
                  textAlign: "center",
                  transition: "all 0.3s ease",
                  cursor: "pointer",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#f1f5f9";
                  e.currentTarget.style.borderColor = "#2563eb";
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(37, 99, 235, 0.15)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#f8fafc";
                  e.currentTarget.style.borderColor = "#e2e8f0";
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.05)";
                }}
              >
                <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>{entity.icon}</div>
                <div style={{ fontSize: "2rem", fontWeight: "700", color: "#2563eb", marginBottom: "0.5rem" }}>
                  {entityStats[entity.name] || 0}
                </div>
                <div style={{ fontSize: "0.9rem", color: "#64748b", fontWeight: "500" }}>
                  {entity.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="nav-tabs">
          <button
            className={`nav-tab ${activeTab === "data" ? "active" : ""}`}
            onClick={() => setActiveTab("data")}
          >
            📊 Data View
          </button>
          <button
            className={`nav-tab ${activeTab === "charts" ? "active" : ""}`}
            onClick={() => setActiveTab("charts")}
          >
            📈 Charts
          </button>
          <button
            className={`nav-tab ${activeTab === "excel" ? "active" : ""}`}
            onClick={() => setActiveTab("excel")}
          >
            🧾 Excel View
          </button>
          <button
            className={`nav-tab ${activeTab === "import" ? "active" : ""}`}
            onClick={() => setActiveTab("import")}
          >
            📥 Import Data
          </button>
          <button
            className={`nav-tab ${activeTab === "users" ? "active" : ""}`}
            onClick={() => setActiveTab("users")}
          >
            👥 User Activity
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="alert alert-error">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="alert alert-success">
            <span>✅</span>
            <span>{success}</span>
          </div>
        )}

        {/* Data View Tab */}
        {activeTab === "data" && (
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">
                {selectedEntity?.icon} {selectedEntity?.label}
              </h2>
              <div className="row" style={{ alignItems: "center" }}>
                <select
                  value={selected}
                  onChange={(e) => setSelected(e.target.value as EntityName)}
                  style={{ marginRight: "0.75rem" }}
                >
                  {entities.map((e) => (
                    <option key={e.name} value={e.name}>
                      {e.icon} {e.label}
                    </option>
                  ))}
                </select>

                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginRight: "0.75rem" }}>
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ padding: "0.5rem", borderRadius: "6px", border: "2px solid var(--border)" }}
                  />
                  <select value={searchBy} onChange={(e) => setSearchBy(e.target.value)} style={{ padding: "0.5rem", borderRadius: "6px" }}>
                    <option value="any">Any field</option>
                    {columns.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => downloadCsv(`${selected}.csv`, data.filter((r) => {
                    if (!searchTerm) return true;
                    const term = searchTerm.toLowerCase();
                    if (searchBy === "any") {
                      return Object.values(r).some((v) => (v ?? "").toString().toLowerCase().includes(term));
                    }
                    const val = (r as any)[searchBy];
                    return (val ?? "").toString().toLowerCase().includes(term);
                  }))}
                  disabled={!data.length}
                >
                  📥 Export CSV
                </button>
                
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    const newRow = { id: Math.max(...data.map((r: any) => r.id || 0), 0) + 1 };
                    setInlineEditRow(newRow);
                    setInlineEditData(newRow);
                    setEditMode(`edit-${newRow.id}`);
                  }}
                  title="Add new row"
                >
                  ➕ Add New
                </button>

                {/* Quick Delete Section */}
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginLeft: "auto" }}>
                  <input
                    type="text"
                    placeholder="ID to delete"
                    value={deleteId}
                    onChange={(e) => setDeleteId(e.target.value)}
                    style={{ padding: "0.5rem", borderRadius: "6px", border: "2px solid var(--border)", width: "100px" }}
                  />
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => {
                      if (deleteId.trim()) {
                        setDeleteConfirmId(deleteId);
                      }
                    }}
                    disabled={!deleteId.trim()}
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="loading">
                <div className="spinner"></div>
                <span>Loading data...</span>
              </div>
            ) : (
              <>
                <div className="table-container">
                  {filteredData.length > 0 ? (
                    <table>
                      <thead>
                        <tr>
                          <th>Actions</th>
                          {columns.map((c) => (
                            <th key={c}>{c.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredData.map((row, idx) => (
                          <tr key={idx}>
                            <td>
                              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                                <button
                                  className="btn btn-primary btn-sm"
                                  onClick={() => handleOpenInlineEdit(row)}
                                  title="Edit this row"
                                >
                                  ✏️
                                </button>
                                <button
                                  className="btn btn-danger btn-sm"
                                  onClick={() => handleInlineDelete(row)}
                                  title="Delete this row"
                                >
                                  🗑️
                                </button>
                              </div>
                            </td>
                            {columns.map((c) => {
                              const isEditing = editingCell?.rowIndex === idx && editingCell?.column === c;
                              const value = (row as any)[c];
                              const displayValue = value === null || value === undefined ? "—" : String(value).substring(0, 50);
                              const isInEditMode = editMode === `edit-${(row as any).id}`;

                              if (isEditing && isInEditMode) {
                                return (
                                  <td key={c} className="editing-cell">
                                    <input
                                      type="text"
                                      value={editValue}
                                      onChange={(e) => setEditValue(e.target.value)}
                                      onBlur={handleCellSave}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") handleCellSave();
                                        if (e.key === "Escape") handleCellCancel();
                                      }}
                                      autoFocus
                                      style={{ width: "100%", padding: "0.25rem" }}
                                    />
                                  </td>
                                );
                              }

                              return (
                                <td
                                  key={c}
                                  onClick={() => {
                                    if ((row as any).id && isInEditMode) {
                                      handleCellEdit(idx, c, value);
                                    }
                                  }}
                                  style={{
                                    cursor: (row as any).id && isInEditMode ? "pointer" : "default",
                                    position: "relative",
                                    backgroundColor: isInEditMode ? "rgba(59, 130, 246, 0.05)" : "transparent",
                                  }}
                                  title={(row as any).id && isInEditMode ? "Click to edit" : ""}
                                >
                                  {displayValue}
                                  {(row as any).id && isInEditMode && (
                                    <span style={{ opacity: 0.3, marginLeft: "0.25rem" }}>✏️</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="empty-state">No data available</div>
                  )}
                </div>
                
                {/* Pagination Controls */}
                {data.length > 0 && (
                  <div style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: "1rem",
                    marginTop: "1rem",
                    padding: "1rem",
                    borderTop: "1px solid var(--border)"
                  }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                      disabled={currentPage === 0}
                    >
                      ← Previous
                    </button>
                    <span style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>
                      Page {currentPage + 1} • Showing {Math.min(pageSize, data.length)} records
                    </span>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={data.length < pageSize}
                    >
                      Next →
                    </button>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={handleLoadMore}
                      disabled={loadingMore || data.length < pageSize}
                    >
                      {loadingMore ? "Loading..." : "Load More"}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === "excel" && (
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">🧾 Raw Excel Workbook View (Editable)</h2>
              {excelWorkbooks.length === 0 ? (
                <div style={{ marginTop: "1rem" }}>
                  <p style={{ color: "var(--text-secondary)", marginBottom: "1rem" }}>
                    No Excel workbooks imported yet. Import Excel files to view them here.
                  </p>
                  <button
                    className="btn btn-primary"
                    onClick={() => setActiveTab("import")}
                  >
                    📥 Go to Import Tab
                  </button>
                </div>
              ) : (
                <div className="row" style={{ alignItems: "center" }}>
                  <select
                    value={excelWorkbookId ?? ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      setExcelWorkbookId(v ? Number(v) : null);
                      setExcelOffset(0);
                    }}
                    style={{ marginRight: "0.75rem" }}
                  >
                    <option value="">Select workbook...</option>
                    {excelWorkbooks.map((wb) => (
                      <option key={wb.id} value={wb.id}>
                        {wb.filename}
                      </option>
                    ))}
                  </select>

                  <select
                    value={excelSheetId ?? ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      setExcelSheetId(v ? Number(v) : null);
                      setExcelOffset(0);
                    }}
                    style={{ marginRight: "0.75rem" }}
                    disabled={!excelWorkbookId || !excelSheets.length}
                  >
                    {excelSheets.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>

                  <input
                    type="text"
                    placeholder="Search in sheet..."
                    value={excelQ}
                    onChange={(e) => {
                      setExcelQ(e.target.value);
                      setExcelOffset(0);
                    }}
                    style={{
                      padding: "0.5rem",
                      borderRadius: "6px",
                      border: "2px solid var(--border)",
                      marginRight: "0.75rem",
                    }}
                    disabled={!excelSheetId}
                  />

                  <select
                    value={excelSortCol}
                    onChange={(e) => setExcelSortCol(e.target.value)}
                    style={{ marginRight: "0.5rem" }}
                    disabled={!excelColumns.length}
                  >
                    <option value="">Sort...</option>
                    {excelColumns.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>

                  <select
                    value={excelSortDir}
                    onChange={(e) => setExcelSortDir(e.target.value as any)}
                    style={{ marginRight: "0.75rem" }}
                    disabled={!excelSortCol}
                  >
                    <option value="asc">Asc</option>
                    <option value="desc">Desc</option>
                  </select>

                  <button className="btn btn-secondary btn-sm" onClick={copyExcelVisibleAsTSV} disabled={!excelRows.length}>
                    📋 Copy TSV
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-2" style={{ marginBottom: "1rem" }}>
              <div>
                <div className="form-group">
                  <label>Active Cell</label>
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    <input
                      type="text"
                      value={excelActiveCell ? `row:${excelActiveCell.rowId}  col:${excelActiveCell.col}` : "(click a cell)"}
                      readOnly
                      style={{ flex: 1, opacity: 0.85 }}
                    />
                    <button className="btn btn-primary btn-sm" onClick={handleExcelCellSave} disabled={!excelActiveCell}>
                      💾 Save
                    </button>
                  </div>
                  <input
                    type="text"
                    value={excelEditValue}
                    onChange={(e) => setExcelEditValue(e.target.value)}
                    placeholder="Edit selected cell value..."
                    disabled={!excelActiveCell}
                  />
                  <small style={{ color: "var(--text-secondary)" }}>
                    Tip: click any cell to select it. Edit above and hit Save.
                  </small>
                </div>
              </div>

              <div>
                <div className="form-group">
                  <label>Paste TSV (bulk update into visible rows)</label>
                  <textarea
                    rows={4}
                    value={excelPasteText}
                    onChange={(e) => setExcelPasteText(e.target.value)}
                    placeholder="Paste from Excel here (tab-separated). Updates start from selected cell (or top-left)."
                  />
                  <div className="row" style={{ justifyContent: "flex-end" }}>
                    <button className="btn btn-primary btn-sm" onClick={applyExcelPasteTSV} disabled={!excelPasteText.trim() || !excelSheetId}>
                      ⬇️ Apply Paste
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {excelLoading ? (
              <div className="loading">
                <div className="spinner"></div>
                <span>Loading workbook data...</span>
              </div>
            ) : (
              <>
                <div className="table-container excel-table">
                  {excelRows.length ? (
                    <table>
                      <thead>
                        <tr>
                          <th style={{ width: 80 }}>Row</th>
                          {excelColumns.map((c) => (
                            <th key={c}>{c}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {excelRows.map((r) => (
                          <tr key={r.id}>
                            <td style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Courier New', monospace" }}>
                              {r.row_index}
                            </td>
                            {excelColumns.map((c) => {
                              const v = (r.data || {})[c];
                              const isActive = excelActiveCell?.rowId === r.id && excelActiveCell?.col === c;
                              return (
                                <td
                                  key={c}
                                  onClick={() => handleExcelCellSelect(r.id, c)}
                                  className={isActive ? "excel-active-cell" : ""}
                                >
                                  {v === null || v === undefined || v === "" ? "—" : String(v)}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="empty-state">No rows found (try changing sheet, clearing search, or increasing limit)</div>
                  )}
                </div>

                <div className="row" style={{ justifyContent: "space-between", marginTop: "1rem" }}>
                  <div style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                    Showing <strong>{excelRows.length}</strong> rows{excelActiveSheet?.max_row ? ` (sheet max rows: ${excelActiveSheet.max_row})` : ""}
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    <button 
                      className="btn btn-primary btn-sm" 
                      onClick={() => excelSheetId && loadAllExcelRows(excelSheetId)}
                      disabled={!excelSheetId || excelLoading}
                    >
                      📥 Load All Rows
                    </button>
                    <select value={excelLimit} onChange={(e) => { setExcelLimit(Number(e.target.value)); setExcelOffset(0); }}>
                      {[100, 200, 500, 1000].map((n) => (
                        <option key={n} value={n}>{n} / page</option>
                      ))}
                      <option value={5000}>Load All</option>
                    </select>
                    <button className="btn btn-secondary btn-sm" onClick={() => setExcelOffset(Math.max(0, excelOffset - excelLimit))} disabled={excelOffset <= 0}>
                      ⬅ Prev
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={() => setExcelOffset(excelOffset + excelLimit)} disabled={!excelRows.length || excelRows.length < excelLimit}>
                      Next ➡
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Charts Tab */}
        {activeTab === "charts" && (
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">📈 Data Visualization & Analytics</h2>
            </div>

            {data.length === 0 ? (
              <div className="empty-state">No data available for visualization</div>
            ) : (
              <div className="charts-grid">
                {/* Count Overview */}
                <div className="chart-container">
                  <h3 style={{ margin: "0 0 1rem 0" }}>
                    {selectedEntity?.label} Count
                  </h3>
                  <div className="stat-large">{data.length}</div>
                  <p style={{ color: "var(--text-secondary)", marginTop: "0.5rem" }}>
                    Total {selectedEntity?.label?.toLowerCase()}
                  </p>
                </div>

                {/* Pie Chart */}
                {chartData.length > 0 && (
                  <div className="chart-container">
                    <h3 style={{ margin: "0 0 1rem 0" }}>Distribution</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={chartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, count }) => `${name}: ${count}`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="count"
                        >
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Bar Chart - Field Completeness */}
                {fieldDistribution.length > 0 && selected === "components" && (
                  <div className="chart-container" style={{ gridColumn: "1 / -1" }}>
                    <h3 style={{ margin: "0 0 1rem 0" }}>Field Data Completeness</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={fieldDistribution}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="field" angle={-45} textAnchor="end" height={80} />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="#2563eb" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Statistics Summary */}
                <div className="chart-container" style={{ gridColumn: "1 / -1" }}>
                  <h3 style={{ margin: "0 0 1rem 0" }}>Summary Statistics</h3>
                  <div className="stats-summary">
                    <div className="summary-stat">
                      <div className="summary-label">Total Records</div>
                      <div className="summary-value">{data.length}</div>
                    </div>
                    {selected === "components" && (
                      <>
                        <div className="summary-stat">
                          <div className="summary-label">With Location</div>
                          <div className="summary-value">
                            {data.filter((r: any) => r.lat && r.lng).length}
                          </div>
                        </div>
                        <div className="summary-stat">
                          <div className="summary-label">With Credentials</div>
                          <div className="summary-value">
                            {data.filter((r: any) => r.credentials).length}
                          </div>
                        </div>
                        <div className="summary-stat">
                          <div className="summary-label">Coverage</div>
                          <div className="summary-value">
                            {data.length > 0 
                              ? Math.round((data.filter((r: any) => r.lat && r.lng).length / data.length) * 100) 
                              : 0}%
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Import Tab */}
        {activeTab === "import" && (
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">📥 Data Import</h2>
            </div>

            {/* File Upload Section */}
            <div style={{ marginBottom: "2rem", paddingBottom: "2rem", borderBottom: "2px solid var(--border)" }}>
              <h3 style={{ marginTop: 0, marginBottom: "1rem", color: "var(--primary)" }}>📤 Upload & Import File</h3>
              <p style={{ color: "var(--text-secondary)", marginBottom: "1rem" }}>
                Upload Excel files (.xlsx) that match one of the supported schemas:
              </p>
              
              <div className="form-group" style={{ marginBottom: "1.5rem" }}>
                <label htmlFor="file-input">📎 Select Excel File</label>
                <input
                  id="file-input"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
                  style={{
                    padding: "0.75rem",
                    border: "2px solid var(--border)",
                    borderRadius: "var(--radius)",
                    cursor: "pointer",
                  }}
                />
                {uploadedFile && (
                  <div style={{ marginTop: "0.5rem", fontSize: "0.9rem", color: "var(--text-secondary)" }}>
                    ✓ Selected: {uploadedFile.name}
                  </div>
                )}
              </div>

              {fileSchema && (
                <div style={{
                  backgroundColor: "#f0fdf4",
                  border: "1px solid #22c55e",
                  padding: "1rem",
                  borderRadius: "var(--radius)",
                  marginBottom: "1.5rem",
                }}>
                  <p style={{ margin: "0 0 0.75rem 0", fontWeight: 600, color: "#15803d" }}>
                    ✓ File recognized as: <strong>{fileSchema.detected_type}</strong>
                  </p>
                  <div style={{ marginBottom: "1rem" }}>
                    <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Select Sheet:</label>
                    <select
                      value={selectedSheet}
                      onChange={(e) => setSelectedSheet(e.target.value)}
                      style={{
                        padding: "0.5rem",
                        borderRadius: "6px",
                        border: "2px solid var(--border)",
                        width: "100%",
                      }}
                    >
                      <option value="auto">Auto-detect</option>
                      {fileSchema.sheets.map((sheet: string) => (
                        <option key={sheet} value={sheet}>{sheet}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ marginBottom: "1rem" }}>
                    <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>Import Type:</label>
                    <select
                      value={importType}
                      onChange={(e) => setImportType(e.target.value)}
                      style={{
                        padding: "0.5rem",
                        borderRadius: "6px",
                        border: "2px solid var(--border)",
                        width: "100%",
                      }}
                    >
                      <option value="auto">Auto-detect</option>
                      <option value="enum1">JKP Network Design (Enum-1)</option>
                      <option value="ip-schema">IP Schema (Poles/JBs)</option>
                      <option value="credentials">Credentials</option>
                    </select>
                  </div>

                  <button
                    className="btn btn-success"
                    onClick={handleFileImport}
                    disabled={fileImportLoading}
                    style={{ width: "100%", padding: "0.75rem" }}
                  >
                    {fileImportLoading ? "⏳ Importing..." : "✓ Import File"}
                  </button>
                </div>
              )}

              {fileImportResult && (
                <div className="form-group">
                  <label>Import Results:</label>
                  <div style={{
                    backgroundColor: "#f1f5f9",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius)",
                    padding: "1rem",
                    maxHeight: "400px",
                    overflowY: "auto",
                    fontFamily: "monospace",
                    fontSize: "0.85rem",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}>
                    {JSON.stringify(fileImportResult, null, 2)}
                  </div>
                </div>
              )}
            </div>

            {/* Auto Import Section */}
            <div>
              <h3 style={{ marginBottom: "1rem", color: "var(--primary)" }}>🚀 Auto Import (Default Files)</h3>
              <div className="form-group" style={{ marginBottom: "1rem" }}>
                <p style={{ marginBottom: "1rem", color: "var(--text-secondary)" }}>
                  Data is automatically imported from the following hardcoded file paths:
                </p>
                <ul style={{ marginLeft: "1.5rem", marginBottom: "1rem", color: "var(--text-secondary)" }}>
                  <li>JKP Network Design Draft.xlsx (Enum-1 sheet)</li>
                  <li>IP SCHEMA.xlsx (Field Device Details - Poles and JB sheets)</li>
                  <li>PHASE 1 CREDENTIALS.xlsx (All region sheets)</li>
                </ul>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                  <strong>Relationships:</strong> All data is interconnected via foreign keys (lat/lng, component_id, etc.)
                </p>
              </div>
              
              <div style={{ marginBottom: "1rem" }}>
                <button 
                  className="btn btn-success btn-lg"
                  onClick={async () => {
                    setImportLoading(true);
                    setImportResult(null);
                    try {
                      const res = await importAuto();
                      setImportResult(JSON.stringify(res.results, null, 2));
                      logAction("IMPORT", "all", "Auto-imported all data");
                      // Refresh data
                      setTimeout(() => {
                        fetchEntities(selected)
                          .then(setData)
                          .catch((e) => setError(String(e)));
                      }, 500);
                    } catch (e: any) {
                      setImportResult(`Error: ${e.message}`);
                    } finally {
                      setImportLoading(false);
                    }
                  }}
                  disabled={importLoading}
                  style={{ width: "100%", padding: "0.75rem 1rem", fontSize: "1.1rem" }}
                >
                  {importLoading ? "⏳ Importing..." : "🚀 Run Import Now"}
                </button>
              </div>

              {importResult && (
                <div className="form-group">
                  <label>Import Results:</label>
                  <div style={{
                    backgroundColor: "#f1f5f9",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius)",
                    padding: "1rem",
                    maxHeight: "400px",
                    overflowY: "auto",
                    fontFamily: "monospace",
                    fontSize: "0.85rem",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}>
                    {importResult}
                  </div>
                </div>
              )}

              <div className="alert alert-info">
                <span>ℹ️</span>
                <span>
                  <strong>Auto Import:</strong> All datasets from the three Excel files are automatically imported on app startup. 
                  Data relationships are maintained through foreign keys (regions → districts → landmarks → poles/JBs → components, 
                  and credentials linked to components by component_id).
                </span>
              </div>
            </div>
          </div>
        )}

        {/* User Activity Tab */}
        {activeTab === "users" && (
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">👥 User Activity Log</h2>
            </div>
            
            {auditLoading ? (
              <div className="loading">
                <div className="spinner"></div>
                <span>Loading audit logs...</span>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: "1.5rem" }}>
                  <p style={{ color: "var(--text-secondary)", marginBottom: "0.75rem" }}>
                    <strong>Active Users:</strong> {uniqueUsers.length > 0 ? uniqueUsers.join(", ") : "No activity yet"}
                  </p>
                  <p style={{ color: "var(--text-secondary)" }}>
                    <strong>Total Actions Logged:</strong> {auditLogs.length}
                  </p>
                </div>

                <div className="table-container">
                  {auditLogs.length > 0 ? (
                    <table>
                      <thead>
                        <tr>
                          <th>User</th>
                          <th>Action</th>
                          <th>Entity Type</th>
                          <th>Description</th>
                          <th>Timestamp</th>
                        </tr>
                      </thead>
                      <tbody>
                        {auditLogs.map((log: any, idx: number) => (
                          <tr key={idx}>
                            <td><strong>{log.username}</strong></td>
                            <td>
                              <span className={`badge badge-${log.action === "DELETE" ? "danger" : log.action === "CREATE" ? "success" : "info"}`}>
                                {log.action}
                              </span>
                            </td>
                            <td>{log.entity_type}</td>
                            <td>{log.description || "-"}</td>
                            <td style={{ fontSize: "0.85rem" }}>{new Date(log.timestamp).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="empty-state">No audit logs yet</div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Inline Edit Modal */}
              <div className="grid grid-2">
                <div className="form-group">
                  <label>Entity Type</label>
                  <select value={selected} onChange={(e) => setSelected(e.target.value as EntityName)}>
                    {entities.map((e) => (
                      <option key={e.name} value={e.name}>
                        {e.icon} {e.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>ID to Delete</label>
                  <input
                    type="text"
                    value={deleteId}
                    onChange={(e) => setDeleteId(e.target.value)}
                    placeholder="Enter ID to delete"
                  />
                </div>
              </div>

        {/* User Activity Tab */}
        {activeTab === "users" && (
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">👥 User Activity Log</h2>
            </div>
            
            {auditLoading ? (
              <div className="loading">
                <div className="spinner"></div>
                <span>Loading audit logs...</span>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: "1.5rem" }}>
                  <p style={{ color: "var(--text-secondary)", marginBottom: "0.75rem" }}>
                    <strong>Active Users:</strong> {uniqueUsers.length > 0 ? uniqueUsers.join(", ") : "No activity yet"}
                  </p>
                  <p style={{ color: "var(--text-secondary)" }}>
                    <strong>Total Actions Logged:</strong> {auditLogs.length}
                  </p>
                </div>

                <div className="table-container">
                  {auditLogs.length > 0 ? (
                    <table>
                      <thead>
                        <tr>
                          <th>User</th>
                          <th>Action</th>
                          <th>Entity Type</th>
                          <th>Entity ID</th>
                          <th>Description</th>
                          <th>Timestamp</th>
                        </tr>
                      </thead>
                      <tbody>
                        {auditLogs.map((log: any, idx: number) => (
                          <tr key={idx}>
                            <td><strong>{log.username}</strong></td>
                            <td>
                              <span className={`badge badge-${log.action === "DELETE" ? "danger" : log.action === "CREATE" ? "success" : "info"}`}>
                                {log.action}
                              </span>
                            </td>
                            <td>{log.entity_type}</td>
                            <td>{log.entity_id || "—"}</td>
                            <td style={{ fontSize: "0.8rem" }}>{log.description || "—"}</td>
                            <td style={{ fontSize: "0.8rem" }}>
                              {new Date(log.timestamp).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="empty-state">No user activity recorded yet</div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </main>

      {/* Inline Edit Modal */}
      {inlineEditRow && inlineEditData && (
        <div className="modal-overlay" onClick={handleCloseInlineEdit}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>Edit {selectedEntity?.label} (ID: {inlineEditRow.id})</h3>
              <button
                className="btn btn-secondary btn-sm"
                onClick={handleCloseInlineEdit}
                style={{ background: "transparent", border: "none", fontSize: "1.5rem", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="grid grid-2">
                {columns.map((col) => (
                  <div key={col} className="form-group">
                    <label>{col.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}</label>
                    {col === "id" ? (
                      <input type="text" value={inlineEditData[col]} disabled style={{ opacity: 0.5 }} />
                    ) : (
                      <input
                        type="text"
                        value={inlineEditData[col] ?? ""}
                        onChange={(e) => handleInlineEditChange(col, e.target.value)}
                        placeholder={col}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={handleCloseInlineEdit}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleInlineEditSave}>
                💾 Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="modal-overlay" onClick={cancelDelete}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "400px" }}>
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>Confirm Delete</h3>
              <button
                className="btn btn-secondary btn-sm"
                onClick={cancelDelete}
                style={{ background: "transparent", border: "none", fontSize: "1.5rem", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: "1rem" }}>
                Are you sure you want to delete this {selectedEntity?.label?.toLowerCase()} entry (ID: <strong>{deleteConfirmId}</strong>)? This action cannot be undone.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={cancelDelete}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={confirmDelete}>
                🗑️ Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
