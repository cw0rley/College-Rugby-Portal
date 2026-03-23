import { CSV_COLS, CSV_NUM_FIELDS, CSV_BOOL_FIELDS } from "../constants.js";

export function parseCSVLine(line) {
  const result = []; let cur = ""; let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { if (inQ && line[i+1] === '"') { cur += '"'; i++; } else inQ = !inQ; }
    else if (ch === ',' && !inQ) { result.push(cur); cur = ""; }
    else cur += ch;
  }
  result.push(cur);
  return result;
}

export function exportCSV(programs, filename = "rugby-programs-report.csv") {
  const header = CSV_COLS.map(([,label]) => label).join(",");
  const rows = programs.map(p =>
    CSV_COLS.map(([key]) => {
      const v = p[key];
      if (v == null) return "";
      const s = String(v);
      return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(",")
  );
  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const labelToKey = Object.fromEntries(CSV_COLS.map(([k, l]) => [l, k]));
  const headers = parseCSVLine(lines[0]).map(h => labelToKey[h.trim()] || h.trim());
  return lines.slice(1).filter(l => l.trim()).map(line => {
    const vals = parseCSVLine(line);
    const obj = {};
    headers.forEach((key, i) => {
      let v = vals[i] ?? "";
      if (CSV_NUM_FIELDS.has(key)) { const n = parseFloat(v); if (!isNaN(n)) obj[key] = n; }
      else if (CSV_BOOL_FIELDS.has(key)) obj[key] = v.toLowerCase() === "true";
      else if (v !== "") obj[key] = v;
    });
    return obj;
  });
}

export function exportGenericCSV(cols, rows, filename) {
  const header = cols.map(([,l]) => l).join(",");
  const lines = rows.map(r =>
    cols.map(([k]) => {
      const v = r[k]; if (v == null) return "";
      const s = String(v);
      return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g,'""')}"` : s;
    }).join(",")
  );
  const blob = new Blob([[header,...lines].join("\n")], { type:"text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export function parseGenericCSV(text, cols) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const labelToKey = Object.fromEntries(cols.map(([k,l]) => [l,k]));
  const headers = parseCSVLine(lines[0]).map(h => labelToKey[h.trim()] || h.trim());
  return lines.slice(1).filter(l => l.trim()).map(line => {
    const vals = parseCSVLine(line);
    const obj = {};
    headers.forEach((key, i) => { if (vals[i]?.trim()) obj[key] = vals[i].trim(); });
    return obj;
  });
}
