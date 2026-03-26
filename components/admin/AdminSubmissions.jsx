import React, { useState, useEffect } from "react";
import { collection, getDocs, updateDoc, addDoc, doc, orderBy, query, where } from "firebase/firestore";
import { db } from "../../firebase.js";
import { logChange } from "../../utils/changelog.js";

export default function AdminSubmissions({ userEmail, programs = [], onRefresh }) {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");
  const [expandedId, setExpandedId] = useState(null);
  const [acting, setActing] = useState(null);
  const [sortCol, setSortCol] = useState("");
  const [sortDir, setSortDir] = useState("asc");
  const [searchText, setSearchText] = useState("");

  function handleSort(col) {
    if (sortCol === col) { setSortDir(d => d === "asc" ? "desc" : "asc"); }
    else { setSortCol(col); setSortDir("asc"); }
  }

  function loadSubmissions() {
    setLoading(true);
    getDocs(query(collection(db, "submissions"), orderBy("submittedAt", "desc")))
      .then(snap => {
        setSubmissions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      })
      .catch(() => {
        getDocs(collection(db, "submissions")).then(snap => {
          const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          docs.sort((a, b) => {
            const ta = a.submittedAt?.toDate?.() || new Date(0);
            const tb = b.submittedAt?.toDate?.() || new Date(0);
            return tb - ta;
          });
          setSubmissions(docs);
          setLoading(false);
        });
      });
  }

  useEffect(() => { loadSubmissions(); }, []);

  async function handleApprove(sub) {
    setActing(sub.id);
    try {
      if (sub.requestType === "update") {
        // Find matching program by school name
        const match = programs.find(p =>
          p.school?.toLowerCase() === sub.school?.toLowerCase()
        );
        if (match) {
          // Update the program's contact info if provided
          if (sub.name || sub.email) {
            // Check if a contact already exists for this program with this email
            const existingSnap = await getDocs(query(
              collection(db, "programContacts"),
              where("programId", "==", match.id)
            ));
            const existingContact = existingSnap.docs.find(d =>
              d.data().email?.toLowerCase() === sub.email?.toLowerCase()
            );
            if (existingContact) {
              // Update existing contact
              const updates = {};
              if (sub.name) updates.contact = sub.name;
              if (sub.title) updates.contactTitle = sub.title;
              if (sub.email) updates.email = sub.email;
              await updateDoc(doc(db, "programContacts", existingContact.id), updates);
            } else if (sub.name || sub.email) {
              // Add new contact
              await addDoc(collection(db, "programContacts"), {
                programId: match.id,
                contact: sub.name || "",
                contactTitle: sub.title || "",
                email: sub.email || "",
              });
            }
          }
          // Apply details as notes if they contain useful info
          if (sub.details) {
            const existingNotes = match.notes || "";
            const newNote = `[Update ${new Date().toLocaleDateString()}] ${sub.details}`;
            await updateDoc(doc(db, "programs", match.id), {
              notes: existingNotes ? existingNotes + "\n\n" + newNote : newNote,
            });
          }
          await logChange("update", "programs", match.id, { approvedSubmission: sub.id, school: sub.school }, userEmail);
        }
      } else if (sub.requestType === "add") {
        // Create a new program with basic info from the submission
        const newProgram = {
          school: sub.school || "",
          gender: "mens",
          notes: sub.details || "",
        };
        const ref = await addDoc(collection(db, "programs"), newProgram);
        // Add submitter as contact if they provided info
        if (sub.name || sub.email) {
          await addDoc(collection(db, "programContacts"), {
            programId: ref.id,
            contact: sub.name || "",
            contactTitle: sub.title || "",
            email: sub.email || "",
          });
        }
        await logChange("add", "programs", ref.id, { approvedSubmission: sub.id, school: sub.school }, userEmail);
      }

      // Mark submission as approved
      await updateDoc(doc(db, "submissions", sub.id), { status: "approved" });
      await logChange("update", "submissions", sub.id, { status: "approved", school: sub.school }, userEmail);

      // Clear cache so main site picks up changes
      localStorage.removeItem("crp_cache_v5");
      loadSubmissions();
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error("Failed to approve submission:", err);
      alert("Error: " + err.message);
    }
    setActing(null);
  }

  async function handleReject(sub) {
    setActing(sub.id);
    try {
      await updateDoc(doc(db, "submissions", sub.id), { status: "rejected" });
      await logChange("update", "submissions", sub.id, { status: "rejected", school: sub.school }, userEmail);
      loadSubmissions();
    } catch (err) {
      console.error("Failed to reject submission:", err);
    }
    setActing(null);
  }

  const displayed = (filter === "all" ? submissions : submissions.filter(s => (s.status || "pending") === filter))
    .filter(s => {
      if (!searchText) return true;
      const q = searchText.toLowerCase();
      return (s.name || "").toLowerCase().includes(q) ||
        (s.school || "").toLowerCase().includes(q) ||
        (s.email || "").toLowerCase().includes(q) ||
        (s.details || "").toLowerCase().includes(q) ||
        (s.requestType || "").toLowerCase().includes(q);
    });

  const statusBadge = (status) => {
    const s = status || "pending";
    const colors = {
      pending: { bg: "#fef3c7", color: "#92400e", border: "#fde68a" },
      approved: { bg: "#dcfce7", color: "#166534", border: "#bbf7d0" },
      rejected: { bg: "#fee2e2", color: "#991b1b", border: "#fecaca" },
    };
    const c = colors[s] || colors.pending;
    return (
      <span style={{
        display: "inline-block", padding: "2px 10px", borderRadius: 20,
        fontSize: 11, fontWeight: 700, textTransform: "uppercase",
        background: c.bg, color: c.color, border: `1px solid ${c.border}`,
      }}>{s}</span>
    );
  };

  function formatDate(ts) {
    if (!ts) return "—";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {[["pending", "Pending Only"], ["all", "All Submissions"]].map(([key, label]) => (
          <button key={key} onClick={() => setFilter(key)} style={{
            padding: "7px 16px", borderRadius: 8, border: "1px solid #E5E7EB", cursor: "pointer",
            fontWeight: 600, fontSize: 13,
            background: filter === key ? "#0A1F44" : "#fff",
            color: filter === key ? "#fff" : "#475569",
          }}>{label}</button>
        ))}
        <input
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          placeholder="Filter..."
          style={{ padding:"9px 14px", borderRadius:8, border:"1px solid #E5E7EB",
            fontSize:13, width:300, boxSizing:"border-box" }}
        />
        <span style={{ fontSize: 13, color: "#64748b", alignSelf: "center", marginLeft: 8 }}>
          {displayed.length} submission{displayed.length !== 1 ? "s" : ""}
        </span>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>Loading submissions...</div>
      ) : displayed.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: "#94a3b8", background: "#fff",
          borderRadius: 12, border: "1px solid #E5E7EB" }}>
          No {filter === "pending" ? "pending " : ""}submissions found.
        </div>
      ) : (
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E5E7EB",
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)", overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "2px solid #E5E7EB" }}>
                {[["Date","submittedAt"],["Submitter","name"],["School","school"],["Type","requestType"],["Status","status"],["Actions",null]].map(([h, col]) => (
                  <th key={h} onClick={col ? () => handleSort(col) : undefined} style={{
                    padding: "10px 14px", textAlign: "left", fontSize: 11,
                    fontWeight: 700, color: "#64748b", textTransform: "uppercase",
                    letterSpacing: "0.05em", whiteSpace: "nowrap",
                    cursor: col ? "pointer" : "default", userSelect: col ? "none" : undefined,
                  }}>{h} {col && sortCol === col ? (sortDir === "asc" ? "\u25B2" : "\u25BC") : ""}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(sortCol ? [...displayed].sort((a, b) => {
                let av = a[sortCol], bv = b[sortCol];
                if (sortCol === "submittedAt") {
                  av = av?.toDate ? av.toDate() : av ? new Date(av) : null;
                  bv = bv?.toDate ? bv.toDate() : bv ? new Date(bv) : null;
                  if (av == null && bv == null) return 0;
                  if (av == null) return 1;
                  if (bv == null) return -1;
                  const cmp = av - bv;
                  return sortDir === "asc" ? cmp : -cmp;
                }
                if (sortCol === "status") { av = av || "pending"; bv = bv || "pending"; }
                if (av == null && bv == null) return 0;
                if (av == null) return 1;
                if (bv == null) return -1;
                const cmp = typeof av === "number" ? av - bv : String(av).localeCompare(String(bv));
                return sortDir === "asc" ? cmp : -cmp;
              }) : displayed).map(sub => {
                const isExpanded = expandedId === sub.id;
                const status = sub.status || "pending";
                const matchedProgram = programs.find(p => p.school?.toLowerCase() === sub.school?.toLowerCase());
                return (
                  <React.Fragment key={sub.id}>
                    <tr
                      style={{
                        borderBottom: isExpanded ? "none" : "1px solid #f1f5f9",
                        background: isExpanded ? "#eff6ff" : "",
                        cursor: "pointer",
                      }}
                      onClick={() => setExpandedId(isExpanded ? null : sub.id)}
                      onMouseEnter={e => { if (!isExpanded) e.currentTarget.style.background = "#f8fafc"; }}
                      onMouseLeave={e => { if (!isExpanded) e.currentTarget.style.background = ""; }}
                    >
                      <td style={{ padding: "10px 14px", color: "#475569", whiteSpace: "nowrap" }}>
                        {formatDate(sub.submittedAt)}
                      </td>
                      <td style={{ padding: "10px 14px", fontWeight: 600, color: "#0A1F44" }}>
                        {sub.name || "—"}
                      </td>
                      <td style={{ padding: "10px 14px", color: "#475569" }}>
                        {sub.school || "—"}
                        {sub.requestType === "update" && !matchedProgram && sub.school && (
                          <span style={{ fontSize: 10, color: "#dc2626", marginLeft: 6 }}>no match</span>
                        )}
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <span style={{
                          padding: "2px 8px", borderRadius: 12, fontSize: 11, fontWeight: 600,
                          background: sub.requestType === "add" ? "#dbeafe" : "#f3e8ff",
                          color: sub.requestType === "add" ? "#1d4ed8" : "#7c3aed",
                        }}>{sub.requestType === "add" ? "New" : "Update"}</span>
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        {statusBadge(status)}
                      </td>
                      <td style={{ padding: "10px 14px" }} onClick={e => e.stopPropagation()}>
                        {status === "pending" && (
                          <div style={{ display: "flex", gap: 8 }}>
                            <button
                              disabled={acting === sub.id}
                              onClick={() => handleApprove(sub)}
                              style={{
                                padding: "5px 12px", borderRadius: 6, border: "none",
                                background: "#dcfce7", color: "#166534", fontWeight: 600,
                                fontSize: 12, cursor: acting === sub.id ? "default" : "pointer",
                              }}
                            >{acting === sub.id ? "..." : "Approve & Apply"}</button>
                            <button
                              disabled={acting === sub.id}
                              onClick={() => handleReject(sub)}
                              style={{
                                padding: "5px 12px", borderRadius: 6, border: "none",
                                background: "#fee2e2", color: "#dc2626", fontWeight: 600,
                                fontSize: 12, cursor: "pointer",
                              }}
                            >Reject</button>
                          </div>
                        )}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={6} style={{
                          padding: "0 0 2px", background: "#eff6ff",
                          borderBottom: "2px solid #0A1F44",
                        }}>
                          <div style={{ padding: "16px 24px", display: "grid",
                            gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                            <div>
                              <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b",
                                textTransform: "uppercase", marginBottom: 4 }}>Name</div>
                              <div style={{ fontSize: 13, color: "#0A1F44" }}>{sub.name || "—"}</div>
                            </div>
                            <div>
                              <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b",
                                textTransform: "uppercase", marginBottom: 4 }}>Email</div>
                              <div style={{ fontSize: 13, color: "#0A1F44" }}>{sub.email || "—"}</div>
                            </div>
                            <div>
                              <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b",
                                textTransform: "uppercase", marginBottom: 4 }}>Title</div>
                              <div style={{ fontSize: 13, color: "#0A1F44" }}>{sub.title || "—"}</div>
                            </div>
                            <div>
                              <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b",
                                textTransform: "uppercase", marginBottom: 4 }}>Phone</div>
                              <div style={{ fontSize: 13, color: "#0A1F44" }}>{sub.phone || "—"}</div>
                            </div>
                            <div>
                              <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b",
                                textTransform: "uppercase", marginBottom: 4 }}>School</div>
                              <div style={{ fontSize: 13, color: "#0A1F44" }}>
                                {sub.school || "—"}
                                {matchedProgram && (
                                  <span style={{ fontSize: 11, color: "#00CC00", marginLeft: 8 }}>matched</span>
                                )}
                              </div>
                            </div>
                            <div>
                              <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b",
                                textTransform: "uppercase", marginBottom: 4 }}>Request Type</div>
                              <div style={{ fontSize: 13, color: "#0A1F44" }}>{sub.requestType || "—"}</div>
                            </div>
                            <div style={{ gridColumn: "1 / -1" }}>
                              <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b",
                                textTransform: "uppercase", marginBottom: 4 }}>Details</div>
                              <div style={{ fontSize: 13, color: "#0A1F44", whiteSpace: "pre-wrap",
                                background: "#fff", padding: 12, borderRadius: 8, border: "1px solid #E5E7EB" }}>
                                {sub.details || "—"}
                              </div>
                            </div>
                          </div>
                          <div style={{ padding: "0 24px 16px", fontSize: 12, color: "#64748b" }}>
                            <strong>What "Approve & Apply" does:</strong>{" "}
                            {sub.requestType === "update"
                              ? matchedProgram
                                ? `Updates ${matchedProgram.school}'s notes with the details. Adds/updates contact info if provided.`
                                : `No matching program found for "${sub.school}" — will mark as approved but won't update any program.`
                              : `Creates a new program "${sub.school}" with the submitted details and adds the submitter as a contact.`
                            }
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
    </div>
  );
}
