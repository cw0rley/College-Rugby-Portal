import React from "react";
export default function AboutPage() {
  const cardStyle = {
    background: "#fff", borderRadius: 12, padding: 28,
    border: "1px solid #E5E7EB", boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
  };
  return (
    <div style={{ maxWidth: 760, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>

      <div style={{ ...cardStyle, background: "linear-gradient(135deg, #0A1F44, #244B86)",
        color: "#fff", padding: 36 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <img src="/logo-icon.svg" alt="" style={{ width: 44, height: 44 }} />
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>About College Rugby Portal</h2>
        </div>
        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.8, color: "#cbd5e1" }}>
          College Rugby Portal is a free resource for student-athletes, parents, and coaches looking to
          navigate the college rugby recruiting landscape. We aggregate program data from across the USA
          — including academic profiles, tuition costs, conference affiliations, and coaching contacts —
          so recruits can make informed decisions about where to play next.
        </p>
      </div>

      <div style={cardStyle}>
        <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700, color: "#0A1F44" }}>What We Offer</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14 }}>
          {[
            ["🏉", "826+ Programs", "Men's and women's programs across all 50 states"],
            ["🎓", "Academic Data", "GPA, SAT averages, acceptance rates, and top majors"],
            ["💰", "Tuition Info", "In-state and out-of-state costs for every school"],
            ["📊", "Compare & Filter", "Filter by state, conference, scholarship, and more"],
            ["⬇", "Export Reports", "Download filtered results as a CSV for offline use"],
            ["📬", "Submit Updates", "Coaches can submit new or updated program info"],
          ].map(([icon, title, desc]) => (
            <div key={title} style={{ padding: 16, background: "#f8fafc",
              borderRadius: 10, border: "1px solid #f1f5f9" }}>
              <div style={{ fontSize: 22, marginBottom: 8 }}>{icon}</div>
              <div style={{ fontWeight: 700, fontSize: 13, color: "#0A1F44", marginBottom: 4 }}>{title}</div>
              <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>{desc}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={cardStyle}>
        <h3 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 700, color: "#0A1F44" }}>Who Runs This?</h3>
        <p style={{ margin: "0 0 12px", fontSize: 14, color: "#475569", lineHeight: 1.8 }}>
          College Rugby Portal is maintained by a small team of rugby enthusiasts and former players
          passionate about growing the sport at the collegiate level. We are not affiliated with USA Rugby,
          World Rugby, or any individual program.
        </p>
        <p style={{ margin: 0, fontSize: 14, color: "#475569", lineHeight: 1.8 }}>
          Data is sourced from publicly available information and direct submissions from coaches and
          school representatives. If you spot something out of date, use the <strong>Submit Program Info</strong> tab
          to send us a correction — we review all submissions promptly.
        </p>
      </div>

      <div style={{ ...cardStyle, background: "#fffbeb", border: "1px solid #fde68a" }}>
        <h3 style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 700, color: "#92400e" }}>Disclaimer</h3>
        <p style={{ margin: 0, fontSize: 13, color: "#78350f", lineHeight: 1.7 }}>
          Program data is provided for informational purposes only and may not reflect the most current
          information. Always verify details directly with the school or coaching staff before making
          any decisions. Tuition figures are approximate and subject to change.
        </p>
      </div>
    </div>
  );
}
