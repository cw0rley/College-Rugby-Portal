import React, { useState, useEffect } from "react";
import { collection, getDocs, doc, setDoc, deleteDoc, query, where } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../../firebase.js";
import { useIsMobile } from "../../utils/useIsMobile.js";
import { useToast } from "../ui/Toast.jsx";
import ConfirmDialog from "../ui/ConfirmDialog.jsx";

export default function AdminUsers({ programs = [], programContacts = [] }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [expandedId, setExpandedId] = useState(null);
  const [programSearch, setProgramSearch] = useState("");
  const [sortCol, setSortCol] = useState("");
  const [sortDir, setSortDir] = useState("asc");
  const [confirmAction, setConfirmAction] = useState(null);
  const { addToast } = useToast();
  const isMobile = useIsMobile();

  function handleSort(col) {
    if (sortCol === col) { setSortDir(d => d === "asc" ? "desc" : "asc"); }
    else { setSortCol(col); setSortDir("asc"); }
  }

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

  async function toggleAdmin(uid, isAdmin) {
    await setDoc(doc(db, "users", uid), { isAdmin: !isAdmin }, { merge: true });
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

  function resendVerification(uid, email) {
    setConfirmAction({
      message: `Resend verification email to ${email}?`,
      onConfirm: async () => {
        setConfirmAction(null);
        try {
          const fn = httpsCallable(functions, "resendVerificationEmail");
          await fn({ uid });
          addToast(`Verification email sent to ${email}`, "success");
        } catch (err) {
          addToast(`Failed to send: ${err.message}`, "error");
        }
      },
    });
  }

  function removeUser(uid) {
    setConfirmAction({
      message: "Delete this user and all their data (profile, favorites, messages, notifications)?",
      onConfirm: () => { setConfirmAction(null); doRemoveUser(uid); },
    });
  }

  async function doRemoveUser(uid) {
    // Delete player profile
    await deleteDoc(doc(db, "playerProfiles", uid)).catch(() => {});
    // Delete favorites and remove programInterest entries
    const favSnap = await getDocs(collection(db, "users", uid, "favorites")).catch(() => ({ docs: [] }));
    await Promise.all((favSnap.docs || []).map(async d => {
      await deleteDoc(d.ref);
      // Remove from that program's interested players
      await deleteDoc(doc(db, "programInterest", d.id, "players", uid)).catch(() => {});
    }));
    // Also scan all programInterest for this user (in case they were added without a favorite)
    const allProgsSnap = await getDocs(collection(db, "programs")).catch(() => ({ docs: [] }));
    await Promise.all((allProgsSnap.docs || []).map(p =>
      deleteDoc(doc(db, "programInterest", p.id, "players", uid)).catch(() => {})
    ));
    // Delete this user's recruits subcollection (if they're a coach)
    const recruitSnap = await getDocs(collection(db, "users", uid, "recruits")).catch(() => ({ docs: [] }));
    await Promise.all((recruitSnap.docs || []).map(d => deleteDoc(d.ref)));
    // Remove this user from all coaches' recruit lists (if they're a player)
    const allUsersSnap = await getDocs(collection(db, "users")).catch(() => ({ docs: [] }));
    await Promise.all((allUsersSnap.docs || []).map(async u => {
      const ref = doc(db, "users", u.id, "recruits", uid);
      await deleteDoc(ref).catch(() => {});
    }));
    // Delete notifications
    const notifSnap = await getDocs(query(collection(db, "notifications"), where("recipientUid", "==", uid))).catch(() => ({ docs: [] }));
    await Promise.all((notifSnap.docs || []).map(d => deleteDoc(d.ref)));
    // Delete conversations where this user is a participant
    const convsSnap = await getDocs(query(collection(db, "conversations"), where("participants", "array-contains", uid))).catch(() => ({ docs: [] }));
    await Promise.all((convsSnap.docs || []).map(async d => {
      const msgsSnap = await getDocs(collection(db, "conversations", d.id, "messages")).catch(() => ({ docs: [] }));
      await Promise.all((msgsSnap.docs || []).map(m => deleteDoc(m.ref)));
      await deleteDoc(d.ref);
    }));
    // Delete user doc
    await deleteDoc(doc(db, "users", uid));
    // Delete from Firebase Authentication
    try {
      const deleteUserAuth = httpsCallable(functions, "deleteUser");
      await deleteUserAuth({ uid });
    } catch (err) {
      console.warn("Failed to delete from Auth (may already be removed):", err.message);
    }
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
            fontSize: 13, width: isMobile ? "100%" : 280, boxSizing: "border-box" }}
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

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>Loading...</div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>
          {users.length === 0 ? "No users yet. Users appear here when they sign in." : "No matching users."}
        </div>
      ) : isMobile ? (
        /* Mobile: card layout */
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {(sortCol ? [...filtered].sort((a, b) => {
            const av = a[sortCol], bv = b[sortCol];
            if (av == null && bv == null) return 0;
            if (av == null) return 1;
            if (bv == null) return -1;
            const cmp = typeof av === "number" || typeof av === "boolean" ? Number(av) - Number(bv) : String(av).localeCompare(String(bv));
            return sortDir === "asc" ? cmp : -cmp;
          }) : filtered).map(u => {
            const isExpanded = expandedId === u.id;
            const assignedIds = u.assignedProgramIds || [];
            const emailMatchIds = u.email
              ? [...new Set(programContacts.filter(c => c.email?.toLowerCase() === u.email.toLowerCase()).map(c => c.programId))]
              : [];
            const allIds = [...new Set([...assignedIds, ...emailMatchIds])];
            return (
              <div key={u.id} style={{ background: "#fff", borderRadius: 10, border: "1px solid #E5E7EB",
                padding: 14, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
                onClick={() => { setExpandedId(isExpanded ? null : u.id); setProgramSearch(""); }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: "#0A1F44", fontSize: 13, wordBreak: "break-all" }}>
                      {u.email || "—"}
                      {u.emailVerified && <span style={{ marginLeft: 4, color: "#00CC00" }}>&#10003;</span>}
                    </div>
                    {u.displayName && <div style={{ fontSize: 12, color: "#475569", marginTop: 2 }}>{u.displayName}</div>}
                  </div>
                  <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                    <span style={{
                      padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700,
                      background: u.isCoach ? "rgba(0,204,0,0.1)" : "rgba(148,163,184,0.15)",
                      color: u.isCoach ? "#00CC00" : "#94a3b8",
                      border: `1px solid ${u.isCoach ? "rgba(0,204,0,0.3)" : "rgba(148,163,184,0.3)"}`,
                    }}>{u.isCoach ? "Coach" : "User"}</span>
                    {u.isAdmin && <span style={{
                      padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700,
                      background: "rgba(26,86,219,0.1)", color: "#1a56db", border: "1px solid rgba(26,86,219,0.3)",
                    }}>Admin</span>}
                  </div>
                </div>
                {u.isCoach && allIds.length > 0 && (
                  <div style={{ fontSize: 11, color: "#64748b", marginBottom: 8 }}>
                    {allIds.map(id => getProgramLabel(id)).join(", ")}
                  </div>
                )}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }} onClick={e => e.stopPropagation()}>
                  {(() => {
                    const btnBase = {
                      padding: "6px 8px", borderRadius: 6, width: "100%",
                      fontWeight: 600, fontSize: 11, cursor: "pointer",
                      whiteSpace: "nowrap", textAlign: "center",
                    };
                    return (
                      <>
                        <button onClick={() => toggleCoach(u.id, u.isCoach)} style={{
                          ...btnBase, border: "1px solid #E5E7EB",
                          background: u.isCoach ? "#fee2e2" : "#f0fde8",
                          color: u.isCoach ? "#dc2626" : "#00CC00",
                        }}>{u.isCoach ? "Remove Coach" : "Make Coach"}</button>
                        <button onClick={() => toggleAdmin(u.id, u.isAdmin)} style={{
                          ...btnBase, border: "1px solid #E5E7EB",
                          background: u.isAdmin ? "#fee2e2" : "#dbeafe",
                          color: u.isAdmin ? "#dc2626" : "#1a56db",
                        }}>{u.isAdmin ? "Remove Admin" : "Make Admin"}</button>
                        <button
                          onClick={() => u.email && !u.emailVerified && resendVerification(u.id, u.email)}
                          disabled={!u.email || u.emailVerified}
                          style={{
                            ...btnBase, border: "1px solid #E5E7EB",
                            background: (u.email && !u.emailVerified) ? "#fffbeb" : "#f8fafc",
                            color: (u.email && !u.emailVerified) ? "#b45309" : "#cbd5e1",
                            cursor: (u.email && !u.emailVerified) ? "pointer" : "default",
                          }}>Resend Email</button>
                        <button onClick={() => removeUser(u.id)} style={{
                          ...btnBase, border: "none",
                          background: "#fee2e2", color: "#dc2626",
                        }}>Delete</button>
                      </>
                    );
                  })()}
                </div>
                {isExpanded && u.isCoach && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #E5E7EB" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#0A1F44", marginBottom: 8,
                      textTransform: "uppercase", letterSpacing: "0.04em" }}>Assigned Programs</div>
                    {assignedIds.length > 0 && (
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                        {assignedIds.map(id => (
                          <span key={id} style={{
                            display: "inline-flex", alignItems: "center", gap: 4,
                            padding: "3px 8px", borderRadius: 20, fontSize: 11, fontWeight: 600,
                            background: "#dcfce7", color: "#166534", border: "1px solid #bbf7d0",
                          }}>
                            {getProgramLabel(id)}
                            <button onClick={() => removeProgram(u.id, id)} style={{
                              background: "none", border: "none", cursor: "pointer",
                              color: "#dc2626", fontWeight: 700, fontSize: 13, padding: 0, lineHeight: 1,
                            }}>×</button>
                          </span>
                        ))}
                      </div>
                    )}
                    <input value={programSearch} onChange={e => setProgramSearch(e.target.value)}
                      placeholder="Search and add a program..."
                      onClick={e => e.stopPropagation()}
                      style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #E5E7EB",
                        fontSize: 12, width: "100%", boxSizing: "border-box" }} />
                    {programSearch.length >= 2 && (
                      <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 8,
                        boxShadow: "0 4px 16px rgba(0,0,0,0.12)", maxHeight: 160, overflowY: "auto", marginTop: 4 }}>
                        {programOptions
                          .filter(p => p.label.toLowerCase().includes(programSearch.toLowerCase()))
                          .filter(p => !assignedIds.includes(p.id))
                          .slice(0, 10)
                          .map(p => (
                            <div key={p.id} onClick={(e) => { e.stopPropagation(); assignProgram(u.id, p.id); setProgramSearch(""); }}
                              style={{ padding: "8px 12px", cursor: "pointer", fontSize: 12, borderBottom: "1px solid #f1f5f9" }}>
                              {p.label}
                            </div>
                          ))}
                        {programOptions.filter(p => p.label.toLowerCase().includes(programSearch.toLowerCase()))
                          .filter(p => !assignedIds.includes(p.id)).length === 0 && (
                          <div style={{ padding: "8px 12px", color: "#94a3b8", fontSize: 11 }}>No matching programs</div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Desktop: table layout */
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E5E7EB", overflow: "visible" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "2px solid #E5E7EB" }}>
                {[["Email","email"],["Display Name","displayName"],["Role","isCoach"],["Programs",null],["Actions",null]].map(([h, col]) => (
                  <th key={h} onClick={col ? () => handleSort(col) : undefined} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11,
                    fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em",
                    cursor: col ? "pointer" : "default", userSelect: col ? "none" : undefined,
                  }}>{h} {col && sortCol === col ? (sortDir === "asc" ? "\u25B2" : "\u25BC") : ""}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(sortCol ? [...filtered].sort((a, b) => {
                const av = a[sortCol], bv = b[sortCol];
                if (av == null && bv == null) return 0;
                if (av == null) return 1;
                if (bv == null) return -1;
                const cmp = typeof av === "number" || typeof av === "boolean" ? Number(av) - Number(bv) : String(av).localeCompare(String(bv));
                return sortDir === "asc" ? cmp : -cmp;
              }) : filtered).map(u => {
                const isExpanded = expandedId === u.id;
                const assignedIds = u.assignedProgramIds || [];
                return (
                  <React.Fragment key={u.id}>
                    <tr style={{ borderBottom: isExpanded ? "none" : "1px solid #f1f5f9",
                      background: isExpanded ? "#eff6ff" : "", cursor: "pointer" }}
                      onClick={() => { setExpandedId(isExpanded ? null : u.id); setProgramSearch(""); }}>
                      <td style={{ padding: "10px 14px", fontWeight: 600, color: "#0A1F44" }}>
                        {u.email || "—"}
                        {u.emailVerified && (
                          <span title="Email verified" style={{ marginLeft: 6, color: "#00CC00", fontSize: 13 }}>&#10003;</span>
                        )}
                      </td>
                      <td style={{ padding: "10px 14px", color: "#475569" }}>{u.displayName || "—"}</td>
                      <td style={{ padding: "10px 14px" }}>
                        <span style={{
                          padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                          background: u.isCoach ? "rgba(0,204,0,0.1)" : "rgba(148,163,184,0.15)",
                          color: u.isCoach ? "#00CC00" : "#94a3b8",
                          border: `1px solid ${u.isCoach ? "rgba(0,204,0,0.3)" : "rgba(148,163,184,0.3)"}`,
                        }}>{u.isCoach ? "Coach" : "User"}</span>
                        {u.isAdmin && (
                          <span style={{
                            padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                            background: "rgba(26,86,219,0.1)", color: "#1a56db",
                            border: "1px solid rgba(26,86,219,0.3)", marginLeft: 4,
                          }}>Admin</span>
                        )}
                      </td>
                      <td style={{ padding: "10px 14px", color: "#475569", fontSize: 12 }}>
                        {(() => {
                          const emailMatchIds = u.email
                            ? [...new Set(programContacts.filter(c => c.email?.toLowerCase() === u.email.toLowerCase()).map(c => c.programId))]
                            : [];
                          const allIds = [...new Set([...assignedIds, ...emailMatchIds])];
                          if (!u.isCoach) return "—";
                          if (allIds.length === 0) return <span style={{ color: "#f59e0b" }}>No programs</span>;
                          return allIds.map(id => {
                            const label = getProgramLabel(id);
                            const isEmailMatch = emailMatchIds.includes(id) && !assignedIds.includes(id);
                            return (
                              <span key={id}>
                                {label}
                                {isEmailMatch && <span style={{ fontSize: 10, color: "#94a3b8" }}> (email match)</span>}
                              </span>
                            );
                          }).reduce((prev, curr) => [prev, ", ", curr]);
                        })()}
                      </td>
                      <td style={{ padding: "10px 14px" }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: "flex", gap: 8 }}>
                          {(() => {
                            const btnBase = {
                              padding: "6px 10px", borderRadius: 6, width: 82,
                              fontWeight: 600, fontSize: 12, cursor: "pointer",
                              lineHeight: 1.3, textAlign: "center",
                            };
                            return (
                              <>
                                <button onClick={() => toggleCoach(u.id, u.isCoach)} style={{
                                  ...btnBase, border: "1px solid #E5E7EB",
                                  background: u.isCoach ? "#fee2e2" : "#f0fde8",
                                  color: u.isCoach ? "#dc2626" : "#00CC00",
                                }}>{u.isCoach ? "Remove Coach" : "Make Coach"}</button>
                                <button onClick={() => toggleAdmin(u.id, u.isAdmin)} style={{
                                  ...btnBase, border: "1px solid #E5E7EB",
                                  background: u.isAdmin ? "#fee2e2" : "#dbeafe",
                                  color: u.isAdmin ? "#dc2626" : "#1a56db",
                                }}>{u.isAdmin ? "Remove Admin" : "Make Admin"}</button>
                                <button
                                  onClick={() => u.email && !u.emailVerified && resendVerification(u.id, u.email)}
                                  disabled={!u.email || u.emailVerified}
                                  style={{
                                    ...btnBase, border: "1px solid #E5E7EB",
                                    background: (u.email && !u.emailVerified) ? "#fffbeb" : "#f8fafc",
                                    color: (u.email && !u.emailVerified) ? "#b45309" : "#cbd5e1",
                                    cursor: (u.email && !u.emailVerified) ? "pointer" : "default",
                                  }}>Resend Email</button>
                                <button onClick={() => removeUser(u.id)} style={{
                                  ...btnBase, border: "none",
                                  background: "#fee2e2", color: "#dc2626",
                                }}>Delete</button>
                              </>
                            );
                          })()}
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
                            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                              <div style={{ position: "relative", flex: 1, maxWidth: 400 }}>
                                <input value={programSearch} onChange={e => setProgramSearch(e.target.value)}
                                  placeholder="Search and add a program..."
                                  style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #E5E7EB",
                                    fontSize: 13, width: "100%", boxSizing: "border-box" }} />
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
      )}

      <p style={{ marginTop: 12, fontSize: 12, color: "#94a3b8" }}>
        Coaches can access Messages and Player Directory. Click a coach row to assign programs. Users are created automatically when they sign in.
      </p>
      {confirmAction && (
        <ConfirmDialog
          message={confirmAction.message}
          onConfirm={confirmAction.onConfirm}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </div>
  );
}
