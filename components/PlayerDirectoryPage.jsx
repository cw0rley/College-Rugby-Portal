import React, { useState, useEffect, useMemo } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase.js";
import AuthGate from "./ui/AuthGate.jsx";

const POSITIONS = [
  "Loosehead Prop", "Hooker", "Tighthead Prop",
  "Lock", "Blindside Flanker", "Openside Flanker", "Number 8",
  "Scrum Half", "Fly Half", "Inside Center", "Outside Center",
  "Left Wing", "Right Wing", "Fullback",
];

const currentYear = new Date().getFullYear();
const GRAD_YEARS = [];
for (let y = currentYear; y <= currentYear + 5; y++) GRAD_YEARS.push(y);

export default function PlayerDirectoryPage({ user }) {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [posFilter, setPosFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");

  const isMobile = Math.min(window.innerWidth, screen.width) <= 900;

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    getDocs(query(collection(db, "playerProfiles"), where("profilePublic", "==", true)))
      .then(snap => {
        setPlayers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      })
      .catch(err => console.error("Failed to load player directory:", err))
      .finally(() => setLoading(false));
  }, [user]);

  const filtered = useMemo(() => {
    return players.filter(p => {
      if (posFilter && p.position !== posFilter && p.secondaryPosition !== posFilter) return false;
      if (yearFilter && String(p.graduationYear) !== yearFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const name = ((p.firstName || "") + " " + (p.lastName || "")).toLowerCase();
        return (
          name.includes(q) ||
          (p.city || "").toLowerCase().includes(q) ||
          (p.currentClub || "").toLowerCase().includes(q) ||
          (p.position || "").toLowerCase().includes(q) ||
          (p.highSchool || "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [players, search, posFilter, yearFilter]);

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
              {filtered.map(p => (
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
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </AuthGate>
  );
}
