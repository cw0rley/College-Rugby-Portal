import React from "react";
import Avatar from "./ui/Avatar.jsx";
import Badge from "./ui/Badge.jsx";
import StatPill from "./ui/StatPill.jsx";

export default function ProgramCard({ program, onClick }) {
  const genderColor = program.gender === "mens" ? "#0A1F44" : "#d61f69";
  const genderLabel = program.gender === "mens" ? "Men's" : "Women's";
  const contacts = program._contacts || [];

  return (
    <div onClick={() => onClick(program)} style={{
      background: "#fff", border: "1px solid #E5E7EB", borderRadius: 12,
      padding: 20, cursor: "pointer", transition: "all 0.18s",
      boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
    }}
    onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 6px 24px rgba(0,0,0,0.12)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
    onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.06)"; e.currentTarget.style.transform = ""; }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 12 }}>
        <Avatar name={program.school} size={44} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: "#0A1F44", lineHeight: 1.3,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {program.school}
          </div>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 3 }}>
            {program.city || program.state}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
        <Badge label={genderLabel} color={genderColor} />
        {program.league && <Badge label={program.league} color="#69BE28" />}
        {program.rugbyScholarship && <Badge label="🏉 Scholarship" color="#7e3af2" />}
        {program.schoolFunded && <Badge label="School Funded" color="#ff5a1f" />}
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {program.gpa && <StatPill label="GPA" value={program.gpa?.toFixed(2)} />}
        {program.sat && <StatPill label="SAT" value={program.sat?.toFixed(0)} />}
        {program.inStateTuition && <StatPill label="In-State" value={`$${(program.inStateTuition/1000).toFixed(0)}k`} />}
        {program.rugbyRanking && <StatPill label="Ranking" value={`#${program.rugbyRanking}`} />}
      </div>

      {contacts.length > 0 && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #f1f5f9",
          display: "flex", gap: 14, flexWrap: "wrap" }}>
          {contacts.map((ct, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#64748b" }}>
              <span>👤</span>
              <span style={{ fontWeight: 600, color: "#475569" }}>{ct.name}</span>
              {ct.title && <span style={{ color: "#94a3b8" }}>· {ct.title}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
