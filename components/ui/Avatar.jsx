import React from "react";

export default function Avatar({ name, size = 40 }) {
  const initials = name ? name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase() : "?";
  const colors = ["#0A1F44","#244B86","#1B3767","#0e9f6e","#7e3af2","#0694a2"];
  const color = colors[name ? name.charCodeAt(0) % colors.length : 0];
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", background: color,
      display: "flex", alignItems: "center", justifyContent: "center",
      color: "#fff", fontWeight: 700, fontSize: size * 0.36, flexShrink: 0,
    }}>{initials}</div>
  );
}
