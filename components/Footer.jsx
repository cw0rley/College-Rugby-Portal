import React from "react";
import { Link } from "react-router-dom";

export default function Footer() {
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
              {[["/","Programs"],["/conferences","Conferences"],
                ["/leagues","Leagues"],["/rankings","Rankings"],["/directory","Player Directory"],["/submit","Submit Program Info"],["/player-profile","Player Profile"],["/about","About"]].map(([to, label]) => (
                <Link key={to} to={to} style={linkStyle}>{label}</Link>
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontWeight: 700, fontSize: 12, color: "#475569",
              textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>Contact</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 13 }}>
              <span>Questions or feedback?</span>
              <a href="mailto:admin@collegerugbyportal.com" style={{ ...linkStyle, fontSize: 13 }}>
                admin@collegerugbyportal.com
              </a>
              <a href="https://www.instagram.com/collegerugbyportal" target="_blank" rel="noopener noreferrer" style={{ ...linkStyle, fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#00FF00"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                Instagram
              </a>
              <a href="https://www.facebook.com/collegerugbyportal" target="_blank" rel="noopener noreferrer" style={{ ...linkStyle, fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#00FF00"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                Facebook
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
            &copy; {new Date().getFullYear()} College Rugby Portal. All rights reserved.
          </span>
          <span style={{ fontSize: 12, color: "#475569" }}>
            Not affiliated with USA Rugby or World Rugby.
          </span>
        </div>
      </div>
    </footer>
  );
}
