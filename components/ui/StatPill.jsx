import React from "react";

export default function StatPill({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div style={{
      background: "#F4F4F4", border: "1px solid #E5E7EB", borderRadius: 8,
      padding: "6px 10px", textAlign: "center", minWidth: 0, flex: "1 1 0",
    }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>{value}</div>
      <div style={{ fontSize: 10, color: "#64748b", marginTop: 1 }}>{label}</div>
    </div>
  );
}
