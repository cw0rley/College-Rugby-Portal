import React, { useState, useEffect } from "react";
import { collection, getDocs, query, where, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { signInWithPopup, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged } from "firebase/auth";
import { db, auth, googleProvider } from "../../firebase.js";
import { EMPTY_PROGRAM, CONF_COLS, CONF_CONTACT_COLS, LEAGUE_COLS, PROG_CONTACT_COLS } from "../../constants.js";
import { exportCSV, parseCSV, exportGenericCSV, parseGenericCSV } from "../../utils/csv.js";
import { logChange } from "../../utils/changelog.js";
import ProgramForm from "./ProgramForm.jsx";
import AdminLeagues from "./AdminLeagues.jsx";
import AdminConferences from "./AdminConferences.jsx";
import AdminConferenceContacts from "./AdminConferenceContacts.jsx";
import AdminProgramContacts from "./AdminProgramContacts.jsx";
import AdminChangelog from "./AdminChangelog.jsx";

export default function AdminPage() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [formMode, setFormMode] = useState(null);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [importPreview, setImportPreview] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importStats, setImportStats] = useState(null);
  const [adminTab, setAdminTab] = useState("programs");
  const [leaguesList, setLeaguesList] = useState([]);
  const [conferencesList, setConferencesList] = useState([]);
  const [confContactsList, setConfContactsList] = useState([]);
  const [progContactsList, setProgContactsList] = useState([]);

  useEffect(() => {
    getRedirectResult(auth).catch(() => {});
    return onAuthStateChanged(auth, u => { setUser(u); setAuthLoading(false); });
  }, []);

  function loadPrograms() {
    setLoading(true);
    getDocs(collection(db, "programs")).then(snap => {
      setPrograms(snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a,b) => (a.school||"").localeCompare(b.school||"")));
      setLoading(false);
    });
  }

  function loadLeagues() {
    getDocs(collection(db, "leagues")).then(snap =>
      setLeaguesList(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => a.name.localeCompare(b.name)))
    );
  }

  function loadConferences() {
    getDocs(collection(db, "conferences")).then(snap =>
      setConferencesList(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => (a.conference||"").localeCompare(b.conference||"")))
    );
  }

  function loadConfContacts() {
    getDocs(collection(db, "conferenceContacts")).then(snap =>
      setConfContactsList(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => (a.conference||"").localeCompare(b.conference||"")))
    );
  }

  function loadProgContacts() {
    getDocs(collection(db, "programContacts")).then(snap =>
      setProgContactsList(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
  }

  useEffect(() => {
    if (user) { loadPrograms(); loadLeagues(); loadConferences(); loadConfContacts(); loadProgContacts(); }
  }, [user]);

  async function handleSave(data) {
    if (formMode === "add") {
      const ref = await addDoc(collection(db, "programs"), data);
      await logChange("add", "programs", ref.id, data, user.email);
    } else {
      await updateDoc(doc(db, "programs", editing.id), data);
      await logChange("update", "programs", editing.id, data, user.email);
    }
    localStorage.removeItem("crp_cache_v4");
    setFormMode(null); setEditing(null);
    loadPrograms();
  }

  async function handleDelete() {
    setDeleting(true);
    // Cascade-delete associated program contacts
    const contactSnap = await getDocs(query(collection(db, "programContacts"), where("programId", "==", deleteTarget.id)));
    await Promise.all(contactSnap.docs.map(d => {
      logChange("delete", "programContacts", d.id, d.data(), user.email);
      return deleteDoc(d.ref);
    }));
    await deleteDoc(doc(db, "programs", deleteTarget.id));
    await logChange("delete", "programs", deleteTarget.id, deleteTarget, user.email);
    localStorage.removeItem("crp_cache_v4");
    setDeleteTarget(null); setDeleting(false);
    loadPrograms(); loadProgContacts();
  }

  function handleImportFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      const text = evt.target.result;
      const rows = adminTab === "programs" ? parseCSV(text)
        : adminTab === "conferences" ? parseGenericCSV(text, CONF_COLS)
        : adminTab === "confContacts" ? parseGenericCSV(text, CONF_CONTACT_COLS)
        : adminTab === "progContacts" ? parseGenericCSV(text, PROG_CONTACT_COLS)
        : parseGenericCSV(text, LEAGUE_COLS);
      setImportPreview(rows);
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  async function handleImportConfirm() {
    setImporting(true);
    setImportProgress(0);
    const colName = adminTab === "programs" ? "programs"
      : adminTab === "conferences" ? "conferences"
      : adminTab === "confContacts" ? "conferenceContacts"
      : adminTab === "progContacts" ? "programContacts" : "leagues";
    const reload = adminTab === "programs" ? loadPrograms
      : adminTab === "conferences" ? loadConferences
      : adminTab === "confContacts" ? loadConfContacts
      : adminTab === "progContacts" ? loadProgContacts : loadLeagues;

    // For progContacts CSV import, resolve school+gender to programId
    const progLookup = {};
    if (adminTab === "progContacts") {
      programs.forEach(p => {
        progLookup[`${(p.school||"").toLowerCase()}|${(p.gender||"").toLowerCase()}`] = p.id;
      });
    }

    function matchKey(row) {
      if (colName === "programs") return `${(row.school||"").toLowerCase()}|${(row.gender||"").toLowerCase()}`;
      if (colName === "conferences") return (row.conference||"").toLowerCase();
      if (colName === "conferenceContacts") return `${(row.conference||"").toLowerCase()}|${(row.league||"").toLowerCase()}|${(row.gender||"").toLowerCase()}`;
      if (colName === "programContacts") return `${(row.programId||"").toLowerCase()}|${(row.contact||"").toLowerCase()}|${(row.email||"").toLowerCase()}`;
      return (row.name||"").toLowerCase();
    }

    // Build a lookup of existing records — skip if collection read fails
    const existingByKey = {};
    const existingDataById = {};
    try {
      const snap = await Promise.race([
        getDocs(collection(db, colName)),
        new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 10000)),
      ]);
      snap.docs.forEach(d => {
        const r = { id: d.id, ...d.data() };
        existingByKey[matchKey(r)] = r.id;
        existingDataById[r.id] = r;
      });
    } catch (err) {
      console.warn("Could not fetch existing records for upsert, all rows will be added:", err);
    }

    let added = 0, updated = 0, skipped = 0;
    try {
      const BATCH_SIZE = 20;
      for (let i = 0; i < importPreview.length; i += BATCH_SIZE) {
        const batch = importPreview.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map(row => {
          // For progContacts CSV, resolve school+gender to programId
          if (adminTab === "progContacts" && !row.programId) {
            const pid = progLookup[`${(row.school||"").toLowerCase()}|${(row.gender||"").toLowerCase()}`];
            if (!pid) { console.warn("Skipping contact — no matching program:", row.school, row.gender); return Promise.resolve(); }
            row = { programId: pid, contact: row.contact || "", contactTitle: row.contactTitle || "", email: row.email || "" };
          }
          // Strip undefined values — Firestore rejects them
          const clean = Object.fromEntries(Object.entries(row).filter(([, v]) => v !== undefined));
          const key = matchKey(clean);
          const existingId = existingByKey[key];
          if (existingId) {
            // Check if anything actually changed
            const existing = existingDataById[existingId];
            const hasChanges = Object.keys(clean).some(k => {
              const oldVal = existing[k];
              const newVal = clean[k];
              if (oldVal === undefined && (newVal === "" || newVal === null)) return false;
              return String(oldVal ?? "") !== String(newVal ?? "");
            });
            if (!hasChanges) { skipped++; return Promise.resolve(); }
            updated++;
            return updateDoc(doc(db, colName, existingId), clean).then(() =>
              logChange("update", colName, existingId, clean, user.email));
          } else {
            added++;
            return addDoc(collection(db, colName), clean).then(ref =>
              logChange("add", colName, ref.id, clean, user.email));
          }
        }));
        setImportProgress(Math.min(i + BATCH_SIZE, importPreview.length));
      }
    } catch (err) {
      console.error("Import error:", err);
    }
    if (skipped > 0) console.log(`Import: skipped ${skipped} unchanged rows`);
    localStorage.removeItem("crp_cache_v4");
    setImporting(false);
    setImportPreview(null);
    setImportStats({ added, updated });
    reload();
  }

  if (authLoading) return <div style={{ padding:40, textAlign:"center", color:"#64748b" }}>Loading...</div>;

  if (!user) return (
    <div style={{ maxWidth:400, margin:"60px auto", textAlign:"center",
      background:"#fff", borderRadius:16, padding:40,
      boxShadow:"0 1px 3px rgba(0,0,0,0.08)", border:"1px solid #E5E7EB" }}>
      <img src="/logo-icon.svg" alt="College Rugby Portal" style={{ width:56, height:56 }} />
      <h2 style={{ margin:"16px 0 8px", color:"#0A1F44" }}>Admin Login</h2>
      <p style={{ color:"#64748b", fontSize:14, marginBottom:24 }}>
        Sign in with your Google account to manage programs.
      </p>
      <button onClick={() => signInWithPopup(auth, googleProvider).catch(() => signInWithRedirect(auth, googleProvider))} style={{
        display:"inline-flex", alignItems:"center", gap:10, padding:"11px 24px",
        borderRadius:8, border:"1px solid #E5E7EB", background:"#fff",
        fontWeight:700, fontSize:14, cursor:"pointer", boxShadow:"0 1px 3px rgba(0,0,0,0.08)" }}>
        <svg width="18" height="18" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Sign in with Google
      </button>
    </div>
  );

  const filtered = programs.filter(p =>
    !search || p.school?.toLowerCase().includes(search.toLowerCase()) ||
    p.state?.toLowerCase().includes(search.toLowerCase()) ||
    p.conference?.toLowerCase().includes(search.toLowerCase())
  );

  const adminLeagues = leaguesList.map(l => l.name);
  const adminConferences = conferencesList.map(c => ({ name: c.conference }));
  const adminSchoolTypes = [...new Set(programs.map(p => p.schoolType).filter(Boolean))].sort();

  return (
    <div>
      {/* Admin header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
        marginBottom:20, flexWrap:"wrap", gap:12 }}>
        <div>
          <h2 style={{ margin:"0 0 4px", fontSize:20, color:"#0A1F44" }}>Admin</h2>
          <div style={{ fontSize:13, color:"#64748b" }}>{programs.length} total programs</div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ fontSize:13, color:"#64748b" }}>
            Signed in as <strong>{user.email}</strong>
          </div>
          {adminTab !== "changelog" && <><button onClick={() => {
            if (adminTab === "programs") exportCSV(programs, "programs-backup.csv");
            else if (adminTab === "conferences") exportGenericCSV(CONF_COLS, conferencesList, "conferences-backup.csv");
            else if (adminTab === "confContacts") exportGenericCSV(CONF_CONTACT_COLS, confContactsList, "conference-contacts-backup.csv");
            else if (adminTab === "progContacts") {
              // Export with school+gender instead of programId for readability
              const progMap = Object.fromEntries(programs.map(p => [p.id, p]));
              const rows = progContactsList.map(c => {
                const p = progMap[c.programId] || {};
                return { school: p.school||"", gender: p.gender||"", contact: c.contact, contactTitle: c.contactTitle, email: c.email };
              });
              exportGenericCSV(PROG_CONTACT_COLS, rows, "program-contacts-backup.csv");
            }
            else exportGenericCSV(LEAGUE_COLS, leaguesList, "leagues-backup.csv");
          }} style={{
            padding:"7px 14px", borderRadius:8, border:"1px solid #E5E7EB",
            background:"#fff", color:"#475569", fontWeight:600, fontSize:13, cursor:"pointer" }}>
            ⬇ Export {({programs:"Programs",conferences:"Conferences",confContacts:"Conf. Contacts",progContacts:"Prog. Contacts",leagues:"Leagues"})[adminTab]}
          </button>
          <label style={{
            padding:"7px 14px", borderRadius:8, border:"1px solid #E5E7EB",
            background:"#fff", color:"#475569", fontWeight:600, fontSize:13, cursor:"pointer" }}>
            ⬆ Import {({programs:"Programs",conferences:"Conferences",confContacts:"Conf. Contacts",progContacts:"Prog. Contacts",leagues:"Leagues"})[adminTab]}
            <input type="file" accept=".csv" onChange={handleImportFile} style={{ display:"none" }} />
          </label></>}
          <button onClick={() => signOut(auth)} style={{
            padding:"7px 14px", borderRadius:8, border:"1px solid #E5E7EB",
            background:"#fff", color:"#475569", fontWeight:600, fontSize:13, cursor:"pointer" }}>
            Sign Out
          </button>
          <button onClick={() => { setEditing(null); setFormMode("add"); }} style={{
            padding:"8px 18px", borderRadius:8, border:"none", background:"#0A1F44",
            color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer" }}>
            + Add Program
          </button>
        </div>
      </div>

      {/* Admin tabs */}
      <div style={{ display:"flex", gap:8, marginBottom:20 }}>
        {[["programs","Programs"],["progContacts","Prog. Contacts"],["confContacts","Conf. Contacts"],["conferences","Conferences"],["leagues","Leagues"],["changelog","Changelog"]].map(([key, label]) => (
          <button key={key} onClick={() => setAdminTab(key)} style={{
            padding:"9px 20px", borderRadius:10, border:"none", cursor:"pointer",
            fontWeight:600, fontSize:14,
            background: adminTab === key ? "#0A1F44" : "#fff",
            color: adminTab === key ? "#fff" : "#475569",
            boxShadow: adminTab === key ? "0 4px 12px rgba(26,86,219,0.3)" : "0 1px 3px rgba(0,0,0,0.08)",
          }}>{label}</button>
        ))}
      </div>

      {/* Delete confirmation */}
      {deleteTarget && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:2000,
          display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ background:"#fff", borderRadius:12, padding:28, maxWidth:400, width:"100%",
            margin:20, boxShadow:"0 20px 60px rgba(0,0,0,0.3)" }}>
            <h3 style={{ margin:"0 0 12px", color:"#0A1F44" }}>Delete Program?</h3>
            <p style={{ margin:"0 0 20px", color:"#475569", fontSize:14 }}>
              Are you sure you want to delete <strong>{deleteTarget.school}</strong>? This cannot be undone.
            </p>
            <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
              <button onClick={() => setDeleteTarget(null)} style={{
                padding:"8px 18px", borderRadius:8, border:"1px solid #E5E7EB",
                background:"#fff", color:"#475569", fontWeight:600, cursor:"pointer" }}>
                Cancel
              </button>
              <button onClick={handleDelete} disabled={deleting} style={{
                padding:"8px 18px", borderRadius:8, border:"none",
                background:"#dc2626", color:"#fff", fontWeight:700, cursor:"pointer" }}>
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import confirmation modal */}
      {importPreview && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:2000,
          display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ background:"#fff", borderRadius:12, padding:28, maxWidth:440, width:"100%",
            margin:20, boxShadow:"0 20px 60px rgba(0,0,0,0.3)" }}>
            <h3 style={{ margin:"0 0 12px", color:"#0A1F44" }}>Confirm Import</h3>
            <p style={{ margin:"0 0 8px", color:"#475569", fontSize:14 }}>
              <strong>{importPreview.length} records</strong> parsed from CSV.
              Existing matches will be <strong>overwritten</strong>; new records will be added.
            </p>
            <div style={{ fontSize:12, color:"#64748b", marginBottom:8, padding:"6px 10px",
              background:"#f8fafc", borderRadius:6, border:"1px solid #E5E7EB" }}>
              Match key: {adminTab === "programs" ? "School + Gender" : adminTab === "conferences" ? "Abbreviation" : "Name"}
            </div>
            {importPreview.slice(0, 5).map((p, i) => (
              <div key={i} style={{ fontSize:12, color:"#64748b", padding:"4px 0",
                borderBottom:"1px solid #f1f5f9" }}>
                {p.school} — {p.state} — {p.gender}
              </div>
            ))}
            {importPreview.length > 5 && (
              <div style={{ fontSize:12, color:"#94a3b8", padding:"4px 0" }}>
                …and {importPreview.length - 5} more
              </div>
            )}
            {importing && (
              <div style={{ margin:"16px 0 0", fontSize:13, color:"#0A1F44" }}>
                Importing {importProgress} / {importPreview.length}...
              </div>
            )}
            <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:20 }}>
              <button onClick={() => setImportPreview(null)} disabled={importing} style={{
                padding:"8px 18px", borderRadius:8, border:"1px solid #E5E7EB",
                background:"#fff", color:"#475569", fontWeight:600, cursor:"pointer" }}>
                Cancel
              </button>
              <button onClick={handleImportConfirm} disabled={importing} style={{
                padding:"8px 18px", borderRadius:8, border:"none",
                background: importing ? "#E5E7EB" : "#0A1F44",
                color:"#fff", fontWeight:700, cursor:"pointer" }}>
                {importing ? "Importing..." : `Import ${importPreview.length} Records`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import results banner */}
      {importStats && (
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
          gap:12, background:"#ecfdf5", border:"1px solid #bbf7d0",
          borderRadius:10, padding:"12px 16px", marginBottom:16 }}>
          <div style={{ fontSize:13, color:"#065f46" }}>
            Import complete: <strong>{importStats.updated} updated</strong>, <strong>{importStats.added} added</strong>
          </div>
          <button onClick={() => setImportStats(null)} style={{
            background:"none", border:"none", fontSize:16, cursor:"pointer",
            color:"#065f46", lineHeight:1 }}>×</button>
        </div>
      )}

      {adminTab === "leagues" && (
        <AdminLeagues leagues={leaguesList} onRefresh={loadLeagues} userEmail={user.email} />
      )}

      {adminTab === "progContacts" && (
        <AdminProgramContacts contacts={progContactsList} programs={programs} onRefresh={loadProgContacts} userEmail={user.email} />
      )}

      {adminTab === "confContacts" && (
        <AdminConferenceContacts contacts={confContactsList} conferences={conferencesList} leagues={leaguesList} onRefresh={loadConfContacts} userEmail={user.email} />
      )}

      {adminTab === "conferences" && (
        <AdminConferences conferences={conferencesList} onRefresh={loadConferences} userEmail={user.email} />
      )}

      {adminTab === "changelog" && <AdminChangelog />}

      {adminTab === "programs" && (
        <>
          {formMode === "add" && (
            <div style={{ background:"#fff", borderRadius:12, padding:28, marginBottom:20,
              border:"1px solid #E5E7EB", boxShadow:"0 1px 3px rgba(0,0,0,0.06)" }}>
              <h3 style={{ margin:"0 0 20px", fontSize:16, color:"#0A1F44" }}>Add New Program</h3>
              <ProgramForm
                initial={EMPTY_PROGRAM}
                onSave={handleSave}
                onCancel={() => setFormMode(null)}
                leagues={adminLeagues}
                conferences={adminConferences}
                schoolTypes={adminSchoolTypes}
              />
            </div>
          )}

          <div style={{ marginBottom:14 }}>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search programs..."
              style={{ padding:"9px 14px", borderRadius:8, border:"1px solid #E5E7EB",
                fontSize:13, width:280, boxSizing:"border-box" }} />
          </div>

          {loading ? (
            <div style={{ padding:40, textAlign:"center", color:"#64748b" }}>Loading programs...</div>
          ) : (
            <div style={{ background:"#fff", borderRadius:12, border:"1px solid #E5E7EB",
              boxShadow:"0 1px 3px rgba(0,0,0,0.06)", overflow:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                <thead>
                  <tr style={{ background:"#f8fafc", borderBottom:"2px solid #E5E7EB" }}>
                    {["School","State","Gender","Conference","Scholarship","Actions"].map(h => (
                      <th key={h} style={{ padding:"10px 14px", textAlign:"left", fontSize:11,
                        fontWeight:700, color:"#64748b", textTransform:"uppercase",
                        letterSpacing:"0.05em", whiteSpace:"nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(p => {
                    const isEditing = formMode === "edit" && editing?.id === p.id;
                    return (
                      <React.Fragment key={p.id}>
                        <tr style={{ borderBottom: isEditing ? "none" : "1px solid #f1f5f9",
                          background: isEditing ? "#eff6ff" : "" }}
                          onMouseEnter={e => { if (!isEditing) e.currentTarget.style.background="#f8fafc"; }}
                          onMouseLeave={e => { if (!isEditing) e.currentTarget.style.background=""; }}>
                          <td style={{ padding:"10px 14px", fontWeight:600, color:"#0A1F44" }}>{p.school}</td>
                          <td style={{ padding:"10px 14px", color:"#475569" }}>{p.state}</td>
                          <td style={{ padding:"10px 14px", color:"#475569" }}>{p.gender === "mens" ? "Men's" : "Women's"}</td>
                          <td style={{ padding:"10px 14px", color:"#475569" }}>{p.conference || "—"}</td>
                          <td style={{ padding:"10px 14px" }}>{p.rugbyScholarship ? "✓" : ""}</td>
                          <td style={{ padding:"10px 14px" }}>
                            <div style={{ display:"flex", gap:8 }}>
                              <button onClick={() => { setEditing(p); setFormMode(isEditing ? null : "edit"); }} style={{
                                padding:"5px 12px", borderRadius:6, border:"1px solid #E5E7EB",
                                background: isEditing ? "#eff6ff" : "#fff",
                                color:"#0A1F44", fontWeight:600, fontSize:12, cursor:"pointer" }}>
                                {isEditing ? "Cancel" : "Edit"}
                              </button>
                              <button onClick={() => setDeleteTarget(p)} style={{
                                padding:"5px 12px", borderRadius:6, border:"none",
                                background:"#fee2e2", color:"#dc2626", fontWeight:600,
                                fontSize:12, cursor:"pointer" }}>Delete</button>
                            </div>
                          </td>
                        </tr>
                        {isEditing && (
                          <tr>
                            <td colSpan={6} style={{ padding:"0 0 2px", background:"#eff6ff",
                              borderBottom:"2px solid #0A1F44" }}>
                              <div style={{ padding:"20px 24px" }}>
                                <ProgramForm
                                  initial={{ ...EMPTY_PROGRAM, ...editing }}
                                  onSave={handleSave}
                                  onCancel={() => { setFormMode(null); setEditing(null); }}
                                  leagues={adminLeagues}
                                  conferences={adminConferences}
                                  schoolTypes={adminSchoolTypes}
                                />
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
        </>
      )}
    </div>
  );
}
