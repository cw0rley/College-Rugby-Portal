import React, { useState } from "react";

export default function ProgramTable({ programs, confNameMap = {}, onRowClick }) {
  const [sortKey, setSortKey] = useState("school");
  const [sortDir, setSortDir] = useState(1);

  const cols = [
    { key: "school",        label: "School" },
    { key: "state",         label: "State" },
    { key: "gender",        label: "Gender" },
    { key: "conference",    label: "Conference" },
    { key: "league",        label: "League" },
  ];

  function toggleSort(key) {
    if (sortKey === key) setSortDir(d => d * -1);
    else { setSortKey(key); setSortDir(1); }
  }

  const sorted = [...programs].sort((a, b) => {
    const av = a[sortKey], bv = b[sortKey];
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    if (typeof av === "number") return (av - bv) * sortDir;
    return String(av).localeCompare(String(bv)) * sortDir;
  });

  const thStyle = (key) => ({
    padding: "10px 14px", textAlign: "left", fontSize: 12, fontWeight: 700,
    color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em",
    cursor: "pointer", userSelect: "none", whiteSpace: "nowrap",
    background: sortKey === key ? "#f0fde8" : "#f8fafc",
    borderBottom: "2px solid #E5E7EB",
  });

  const tdStyle = {
    padding: "10px 14px", fontSize: 13, color: "#374151",
    borderBottom: "1px solid #f1f5f9", whiteSpace: "nowrap",
  };

  return (
    <div style={{ background: "#fff", borderRadius: 12, overflow: "auto",
      boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: "1px solid #E5E7EB" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr>
            {cols.map(c => (
              <th key={c.key} style={thStyle(c.key)} onClick={() => toggleSort(c.key)}>
                {c.label} {sortKey === c.key ? (sortDir === 1 ? "↑" : "↓") : ""}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((p, i) => (
            <tr key={p.id || i} onClick={() => onRowClick(p)}
              style={{ cursor: "pointer" }}
              onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
              onMouseLeave={e => e.currentTarget.style.background = ""}>
              <td style={{ ...tdStyle, fontWeight: 600, color: "#0A1F44" }}>{p.school}</td>
              <td style={tdStyle}>{p.state}</td>
              <td style={tdStyle}>{p.gender === "mens" ? "Men's" : "Women's"}</td>
              <td style={tdStyle}>{(p.conference && confNameMap[p.conference]) || p.conference || "—"}</td>
              <td style={tdStyle}>{p.league || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
