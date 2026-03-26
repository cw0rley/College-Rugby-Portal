import React, { useState } from "react";
import { collection, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "../../firebase.js";
import { logChange } from "../../utils/changelog.js";

export default function AdminConferences({ conferences, onRefresh, userEmail }) {
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [newForm, setNewForm] = useState({ conference:"", fullName:"", notes:"" });
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

  async function handleAdd() {
    if (!newForm.conference.trim()) return;
    setSaving(true);
    const ref = await addDoc(collection(db, "conferences"), { ...newForm });
    await logChange("add", "conferences", ref.id, { ...newForm }, userEmail);
    localStorage.removeItem("crp_cache_v5");
    setNewForm({ conference:"", fullName:"", notes:"" });
    setSaving(false); onRefresh();
  }
  async function handleUpdate(id) {
    await updateDoc(doc(db, "conferences", id), editForm);
    await logChange("update", "conferences", id, editForm, userEmail);
    localStorage.removeItem("crp_cache_v5");
    setEditingId(null); onRefresh();
  }
  async function handleDeleteConf(id) {
    const deleted = conferences.find(c => c.id === id);
    await deleteDoc(doc(db, "conferences", id));
    await logChange("delete", "conferences", id, deleted || {}, userEmail);
    localStorage.removeItem("crp_cache_v5");
    onRefresh();
  }

  return (
    <div>
      <div style={{ background:"#fff", borderRadius:12, padding:20, marginBottom:16, border:"1px solid #E5E7EB" }}>
        <div style={{ fontWeight:700, fontSize:13, color:"#0A1F44", marginBottom:12 }}>Add Conference</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 2fr 2fr", gap:10, marginBottom:10 }}>
          <div>
            <label style={lblStyle}>ABBR *</label>
            <input value={newForm.conference} onChange={e => setNewForm(f => ({...f, conference:e.target.value}))} style={inp} />
          </div>
          <div>
            <label style={lblStyle}>FULL NAME</label>
            <input value={newForm.fullName} onChange={e => setNewForm(f => ({...f, fullName:e.target.value}))} style={inp} />
          </div>
          <div>
            <label style={lblStyle}>NOTES</label>
            <input value={newForm.notes} onChange={e => setNewForm(f => ({...f, notes:e.target.value}))} style={inp} placeholder="Optional notes..." />
          </div>
        </div>
        <button onClick={handleAdd} disabled={saving || !newForm.conference.trim()} style={{
          padding:"8px 18px", borderRadius:8, border:"none", background:"#0A1F44",
          color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer" }}>
          + Add Conference
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
              {[["Abbr","conference"],["Full Name","fullName"],["Notes","notes"],["Actions",null]].map(([h, col]) => (
                <th key={h} onClick={col ? () => handleSort(col) : undefined} style={{ padding:"10px 14px", textAlign:"left", fontSize:11,
                  fontWeight:700, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.05em",
                  cursor: col ? "pointer" : "default", userSelect: col ? "none" : undefined,
                }}>{h} {col && sortCol === col ? (sortDir === "asc" ? "\u25B2" : "\u25BC") : ""}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(sortCol ? [...conferences].filter(c => {
              if (!filterText) return true;
              const q = filterText.toLowerCase();
              return (c.conference || "").toLowerCase().includes(q) ||
                (c.fullName || "").toLowerCase().includes(q) ||
                (c.notes || "").toLowerCase().includes(q);
            }).sort((a, b) => {
              const av = a[sortCol], bv = b[sortCol];
              if (av == null && bv == null) return 0;
              if (av == null) return 1;
              if (bv == null) return -1;
              const cmp = typeof av === "number" ? av - bv : String(av).localeCompare(String(bv));
              return sortDir === "asc" ? cmp : -cmp;
            }) : conferences.filter(c => {
              if (!filterText) return true;
              const q = filterText.toLowerCase();
              return (c.conference || "").toLowerCase().includes(q) ||
                (c.fullName || "").toLowerCase().includes(q) ||
                (c.notes || "").toLowerCase().includes(q);
            })).map(c => {
              const isEditing = editingId === c.id;
              return (
                <React.Fragment key={c.id}>
                  <tr style={{ borderBottom: isEditing ? "none" : "1px solid #f1f5f9", background: isEditing ? "#f0fde8" : "" }}>
                    <td style={{ padding:"10px 14px", fontWeight:600, color:"#0A1F44" }}>{c.conference}</td>
                    <td style={{ padding:"10px 14px", color:"#475569" }}>{c.fullName || "—"}</td>
                    <td style={{ padding:"10px 14px", color:"#64748b", fontSize:12 }}>{c.notes || "—"}</td>
                    <td style={{ padding:"10px 14px" }}>
                      <div style={{ display:"flex", gap:8 }}>
                        <button onClick={() => { setEditingId(isEditing ? null : c.id); setEditForm({...c}); }} style={{
                          padding:"5px 12px", borderRadius:6, border:"1px solid #E5E7EB",
                          background: isEditing ? "#f0fde8" : "#fff", color:"#0A1F44", fontWeight:600, fontSize:12, cursor:"pointer" }}>
                          {isEditing ? "Cancel" : "Edit"}
                        </button>
                        <button onClick={() => handleDeleteConf(c.id)} style={{
                          padding:"5px 12px", borderRadius:6, border:"none",
                          background:"#fee2e2", color:"#dc2626", fontWeight:600, fontSize:12, cursor:"pointer" }}>Delete</button>
                      </div>
                    </td>
                  </tr>
                  {isEditing && (
                    <tr>
                      <td colSpan={4} style={{ padding:"0 0 2px", background:"#f0fde8", borderBottom:"2px solid #0A1F44" }}>
                        <div style={{ padding:"16px 20px", display:"grid", gridTemplateColumns:"1fr 2fr 2fr auto", gap:10, alignItems:"end" }}>
                          <div>
                            <label style={lblStyle}>ABBR</label>
                            <input value={editForm.conference ?? ""} onChange={e => setEditForm(f => ({...f, conference:e.target.value}))} style={inp} />
                          </div>
                          <div>
                            <label style={lblStyle}>FULL NAME</label>
                            <input value={editForm.fullName ?? ""} onChange={e => setEditForm(f => ({...f, fullName:e.target.value}))} style={inp} />
                          </div>
                          <div>
                            <label style={lblStyle}>NOTES</label>
                            <input value={editForm.notes ?? ""} onChange={e => setEditForm(f => ({...f, notes:e.target.value}))} style={inp} />
                          </div>
                          <button onClick={() => handleUpdate(c.id)} style={{
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
      </div>
    </div>
  );
}
