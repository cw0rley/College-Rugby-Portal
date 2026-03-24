import React, { useState } from "react";
import { collection, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "../../firebase.js";
import { logChange } from "../../utils/changelog.js";

export default function AdminLeagues({ leagues, onRefresh, userEmail }) {
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const inp = { padding:"8px 12px", borderRadius:8, border:"1px solid #E5E7EB", fontSize:13 };

  async function handleAdd() {
    if (!newName.trim()) return;
    setSaving(true);
    const ref = await addDoc(collection(db, "leagues"), { name: newName.trim() });
    await logChange("add", "leagues", ref.id, { name: newName.trim() }, userEmail);
    localStorage.removeItem("crp_cache_v4");
    setNewName(""); setSaving(false); onRefresh();
  }
  async function handleUpdate(id) {
    await updateDoc(doc(db, "leagues", id), { name: editName.trim() });
    await logChange("update", "leagues", id, { name: editName.trim() }, userEmail);
    localStorage.removeItem("crp_cache_v4");
    setEditingId(null); onRefresh();
  }
  async function handleDeleteLeague(id) {
    const deleted = leagues.find(l => l.id === id);
    await deleteDoc(doc(db, "leagues", id));
    await logChange("delete", "leagues", id, deleted || {}, userEmail);
    localStorage.removeItem("crp_cache_v4");
    onRefresh();
  }

  return (
    <div>
      <div style={{ display:"flex", gap:8, marginBottom:20 }}>
        <input value={newName} onChange={e => setNewName(e.target.value)}
          placeholder="New league name..." style={{ ...inp, flex:1 }} />
        <button onClick={handleAdd} disabled={saving || !newName.trim()} style={{
          padding:"8px 16px", borderRadius:8, border:"none", background:"#0A1F44",
          color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer" }}>
          + Add League
        </button>
      </div>
      <div style={{ background:"#fff", borderRadius:12, border:"1px solid #E5E7EB" }}>
        {leagues.map((l, i) => (
          <div key={l.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 16px",
            borderBottom: i < leagues.length - 1 ? "1px solid #f1f5f9" : "none" }}>
            {editingId === l.id ? (
              <>
                <input value={editName} onChange={e => setEditName(e.target.value)}
                  style={{ ...inp, flex:1 }} />
                <button onClick={() => handleUpdate(l.id)} style={{
                  padding:"5px 12px", borderRadius:6, border:"none", background:"#0A1F44",
                  color:"#fff", fontWeight:600, fontSize:12, cursor:"pointer" }}>Save</button>
                <button onClick={() => setEditingId(null)} style={{
                  padding:"5px 12px", borderRadius:6, border:"1px solid #E5E7EB",
                  background:"#fff", color:"#475569", fontWeight:600, fontSize:12, cursor:"pointer" }}>Cancel</button>
              </>
            ) : (
              <>
                <span style={{ flex:1, fontWeight:600, color:"#0A1F44", fontSize:14 }}>{l.name}</span>
                <button onClick={() => { setEditingId(l.id); setEditName(l.name); }} style={{
                  padding:"5px 12px", borderRadius:6, border:"1px solid #E5E7EB",
                  background:"#fff", color:"#0A1F44", fontWeight:600, fontSize:12, cursor:"pointer" }}>Edit</button>
                <button onClick={() => handleDeleteLeague(l.id)} style={{
                  padding:"5px 12px", borderRadius:6, border:"none",
                  background:"#fee2e2", color:"#dc2626", fontWeight:600, fontSize:12, cursor:"pointer" }}>Delete</button>
              </>
            )}
          </div>
        ))}
        {leagues.length === 0 && (
          <div style={{ padding:40, textAlign:"center", color:"#94a3b8" }}>No leagues yet. Add one above.</div>
        )}
      </div>
    </div>
  );
}
