import React from "react";

export default function CompareBar({ compareIds, programs, onRemove, onClear, onCompare }) {
  if (compareIds.length === 0) return null;

  const isMobile = Math.min(window.innerWidth, screen.width) <= 900;
  const selectedPrograms = programs.filter(p => compareIds.includes(p.id));

  return (
    <div style={{
      position: "fixed", bottom: isMobile ? 60 : 0, left: 0, right: 0, zIndex: 950,
      background: "#0A1F44", color: "#fff", padding: isMobile ? "10px 12px" : "12px 24px",
      boxShadow: "0 -4px 20px rgba(0,0,0,0.3)",
      display: "flex", alignItems: "center", gap: isMobile ? 8 : 12,
      flexWrap: "wrap", justifyContent: "center",
    }}>
      {/* Chips */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", flex: 1, minWidth: 0 }}>
        {selectedPrograms.map(p => (
          <div key={p.id} style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "rgba(255,255,255,0.12)", borderRadius: 20,
            padding: "5px 12px 5px 14px", fontSize: 13, fontWeight: 600,
            maxWidth: 200, overflow: "hidden",
          }}>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {p.school}
            </span>
            <button onClick={() => onRemove(p.id)} style={{
              background: "none", border: "none", color: "#94a3b8", cursor: "pointer",
              fontSize: 16, lineHeight: 1, padding: 0, flexShrink: 0,
            }}>×</button>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
        <button onClick={onClear} style={{
          padding: "8px 16px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.2)",
          background: "transparent", color: "#94a3b8", cursor: "pointer",
          fontSize: 13, fontWeight: 600,
        }}>Clear</button>
        <button
          onClick={onCompare}
          disabled={compareIds.length < 2}
          style={{
            padding: "8px 20px", borderRadius: 8, border: "none",
            background: compareIds.length >= 2 ? "#00FF00" : "rgba(255,255,255,0.1)",
            color: compareIds.length >= 2 ? "#0A1F44" : "#64748b",
            cursor: compareIds.length >= 2 ? "pointer" : "default",
            fontSize: 13, fontWeight: 700,
          }}
        >Compare ({compareIds.length})</button>
      </div>
    </div>
  );
}
