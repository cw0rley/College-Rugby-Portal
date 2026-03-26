import React, { useState } from "react";
import { collection, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "../../firebase.js";
import { logChange } from "../../utils/changelog.js";
import Badge from "../ui/Badge.jsx";

export default function AdminConferenceContacts({ contacts, conferences, leagues, onRefresh, userEmail }) {
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [newForm, setNewForm] = useState({ conference:"", league:"", gender:"mens", contactName:"", contactTitle:"", email:"", phone:"" });
  const [saving, setSaving] = useState(false);
  const [sortCol, setSortCol] = useState("");
  const [sortDir, setSortDir] = useState("asc");
  const [filterText, setFilterText] = useState("");

  function handleSort(col) {
    if (sortCol === col) { setSortDir(d => d === "asc" ? "desc" : "asc"); }
    else { setSortCol(col); setSortDir("asc"); }
  }
  const inp = { padding:"7px 10px", borderRadius:6, border:"1px solid #E5E7EB", fontSize:13, width:"100%", boxSizing:"border-box" };
  const lblStyle = { fontSize:11, fontWeight:700, color:"#64748b", display:"block", marginBottom:4 };

  const confNames = [...new Set(conferences.map(c => c.conference))].sort();
  const leagueNames = leagues.map(l => l.name).sort();

  async function handleAdd() {
    if (!newForm.conference.trim() || !newForm.league.trim()) return;
    setSaving(true);
    const ref = await addDoc(collection(db, "conferenceContacts"), { ...newForm });
    await logChange("add", "conferenceContacts", ref.id, { ...newForm }, userEmail);
    localStorage.removeItem("crp_cache_v5");
    setNewForm({ conference:"", league:"", gender:"mens", contactName:"", contactTitle:"", email:"", phone:"" });
    setSaving(false); onRefresh();
  }
  async function handleUpdate(id) {
    await updateDoc(doc(db, "conferenceContacts", id), editForm);
    await logChange("update", "conferenceContacts", id, editForm, userEmail);
    localStorage.removeItem("crp_cache_v5");
    setEditingId(null); onRefresh();
  }
  async function handleDelete(id) {
    const deleted = contacts.find(c => c.id === id);
    await deleteDoc(doc(db, "conferenceContacts", id));
    await logChange("delete", "conferenceContacts", id, deleted || {}, userEmail);
    localStorage.removeItem("crp_cache_v5");
    onRefresh();
  }

  return (
    <div>
      <div style={{ background:"#fff", borderRadius:12, padding:20, marginBottom:16, border:"1px solid #E5E7EB" }}>
        <div style={{ fontWeight:700, fontSize:13, color:"#0A1F44", marginBottom:12 }}>Add Conference Contact</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr 1fr 2fr 1fr", gap:10, marginBottom:10 }}>
          <div>
            <label style={lblStyle}>CONFERENCE *</label>
            <select value={newForm.conference} onChange={e => setNewForm(f => ({...f, conference:e.target.value}))} style={inp}>
              <option value="">— Select —</option>
              {confNames.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={lblStyle}>LEAGUE *</label>
            <select value={newForm.league} onChange={e => setNewForm(f => ({...f, league:e.target.value}))} style={inp}>
              <option value="">— Select —</option>
              {leagueNames.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div>
            <label style={lblStyle}>GENDER</label>
            <select value={newForm.gender} onChange={e => setNewForm(f => ({...f, gender:e.target.value}))} style={inp}>
              <option value="mens">Men's</option>
              <option value="womens">Women's</option>
            </select>
          </div>
          <div>
            <label style={lblStyle}>CONTACT NAME</label>
            <input value={newForm.contactName} onChange={e => setNewForm(f => ({...f, contactName:e.target.value}))} style={inp} />
          </div>
          <div>
            <label style={lblStyle}>TITLE</label>
            <input value={newForm.contactTitle} onChange={e => setNewForm(f => ({...f, contactTitle:e.target.value}))} style={inp} />
          </div>
          <div>
            <label style={lblStyle}>EMAIL</label>
            <input value={newForm.email} onChange={e => setNewForm(f => ({...f, email:e.target.value}))} style={inp} />
          </div>
          <div>
            <label style={lblStyle}>PHONE</label>
            <input value={newForm.phone} onChange={e => setNewForm(f => ({...f, phone:e.target.value}))} style={inp} />
          </div>
        </div>
        <button onClick={handleAdd} disabled={saving || !newForm.conference.trim() || !newForm.league.trim()} style={{
          padding:"8px 18px", borderRadius:8, border:"none", background:"#0A1F44",
          color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer" }}>
          + Add Contact
        </button>
      </div>

      <div style={{ marginBottom:12 }}>
        <input
          value={filterText}
          onChange={e => setFilterText(e.target.value)}
          placeholder="Filter..."
          style={{ padding:"9px 14px", borderRadius:8, border:"1px solid #E5E7EB",
            fontSize:13, width:300, boxSizing:"border-box" }}
        />
      </div>

      <div style={{ background:"#fff", borderRadius:12, border:"1px solid #E5E7EB", overflow:"auto" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
          <thead>
            <tr style={{ background:"#f8fafc", borderBottom:"2px solid #E5E7EB" }}>
              {[["Conference","conference"],["League","league"],["Gender","gender"],["Contact","contactName"],["Title","contactTitle"],["Email","email"],["Phone","phone"],["Actions",null]].map(([h, col]) => (
                <th key={h} onClick={col ? () => handleSort(col) : undefined} style={{ padding:"10px 14px", textAlign:"left", fontSize:11,
                  fontWeight:700, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.05em",
                  cursor: col ? "pointer" : "default", userSelect: col ? "none" : undefined,
                }}>{h} {col && sortCol === col ? (sortDir === "asc" ? "\u25B2" : "\u25BC") : ""}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(sortCol ? [...contacts].filter(ct => {
              if (!filterText) return true;
              const q = filterText.toLowerCase();
              return (ct.conference || "").toLowerCase().includes(q) ||
                (ct.league || "").toLowerCase().includes(q) ||
                (ct.gender || "").toLowerCase().includes(q) ||
                (ct.gender === "womens" ? "women's" : "men's").includes(q) ||
                (ct.contactName || "").toLowerCase().includes(q) ||
                (ct.contactTitle || "").toLowerCase().includes(q) ||
                (ct.email || "").toLowerCase().includes(q) ||
                (ct.phone || "").toLowerCase().includes(q);
            }).sort((a, b) => {
              const av = a[sortCol], bv = b[sortCol];
              if (av == null && bv == null) return 0;
              if (av == null) return 1;
              if (bv == null) return -1;
              const cmp = typeof av === "number" ? av - bv : String(av).localeCompare(String(bv));
              return sortDir === "asc" ? cmp : -cmp;
            }) : contacts.filter(ct => {
              if (!filterText) return true;
              const q = filterText.toLowerCase();
              return (ct.conference || "").toLowerCase().includes(q) ||
                (ct.league || "").toLowerCase().includes(q) ||
                (ct.gender || "").toLowerCase().includes(q) ||
                (ct.gender === "womens" ? "women's" : "men's").includes(q) ||
                (ct.contactName || "").toLowerCase().includes(q) ||
                (ct.contactTitle || "").toLowerCase().includes(q) ||
                (ct.email || "").toLowerCase().includes(q) ||
                (ct.phone || "").toLowerCase().includes(q);
            })).map(ct => {
              const isEditing = editingId === ct.id;
              const genderColor = ct.gender === "womens" ? "#d61f69" : "#0A1F44";
              const genderLabel = ct.gender === "womens" ? "Women's" : "Men's";
              return (
                <React.Fragment key={ct.id}>
                  <tr style={{ borderBottom: isEditing ? "none" : "1px solid #f1f5f9", background: isEditing ? "#f0fde8" : "" }}>
                    <td style={{ padding:"10px 14px", fontWeight:600, color:"#0A1F44" }}>{ct.conference}</td>
                    <td style={{ padding:"10px 14px" }}>{ct.league ? <Badge label={ct.league} color="#00FF00" /> : "—"}</td>
                    <td style={{ padding:"10px 14px" }}><Badge label={genderLabel} color={genderColor} /></td>
                    <td style={{ padding:"10px 14px", color:"#475569" }}>{ct.contactName || "—"}</td>
                    <td style={{ padding:"10px 14px", color:"#475569" }}>{ct.contactTitle || "—"}</td>
                    <td style={{ padding:"10px 14px", color:"#475569" }}>{ct.email || "—"}</td>
                    <td style={{ padding:"10px 14px", color:"#475569" }}>{ct.phone || "—"}</td>
                    <td style={{ padding:"10px 14px" }}>
                      <div style={{ display:"flex", gap:8 }}>
                        <button onClick={() => { setEditingId(isEditing ? null : ct.id); setEditForm({...ct}); }} style={{
                          padding:"5px 12px", borderRadius:6, border:"1px solid #E5E7EB",
                          background: isEditing ? "#f0fde8" : "#fff", color:"#0A1F44", fontWeight:600, fontSize:12, cursor:"pointer" }}>
                          {isEditing ? "Cancel" : "Edit"}
                        </button>
                        <button onClick={() => handleDelete(ct.id)} style={{
                          padding:"5px 12px", borderRadius:6, border:"none",
                          background:"#fee2e2", color:"#dc2626", fontWeight:600, fontSize:12, cursor:"pointer" }}>Delete</button>
                      </div>
                    </td>
                  </tr>
                  {isEditing && (
                    <tr>
                      <td colSpan={8} style={{ padding:"0 0 2px", background:"#f0fde8", borderBottom:"2px solid #0A1F44" }}>
                        <div style={{ padding:"16px 20px", display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr 1fr 2fr 1fr auto", gap:10, alignItems:"end" }}>
                          <div>
                            <label style={lblStyle}>CONFERENCE</label>
                            <select value={editForm.conference ?? ""} onChange={e => setEditForm(f => ({...f, conference:e.target.value}))} style={inp}>
                              <option value="">— Select —</option>
                              {confNames.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </div>
                          <div>
                            <label style={lblStyle}>LEAGUE</label>
                            <select value={editForm.league ?? ""} onChange={e => setEditForm(f => ({...f, league:e.target.value}))} style={inp}>
                              <option value="">— Select —</option>
                              {leagueNames.map(l => <option key={l} value={l}>{l}</option>)}
                            </select>
                          </div>
                          <div>
                            <label style={lblStyle}>GENDER</label>
                            <select value={editForm.gender ?? "mens"} onChange={e => setEditForm(f => ({...f, gender:e.target.value}))} style={inp}>
                              <option value="mens">Men's</option>
                              <option value="womens">Women's</option>
                            </select>
                          </div>
                          <div>
                            <label style={lblStyle}>CONTACT NAME</label>
                            <input value={editForm.contactName ?? ""} onChange={e => setEditForm(f => ({...f, contactName:e.target.value}))} style={inp} />
                          </div>
                          <div>
                            <label style={lblStyle}>TITLE</label>
                            <input value={editForm.contactTitle ?? ""} onChange={e => setEditForm(f => ({...f, contactTitle:e.target.value}))} style={inp} />
                          </div>
                          <div>
                            <label style={lblStyle}>EMAIL</label>
                            <input value={editForm.email ?? ""} onChange={e => setEditForm(f => ({...f, email:e.target.value}))} style={inp} />
                          </div>
                          <div>
                            <label style={lblStyle}>PHONE</label>
                            <input value={editForm.phone ?? ""} onChange={e => setEditForm(f => ({...f, phone:e.target.value}))} style={inp} />
                          </div>
                          <button onClick={() => handleUpdate(ct.id)} style={{
                            padding:"8px 16px", borderRadius:8, border:"none", background:"#0A1F44",
                            color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer", alignSelf:"end" }}>Save</button>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
        {contacts.length === 0 && (
          <div style={{ padding:40, textAlign:"center", color:"#94a3b8" }}>No conference contacts yet. Add one above.</div>
        )}
      </div>
    </div>
  );
}
