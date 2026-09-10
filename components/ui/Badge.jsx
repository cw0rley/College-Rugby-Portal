import React from "react";

export default function Badge({ label, color = "#0A1F44", title }) {
  return (
    <span title={title} style={{
      background: color + "18", color, border: `1px solid ${color}40`,
      borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 600,
      whiteSpace: "nowrap",
      cursor: title ? "help" : undefined,
    }}>{label}</span>
  );
}
