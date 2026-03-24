import React, { useState, useEffect } from "react";
import { collection, getDocs, doc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "../../firebase.js";

export default function AdminUsers({ programs = [] }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [expandedId, setExpandedId] = useState(null);
  const [programSearch, setProgramSearch] = useState("");

  async function loadUsers() {
    setLoading(true);
    const snap = await getDocs(collection(db, "users"));
    setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    setLoading(false);
  }

  useEffect(() => { loadUsers(); }, []);

  // Build unique school list with IDs for the program picker
  const programOptions = [...new Map(
    programs.map(p => [p.school + "|" + p.gender, p])
  ).values()]
    .sort((a, b) => (a.school || "").localeCompare(b.school || ""))
    .map(p => ({ id: p.id, label: `${p.school} (${p.gender === "womens" ? "Women's" : "Men's"})` }));

  async function toggleCoach(uid, isCoach) {
    const updates = { isCoach: !isCoach, approved: !isCoach };
    if (isCoach) updates.assignedProgramIds = []; // clear assignments when removing coach
    await setDoc(doc(db, "users", uid), updates, { merge: true });
    loadUsers();
  }

  async function assignProgram(uid, programId) {
    const user = users.find(u => u.id === uid);
    const current = user?.assignedProgramIds || [];
    if (current.includes(programId)) return;
    const updated = [...current, programId];
    await setDoc(doc(db, "users", uid), { assignedProgramIds: updated }, { merge: true });
    loadUsers();
  }

  async function removeProgram(uid, programId) {
    const user = users.find(u => u.id === uid);
    const current = user?.assignedProgramIds || [];
    const updated = current.filter(id => id !== programId);
    await setDoc(doc(db, "users", uid), { assignedProgramIds: updated }, { merge: true });
    loadUsers();
  }

  async function removeUser(uid) {
    if (!confirm("Remove this user's access record?")) return;
    await deleteDoc(doc(db, "users", uid));
    loadUsers();
  }

  const filtered = users.filter(u => {
    if (filterRole === "coach" && !u.isCoach) return false;
    if (filterRole === "user" && u.isCoach) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (u.email || "").toLowerCase().includes(q) ||
      (u.displayName || "").toLowerCase().includes(q) ||
      u.id.toLowerCase().includes(q);
  });

  const coachCount = users.filter(u => u.isCoach).length;

  function getProgramLabel(programId) {
    const p = programs.find(pr => pr.id === programId);
    return p ? `${p.school} (${p.gender === "womens" ? "Women's" : "Men's"})` : programId.substring(0, 12) + "...";
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search users..."
          style={{ padding: "9px 14px", borderRadius: 8, border: "1px solid #E5E7EB",
            fontSize: 13, width: 280, boxSizing: "border-box" }}
        />
        <div style={{ display: "flex", borderRadius: 8, overflow: "hidden", border: "1px solid #E5E7EB" }}>
          {[["all", `All (${users.length})`], ["coach", `Coaches (${coachCount})`], ["user", `Users (${users.length - coachCount})`]].map(([val, label]) => (
            <button key={val} onClick={() => setFilterRole(val)} style={{
              padding: "7px 14px", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600,
              background: filterRole === val ? "#0A1F44" : "#fff",
              color: filterRole === val ? "#fff" : "#64748b",
            }}>{label}</button>
          ))}
        </div>
        <button onClick={loadUsers} style={{
          padding: "9px 16px", borderRadius: 8, border: "1px solid #E5E7EB",
          background: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer",
        }}>Refresh</button>
      </div>

      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E5E7EB", overflow: "visible" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#f8fafc", borderBottom: "2px solid #E5E7EB" }}>
              {["Email", "Display Name", "Role", "Programs", "Actions"].map(h => (
                <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11,
                  fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ padding: 40, textAlign: "center", color: "#64748b" }}>Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>
                {users.length === 0 ? "No users yet. Users appear here when they sign in." : "No matching users."}
              </td></tr>
            ) : filtered.map(u => {
              const isExpanded = expandedId === u.id;
              const assignedIds = u.assignedProgramIds || [];
              return (
                <React.Fragment key={u.id}>
                  <tr style={{ borderBottom: isExpanded ? "none" : "1px solid #f1f5f9",
                    background: isExpanded ? "#eff6ff" : "", cursor: "pointer" }}
                    onClick={() => { setExpandedId(isExpanded ? null : u.id); setProgramSearch(""); }}>
                    <td style={{ padding: "10px 14px", fontWeight: 600, color: "#0A1F44" }}>{u.email || "—"}</td>
                    <td style={{ padding: "10px 14px", color: "#475569" }}>{u.displayName || "—"}</td>
                    <td style={{ padding: "10px 14px" }}>
                      <span style={{
                        padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                        background: u.isCoach ? "rgba(0,204,0,0.1)" : "rgba(148,163,184,0.15)",
                        color: u.isCoach ? "#00CC00" : "#94a3b8",
                        border: `1px solid ${u.isCoach ? "rgba(0,204,0,0.3)" : "rgba(148,163,184,0.3)"}`,
                      }}>{u.isCoach ? "Coach" : "User"}</span>
                    </td>
                    <td style={{ padding: "10px 14px", color: "#475569", fontSize: 12 }}>
                      {u.isCoach && assignedIds.length > 0
                        ? assignedIds.map(id => getProgramLabel(id)).join(", ")
                        : u.isCoach ? <span style={{ color: "#f59e0b" }}>No programs assigned</span> : "—"
                      }
                    </td>
                    <td style={{ padding: "10px 14px" }} onClick={e => e.stopPropagation()}>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => toggleCoach(u.id, u.isCoach)} style={{
                          padding: "5px 12px", borderRadius: 6, border: "1px solid #E5E7EB",
                          background: u.isCoach ? "#fee2e2" : "#f0fde8",
                          color: u.isCoach ? "#dc2626" : "#00CC00",
                          fontWeight: 600, fontSize: 12, cursor: "pointer",
                        }}>{u.isCoach ? "Remove Coach" : "Make Coach"}</button>
                        <button onClick={() => removeUser(u.id)} style={{
                          padding: "5px 12px", borderRadius: 6, border: "none",
                          background: "#fee2e2", color: "#dc2626",
                          fontWeight: 600, fontSize: 12, cursor: "pointer",
                        }}>Delete</button>
                      </div>
                    </td>
                  </tr>
                  {isExpanded && u.isCoach && (
                    <tr>
                      <td colSpan={5} style={{ padding: 0, background: "#eff6ff", borderBottom: "2px solid #0A1F44" }}>
                        <div style={{ padding: "16px 24px" }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: "#0A1F44", marginBottom: 10,
                            textTransform: "uppercase", letterSpacing: "0.04em" }}>
                            Assigned Programs
                          </div>

                          {/* Current assignments */}
                          {assignedIds.length > 0 && (
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                              {assignedIds.map(id => (
                                <span key={id} style={{
                                  display: "inline-flex", alignItems: "center", gap: 6,
                                  padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600,
                                  background: "#dcfce7", color: "#166534", border: "1px solid #bbf7d0",
                                }}>
                                  {getProgramLabel(id)}
                                  <button onClick={() => removeProgram(u.id, id)} style={{
                                    background: "none", border: "none", cursor: "pointer",
                                    color: "#dc2626", fontWeight: 700, fontSize: 14, padding: 0, lineHeight: 1,
                                  }}>×</button>
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Add program */}
                          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <div style={{ position: "relative", flex: 1, maxWidth: 400 }}>
                              <input
                                value={programSearch}
                                onChange={e => setProgramSearch(e.target.value)}
                                placeholder="Search and add a program..."
                                style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #E5E7EB",
                                  fontSize: 13, width: "100%", boxSizing: "border-box" }}
                              />
                              {programSearch.length >= 2 && (
                                <div style={{
                                  position: "absolute", top: "100%", left: 0, right: 0, zIndex: 10,
                                  background: "#fff", border: "1px solid #E5E7EB", borderRadius: 8,
                                  boxShadow: "0 4px 16px rgba(0,0,0,0.12)", maxHeight: 200, overflowY: "auto",
                                  marginTop: 4,
                                }}>
                                  {programOptions
                                    .filter(p => p.label.toLowerCase().includes(programSearch.toLowerCase()))
                                    .filter(p => !assignedIds.includes(p.id))
                                    .slice(0, 10)
                                    .map(p => (
                                      <div key={p.id}
                                        onClick={() => { assignProgram(u.id, p.id); setProgramSearch(""); }}
                                        style={{
                                          padding: "8px 12px", cursor: "pointer", fontSize: 13,
                                          borderBottom: "1px solid #f1f5f9",
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.background = "#f0fde8"}
                                        onMouseLeave={e => e.currentTarget.style.background = "#fff"}
                                      >{p.label}</div>
                                    ))
                                  }
                                  {programOptions
                                    .filter(p => p.label.toLowerCase().includes(programSearch.toLowerCase()))
                                    .filter(p => !assignedIds.includes(p.id))
                                    .length === 0 && (
                                    <div style={{ padding: "8px 12px", color: "#94a3b8", fontSize: 12 }}>No matching programs</div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <p style={{ marginTop: 12, fontSize: 12, color: "#94a3b8" }}>
        Coaches can access Messages and Player Directory. Click a coach row to assign programs. Users are created automatically when they sign in.
      </p>
    </div>
  );
}
