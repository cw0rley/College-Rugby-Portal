import React from "react";
import Avatar from "./ui/Avatar.jsx";

export default function ConferenceCard({ conf, programCount = 0, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: "#fff", border: "1px solid #E5E7EB", borderRadius: 12,
      padding: 18, boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      display: "flex", alignItems: "center", gap: 14,
      cursor: onClick ? "pointer" : "default", transition: "all 0.15s",
    }}
    onMouseEnter={e => { if (onClick) { e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.1)"; e.currentTarget.style.transform = "translateY(-1px)"; }}}
    onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.06)"; e.currentTarget.style.transform = ""; }}
    >
      <Avatar name={conf.fullName || conf.conference} size={44} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: "#0A1F44" }}>{conf.conference}</div>
        <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{conf.fullName}</div>
      </div>
      {programCount > 0 && (
        <div style={{ textAlign: "center", flexShrink: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 18, color: "#0A1F44" }}>{programCount}</div>
          <div style={{ fontSize: 10, color: "#94a3b8" }}>programs</div>
        </div>
      )}
    </div>
  );
}
