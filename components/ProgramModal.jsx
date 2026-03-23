import React from "react";
import Avatar from "./ui/Avatar.jsx";
import Badge from "./ui/Badge.jsx";

function StatRow({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0",
      borderBottom: "1px solid #E5E7EB" }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b",
        textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: "#0A1F44" }}>{value}</span>
    </div>
  );
}

function SectionHeader({ children }) {
  return (
    <div style={{ fontSize: 12, fontWeight: 800, color: "#0A1F44", textTransform: "uppercase",
      letterSpacing: "0.06em", padding: "14px 0 6px",
      borderBottom: "2px solid #0A1F44", marginBottom: 4 }}>
      {children}
    </div>
  );
}

export default function ProgramModal({ program, confNameMap = {}, onClose }) {
  if (!program) return null;
  const genderColor = program.gender === "mens" ? "#0A1F44" : "#d61f69";
  const contacts = program._contacts || [];
  const confDisplay = program.conference
    ? (confNameMap[program.conference] || program.conference)
    : null;

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }} onClick={onClose}>
      <div style={{
        background: "#fff", borderRadius: 16, maxWidth: 900, width: "100%",
        maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        display: "flex", flexDirection: "row",
      }} onClick={e => e.stopPropagation()}>

        {/* Left sidebar */}
        <div style={{
          width: 260, flexShrink: 0, padding: "32px 24px",
          background: "#F4F4F4", borderRadius: "16px 0 0 16px",
          borderRight: "1px solid #E5E7EB",
          display: "flex", flexDirection: "column", gap: 16,
        }}>
          <div style={{ textAlign: "center" }}>
            <Avatar name={program.school} size={72} />
            <h2 style={{ margin: "12px 0 4px", fontSize: 18, fontWeight: 800, color: "#0A1F44",
              lineHeight: 1.2 }}>{program.school}</h2>
            <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap", marginTop: 8 }}>
              <Badge label={program.gender === "mens" ? "Men's" : "Women's"} color={genderColor} />
              {program.league && <Badge label={program.league} color="#69BE28" />}
            </div>
          </div>

          {/* Address */}
          <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.6 }}>
            {program.city && <div>{program.city}{program.state ? `, ${program.state}` : ""}</div>}
            {!program.city && program.state && <div>{program.state}</div>}
          </div>

          {/* Links */}
          {program.website && (
            <a href={program.website} target="_blank" rel="noreferrer" style={{
              fontSize: 13, color: "#69BE28", fontWeight: 600, textDecoration: "none",
              wordBreak: "break-all",
            }}>{program.website.replace(/^https?:\/\/(www\.)?/, "")}</a>
          )}
          {program.rugbyWebsite && (
            <a href={program.rugbyWebsite} target="_blank" rel="noreferrer" style={{
              fontSize: 13, color: "#69BE28", fontWeight: 600, textDecoration: "none",
              wordBreak: "break-all",
            }}>Rugby: {program.rugbyWebsite.replace(/^https?:\/\/(www\.)?/, "")}</a>
          )}

          {/* Contacts */}
          {contacts.length > 0 && (
            <div style={{ borderTop: "1px solid #E5E7EB", paddingTop: 14 }}>
              {contacts.map((ct, i) => (
                <div key={i} style={{ marginBottom: i < contacts.length - 1 ? 16 : 0 }}>
                  {ct.title && (
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b",
                      textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 2 }}>
                      {ct.title}
                    </div>
                  )}
                  {ct.name && <div style={{ fontSize: 14, fontWeight: 600, color: "#0A1F44" }}>{ct.name}</div>}
                  {ct.email && (
                    <a href={`mailto:${ct.email}`} onClick={e => e.stopPropagation()} style={{
                      display: "block", fontSize: 12, color: "#69BE28", textDecoration: "none",
                      marginTop: 2, wordBreak: "break-all",
                    }}>{ct.email}</a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right content */}
        <div style={{ flex: 1, padding: "28px 32px", minWidth: 0 }}>
          {/* Close button */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
            <button onClick={onClose} style={{
              background: "none", border: "none", fontSize: 22, cursor: "pointer",
              color: "#94a3b8", padding: "0 4px", lineHeight: 1,
            }}>×</button>
          </div>

          {/* Badges row */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
            {program.ncaaDivision && <Badge label={program.ncaaDivision} color="#0694a2" />}
            {program.schoolType && <Badge label={program.schoolType} color="#64748b" />}
            {program.rugbyScholarship && <Badge label="Rugby Scholarship" color="#69BE28" />}
            {program.schoolFunded && <Badge label="School Funded" color="#ff5a1f" />}
          </div>

          {/* Academics */}
          <SectionHeader>Academics</SectionHeader>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 24px" }}>
            <StatRow label="Avg GPA" value={program.gpa ? program.gpa.toFixed(2) : null} />
            <StatRow label="Avg SAT" value={program.sat ? program.sat.toFixed(0) : null} />
            <StatRow label="Acceptance Rate" value={program.acceptanceRate ? `${program.acceptanceRate}%` : null} />
            <StatRow label="Enrollment" value={program.enrollment ? program.enrollment.toLocaleString() : null} />
          </div>
          {program.topPrograms && (
            <div style={{ marginTop: 8, fontSize: 13, color: "#475569", lineHeight: 1.6 }}>
              <span style={{ fontWeight: 700, color: "#0A1F44" }}>Top Programs: </span>
              {program.topPrograms}
            </div>
          )}

          {/* Tuition */}
          <SectionHeader>Tuition</SectionHeader>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 24px" }}>
            <StatRow label="In-State Tuition" value={program.inStateTuition ? `$${program.inStateTuition.toLocaleString()}` : null} />
            <StatRow label="Out-of-State Tuition" value={program.outStateTuition ? `$${program.outStateTuition.toLocaleString()}` : null} />
          </div>

          {/* Rugby */}
          <SectionHeader>Rugby</SectionHeader>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 24px" }}>
            <StatRow label="Gender" value={program.gender === "mens" ? "Men's Team" : "Women's Team"} />
            <StatRow label="National Ranking" value={program.rugbyRanking ? `#${program.rugbyRanking}` : null} />
            <StatRow label="Conference" value={confDisplay} />
            <StatRow label="League" value={program.league} />
            <StatRow label="Scholarship" value={program.rugbyScholarship ? "Yes" : "No"} />
            <StatRow label="School Funded" value={program.schoolFunded ? "Yes" : "No"} />
          </div>

          {/* Notes / Bio */}
          {program.notes && (
            <>
              <SectionHeader>Program Notes</SectionHeader>
              <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.8, padding: "8px 0",
                whiteSpace: "pre-wrap" }}>
                {program.notes}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
