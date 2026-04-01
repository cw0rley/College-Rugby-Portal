import React from "react";
import SchoolLogo from "./ui/SchoolLogo.jsx";
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

const HeartIcon = ({ filled, size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? "#dc2626" : "none"}
    stroke={filled ? "#dc2626" : "#94a3b8"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

export default function ProgramModal({ program, confNameMap = {}, onClose, isFavorited, onToggleFavorite, user, coachProgramIds = [], onOpenMessage }) {
  if (!program) return null;
  const genderColor = program.gender === "mens" ? "#0A1F44" : "#d61f69";
  const contacts = program._contacts || [];
  const confDisplay = program.conference
    ? (confNameMap[program.conference] || program.conference)
    : null;

  const isMobile = window.innerWidth <= 900;

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000,
      display: "flex", alignItems: isMobile ? "flex-end" : "center", justifyContent: "center",
      padding: isMobile ? 0 : 20,
    }} onClick={onClose}>
      <div style={{
        background: "#fff",
        borderRadius: isMobile ? "16px 16px 0 0" : 16,
        maxWidth: isMobile ? "100%" : 900,
        width: "100%",
        maxHeight: isMobile ? "92vh" : "90vh",
        overflowY: "auto",
        boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
        position: "relative",
      }} onClick={e => e.stopPropagation()}>

        {/* Sticky close button for mobile */}
        {isMobile && (
          <div style={{ position: "sticky", top: 0, zIndex: 10, display: "flex", justifyContent: "flex-end",
            padding: "8px 8px 0", background: "linear-gradient(to bottom, #F4F4F4 60%, transparent)" }}>
            <button onClick={onClose} style={{
              background: "rgba(0,0,0,0.12)", border: "none", borderRadius: "50%",
              width: 36, height: 36, fontSize: 20, cursor: "pointer", color: "#0A1F44",
              display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700,
            }}>×</button>
          </div>
        )}

        {/* Close button — desktop: top right of modal */}
        {!isMobile && (
          <button onClick={onClose} style={{
            position: "absolute", top: 12, right: 12, zIndex: 10,
            background: "rgba(0,0,0,0.08)", border: "none", borderRadius: "50%",
            width: 32, height: 32, fontSize: 18, cursor: "pointer", color: "#64748b",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>×</button>
        )}

        {/* Sidebar / Top section */}
        <div style={{
          width: isMobile ? "100%" : 260,
          flexShrink: 0,
          padding: isMobile ? "24px 20px" : "32px 24px",
          background: "#F4F4F4",
          borderRadius: isMobile ? "16px 16px 0 0" : "16px 0 0 16px",
          borderRight: isMobile ? "none" : "1px solid #E5E7EB",
          borderBottom: isMobile ? "1px solid #E5E7EB" : "none",
          display: "flex", flexDirection: "column", gap: 16,
        }}>

          <div style={{ textAlign: "center" }}>
            <SchoolLogo program={program} size={isMobile ? 56 : 72} />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 12 }}>
              <h2 style={{ margin: "0 0 4px", fontSize: isMobile ? 16 : 18, fontWeight: 800, color: "#0A1F44",
                lineHeight: 1.2 }}>{program.school}</h2>
              {onToggleFavorite && (
                <button
                  onClick={e => { e.stopPropagation(); onToggleFavorite(program.id); }}
                  style={{
                    background: "none", border: "none", cursor: "pointer", padding: 2,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}
                  title={isFavorited ? "Remove from favorites" : "Add to favorites"}
                >
                  <HeartIcon filled={isFavorited} size={22} />
                </button>
              )}
            </div>
            <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap", marginTop: 8 }}>
              <Badge label={program.gender === "mens" ? "Men's" : "Women's"} color={genderColor} />
              {program.league && <Badge label={program.league} color="#00CC00" />}
            </div>
          </div>

          {/* Address */}
          <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.6, textAlign: "center" }}>
            {program.city && <div>{program.city}{program.state ? `, ${program.state}` : ""}</div>}
            {!program.city && program.state && <div>{program.state}</div>}
          </div>

          {/* Links */}
          {program.website && (
            <a href={program.website} target="_blank" rel="noreferrer" style={{
              fontSize: 13, color: "#00CC00", fontWeight: 600, textDecoration: "none",
              wordBreak: "break-all",
            }}>{program.website.replace(/^https?:\/\/(www\.)?/, "")}</a>
          )}
          {program.rugbyWebsite && (
            <a href={program.rugbyWebsite} target="_blank" rel="noreferrer" style={{
              fontSize: 13, color: "#00CC00", fontWeight: 600, textDecoration: "none",
              wordBreak: "break-all",
            }}>Rugby: {program.rugbyWebsite.replace(/^https?:\/\/(www\.)?/, "")}</a>
          )}

          {/* Contacts */}
          {contacts.length > 0 && (
            <div style={{ borderTop: "1px solid #E5E7EB", paddingTop: 14 }}>
              {[...contacts].sort((a, b) => {
                const aHead = (a.title || "").toLowerCase().includes("head coach") ? 0 : 1;
                const bHead = (b.title || "").toLowerCase().includes("head coach") ? 0 : 1;
                return aHead - bHead;
              }).map((ct, i) => (
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
                      display: "block", fontSize: 12, color: "#00CC00", textDecoration: "none",
                      marginTop: 2, wordBreak: "break-all",
                    }}>{ct.email}</a>
                  )}
                  {/* Message button - hidden for now */}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Content section */}
        <div style={{ flex: 1, padding: isMobile ? "20px" : "28px 32px", minWidth: 0 }}>

          {/* Badges row */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
            {program.ncaaDivision && <Badge label={program.ncaaDivision} color="#0694a2" />}
            {program.schoolType && <Badge label={program.schoolType} color="#64748b" />}
            {program.rugbyScholarship && <Badge label="Rugby Scholarship" color="#00CC00" />}
            {program.schoolFunded && <Badge label="School Funded" color="#ff5a1f" />}
          </div>

          {/* Academics */}
          <SectionHeader>Academics</SectionHeader>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "0 24px" }}>
            <StatRow label="Avg GPA" value={program.gpa ? program.gpa.toFixed(2) : null} />
            <StatRow label="Avg SAT" value={program.sat ? program.sat.toFixed(0) : null} />
            <StatRow label="Acceptance Rate" value={program.acceptanceRate ? `${program.acceptanceRate}%` : null} />
            <StatRow label="Enrollment" value={program.enrollment ? program.enrollment.toLocaleString() : null} />
            {program.usNewsRank && (
              <StatRow label={program.usNewsCategory ? `US News (${program.usNewsCategory})` : "US News Rank"} value={
                program.usNewsUrl
                  ? <a href={program.usNewsUrl} target="_blank" rel="noreferrer" style={{ color: "#00CC00", textDecoration: "none", fontWeight: 600 }}>#{program.usNewsRank}</a>
                  : `#${program.usNewsRank}`
              } />
            )}
          </div>
          {program.topPrograms && (
            <div style={{ marginTop: 8, fontSize: 13, color: "#475569", lineHeight: 1.6 }}>
              <span style={{ fontWeight: 700, color: "#0A1F44" }}>Top Programs: </span>
              {program.topPrograms}
            </div>
          )}

          {/* Tuition */}
          <SectionHeader>Tuition</SectionHeader>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "0 24px" }}>
            <StatRow label="In-State Tuition" value={program.inStateTuition ? `$${program.inStateTuition.toLocaleString()}` : null} />
            <StatRow label="Out-of-State Tuition" value={program.outStateTuition ? `$${program.outStateTuition.toLocaleString()}` : null} />
          </div>

          {/* Rugby */}
          <SectionHeader>Rugby</SectionHeader>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "0 24px" }}>
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
