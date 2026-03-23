import React, { useState } from "react";

export default function ProgramForm({ initial, onSave, onCancel, leagues = [], conferences = [], schoolTypes = [] }) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    const data = { ...form };
    ["gpa","sat","acceptanceRate","enrollment","inStateTuition","outStateTuition","rugbyRanking"]
      .forEach(k => { if (data[k] !== "" && data[k] != null) data[k] = Number(data[k]); else delete data[k]; });
    await onSave(data);
    setSaving(false);
  }

  const inp = { padding:"8px 10px", borderRadius:8, border:"1px solid #E5E7EB",
    fontSize:13, width:"100%", boxSizing:"border-box" };
  const lbl = { fontSize:11, fontWeight:700, color:"#64748b",
    textTransform:"uppercase", letterSpacing:"0.04em", display:"block", marginBottom:4 };
  const group = (label, key, type="text", extra={}) => (
    <div>
      <label style={lbl}>{label}</label>
      <input type={type} value={form[key] ?? ""} onChange={e => set(key, e.target.value)}
        style={inp} {...extra} />
    </div>
  );
  const dropdown = (label, key, options) => (
    <div>
      <label style={lbl}>{label}</label>
      <select value={form[key] ?? ""} onChange={e => set(key, e.target.value)} style={inp}>
        <option value="">— Select —</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );

  const filteredConferences = conferences.map(c => c.name);

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
        <div style={{ gridColumn:"1/-1" }}>
          <label style={lbl}>School Name *</label>
          <input required value={form.school} onChange={e => set("school", e.target.value)} style={inp} />
        </div>
        {group("City","city")} {group("State","state")}
        <div>
          <label style={lbl}>Gender</label>
          <select value={form.gender} onChange={e => set("gender", e.target.value)} style={inp}>
            <option value="mens">Men's</option>
            <option value="womens">Women's</option>
          </select>
        </div>
        <div>
          <label style={lbl}>League</label>
          <select value={form.league ?? ""} onChange={e => set("league", e.target.value)} style={inp}>
            <option value="">— Select —</option>
            {leagues.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <div>
          <label style={lbl}>Conference</label>
          <select value={form.conference ?? ""} onChange={e => set("conference", e.target.value)} style={inp}>
            <option value="">— Select —</option>
            {filteredConferences.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        {group("NCAA Division","ncaaDivision")}
        {dropdown("School Type","schoolType", schoolTypes)}
        {group("Top Programs","topPrograms")}
      </div>

      <div style={{ fontWeight:700, fontSize:12, color:"#94a3b8", textTransform:"uppercase",
        letterSpacing:"0.06em", margin:"16px 0 10px" }}>📚 Academics</div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:12 }}>
        {group("Avg GPA","gpa","number")} {group("Avg SAT","sat","number")}
        {group("Acceptance %","acceptanceRate","number")} {group("Enrollment","enrollment","number")}
      </div>

      <div style={{ fontWeight:700, fontSize:12, color:"#94a3b8", textTransform:"uppercase",
        letterSpacing:"0.06em", margin:"16px 0 10px" }}>💰 Tuition</div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
        {group("In-State Tuition","inStateTuition","number")}
        {group("Out-of-State Tuition","outStateTuition","number")}
      </div>

      <div style={{ fontWeight:700, fontSize:12, color:"#94a3b8", textTransform:"uppercase",
        letterSpacing:"0.06em", margin:"16px 0 10px" }}>🏉 Rugby</div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginBottom:12 }}>
        {group("National Ranking","rugbyRanking","number")}
        <div style={{ display:"flex", flexDirection:"column", gap:10, paddingTop:20 }}>
          <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", fontSize:13 }}>
            <input type="checkbox" checked={!!form.rugbyScholarship}
              onChange={e => set("rugbyScholarship", e.target.checked)} style={{ width:16, height:16 }} />
            Rugby Scholarship
          </label>
          <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", fontSize:13 }}>
            <input type="checkbox" checked={!!form.schoolFunded}
              onChange={e => set("schoolFunded", e.target.checked)} style={{ width:16, height:16 }} />
            School Funded
          </label>
        </div>
      </div>

      <div style={{ fontWeight:700, fontSize:12, color:"#94a3b8", textTransform:"uppercase",
        letterSpacing:"0.06em", margin:"16px 0 10px" }}>📬 Websites</div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
        {group("School Website","website","url")}
        {group("Rugby Website","rugbyWebsite","url")}
      </div>

      <div style={{ fontWeight:700, fontSize:12, color:"#94a3b8", textTransform:"uppercase",
        letterSpacing:"0.06em", margin:"16px 0 10px" }}>📝 Notes</div>
      <div style={{ marginBottom:24 }}>
        <textarea value={form.notes ?? ""} onChange={e => set("notes", e.target.value)}
          placeholder="Additional notes about this program..."
          rows={3} style={{ ...inp, resize:"vertical" }} />
      </div>

      <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
        <button type="button" onClick={onCancel} style={{
          padding:"9px 20px", borderRadius:8, border:"1px solid #E5E7EB",
          background:"#fff", color:"#475569", fontWeight:600, fontSize:14, cursor:"pointer" }}>
          Cancel
        </button>
        <button type="submit" disabled={saving} style={{
          padding:"9px 24px", borderRadius:8, border:"none",
          background: saving ? "#E5E7EB" : "#0A1F44",
          color:"#fff", fontWeight:700, fontSize:14, cursor: saving ? "default" : "pointer" }}>
          {saving ? "Saving..." : "Save Program"}
        </button>
      </div>
    </form>
  );
}
