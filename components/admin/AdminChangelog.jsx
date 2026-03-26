import React, { useState, useEffect } from "react";
import { collection, getDocs, query, orderBy, limit, startAfter } from "firebase/firestore";
import { db } from "../../firebase.js";

const PAGE_SIZE = 50;

const ACTION_STYLES = {
  add: { bg: "#ecfdf5", color: "#065f46", label: "Add" },
  update: { bg: "#f0fde8", color: "#1B3767", label: "Update" },
  delete: { bg: "#fef2f2", color: "#991b1b", label: "Delete" },
};

export default function AdminChangelog() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [sortCol, setSortCol] = useState("");
  const [sortDir, setSortDir] = useState("asc");
  const [filterText, setFilterText] = useState("");

  function handleSort(col) {
    if (sortCol === col) { setSortDir(d => d === "asc" ? "desc" : "asc"); }
    else { setSortCol(col); setSortDir("asc"); }
  }

  async function loadPage(after) {
    setLoading(true);
    try {
      const constraints = [orderBy("timestamp", "desc"), limit(PAGE_SIZE)];
      if (after) constraints.push(startAfter(after));
      const snap = await getDocs(query(collection(db, "changelog"), ...constraints));
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (after) {
        setEntries(prev => [...prev, ...docs]);
      } else {
        setEntries(docs);
      }
      setLastDoc(snap.docs[snap.docs.length - 1] || null);
      setHasMore(snap.docs.length === PAGE_SIZE);
    } catch (err) {
      console.error("Failed to load changelog:", err);
    }
    setLoading(false);
  }

  useEffect(() => { loadPage(null); }, []);

  function formatTime(ts) {
    if (!ts) return "—";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleString();
  }

  function summarizeData(data) {
    if (!data || typeof data !== "object") return "";
    const keys = ["school", "name", "conference", "contact", "email"];
    for (const k of keys) {
      if (data[k]) return String(data[k]);
    }
    const first = Object.values(data).find(v => typeof v === "string" && v.length > 0);
    return first || "";
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: "#64748b" }}>{entries.length} entries loaded</div>
        <button onClick={() => { setEntries([]); setLastDoc(null); loadPage(null); }} style={{
          padding: "7px 14px", borderRadius: 8, border: "1px solid #E5E7EB",
          background: "#fff", color: "#475569", fontWeight: 600, fontSize: 13, cursor: "pointer"
        }}>Refresh</button>
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

      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E5E7EB",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)", overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#f8fafc", borderBottom: "2px solid #E5E7EB" }}>
              {[["Time","timestamp"],["User","userEmail"],["Action","action"],["Collection","collection"],["Summary",null],["",null]].map(([h, col]) => (
                <th key={h || "_expand"} onClick={col ? () => handleSort(col) : undefined} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11,
                  fontWeight: 700, color: "#64748b", textTransform: "uppercase",
                  letterSpacing: "0.05em", whiteSpace: "nowrap",
                  cursor: col ? "pointer" : "default", userSelect: col ? "none" : undefined,
                }}>{h} {col && sortCol === col ? (sortDir === "asc" ? "\u25B2" : "\u25BC") : ""}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(sortCol ? [...entries].filter(e => {
              if (!filterText) return true;
              const q = filterText.toLowerCase();
              return (e.action || "").toLowerCase().includes(q) ||
                (e.collection || "").toLowerCase().includes(q) ||
                (e.userEmail || "").toLowerCase().includes(q) ||
                summarizeData(e.data).toLowerCase().includes(q);
            }).sort((a, b) => {
              let av = a[sortCol], bv = b[sortCol];
              if (sortCol === "timestamp") {
                av = av?.toDate ? av.toDate() : av ? new Date(av) : null;
                bv = bv?.toDate ? bv.toDate() : bv ? new Date(bv) : null;
                if (av == null && bv == null) return 0;
                if (av == null) return 1;
                if (bv == null) return -1;
                const cmp = av - bv;
                return sortDir === "asc" ? cmp : -cmp;
              }
              if (av == null && bv == null) return 0;
              if (av == null) return 1;
              if (bv == null) return -1;
              const cmp = typeof av === "number" ? av - bv : String(av).localeCompare(String(bv));
              return sortDir === "asc" ? cmp : -cmp;
            }) : entries.filter(e => {
              if (!filterText) return true;
              const q = filterText.toLowerCase();
              return (e.action || "").toLowerCase().includes(q) ||
                (e.collection || "").toLowerCase().includes(q) ||
                (e.userEmail || "").toLowerCase().includes(q) ||
                summarizeData(e.data).toLowerCase().includes(q);
            })).map(e => {
              const style = ACTION_STYLES[e.action] || ACTION_STYLES.update;
              const isExpanded = expanded === e.id;
              return (
                <React.Fragment key={e.id}>
                  <tr style={{ borderBottom: "1px solid #f1f5f9" }}
                    onMouseEnter={ev => ev.currentTarget.style.background = "#f8fafc"}
                    onMouseLeave={ev => ev.currentTarget.style.background = ""}>
                    <td style={{ padding: "10px 14px", color: "#475569", whiteSpace: "nowrap" }}>
                      {formatTime(e.timestamp)}
                    </td>
                    <td style={{ padding: "10px 14px", color: "#475569" }}>{e.userEmail || "—"}</td>
                    <td style={{ padding: "10px 14px" }}>
                      <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: 6,
                        fontSize: 11, fontWeight: 700, background: style.bg, color: style.color }}>
                        {style.label}
                      </span>
                    </td>
                    <td style={{ padding: "10px 14px", color: "#0A1F44", fontWeight: 600 }}>
                      {e.collection || "—"}
                    </td>
                    <td style={{ padding: "10px 14px", color: "#475569", maxWidth: 260,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {summarizeData(e.data)}
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <button onClick={() => setExpanded(isExpanded ? null : e.id)} style={{
                        padding: "4px 10px", borderRadius: 6, border: "1px solid #E5E7EB",
                        background: isExpanded ? "#f0fde8" : "#fff", color: "#0A1F44",
                        fontWeight: 600, fontSize: 11, cursor: "pointer"
                      }}>{isExpanded ? "Hide" : "Details"}</button>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr>
                      <td colSpan={6} style={{ padding: "12px 24px 16px", background: "#f8fafc",
                        borderBottom: "2px solid #E5E7EB" }}>
                        <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6 }}>
                          Doc ID: <code style={{ background: "#E5E7EB", padding: "2px 6px", borderRadius: 4 }}>
                            {e.docId || "—"}
                          </code>
                        </div>
                        <pre style={{ margin: 0, fontSize: 12, color: "#334155", background: "#fff",
                          border: "1px solid #E5E7EB", borderRadius: 8, padding: 12,
                          overflow: "auto", maxHeight: 300 }}>
                          {JSON.stringify(e.data, null, 2)}
                        </pre>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
            {entries.length === 0 && !loading && (
              <tr>
                <td colSpan={6} style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>
                  No changelog entries yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {loading && (
        <div style={{ padding: 20, textAlign: "center", color: "#64748b" }}>Loading...</div>
      )}

      {hasMore && !loading && entries.length > 0 && (
        <div style={{ textAlign: "center", marginTop: 16 }}>
          <button onClick={() => loadPage(lastDoc)} style={{
            padding: "8px 20px", borderRadius: 8, border: "1px solid #E5E7EB",
            background: "#fff", color: "#0A1F44", fontWeight: 600, fontSize: 13, cursor: "pointer"
          }}>Load More</button>
        </div>
      )}
    </div>
  );
}
