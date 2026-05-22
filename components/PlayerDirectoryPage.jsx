import React, { useState, useEffect, useMemo } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase.js";
import { US_STATES, POSITIONS, GRAD_YEARS } from "../constants.js";
import { useIsMobile } from "../utils/useIsMobile.js";
import AuthGate from "./ui/AuthGate.jsx";
import StarRating from "./ui/StarRating.jsx";
import { loadRecruits, saveRecruit, removeRecruit, updateRecruitRating } from "../utils/recruits.js";

const SORTED_STATES = Object.entries(US_STATES).sort((a, b) => a[1].localeCompare(b[1]));

export default function PlayerDirectoryPage({ user, onOpenMessage }) {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [posFilter, setPosFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [recruits, setRecruits] = useState({}); // { playerUid: { rating, ... } }

  const isMobile = useIsMobile();

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([
      getDocs(query(collection(db, "playerProfiles"), where("profilePublic", "==", true)))
        .then(snap => snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      loadRecruits(user.uid).catch(() => []),
    ]).then(([playerList, recruitList]) => {
      setPlayers(playerList);
      const map = {};
      recruitList.forEach(r => { map[r.playerUid] = r; });
      setRecruits(map);
    }).catch(err => console.error("Failed to load player directory:", err))
      .finally(() => setLoading(false));
  }, [user]);

  async function handleToggleRecruit(e, player) {
    e.stopPropagation();
    if (!user) return;
    const playerUid = player.id;
    if (recruits[playerUid]) {
      // Optimistic remove
      setRecruits(prev => { const next = { ...prev }; delete next[playerUid]; return next; });
      try {
        await removeRecruit(user.uid, playerUid);
      } catch (err) {
        console.error("Failed to remove recruit:", err);
        // Re-add on failure
        setRecruits(prev => ({ ...prev, [playerUid]: { playerUid, rating: 0 } }));
      }
    } else {
      // Optimistic add
      setRecruits(prev => ({ ...prev, [playerUid]: { playerUid, rating: 0 } }));
      try {
        await saveRecruit(user.uid, playerUid, player, 0);
      } catch (err) {
        console.error("Failed to save recruit:", err);
        setRecruits(prev => { const next = { ...prev }; delete next[playerUid]; return next; });
      }
    }
  }

  async function handleRatingChange(e, player, newRating) {
    if (e) e.stopPropagation();
    if (!user) return;
    const playerUid = player.id;
    const prev = recruits[playerUid]?.rating || 0;
    setRecruits(r => ({ ...r, [playerUid]: { ...r[playerUid], rating: newRating } }));
    try {
      await updateRecruitRating(user.uid, playerUid, newRating);
    } catch (err) {
      console.error("Failed to update rating:", err);
      setRecruits(r => ({ ...r, [playerUid]: { ...r[playerUid], rating: prev } }));
    }
  }

  const filtered = useMemo(() => {
    return players.filter(p => {
      if (posFilter && p.position !== posFilter && p.secondaryPosition !== posFilter) return false;
      if (yearFilter && String(p.graduationYear) !== yearFilter) return false;
      if (stateFilter) {
        const pState = (p.state || "").toUpperCase();
        if (pState !== stateFilter) return false;
      }
      if (search) {
        const q = search.toLowerCase();
        const name = ((p.firstName || "") + " " + (p.lastName || "")).toLowerCase();
        return (
          name.includes(q) ||
          (p.city || "").toLowerCase().includes(q) ||
          (p.state || "").toLowerCase().includes(q) ||
          (p.currentClub || "").toLowerCase().includes(q) ||
          (p.position || "").toLowerCase().includes(q) ||
          (p.highSchool || "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [players, search, posFilter, yearFilter, stateFilter]);

  return (
    <AuthGate user={user} title="Player Directory" description="Sign in to browse the player directory and connect with prospective student-athletes.">
      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>Loading player directory...</div>
      ) : (
        <div>
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
            <select value={stateFilter} onChange={e => setStateFilter(e.target.value)} style={{
              padding: "9px 12px", borderRadius: 8, border: "1px solid #E5E7EB",
              fontSize: 14, color: "#475569", background: "#fff", cursor: "pointer",
              width: isMobile ? "100%" : "auto",
            }}>
              <option value="">All States</option>
              {SORTED_STATES.map(([abbr, name]) => (
                <option key={abbr} value={abbr}>{name}</option>
              ))}
            </select>
          </div>

          <div style={{ fontSize: 13, color: "#64748b", marginBottom: 16 }}>
            Showing <strong>{filtered.length}</strong> player{filtered.length !== 1 ? "s" : ""}
          </div>

          {filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 24px", color: "#94a3b8" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>&#127945;</div>
              <div style={{ fontSize: 17, fontWeight: 600 }}>No players found</div>
              <div style={{ fontSize: 14, marginTop: 8 }}>Try adjusting your filters</div>
            </div>
          ) : (
            <div style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(300px, 1fr))",
              gap: isMobile ? 12 : 16, maxWidth: "100%", overflow: "hidden",
            }}>
              {filtered.map(p => {
                const isSaved = !!recruits[p.id];
                return (
                  <div key={p.id} style={{
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
                        {(p.city || p.state) && (
                          <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                            {[p.city, p.state].filter(Boolean).join(", ")}
                          </div>
                        )}
                      </div>
                      {p.graduationYear && (
                        <div style={{
                          background: "#f1f5f9", borderRadius: 6, padding: "3px 8px",
                          fontSize: 12, fontWeight: 700, color: "#475569", flexShrink: 0,
                        }}>'{String(p.graduationYear).slice(-2)}</div>
                      )}
                      {/* Save / Bookmark button */}
                      <button
                        onClick={(e) => handleToggleRecruit(e, p)}
                        title={isSaved ? "Remove from recruit list" : "Save to recruit list"}
                        style={{
                          background: "none", border: "none", cursor: "pointer", padding: 4,
                          fontSize: 20, lineHeight: 1, flexShrink: 0,
                          color: isSaved ? "#FFB800" : "#CBD5E1",
                          transition: "color 0.15s",
                        }}
                      >
                        {isSaved ? "\u2605" : "\u2606"}
                      </button>
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
                      {p.height && (
                        <span><strong style={{ color: "#475569" }}>Ht:</strong> {p.height}</span>
                      )}
                      {p.weight && (
                        <span><strong style={{ color: "#475569" }}>Wt:</strong> {p.weight}</span>
                      )}
                    </div>

                    {p.currentClub && (
                      <div style={{ marginTop: 8, fontSize: 12, color: "#64748b" }}>
                        <strong style={{ color: "#475569" }}>Club:</strong> {p.currentClub}
                      </div>
                    )}

                    {p.highlightVideo && (
                      <div style={{ marginTop: 8 }}>
                        <a
                          href={p.highlightVideo}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          style={{
                            fontSize: 12, fontWeight: 700, color: "#0A1F44",
                            textDecoration: "none", display: "inline-flex",
                            alignItems: "center", gap: 4,
                          }}
                        >
                          <span style={{ fontSize: 14 }}>&#9654;</span> Highlight Video
                        </a>
                      </div>
                    )}

                    {onOpenMessage && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onOpenMessage(p.id, `${p.firstName} ${p.lastName}`, "player"); }}
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

                    {/* Show star rating if saved */}
                    {isSaved && (
                      <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>Rating:</span>
                        <StarRating
                          value={recruits[p.id]?.rating || 0}
                          onChange={(val) => handleRatingChange(null, p, val)}
                          size={14}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </AuthGate>
  );
}
