import React from "react";

const POSITIONS = [
  "Loosehead Prop", "Hooker", "Tighthead Prop",
  "Lock", "Blindside Flanker", "Openside Flanker", "Number 8",
  "Scrum Half", "Fly Half", "Inside Center", "Outside Center",
  "Left Wing", "Right Wing", "Fullback",
];

const currentYear = new Date().getFullYear();
const GRAD_YEARS = [];
for (let y = currentYear; y <= currentYear + 5; y++) GRAD_YEARS.push(y);

export default function InterestedPlayersTab({
  filtered, search, setSearch, posFilter, setPosFilter,
  yearFilter, setYearFilter, isMobile, onOpenMessage,
}) {
  return (
    <>
      {/* Filter bar */}
      <div style={{
        background: "#fff", borderRadius: 12, padding: isMobile ? 12 : 16, marginBottom: 20,
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)", display: "flex",
        flexDirection: isMobile ? "column" : "row",
        gap: isMobile ? 8 : 10, flexWrap: "wrap",
        alignItems: isMobile ? "stretch" : "center",
        width: "100%", boxSizing: "border-box",
      }}>
        <div style={{ position: "relative", flex: 1, minWidth: 180 }}>
          <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "#94a3b8" }}>&#128269;</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search players..."
            style={{
              width: "100%", padding: "9px 12px 9px 32px", borderRadius: 8,
              border: "1px solid #E5E7EB", fontSize: 14, boxSizing: "border-box",
              outline: "none", color: "#0A1F44",
            }}
          />
        </div>
        <select value={posFilter} onChange={e => setPosFilter(e.target.value)} style={{
          padding: "9px 12px", borderRadius: 8, border: "1px solid #E5E7EB",
          fontSize: 14, color: "#475569", background: "#fff", cursor: "pointer",
          width: isMobile ? "100%" : "auto",
        }}>
          <option value="">All Positions</option>
          {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={yearFilter} onChange={e => setYearFilter(e.target.value)} style={{
          padding: "9px 12px", borderRadius: 8, border: "1px solid #E5E7EB",
          fontSize: 14, color: "#475569", background: "#fff", cursor: "pointer",
          width: isMobile ? "100%" : "auto",
        }}>
          <option value="">All Years</option>
          {GRAD_YEARS.map(y => <option key={y} value={String(y)}>{y}</option>)}
        </select>
      </div>

      <div style={{ fontSize: 13, color: "#64748b", marginBottom: 16 }}>
        Showing <strong>{filtered.length}</strong> interested player{filtered.length !== 1 ? "s" : ""}
      </div>

      {/* Player cards */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 24px", color: "#94a3b8" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>&#127945;</div>
          <div style={{ fontSize: 17, fontWeight: 600 }}>No interested players yet</div>
          <div style={{ fontSize: 14, marginTop: 8 }}>
            Players who favorite your program will appear here
          </div>
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(300px, 1fr))",
          gap: isMobile ? 12 : 16, maxWidth: "100%", overflow: "hidden",
        }}>
          {filtered.map(p => (
            <div key={p.uid} style={{
              background: "#fff", border: "1px solid #E5E7EB", borderRadius: 12,
              padding: 16, maxWidth: "100%", overflow: "hidden", boxSizing: "border-box",
              boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
                  background: "#0A1F44", color: "#fff", display: "flex",
                  alignItems: "center", justifyContent: "center",
                  fontWeight: 800, fontSize: 16,
                }}>
                  {(p.firstName || "?")[0]}{(p.lastName || "?")[0]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontWeight: 700, fontSize: 15, color: "#0A1F44", lineHeight: 1.3,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {p.firstName} {p.lastName}
                  </div>
                  {p.city && (
                    <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{p.city}</div>
                  )}
                </div>
                {p.graduationYear && (
                  <div style={{
                    background: "#f1f5f9", borderRadius: 6, padding: "3px 8px",
                    fontSize: 12, fontWeight: 700, color: "#475569", flexShrink: 0,
                  }}>'{String(p.graduationYear).slice(-2)}</div>
                )}
              </div>

              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                {p.position && (
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 6,
                    background: "#0A1F44", color: "#fff",
                  }}>{p.position}</span>
                )}
                {p.secondaryPosition && (
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 6,
                    background: "#e2e8f0", color: "#475569",
                  }}>{p.secondaryPosition}</span>
                )}
              </div>

              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 12, color: "#64748b" }}>
                {p.gpa && (
                  <span><strong style={{ color: "#475569" }}>GPA:</strong> {p.gpa}</span>
                )}
              </div>

              {p.currentClub && (
                <div style={{ marginTop: 8, fontSize: 12, color: "#64748b" }}>
                  <strong style={{ color: "#475569" }}>Club:</strong> {p.currentClub}
                </div>
              )}

              {onOpenMessage && (
                <button
                  onClick={() => onOpenMessage(p.uid, `${p.firstName} ${p.lastName}`, "player")}
                  style={{
                    marginTop: 10, padding: "7px 16px", borderRadius: 8, border: "none",
                    background: "#0A1F44", color: "#fff", fontWeight: 600, fontSize: 12,
                    cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  Message
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
