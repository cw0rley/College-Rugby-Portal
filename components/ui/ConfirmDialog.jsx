import React from "react";

export default function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 10000,
      display: "flex", alignItems: "center", justifyContent: "center",
    }} onClick={onCancel}>
      <div style={{
        background: "#fff", borderRadius: 12, padding: "28px 32px", maxWidth: 400,
        width: "90%", boxShadow: "0 8px 30px rgba(0,0,0,0.2)",
      }} onClick={e => e.stopPropagation()}>
        <p style={{ margin: "0 0 20px", fontSize: 15, color: "#1e293b", lineHeight: 1.5 }}>{message}</p>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onCancel} style={{
            padding: "8px 18px", borderRadius: 8, border: "1px solid #E5E7EB",
            background: "#fff", color: "#475569", fontSize: 14, cursor: "pointer",
          }}>Cancel</button>
          <button onClick={onConfirm} style={{
            padding: "8px 18px", borderRadius: 8, border: "none",
            background: "#dc2626", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer",
          }}>Confirm</button>
        </div>
      </div>
    </div>
  );
}
