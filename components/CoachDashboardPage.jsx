import React, { useState, useEffect, useMemo, useRef } from "react";
import { loadInterestedPlayers } from "../utils/programInterest.js";
import { doc, updateDoc, collection, getDocs, addDoc, deleteDoc, query, where } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../firebase.js";
import { logChange } from "../utils/changelog.js";

const POSITIONS = [
  "Loosehead Prop", "Hooker", "Tighthead Prop",
  "Lock", "Blindside Flanker", "Openside Flanker", "Number 8",
  "Scrum Half", "Fly Half", "Inside Center", "Outside Center",
  "Left Wing", "Right Wing", "Fullback",
];

const currentYear = new Date().getFullYear();
const GRAD_YEARS = [];
for (let y = currentYear; y <= currentYear + 5; y++) GRAD_YEARS.push(y);

export default function CoachDashboardPage({ coachProgramIds, programs, user, onOpenMessage }) {
  const [playersByProgram, setPlayersByProgram] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeProgramId, setActiveProgramId] = useState(coachProgramIds[0] || "");
  const [search, setSearch] = useState("");
  const [posFilter, setPosFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [activeTab, setActiveTab] = useState("players");

  // Edit Program state
  const [editForm, setEditForm] = useState({});
  const [editSaving, setEditSaving] = useState(false);
  const [editMsg, setEditMsg] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  // Contacts state
  const [contacts, setContacts] = useState([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactEdits, setContactEdits] = useState({});
  const [contactSaving, setContactSaving] = useState({});
  const [newContact, setNewContact] = useState({ contact: "", contactTitle: "", email: "" });
  const [addingContact, setAddingContact] = useState(false);

  const isMobile = window.innerWidth <= 900;

  // Sync activeProgramId when coachProgramIds updates
  useEffect(() => {
    console.log("DEBUG CoachDashboard coachProgramIds:", coachProgramIds, "activeProgramId:", activeProgramId);
    if (coachProgramIds.length > 0 && !coachProgramIds.includes(activeProgramId)) {
      setActiveProgramId(coachProgramIds[0]);
    }
  }, [coachProgramIds]);

  useEffect(() => {
    if (!coachProgramIds.length) return;
    setLoading(true);
    Promise.all(
      coachProgramIds.map(pid =>
        loadInterestedPlayers(pid).then(players => ({ pid, players }))
      )
    ).then(results => {
      const map = {};
      results.forEach(r => { map[r.pid] = r.players; });
      setPlayersByProgram(map);
    }).catch(err => console.error("Failed to load interested players:", err))
      .finally(() => setLoading(false));
  }, [coachProgramIds]);

  const coachPrograms = useMemo(() =>
    coachProgramIds.map(pid => programs.find(p => p.id === pid)).filter(Boolean),
    [coachProgramIds, programs]
  );

  const activeProgram = coachPrograms.find(p => p.id === activeProgramId) || coachPrograms[0];
  const players = playersByProgram[activeProgram?.id] || [];

  // Initialize edit form when activeProgram changes or tab switches to edit
  useEffect(() => {
    if (activeProgram && activeTab === "edit") {
      setEditForm({
        rugbyWebsite: activeProgram.rugbyWebsite || "",
        logoUrl: activeProgram.logoUrl || "",
        rugbyScholarship: !!activeProgram.rugbyScholarship,
        schoolFunded: !!activeProgram.schoolFunded,
        notes: activeProgram.notes || "",
      });
      loadContacts(activeProgram.id);
    }
  }, [activeProgram?.id, activeTab]);

  async function loadContacts(programId) {
    setContactsLoading(true);
    try {
      const snap = await getDocs(query(collection(db, "programContacts"), where("programId", "==", programId)));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Sort Head Coach to top
      list.sort((a, b) => {
        const aHead = (a.contactTitle || "").toLowerCase().includes("head coach") ? 0 : 1;
        const bHead = (b.contactTitle || "").toLowerCase().includes("head coach") ? 0 : 1;
        return aHead - bHead;
      });
      setContacts(list);
      // Initialize edits
      const edits = {};
      list.forEach(c => { edits[c.id] = { contact: c.contact || "", contactTitle: c.contactTitle || "", email: c.email || "" }; });
      setContactEdits(edits);
    } catch (err) {
      console.error("Failed to load contacts:", err);
    } finally {
      setContactsLoading(false);
    }
  }

  function setEditField(k, v) { setEditForm(f => ({ ...f, [k]: v })); }

  async function handleSaveProgram() {
    if (!activeProgram) return;
    setEditSaving(true);
    try {
      const updates = {
        rugbyWebsite: editForm.rugbyWebsite,
        logoUrl: editForm.logoUrl,
        rugbyScholarship: editForm.rugbyScholarship,
        schoolFunded: editForm.schoolFunded,
        notes: editForm.notes,
      };
      await updateDoc(doc(db, "programs", activeProgram.id), updates);
      await logChange("update", "programs", activeProgram.id, updates, user.email);
      localStorage.removeItem("crp_cache_v5");
      // Update local program object so UI reflects changes
      Object.assign(activeProgram, updates);
      setEditMsg("Program saved successfully!");
      setTimeout(() => setEditMsg(""), 3000);
    } catch (err) {
      console.error("Failed to save program:", err);
      setEditMsg("Error saving: " + err.message);
    } finally {
      setEditSaving(false);
    }
  }

  async function handleSaveContact(contactId) {
    const edits = contactEdits[contactId];
    if (!edits) return;
    setContactSaving(s => ({ ...s, [contactId]: true }));
    try {
      await updateDoc(doc(db, "programContacts", contactId), {
        contact: edits.contact,
        contactTitle: edits.contactTitle,
        email: edits.email,
      });
      localStorage.removeItem("crp_cache_v5");
      await loadContacts(activeProgram.id);
    } catch (err) {
      console.error("Failed to save contact:", err);
      alert("Error saving contact: " + err.message);
    } finally {
      setContactSaving(s => ({ ...s, [contactId]: false }));
    }
  }

  async function handleDeleteContact(contactId) {
    if (!confirm("Remove this contact?")) return;
    try {
      await deleteDoc(doc(db, "programContacts", contactId));
      localStorage.removeItem("crp_cache_v5");
      await loadContacts(activeProgram.id);
    } catch (err) {
      console.error("Failed to delete contact:", err);
      alert("Error deleting contact: " + err.message);
    }
  }

  async function handleAddContact() {
    if (!newContact.contact.trim()) return;
    setAddingContact(true);
    try {
      await addDoc(collection(db, "programContacts"), {
        programId: activeProgram.id,
        contact: newContact.contact,
        contactTitle: newContact.contactTitle,
        email: newContact.email,
      });
      localStorage.removeItem("crp_cache_v5");
      setNewContact({ contact: "", contactTitle: "", email: "" });
      await loadContacts(activeProgram.id);
    } catch (err) {
      console.error("Failed to add contact:", err);
      alert("Error adding contact: " + err.message);
    } finally {
      setAddingContact(false);
    }
  }

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
          (p.position || "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [players, search, posFilter, yearFilter]);

  if (loading) return (
    <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>Loading dashboard...</div>
  );

  const inp = { padding: "8px 10px", borderRadius: 8, border: "1px solid #E5E7EB",
    fontSize: 13, width: "100%", boxSizing: "border-box" };
  const lbl = { fontSize: 11, fontWeight: 700, color: "#64748b",
    textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: 4 };

  return (
    <div>
      {/* Program header */}
      {activeProgram && (
        <div style={{
          background: "#fff", borderRadius: 12, padding: isMobile ? 16 : 24, marginBottom: 20,
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: "1px solid #E5E7EB",
        }}>
          <h2 style={{ margin: "0 0 4px", fontSize: isMobile ? 18 : 22, fontWeight: 800, color: "#0A1F44" }}>
            {activeProgram.school}
          </h2>
          <div style={{ fontSize: 14, color: "#64748b" }}>
            Coach Dashboard — {players.length} interested player{players.length !== 1 ? "s" : ""}
          </div>
        </div>
      )}

      {/* Program tabs if coach has multiple programs */}
      {coachPrograms.length > 1 && (
        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          {coachPrograms.map(prog => (
            <button key={prog.id} onClick={() => setActiveProgramId(prog.id)} style={{
              padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer",
              fontWeight: 600, fontSize: 13, transition: "all 0.15s",
              background: activeProgramId === prog.id ? "#0A1F44" : "#fff",
              color: activeProgramId === prog.id ? "#fff" : "#475569",
              boxShadow: activeProgramId === prog.id
                ? "0 4px 12px rgba(10,31,68,0.3)"
                : "0 1px 3px rgba(0,0,0,0.08)",
            }}>
              {prog.school} ({prog.gender === "mens" ? "M" : "W"})
            </button>
          ))}
        </div>
      )}

      {/* Tab toggle: Interested Players | Edit Program */}
      <div style={{ display: "flex", gap: 0, marginBottom: 20 }}>
        <button onClick={() => setActiveTab("players")} style={{
          padding: "10px 24px", borderRadius: "8px 0 0 8px", border: "1px solid #E5E7EB",
          borderRight: "none", cursor: "pointer", fontWeight: 700, fontSize: 14,
          transition: "all 0.15s",
          background: activeTab === "players" ? "#0A1F44" : "#fff",
          color: activeTab === "players" ? "#fff" : "#475569",
        }}>
          Interested Players
        </button>
        <button onClick={() => setActiveTab("edit")} style={{
          padding: "10px 24px", borderRadius: "0 8px 8px 0", border: "1px solid #E5E7EB",
          cursor: "pointer", fontWeight: 700, fontSize: 14,
          transition: "all 0.15s",
          background: activeTab === "edit" ? "#0A1F44" : "#fff",
          color: activeTab === "edit" ? "#fff" : "#475569",
        }}>
          Edit Program
        </button>
      </div>

      {/* ========== INTERESTED PLAYERS TAB ========== */}
      {activeTab === "players" && (
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

                  {/* Message button - hidden for now */}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ========== EDIT PROGRAM TAB ========== */}
      {activeTab === "edit" && activeProgram && (
        <div>
          {/* Program Info Card */}
          <div style={{
            background: "#fff", borderRadius: 12, padding: isMobile ? 16 : 24, marginBottom: 20,
            boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: "1px solid #E5E7EB",
          }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 800, color: "#0A1F44" }}>
              Edit Program Info
            </h3>

            {/* Read-only fields */}
            <div style={{ fontWeight: 700, fontSize: 12, color: "#94a3b8", textTransform: "uppercase",
              letterSpacing: "0.06em", marginBottom: 10 }}>School Details (read-only)</div>
            <div style={{
              display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr",
              gap: 12, marginBottom: 20,
            }}>
              <div>
                <label style={lbl}>School</label>
                <div style={{ ...inp, background: "#f8fafc", color: "#64748b" }}>{activeProgram.school || "—"}</div>
              </div>
              <div>
                <label style={lbl}>City</label>
                <div style={{ ...inp, background: "#f8fafc", color: "#64748b" }}>{activeProgram.city || "—"}</div>
              </div>
              <div>
                <label style={lbl}>State</label>
                <div style={{ ...inp, background: "#f8fafc", color: "#64748b" }}>{activeProgram.state || "—"}</div>
              </div>
            </div>

            {/* Editable fields */}
            <div style={{ fontWeight: 700, fontSize: 12, color: "#94a3b8", textTransform: "uppercase",
              letterSpacing: "0.06em", marginBottom: 10 }}>Editable Fields</div>

            <div style={{
              display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
              gap: 12, marginBottom: 16,
            }}>
              <div>
                <label style={lbl}>Rugby Website URL</label>
                <input type="url" value={editForm.rugbyWebsite || ""} onChange={e => setEditField("rugbyWebsite", e.target.value)}
                  placeholder="https://..." style={inp} />
              </div>
              <div>
                <label style={lbl}>Logo URL</label>
                <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <input type="url" value={editForm.logoUrl || ""} onChange={e => setEditField("logoUrl", e.target.value)}
                      placeholder="https://..." style={inp} />
                  </div>
                </div>
              </div>
            </div>

            {/* Logo upload + preview */}
            <div style={{ display: "flex", gap: 16, alignItems: "flex-start", marginBottom: 16 }}>
              {editForm.logoUrl && (
                <img src={editForm.logoUrl} alt="Logo preview" style={{
                  width: 64, height: 64, borderRadius: 8, objectFit: "contain",
                  background: "#f8fafc", border: "1px solid #E5E7EB", flexShrink: 0,
                }} onError={e => { e.target.style.display = "none"; }} />
              )}
              <div>
                <input type="file" ref={fileRef} accept="image/*" style={{ display: "none" }}
                  onChange={async e => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setUploading(true);
                    try {
                      const ext = file.name.split(".").pop() || "png";
                      const path = `logos/${(activeProgram.school || "unknown").replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()}-${activeProgram.gender || "unknown"}.${ext}`;
                      const storageRef = ref(storage, path);
                      await uploadBytes(storageRef, file);
                      const url = await getDownloadURL(storageRef);
                      setEditField("logoUrl", url);
                    } catch (err) {
                      console.error("Upload failed:", err);
                      alert("Upload failed: " + err.message);
                    } finally {
                      setUploading(false);
                      e.target.value = "";
                    }
                  }}
                />
                <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} style={{
                  padding: "7px 16px", borderRadius: 6, border: "1px solid #E5E7EB",
                  background: uploading ? "#f1f5f9" : "#fff", color: "#0A1F44",
                  fontWeight: 600, fontSize: 12, cursor: uploading ? "default" : "pointer",
                }}>{uploading ? "Uploading..." : "Upload Logo"}</button>
              </div>
            </div>

            {/* Checkboxes */}
            <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginBottom: 16 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13 }}>
                <input type="checkbox" checked={!!editForm.rugbyScholarship}
                  onChange={e => setEditField("rugbyScholarship", e.target.checked)} style={{ width: 16, height: 16 }} />
                Rugby Scholarship
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13 }}>
                <input type="checkbox" checked={!!editForm.schoolFunded}
                  onChange={e => setEditField("schoolFunded", e.target.checked)} style={{ width: 16, height: 16 }} />
                School Funded
              </label>
            </div>

            {/* Notes */}
            <div style={{ marginBottom: 20 }}>
              <label style={lbl}>Notes / Program Description</label>
              <textarea value={editForm.notes || ""} onChange={e => setEditField("notes", e.target.value)}
                placeholder="Additional notes about this program..."
                rows={4} style={{ ...inp, resize: "vertical" }} />
            </div>

            {/* Save button + message */}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button onClick={handleSaveProgram} disabled={editSaving} style={{
                padding: "9px 24px", borderRadius: 8, border: "none",
                background: editSaving ? "#E5E7EB" : "#69BE28",
                color: editSaving ? "#94a3b8" : "#fff", fontWeight: 700, fontSize: 14,
                cursor: editSaving ? "default" : "pointer", transition: "background 0.15s",
              }}>{editSaving ? "Saving..." : "Save Program"}</button>
              {editMsg && (
                <span style={{
                  fontSize: 13, fontWeight: 600,
                  color: editMsg.startsWith("Error") ? "#dc2626" : "#16a34a",
                }}>{editMsg}</span>
              )}
            </div>
          </div>

          {/* Contacts Card */}
          <div style={{
            background: "#fff", borderRadius: 12, padding: isMobile ? 16 : 24, marginBottom: 20,
            boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: "1px solid #E5E7EB",
          }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 800, color: "#0A1F44" }}>
              Program Contacts
            </h3>

            {contactsLoading ? (
              <div style={{ padding: 20, textAlign: "center", color: "#64748b" }}>Loading contacts...</div>
            ) : contacts.length === 0 ? (
              <div style={{ padding: 20, textAlign: "center", color: "#94a3b8", fontSize: 14 }}>
                No contacts yet. Add one below.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
                {contacts.map(c => (
                  <div key={c.id} style={{
                    border: "1px solid #E5E7EB", borderRadius: 8, padding: 12,
                    display: "flex", flexDirection: isMobile ? "column" : "row",
                    gap: 10, alignItems: isMobile ? "stretch" : "flex-end",
                  }}>
                    <div style={{ flex: 1 }}>
                      <label style={lbl}>Name</label>
                      <input value={contactEdits[c.id]?.contact || ""} onChange={e => setContactEdits(prev => ({
                        ...prev, [c.id]: { ...prev[c.id], contact: e.target.value }
                      }))} style={inp} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={lbl}>Title</label>
                      <input value={contactEdits[c.id]?.contactTitle || ""} onChange={e => setContactEdits(prev => ({
                        ...prev, [c.id]: { ...prev[c.id], contactTitle: e.target.value }
                      }))} style={inp} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={lbl}>Email</label>
                      <input type="email" value={contactEdits[c.id]?.email || ""} onChange={e => setContactEdits(prev => ({
                        ...prev, [c.id]: { ...prev[c.id], email: e.target.value }
                      }))} style={inp} />
                    </div>
                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      <button onClick={() => handleSaveContact(c.id)} disabled={contactSaving[c.id]} style={{
                        padding: "7px 14px", borderRadius: 6, border: "none",
                        background: contactSaving[c.id] ? "#E5E7EB" : "#69BE28",
                        color: "#fff", fontWeight: 600, fontSize: 12,
                        cursor: contactSaving[c.id] ? "default" : "pointer",
                      }}>{contactSaving[c.id] ? "..." : "Save"}</button>
                      <button onClick={() => handleDeleteContact(c.id)} style={{
                        padding: "7px 12px", borderRadius: 6, border: "none",
                        background: "#fee2e2", color: "#dc2626",
                        fontWeight: 600, fontSize: 12, cursor: "pointer",
                      }}>Remove</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add Contact form */}
            <div style={{ fontWeight: 700, fontSize: 12, color: "#94a3b8", textTransform: "uppercase",
              letterSpacing: "0.06em", marginBottom: 10 }}>Add New Contact</div>
            <div style={{
              border: "1px dashed #E5E7EB", borderRadius: 8, padding: 12,
              display: "flex", flexDirection: isMobile ? "column" : "row",
              gap: 10, alignItems: isMobile ? "stretch" : "flex-end",
            }}>
              <div style={{ flex: 1 }}>
                <label style={lbl}>Name</label>
                <input value={newContact.contact} onChange={e => setNewContact(nc => ({ ...nc, contact: e.target.value }))}
                  placeholder="Contact name" style={inp} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={lbl}>Title</label>
                <input value={newContact.contactTitle} onChange={e => setNewContact(nc => ({ ...nc, contactTitle: e.target.value }))}
                  placeholder="e.g. Head Coach" style={inp} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={lbl}>Email</label>
                <input type="email" value={newContact.email} onChange={e => setNewContact(nc => ({ ...nc, email: e.target.value }))}
                  placeholder="email@school.edu" style={inp} />
              </div>
              <button onClick={handleAddContact} disabled={addingContact || !newContact.contact.trim()} style={{
                padding: "7px 18px", borderRadius: 6, border: "none", flexShrink: 0,
                background: addingContact || !newContact.contact.trim() ? "#E5E7EB" : "#0A1F44",
                color: addingContact || !newContact.contact.trim() ? "#94a3b8" : "#fff",
                fontWeight: 700, fontSize: 12,
                cursor: addingContact || !newContact.contact.trim() ? "default" : "pointer",
              }}>{addingContact ? "Adding..." : "Add Contact"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
