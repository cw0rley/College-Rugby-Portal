import React from "react";
export default function Footer({ onNavigate }) {
  const linkStyle = {
    color: "#00FF00", textDecoration: "none", fontSize: 13,
    cursor: "pointer", background: "none", border: "none", padding: 0,
  };
  return (
    <footer style={{
      background: "#0A1F44", color: "#94a3b8", marginTop: 60,
      padding: "48px 16px 28px", overflowX: "hidden",
    }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 24, marginBottom: 40 }}>

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <img src="/logo-icon.svg" alt="" style={{ width: 32, height: 32 }} />
              <span style={{ fontWeight: 800, fontSize: 15, color: "#fff" }}>College Rugby Portal</span>
            </div>
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.7, color: "#64748b" }}>
              Helping student-athletes find their perfect college rugby program since 2024.
            </p>
          </div>

          <div>
            <div style={{ fontWeight: 700, fontSize: 12, color: "#475569",
              textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>Navigate</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[["programs","Programs"],["conferences","Conferences"],
                ["structure","Leagues"],["rankings","Rankings"],["contact","Submit Program Info"],["player","Player Profile"],["about","About"]].map(([key, label]) => (
                <button key={key} onClick={() => onNavigate(key)} style={linkStyle}>{label}</button>
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontWeight: 700, fontSize: 12, color: "#475569",
              textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>Contact</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 13 }}>
              <span>Questions or feedback?</span>
              <a href="mailto:admin@claytonrugby.com" style={{ ...linkStyle, fontSize: 13 }}>
                admin@claytonrugby.com
              </a>
              <span style={{ color: "#64748b" }}>
                To update a program listing, use the Submit Info tab.
              </span>
            </div>
          </div>
        </div>

        <div style={{ borderTop: "1px solid #1B3767", paddingTop: 20,
          display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <span style={{ fontSize: 12, color: "#475569" }}>
            © {new Date().getFullYear()} College Rugby Portal. All rights reserved.
          </span>
          <span style={{ fontSize: 12, color: "#475569" }}>
            Not affiliated with USA Rugby or World Rugby.
          </span>
        </div>
      </div>
    </footer>
  );
}
