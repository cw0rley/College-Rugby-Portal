import React from "react";
import StarRating from "../ui/StarRating.jsx";

const POSITIONS = [
  "Loosehead Prop", "Hooker", "Tighthead Prop",
  "Lock", "Blindside Flanker", "Openside Flanker", "Number 8",
  "Scrum Half", "Fly Half", "Inside Center", "Outside Center",
  "Left Wing", "Right Wing", "Fullback",
];

const currentYear = new Date().getFullYear();
const GRAD_YEARS = [];
for (let y = currentYear; y <= currentYear + 5; y++) GRAD_YEARS.push(y);

const inp = { padding: "8px 10px", borderRadius: 8, border: "1px solid #E5E7EB",
  fontSize: 13, width: "100%", boxSizing: "border-box" };

export default function RecruitsTab({
  recruits, filteredRecruits, recruitsLoading,
  recruitSearch, setRecruitSearch,
  recruitPosFilter, setRecruitPosFilter,
  recruitYearFilter, setRecruitYearFilter,
  recruitSortBy, setRecruitSortBy,
  expandedNotes, setExpandedNotes,
  noteDrafts, setNoteDrafts,
  noteSaving,
  onRatingChange, onNotesSave, onRemove, onOpenMessage,
  isMobile,
}) {
  if (recruitsLoading) {
    return <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>Loading recruits...</div>;
  }

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
            value={recruitSearch}
            onChange={e => setRecruitSearch(e.target.value)}
            placeholder="Search recruits..."
            style={{
              width: "100%", padding: "9px 12px 9px 32px", borderRadius: 8,
              border: "1px solid #E5E7EB", fontSize: 14, boxSizing: "border-box",
              outline: "none", color: "#0A1F44",
            }}
          />
        </div>
        <select value={recruitPosFilter} onChange={e => setRecruitPosFilter(e.target.value)} style={{
          padding: "9px 12px", borderRadius: 8, border: "1px solid #E5E7EB",
          fontSize: 14, color: "#475569", background: "#fff", cursor: "pointer",
          width: isMobile ? "100%" : "auto",
        }}>
          <option value="">All Positions</option>
          {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={recruitYearFilter} onChange={e => setRecruitYearFilter(e.target.value)} style={{
          padding: "9px 12px", borderRadius: 8, border: "1px solid #E5E7EB",
          fontSize: 14, color: "#475569", background: "#fff", cursor: "pointer",
          width: isMobile ? "100%" : "auto",
        }}>
          <option value="">All Years</option>
          {GRAD_YEARS.map(y => <option key={y} value={String(y)}>{y}</option>)}
        </select>
        <select value={recruitSortBy} onChange={e => setRecruitSortBy(e.target.value)} style={{
          padding: "9px 12px", borderRadius: 8, border: "1px solid #E5E7EB",
          fontSize: 14, color: "#475569", background: "#fff", cursor: "pointer",
          width: isMobile ? "100%" : "auto",
        }}>
          <option value="rating">Sort: Rating</option>
          <option value="name">Sort: Name</option>
          <option value="position">Sort: Position</option>
          <option value="year">Sort: Grad Year</option>
        </select>
      </div>

      <div style={{ fontSize: 13, color: "#64748b", marginBottom: 16 }}>
        Showing <strong>{filteredRecruits.length}</strong> of {recruits.length} saved recruit{recruits.length !== 1 ? "s" : ""}
      </div>

      {filteredRecruits.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 24px", color: "#94a3b8" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>&#127945;</div>
          <div style={{ fontSize: 17, fontWeight: 600 }}>
            {recruits.length === 0 ? "No recruits saved yet" : "No recruits match your filters"}
          </div>
          <div style={{ fontSize: 14, marginTop: 8 }}>
            {recruits.length === 0
              ? "Save players from the Player Directory to build your recruit list"
              : "Try adjusting your filters"}
          </div>
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(340px, 1fr))",
          gap: isMobile ? 12 : 16, maxWidth: "100%", overflow: "hidden",
        }}>
          {filteredRecruits.map(r => {
            const pd = r.playerData || {};
            const isNotesOpen = expandedNotes[r.playerUid];
            return (
              <div key={r.playerUid} style={{
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
                    {(pd.firstName || "?")[0]}{(pd.lastName || "?")[0]}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontWeight: 700, fontSize: 15, color: "#0A1F44", lineHeight: 1.3,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {pd.firstName} {pd.lastName}
                    </div>
                    {pd.city && (
                      <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{pd.city}</div>
                    )}
                  </div>
                  {pd.graduationYear && (
                    <div style={{
                      background: "#f1f5f9", borderRadius: 6, padding: "3px 8px",
                      fontSize: 12, fontWeight: 700, color: "#475569", flexShrink: 0,
                    }}>'{String(pd.graduationYear).slice(-2)}</div>
                  )}
                </div>

                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                  {pd.position && (
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 6,
                      background: "#0A1F44", color: "#fff",
                    }}>{pd.position}</span>
                  )}
                  {pd.secondaryPosition && (
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 6,
                      background: "#e2e8f0", color: "#475569",
                    }}>{pd.secondaryPosition}</span>
                  )}
                </div>

                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 12, color: "#64748b" }}>
                  {pd.gpa && (
                    <span><strong style={{ color: "#475569" }}>GPA:</strong> {pd.gpa}</span>
                  )}
                </div>

                {pd.currentClub && (
                  <div style={{ marginTop: 8, fontSize: 12, color: "#64748b" }}>
                    <strong style={{ color: "#475569" }}>Club:</strong> {pd.currentClub}
                  </div>
                )}

                {/* Star rating */}
                <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>Rating:</span>
                  <StarRating
                    value={r.rating || 0}
                    onChange={(val) => onRatingChange(r.playerUid, val)}
                    size={18}
                  />
                </div>

                {/* Notes toggle + area */}
                <div style={{ marginTop: 10 }}>
                  <button
                    onClick={() => setExpandedNotes(prev => ({ ...prev, [r.playerUid]: !prev[r.playerUid] }))}
                    style={{
                      background: "none", border: "none", cursor: "pointer",
                      fontSize: 12, fontWeight: 600, color: "#64748b", padding: 0,
                      display: "flex", alignItems: "center", gap: 4,
                    }}
                  >
                    {isNotesOpen ? "\u25BC" : "\u25B6"} Notes
                    {r.notes ? ` (${r.notes.length > 30 ? r.notes.slice(0, 30) + "..." : r.notes})` : ""}
                  </button>
                  {isNotesOpen && (
                    <div style={{ marginTop: 8 }}>
                      <textarea
                        value={noteDrafts[r.playerUid] ?? r.notes ?? ""}
                        onChange={e => setNoteDrafts(prev => ({ ...prev, [r.playerUid]: e.target.value }))}
                        placeholder="Add notes about this recruit..."
                        rows={3}
                        style={{
                          ...inp, resize: "vertical", fontSize: 12,
                        }}
                      />
                      <button
                        onClick={() => onNotesSave(r.playerUid)}
                        disabled={noteSaving[r.playerUid]}
                        style={{
                          marginTop: 6, padding: "5px 14px", borderRadius: 6, border: "none",
                          background: noteSaving[r.playerUid] ? "#E5E7EB" : "#69BE28",
                          color: "#fff", fontWeight: 600, fontSize: 11,
                          cursor: noteSaving[r.playerUid] ? "default" : "pointer",
                        }}
                      >
                        {noteSaving[r.playerUid] ? "Saving..." : "Save Notes"}
                      </button>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div style={{ marginTop: 12, borderTop: "1px solid #f1f5f9", paddingTop: 10, display: "flex", alignItems: "center", gap: 12 }}>
                  {onOpenMessage && (
                    <button
                      onClick={() => onOpenMessage(r.playerUid, `${r.firstName} ${r.lastName}`, "player")}
                      style={{
                        padding: "6px 14px", borderRadius: 6, border: "none",
                        background: "#0A1F44", color: "#fff", fontWeight: 600, fontSize: 11,
                        cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                      Message
                    </button>
                  )}
                  <button
                    onClick={() => onRemove(r.playerUid)}
                    style={{
                      background: "none", border: "none", cursor: "pointer",
                      fontSize: 11, fontWeight: 600, color: "#dc2626", padding: 0,
                    }}
                  >
                    Remove from list
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
