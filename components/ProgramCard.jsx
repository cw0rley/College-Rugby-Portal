import React from "react";
import SchoolLogo from "./ui/SchoolLogo.jsx";
import Badge from "./ui/Badge.jsx";
import StatPill from "./ui/StatPill.jsx";

const HeartIcon = ({ filled, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? "#dc2626" : "none"}
    stroke={filled ? "#dc2626" : "#94a3b8"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

export default function ProgramCard({ program, onClick, isComparing, onToggleCompare, isFavorited, onToggleFavorite }) {
  const genderColor = program.gender === "mens" ? "#0A1F44" : "#d61f69";
  const genderLabel = program.gender === "mens" ? "Men's" : "Women's";
  const contacts = program._contacts || [];

  return (
    <div onClick={() => onClick(program)} style={{
      background: "#fff", border: "1px solid #E5E7EB", borderRadius: 12,
      padding: 16, cursor: "pointer", transition: "all 0.18s",
      boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      maxWidth: "100%", overflow: "hidden", boxSizing: "border-box",
      position: "relative",
    }}
    onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 6px 24px rgba(0,0,0,0.12)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
    onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.06)"; e.currentTarget.style.transform = ""; }}
    >
      {/* Featured badge */}
      {program.featured && (
        <div style={{ position: "absolute", top: 8, left: 8, background: "#FFB800", color: "#fff",
          borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700, zIndex: 2 }}>&#9733; Featured</div>
      )}

      {/* Favorite heart */}
      {onToggleFavorite && (
        <button
          onClick={e => { e.stopPropagation(); onToggleFavorite(program.id); }}
          style={{
            position: "absolute", top: 10, right: 10, zIndex: 2,
            background: "none", border: "none", cursor: "pointer", padding: 4,
            display: "flex", alignItems: "center", justifyContent: "center",
            borderRadius: "50%",
          }}
          title={isFavorited ? "Remove from favorites" : "Add to favorites"}
        >
          <HeartIcon filled={isFavorited} size={20} />
        </button>
      )}

      <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 12, paddingRight: onToggleFavorite ? 28 : 0 }}>
        <SchoolLogo program={program} size={44} />
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
        {program.league && <Badge label={program.league} color="#00CC00" />}
        {program.rugbyScholarship && <Badge label="🏉 Scholarship" color="#7e3af2" />}
        {program.schoolFunded && <Badge label="School Funded" color="#ff5a1f" />}
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {program.gpa && <StatPill label="GPA" value={program.gpa?.toFixed(2)} />}
        {program.sat && <StatPill label="SAT" value={program.sat?.toFixed(0)} />}
        {program.inStateTuition && <StatPill label="In-State" value={`$${(program.inStateTuition/1000).toFixed(0)}k`} />}
        {program.rugbyRanking && <StatPill label="Rugby Rank" value={`#${program.rugbyRanking}`} />}
        {program.usNewsRank && (
          program.usNewsUrl
            ? <a href={program.usNewsUrl} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{ textDecoration: "none" }}>
                <StatPill label="US News" value={`#${program.usNewsRank}`} />
              </a>
            : <StatPill label="US News" value={`#${program.usNewsRank}`} />
        )}
      </div>

      {/* Compare checkbox */}
      {onToggleCompare && (
        <div style={{ marginTop: 12, paddingTop: contacts.length > 0 ? 0 : 12, borderTop: contacts.length > 0 ? "none" : "1px solid #f1f5f9" }}>
          <button
            onClick={e => { e.stopPropagation(); onToggleCompare(program.id); }}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "5px 10px", borderRadius: 6,
              border: isComparing ? "1px solid #00CC00" : "1px solid #E5E7EB",
              background: isComparing ? "rgba(0,204,0,0.08)" : "transparent",
              color: isComparing ? "#00CC00" : "#94a3b8",
              cursor: "pointer", fontSize: 12, fontWeight: 600,
            }}
          >
            {isComparing ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
              </svg>
            )}
            Compare
          </button>
        </div>
      )}

      {contacts.length > 0 && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #f1f5f9",
          display: "flex", gap: 14, flexWrap: "wrap" }}>
          {[...contacts].sort((a, b) => {
            const aHead = (a.title || "").toLowerCase().includes("head coach") ? 0 : 1;
            const bHead = (b.title || "").toLowerCase().includes("head coach") ? 0 : 1;
            return aHead - bHead;
          }).map((ct, i) => (
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
