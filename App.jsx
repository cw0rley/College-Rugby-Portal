import React, { useState, useEffect, useMemo } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";

// ─── PASTE YOUR FIREBASE CONFIG HERE ────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyC0EnhbS_bk3oGR-iqV7tyrJ7ye5BVXc3A",
  authDomain: "college-rugby-portal.firebaseapp.com",
  projectId: "college-rugby-portal",
  storageBucket: "college-rugby-portal.firebasestorage.app",
  messagingSenderId: "794742569184",
  appId: "1:794742569184:web:5feb0dfefdd07836a67885",
  measurementId: "G-K1K3SYDN5W"
};
// ─────────────────────────────────────────────────────────────────────────────

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

function RugbyBall({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="32" cy="32" rx="22" ry="14" transform="rotate(-35 32 32)"
        fill="#b45309" stroke="#92400e" strokeWidth="1.5" />
      <ellipse cx="32" cy="32" rx="16" ry="9" transform="rotate(-35 32 32)"
        fill="none" stroke="#fbbf24" strokeWidth="1" strokeDasharray="3 2" />
      {/* lace */}
      <line x1="29" y1="25" x2="35" y2="39" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
      <line x1="26" y1="29" x2="38" y2="35" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="27" y1="26" x2="37" y2="38" stroke="#fff" strokeWidth="1" strokeLinecap="round" strokeDasharray="2 2" />
      <ellipse cx="32" cy="32" rx="22" ry="14" transform="rotate(-35 32 32)"
        fill="none" stroke="#92400e" strokeWidth="1.5" />
    </svg>
  );
}

const US_STATES = {
  AL:"Alabama",AK:"Alaska",AZ:"Arizona",AR:"Arkansas",CA:"California",
  CO:"Colorado",CT:"Connecticut",DC:"D.C.",DE:"Delaware",FL:"Florida",
  GA:"Georgia",HI:"Hawaii",ID:"Idaho",IL:"Illinois",IN:"Indiana",
  IA:"Iowa",KS:"Kansas",KY:"Kentucky",LA:"Louisiana",ME:"Maine",
  MD:"Maryland",MA:"Massachusetts",MI:"Michigan",MN:"Minnesota",
  MS:"Mississippi",MO:"Missouri",MT:"Montana",NE:"Nebraska",NV:"Nevada",
  NH:"New Hampshire",NJ:"New Jersey",NM:"New Mexico",NY:"New York",
  NC:"North Carolina",ND:"North Dakota",OH:"Ohio",OK:"Oklahoma",
  OR:"Oregon",PA:"Pennsylvania",RI:"Rhode Island",SC:"South Carolina",
  SD:"South Dakota",TN:"Tennessee",TX:"Texas",UT:"Utah",VT:"Vermont",
  VA:"Virginia",WA:"Washington",WV:"West Virginia",WI:"Wisconsin",WY:"Wyoming",
};

function Avatar({ name, size = 40 }) {
  const initials = name ? name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase() : "?";
  const colors = ["#1a56db","#0e9f6e","#d61f69","#7e3af2","#ff5a1f","#0694a2"];
  const color = colors[name ? name.charCodeAt(0) % colors.length : 0];
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", background: color,
      display: "flex", alignItems: "center", justifyContent: "center",
      color: "#fff", fontWeight: 700, fontSize: size * 0.36, flexShrink: 0,
    }}>{initials}</div>
  );
}

function Badge({ label, color = "#1a56db" }) {
  return (
    <span style={{
      background: color + "18", color, border: `1px solid ${color}40`,
      borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 600,
      whiteSpace: "nowrap",
    }}>{label}</span>
  );
}

function StatPill({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div style={{
      background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8,
      padding: "6px 12px", textAlign: "center", minWidth: 80,
    }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>{value}</div>
      <div style={{ fontSize: 10, color: "#64748b", marginTop: 1 }}>{label}</div>
    </div>
  );
}

function ProgramCard({ program, onClick }) {
  const genderColor = program.gender === "mens" ? "#1a56db" : "#d61f69";
  const genderLabel = program.gender === "mens" ? "Men's" : "Women's";

  return (
    <div onClick={() => onClick(program)} style={{
      background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12,
      padding: 20, cursor: "pointer", transition: "all 0.18s",
      boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
    }}
    onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 6px 24px rgba(0,0,0,0.12)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
    onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.06)"; e.currentTarget.style.transform = ""; }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 12 }}>
        <Avatar name={program.school} size={44} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: "#0f172a", lineHeight: 1.3,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {program.school}
          </div>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 3 }}>
            {program.city || program.state}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
        <Badge label={genderLabel} color={genderColor} />
        {program.league && <Badge label={program.league} color="#0e9f6e" />}
        {program.rugbyScholarship && <Badge label="🏉 Scholarship" color="#7e3af2" />}
        {program.schoolFunded && <Badge label="School Funded" color="#ff5a1f" />}
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {program.gpa && <StatPill label="GPA" value={program.gpa?.toFixed(2)} />}
        {program.sat && <StatPill label="SAT" value={program.sat?.toFixed(0)} />}
        {program.inStateTuition && <StatPill label="In-State" value={`$${(program.inStateTuition/1000).toFixed(0)}k`} />}
        {program.rugbyRanking && <StatPill label="Ranking" value={`#${program.rugbyRanking}`} />}
      </div>

      {program.contact && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #f1f5f9",
          fontSize: 12, color: "#64748b", display: "flex", alignItems: "center", gap: 6 }}>
          <span>👤</span>
          <span>{program.contact}</span>
          {program.contactTitle && <span style={{ color: "#94a3b8" }}>· {program.contactTitle}</span>}
        </div>
      )}
    </div>
  );
}

function ProgramModal({ program, onClose }) {
  if (!program) return null;
  const genderColor = program.gender === "mens" ? "#1a56db" : "#d61f69";

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }} onClick={onClose}>
      <div style={{
        background: "#fff", borderRadius: 16, padding: 32, maxWidth: 560, width: "100%",
        maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
      }} onClick={e => e.stopPropagation()}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <Avatar name={program.school} size={52} />
            <div>
              <h2 style={{ margin: 0, fontSize: 20, color: "#0f172a" }}>{program.school}</h2>
              <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>{program.city}</div>
            </div>
          </div>
          <button onClick={onClose} style={{
            background: "none", border: "none", fontSize: 22, cursor: "pointer",
            color: "#94a3b8", padding: "0 4px",
          }}>×</button>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
          <Badge label={program.gender === "mens" ? "Men's" : "Women's"} color={genderColor} />
          {program.league && <Badge label={program.league} color="#0e9f6e" />}
          {program.ncaaDivision && <Badge label={program.ncaaDivision} color="#0694a2" />}
          {program.schoolType && <Badge label={program.schoolType} color="#64748b" />}
          {program.rugbyScholarship && <Badge label="🏉 Rugby Scholarship" color="#7e3af2" />}
          {program.schoolFunded && <Badge label="School Funded" color="#ff5a1f" />}
        </div>

        {/* Academic Stats */}
        <Section title="📚 Academic Profile">
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {program.gpa && <StatPill label="Avg GPA" value={program.gpa?.toFixed(2)} />}
            {program.sat && <StatPill label="Avg SAT" value={program.sat?.toFixed(0)} />}
            {program.acceptanceRate && <StatPill label="Acceptance" value={`${program.acceptanceRate}%`} />}
            {program.enrollment && <StatPill label="Enrollment" value={program.enrollment?.toLocaleString()} />}
          </div>
          {program.topPrograms && (
            <div style={{ marginTop: 10, fontSize: 13, color: "#475569" }}>
              <strong>Top Programs:</strong> {program.topPrograms}
            </div>
          )}
        </Section>

        {/* Tuition */}
        <Section title="💰 Tuition">
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {program.inStateTuition && <StatPill label="In-State" value={`$${program.inStateTuition?.toLocaleString()}`} />}
            {program.outStateTuition && <StatPill label="Out-of-State" value={`$${program.outStateTuition?.toLocaleString()}`} />}
          </div>
        </Section>

        {/* Rugby Info */}
        <Section title="🏉 Rugby Info">
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {program.rugbyRanking && <StatPill label="National Rank" value={`#${program.rugbyRanking}`} />}
          </div>
          {program.conference && (
            <div style={{ marginTop: 10, fontSize: 13, color: "#475569" }}>
              <strong>Conference:</strong> {program.conference}
            </div>
          )}
        </Section>

        {/* Contact */}
        {(program.contact || program.email) && (
          <Section title="📬 Contact Coach">
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              {program.contact && <Avatar name={program.contact} size={40} />}
              <div>
                {program.contact && <div style={{ fontWeight: 600, color: "#0f172a" }}>{program.contact}</div>}
                {program.contactTitle && <div style={{ fontSize: 12, color: "#64748b" }}>{program.contactTitle}</div>}
                {program.email && (
                  <a href={`mailto:${program.email}`} style={{
                    display: "inline-block", marginTop: 6, background: "#1a56db",
                    color: "#fff", padding: "7px 16px", borderRadius: 8, fontSize: 13,
                    fontWeight: 600, textDecoration: "none",
                  }}>✉ {program.email}</a>
                )}
              </div>
            </div>
          </Section>
        )}

        {program.website && (
          <a href={program.website} target="_blank" rel="noreferrer" style={{
            display: "block", textAlign: "center", marginTop: 16, padding: "10px",
            border: "1px solid #e2e8f0", borderRadius: 8, color: "#1a56db",
            textDecoration: "none", fontSize: 13, fontWeight: 600,
          }}>🌐 Visit School Website</a>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#64748b", marginBottom: 8,
        textTransform: "uppercase", letterSpacing: "0.05em" }}>{title}</div>
      {children}
    </div>
  );
}

function ConferenceCard({ conf, programCount = 0, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12,
      padding: 18, boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      display: "flex", alignItems: "center", gap: 14,
      cursor: onClick ? "pointer" : "default", transition: "all 0.15s",
    }}
    onMouseEnter={e => { if (onClick) { e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.1)"; e.currentTarget.style.transform = "translateY(-1px)"; }}}
    onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.06)"; e.currentTarget.style.transform = ""; }}
    >
      <Avatar name={conf.fullName || conf.conference} size={44} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a" }}>{conf.conference}</div>
        <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{conf.fullName}</div>
        {conf.email && (
          <a href={`mailto:${conf.email}`} onClick={e => e.stopPropagation()} style={{
            fontSize: 12, color: "#1a56db", textDecoration: "none", marginTop: 4,
            display: "inline-block",
          }}>✉ {conf.email}</a>
        )}
      </div>
      {programCount > 0 && (
        <div style={{ textAlign: "center", flexShrink: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 18, color: "#1a56db" }}>{programCount}</div>
          <div style={{ fontSize: 10, color: "#94a3b8" }}>programs</div>
        </div>
      )}
    </div>
  );
}

function ProgramTable({ programs, onRowClick }) {
  const [sortKey, setSortKey] = useState("school");
  const [sortDir, setSortDir] = useState(1);

  const cols = [
    { key: "school",        label: "School" },
    { key: "state",         label: "State" },
    { key: "gender",        label: "Gender" },
    { key: "conference",    label: "Conference" },
    { key: "league",        label: "League" },
    { key: "gpa",           label: "GPA" },
    { key: "sat",           label: "SAT" },
    { key: "inStateTuition",label: "In-State $" },
    { key: "rugbyRanking",  label: "Rank" },
    { key: "rugbyScholarship", label: "Scholarship" },
    { key: "contact",       label: "Coach" },
  ];

  function toggleSort(key) {
    if (sortKey === key) setSortDir(d => d * -1);
    else { setSortKey(key); setSortDir(1); }
  }

  const sorted = [...programs].sort((a, b) => {
    const av = a[sortKey], bv = b[sortKey];
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    if (typeof av === "number") return (av - bv) * sortDir;
    return String(av).localeCompare(String(bv)) * sortDir;
  });

  const thStyle = (key) => ({
    padding: "10px 14px", textAlign: "left", fontSize: 12, fontWeight: 700,
    color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em",
    cursor: "pointer", userSelect: "none", whiteSpace: "nowrap",
    background: sortKey === key ? "#f0f7ff" : "#f8fafc",
    borderBottom: "2px solid #e2e8f0",
  });

  const tdStyle = {
    padding: "10px 14px", fontSize: 13, color: "#374151",
    borderBottom: "1px solid #f1f5f9", whiteSpace: "nowrap",
  };

  return (
    <div style={{ background: "#fff", borderRadius: 12, overflow: "auto",
      boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: "1px solid #e2e8f0" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr>
            {cols.map(c => (
              <th key={c.key} style={thStyle(c.key)} onClick={() => toggleSort(c.key)}>
                {c.label} {sortKey === c.key ? (sortDir === 1 ? "↑" : "↓") : ""}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((p, i) => (
            <tr key={p.id || i} onClick={() => onRowClick(p)}
              style={{ cursor: "pointer" }}
              onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
              onMouseLeave={e => e.currentTarget.style.background = ""}>
              <td style={{ ...tdStyle, fontWeight: 600, color: "#0f172a" }}>{p.school}</td>
              <td style={tdStyle}>{p.state}</td>
              <td style={tdStyle}>{p.gender === "mens" ? "Men's" : "Women's"}</td>
              <td style={tdStyle}>{p.conference || "—"}</td>
              <td style={tdStyle}>{p.league || "—"}</td>
              <td style={tdStyle}>{p.gpa ? p.gpa.toFixed(2) : "—"}</td>
              <td style={tdStyle}>{p.sat ? p.sat.toFixed(0) : "—"}</td>
              <td style={tdStyle}>{p.inStateTuition ? `$${p.inStateTuition.toLocaleString()}` : "—"}</td>
              <td style={tdStyle}>{p.rugbyRanking ? `#${p.rugbyRanking}` : "—"}</td>
              <td style={tdStyle}>{p.rugbyScholarship ? "✓" : ""}</td>
              <td style={tdStyle}>{p.contact || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ContactPage({ programs }) {
  const [requestType, setRequestType] = useState("update");
  const [form, setForm] = useState({
    name: "", email: "", title: "", school: "", phone: "", details: "",
  });
  const [status, setStatus] = useState(null); // null | "sending" | "sent" | "error"

  function set(field, val) {
    setForm(f => ({ ...f, [field]: val }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus("sending");
    try {
      await addDoc(collection(db, "submissions"), {
        ...form,
        requestType,
        submittedAt: serverTimestamp(),
      });
      setStatus("sent");
      setForm({ name: "", email: "", title: "", school: "", phone: "", details: "" });
    } catch (err) {
      console.error(err);
      setStatus("error");
    }
  }

  const inputStyle = {
    width: "100%", padding: "10px 12px", borderRadius: 8,
    border: "1px solid #e2e8f0", fontSize: 14, boxSizing: "border-box",
    outline: "none", color: "#0f172a",
  };
  const labelStyle = {
    display: "block", fontSize: 12, fontWeight: 700,
    color: "#64748b", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em",
  };

  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: 32,
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: "1px solid #e2e8f0" }}>

        <h2 style={{ margin: "0 0 6px", fontSize: 20, color: "#0f172a" }}>Submit Program Info</h2>
        <p style={{ margin: "0 0 28px", fontSize: 14, color: "#64748b" }}>
          Are you a coach or school representative? Use this form to add a new program or update existing information.
        </p>

        {status === "sent" ? (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>Submission Received!</div>
            <div style={{ fontSize: 14, color: "#64748b", marginBottom: 24 }}>
              Thank you — we'll review your submission and update the portal shortly.
            </div>
            <button onClick={() => setStatus(null)} style={{
              padding: "10px 24px", borderRadius: 8, border: "none", background: "#1a56db",
              color: "#fff", fontWeight: 600, fontSize: 14, cursor: "pointer",
            }}>Submit Another</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {/* Request type */}
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Request Type</label>
              <div style={{ display: "flex", gap: 10 }}>
                {[["update","Update Existing Program"],["add","Add New Program"]].map(([val, label]) => (
                  <button key={val} type="button" onClick={() => setRequestType(val)} style={{
                    flex: 1, padding: "10px", borderRadius: 8, cursor: "pointer", fontWeight: 600,
                    fontSize: 13, border: "2px solid",
                    borderColor: requestType === val ? "#1a56db" : "#e2e8f0",
                    background: requestType === val ? "#eff6ff" : "#fff",
                    color: requestType === val ? "#1a56db" : "#64748b",
                  }}>{label}</button>
                ))}
              </div>
            </div>

            {/* School */}
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>School / Program Name *</label>
              {requestType === "update" ? (
                <select value={form.school} onChange={e => set("school", e.target.value)}
                  required style={inputStyle}>
                  <option value="">— Select a school —</option>
                  {[...new Set(programs.map(p => p.school).filter(Boolean))].sort()
                    .map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              ) : (
                <input value={form.school} onChange={e => set("school", e.target.value)}
                  required placeholder="e.g. University of Example" style={inputStyle} />
              )}
            </div>

            {/* Name + Title row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>Your Name *</label>
                <input value={form.name} onChange={e => set("name", e.target.value)}
                  required placeholder="Full name" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Your Title</label>
                <input value={form.title} onChange={e => set("title", e.target.value)}
                  placeholder="e.g. Head Coach" style={inputStyle} />
              </div>
            </div>

            {/* Email + Phone row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>Email *</label>
                <input type="email" value={form.email} onChange={e => set("email", e.target.value)}
                  required placeholder="you@school.edu" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Phone</label>
                <input type="tel" value={form.phone} onChange={e => set("phone", e.target.value)}
                  placeholder="Optional" style={inputStyle} />
              </div>
            </div>

            {/* Details */}
            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>
                {requestType === "update" ? "What needs to be updated?" : "Program Details"} *
              </label>
              <textarea value={form.details} onChange={e => set("details", e.target.value)}
                required rows={5} style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
                placeholder={requestType === "update"
                  ? "Describe what information needs to be corrected or updated..."
                  : "Include conference, league, location, scholarship info, contact details, website, etc."
                } />
            </div>

            {status === "error" && (
              <div style={{ marginBottom: 16, padding: "10px 14px", borderRadius: 8,
                background: "#fee2e2", color: "#dc2626", fontSize: 13 }}>
                Something went wrong. Please try again or email us directly.
              </div>
            )}

            <button type="submit" disabled={status === "sending"} style={{
              width: "100%", padding: "12px", borderRadius: 8, border: "none",
              background: status === "sending" ? "#93c5fd" : "#1a56db",
              color: "#fff", fontWeight: 700, fontSize: 15, cursor: status === "sending" ? "default" : "pointer",
            }}>
              {status === "sending" ? "Submitting..." : "Submit"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}


function AboutPage() {
  const cardStyle = {
    background: "#fff", borderRadius: 12, padding: 28,
    border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
  };
  return (
    <div style={{ maxWidth: 760, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Hero blurb */}
      <div style={{ ...cardStyle, background: "linear-gradient(135deg, #0f172a, #1e3a8a)",
        color: "#fff", padding: 36 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <RugbyBall size={36} />
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>About College Rugby Portal</h2>
        </div>
        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.8, color: "#cbd5e1" }}>
          College Rugby Portal is a free resource for student-athletes, parents, and coaches looking to
          navigate the college rugby recruiting landscape. We aggregate program data from across the USA
          — including academic profiles, tuition costs, conference affiliations, and coaching contacts —
          so recruits can make informed decisions about where to play next.
        </p>
      </div>

      {/* What we offer */}
      <div style={cardStyle}>
        <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700, color: "#0f172a" }}>What We Offer</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14 }}>
          {[
            ["🏉", "826+ Programs", "Men's and women's programs across all 50 states"],
            ["🎓", "Academic Data", "GPA, SAT averages, acceptance rates, and top majors"],
            ["💰", "Tuition Info", "In-state and out-of-state costs for every school"],
            ["📊", "Compare & Filter", "Filter by state, conference, scholarship, and more"],
            ["⬇", "Export Reports", "Download filtered results as a CSV for offline use"],
            ["📬", "Submit Updates", "Coaches can submit new or updated program info"],
          ].map(([icon, title, desc]) => (
            <div key={title} style={{ padding: 16, background: "#f8fafc",
              borderRadius: 10, border: "1px solid #f1f5f9" }}>
              <div style={{ fontSize: 22, marginBottom: 8 }}>{icon}</div>
              <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a", marginBottom: 4 }}>{title}</div>
              <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5 }}>{desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Who runs it */}
      <div style={cardStyle}>
        <h3 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 700, color: "#0f172a" }}>Who Runs This?</h3>
        <p style={{ margin: "0 0 12px", fontSize: 14, color: "#475569", lineHeight: 1.8 }}>
          College Rugby Portal is maintained by a small team of rugby enthusiasts and former players
          passionate about growing the sport at the collegiate level. We are not affiliated with USA Rugby,
          World Rugby, or any individual program.
        </p>
        <p style={{ margin: 0, fontSize: 14, color: "#475569", lineHeight: 1.8 }}>
          Data is sourced from publicly available information and direct submissions from coaches and
          school representatives. If you spot something out of date, use the <strong>Submit Info</strong> tab
          to send us a correction — we review all submissions promptly.
        </p>
      </div>

      {/* Disclaimer */}
      <div style={{ ...cardStyle, background: "#fffbeb", border: "1px solid #fde68a" }}>
        <h3 style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 700, color: "#92400e" }}>Disclaimer</h3>
        <p style={{ margin: 0, fontSize: 13, color: "#78350f", lineHeight: 1.7 }}>
          Program data is provided for informational purposes only and may not reflect the most current
          information. Always verify details directly with the school or coaching staff before making
          any decisions. Tuition figures are approximate and subject to change.
        </p>
      </div>
    </div>
  );
}

function Footer({ onNavigate }) {
  const linkStyle = {
    color: "#93c5fd", textDecoration: "none", fontSize: 13,
    cursor: "pointer", background: "none", border: "none", padding: 0,
  };
  return (
    <footer style={{
      background: "#0f172a", color: "#94a3b8", marginTop: 60,
      padding: "48px 24px 28px",
    }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 36, marginBottom: 40 }}>

          {/* Brand */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <RugbyBall size={28} />
              <span style={{ fontWeight: 800, fontSize: 15, color: "#fff" }}>College Rugby Portal</span>
            </div>
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.7, color: "#64748b" }}>
              Helping student-athletes find their perfect college rugby program since 2024.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <div style={{ fontWeight: 700, fontSize: 12, color: "#475569",
              textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>Navigate</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[["programs","Programs"],["conferences","Conferences"],
                ["contact","Submit Info"],["about","About"]].map(([key, label]) => (
                <button key={key} onClick={() => onNavigate(key)} style={linkStyle}>{label}</button>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div>
            <div style={{ fontWeight: 700, fontSize: 12, color: "#475569",
              textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>Contact</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 13 }}>
              <span>Questions or feedback?</span>
              <a href="mailto:info@collegerugbyportal.com" style={{ ...linkStyle, fontSize: 13 }}>
                info@collegerugbyportal.com
              </a>
              <span style={{ color: "#64748b" }}>
                To update a program listing, use the Submit Info tab.
              </span>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{ borderTop: "1px solid #1e293b", paddingTop: 20,
          display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <span style={{ fontSize: 12, color: "#475569" }}>
            © {new Date().getFullYear()} College Rugby Portal. All rights reserved.
          </span>
          <span style={{ fontSize: 12, color: "#475569" }}>
            Not affiliated with USA Rugby or World Rugby.
          </span>
        </div>
      </div>
    </footer>
  );
}

const EMPTY_PROGRAM = {
  school:"", city:"", state:"", gender:"mens", conference:"", league:"",
  ncaaDivision:"", schoolType:"", gpa:"", sat:"", acceptanceRate:"",
  enrollment:"", inStateTuition:"", outStateTuition:"", rugbyRanking:"",
  rugbyScholarship:false, schoolFunded:false,
  contact:"", contactTitle:"", email:"", website:"", topPrograms:"",
};

function ProgramForm({ initial, onSave, onCancel, leagues = [], conferences = [], schoolTypes = [] }) {
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

  const inp = { padding:"8px 10px", borderRadius:8, border:"1px solid #e2e8f0",
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

  // Filter conferences to those matching selected league
  const filteredConferences = form.league
    ? conferences.filter(c => c.league === form.league).map(c => c.name)
    : conferences.map(c => c.name);

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
          <select value={form.league ?? ""} onChange={e => { set("league", e.target.value); set("conference", ""); }} style={inp}>
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
        letterSpacing:"0.06em", margin:"16px 0 10px" }}>📬 Coach Contact</div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:24 }}>
        {group("Coach Name","contact")} {group("Title","contactTitle")}
        {group("Email","email","email")} {group("Website","website","url")}
      </div>

      <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
        <button type="button" onClick={onCancel} style={{
          padding:"9px 20px", borderRadius:8, border:"1px solid #e2e8f0",
          background:"#fff", color:"#475569", fontWeight:600, fontSize:14, cursor:"pointer" }}>
          Cancel
        </button>
        <button type="submit" disabled={saving} style={{
          padding:"9px 24px", borderRadius:8, border:"none",
          background: saving ? "#93c5fd" : "#1a56db",
          color:"#fff", fontWeight:700, fontSize:14, cursor: saving ? "default" : "pointer" }}>
          {saving ? "Saving..." : "Save Program"}
        </button>
      </div>
    </form>
  );
}

function AdminLeagues({ leagues, onRefresh }) {
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const inp = { padding:"8px 12px", borderRadius:8, border:"1px solid #e2e8f0", fontSize:13 };

  async function handleAdd() {
    if (!newName.trim()) return;
    setSaving(true);
    await addDoc(collection(db, "leagues"), { name: newName.trim() });
    localStorage.removeItem("crp_cache");
    setNewName(""); setSaving(false); onRefresh();
  }
  async function handleUpdate(id) {
    await updateDoc(doc(db, "leagues", id), { name: editName.trim() });
    localStorage.removeItem("crp_cache");
    setEditingId(null); onRefresh();
  }
  async function handleDeleteLeague(id) {
    await deleteDoc(doc(db, "leagues", id));
    localStorage.removeItem("crp_cache");
    onRefresh();
  }

  return (
    <div>
      <div style={{ display:"flex", gap:8, marginBottom:20 }}>
        <input value={newName} onChange={e => setNewName(e.target.value)}
          placeholder="New league name..." style={{ ...inp, flex:1 }} />
        <button onClick={handleAdd} disabled={saving || !newName.trim()} style={{
          padding:"8px 16px", borderRadius:8, border:"none", background:"#1a56db",
          color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer" }}>
          + Add League
        </button>
      </div>
      <div style={{ background:"#fff", borderRadius:12, border:"1px solid #e2e8f0" }}>
        {leagues.map((l, i) => (
          <div key={l.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 16px",
            borderBottom: i < leagues.length - 1 ? "1px solid #f1f5f9" : "none" }}>
            {editingId === l.id ? (
              <>
                <input value={editName} onChange={e => setEditName(e.target.value)}
                  style={{ ...inp, flex:1 }} />
                <button onClick={() => handleUpdate(l.id)} style={{
                  padding:"5px 12px", borderRadius:6, border:"none", background:"#1a56db",
                  color:"#fff", fontWeight:600, fontSize:12, cursor:"pointer" }}>Save</button>
                <button onClick={() => setEditingId(null)} style={{
                  padding:"5px 12px", borderRadius:6, border:"1px solid #e2e8f0",
                  background:"#fff", color:"#475569", fontWeight:600, fontSize:12, cursor:"pointer" }}>Cancel</button>
              </>
            ) : (
              <>
                <span style={{ flex:1, fontWeight:600, color:"#0f172a", fontSize:14 }}>{l.name}</span>
                <button onClick={() => { setEditingId(l.id); setEditName(l.name); }} style={{
                  padding:"5px 12px", borderRadius:6, border:"1px solid #e2e8f0",
                  background:"#fff", color:"#1a56db", fontWeight:600, fontSize:12, cursor:"pointer" }}>Edit</button>
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

function AdminConferences({ conferences, leagues, onRefresh }) {
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [newForm, setNewForm] = useState({ conference:"", fullName:"", league:"", email:"" });
  const [saving, setSaving] = useState(false);
  const inp = { padding:"7px 10px", borderRadius:6, border:"1px solid #e2e8f0", fontSize:13, width:"100%", boxSizing:"border-box" };

  async function handleAdd() {
    if (!newForm.conference.trim()) return;
    setSaving(true);
    await addDoc(collection(db, "conferences"), { ...newForm });
    localStorage.removeItem("crp_cache");
    setNewForm({ conference:"", fullName:"", league:"", email:"" });
    setSaving(false); onRefresh();
  }
  async function handleUpdate(id) {
    await updateDoc(doc(db, "conferences", id), editForm);
    localStorage.removeItem("crp_cache");
    setEditingId(null); onRefresh();
  }
  async function handleDeleteConf(id) {
    await deleteDoc(doc(db, "conferences", id));
    localStorage.removeItem("crp_cache");
    onRefresh();
  }

  return (
    <div>
      <div style={{ background:"#fff", borderRadius:12, padding:20, marginBottom:16, border:"1px solid #e2e8f0" }}>
        <div style={{ fontWeight:700, fontSize:13, color:"#0f172a", marginBottom:12 }}>Add Conference</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 2fr 1fr 2fr", gap:10, marginBottom:10 }}>
          <div>
            <label style={{ fontSize:11, fontWeight:700, color:"#64748b", display:"block", marginBottom:4 }}>ABBR *</label>
            <input value={newForm.conference} onChange={e => setNewForm(f => ({...f, conference:e.target.value}))} style={inp} />
          </div>
          <div>
            <label style={{ fontSize:11, fontWeight:700, color:"#64748b", display:"block", marginBottom:4 }}>FULL NAME</label>
            <input value={newForm.fullName} onChange={e => setNewForm(f => ({...f, fullName:e.target.value}))} style={inp} />
          </div>
          <div>
            <label style={{ fontSize:11, fontWeight:700, color:"#64748b", display:"block", marginBottom:4 }}>LEAGUE</label>
            <select value={newForm.league} onChange={e => setNewForm(f => ({...f, league:e.target.value}))} style={inp}>
              <option value="">— Select —</option>
              {leagues.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize:11, fontWeight:700, color:"#64748b", display:"block", marginBottom:4 }}>EMAIL</label>
            <input value={newForm.email} onChange={e => setNewForm(f => ({...f, email:e.target.value}))} style={inp} />
          </div>
        </div>
        <button onClick={handleAdd} disabled={saving || !newForm.conference.trim()} style={{
          padding:"8px 18px", borderRadius:8, border:"none", background:"#1a56db",
          color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer" }}>
          + Add Conference
        </button>
      </div>

      <div style={{ background:"#fff", borderRadius:12, border:"1px solid #e2e8f0", overflow:"auto" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
          <thead>
            <tr style={{ background:"#f8fafc", borderBottom:"2px solid #e2e8f0" }}>
              {["Abbr","Full Name","League","Email","Actions"].map(h => (
                <th key={h} style={{ padding:"10px 14px", textAlign:"left", fontSize:11,
                  fontWeight:700, color:"#64748b", textTransform:"uppercase", letterSpacing:"0.05em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {conferences.map(c => {
              const isEditing = editingId === c.id;
              return (
                <React.Fragment key={c.id}>
                  <tr style={{ borderBottom: isEditing ? "none" : "1px solid #f1f5f9", background: isEditing ? "#eff6ff" : "" }}>
                    <td style={{ padding:"10px 14px", fontWeight:600, color:"#0f172a" }}>{c.conference}</td>
                    <td style={{ padding:"10px 14px", color:"#475569" }}>{c.fullName || "—"}</td>
                    <td style={{ padding:"10px 14px" }}>{c.league ? <Badge label={c.league} color="#0e9f6e" /> : "—"}</td>
                    <td style={{ padding:"10px 14px", color:"#475569" }}>{c.email || "—"}</td>
                    <td style={{ padding:"10px 14px" }}>
                      <div style={{ display:"flex", gap:8 }}>
                        <button onClick={() => { setEditingId(isEditing ? null : c.id); setEditForm({...c}); }} style={{
                          padding:"5px 12px", borderRadius:6, border:"1px solid #e2e8f0",
                          background: isEditing ? "#eff6ff" : "#fff", color:"#1a56db", fontWeight:600, fontSize:12, cursor:"pointer" }}>
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
                      <td colSpan={5} style={{ padding:"0 0 2px", background:"#eff6ff", borderBottom:"2px solid #1a56db" }}>
                        <div style={{ padding:"16px 20px", display:"grid", gridTemplateColumns:"1fr 2fr 1fr 2fr auto", gap:10, alignItems:"end" }}>
                          <div>
                            <label style={{ fontSize:11, fontWeight:700, color:"#64748b", display:"block", marginBottom:4 }}>ABBR</label>
                            <input value={editForm.conference ?? ""} onChange={e => setEditForm(f => ({...f, conference:e.target.value}))} style={inp} />
                          </div>
                          <div>
                            <label style={{ fontSize:11, fontWeight:700, color:"#64748b", display:"block", marginBottom:4 }}>FULL NAME</label>
                            <input value={editForm.fullName ?? ""} onChange={e => setEditForm(f => ({...f, fullName:e.target.value}))} style={inp} />
                          </div>
                          <div>
                            <label style={{ fontSize:11, fontWeight:700, color:"#64748b", display:"block", marginBottom:4 }}>LEAGUE</label>
                            <select value={editForm.league ?? ""} onChange={e => setEditForm(f => ({...f, league:e.target.value}))} style={inp}>
                              <option value="">— Select —</option>
                              {leagues.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
                            </select>
                          </div>
                          <div>
                            <label style={{ fontSize:11, fontWeight:700, color:"#64748b", display:"block", marginBottom:4 }}>EMAIL</label>
                            <input value={editForm.email ?? ""} onChange={e => setEditForm(f => ({...f, email:e.target.value}))} style={inp} />
                          </div>
                          <button onClick={() => handleUpdate(c.id)} style={{
                            padding:"8px 16px", borderRadius:8, border:"none", background:"#1a56db",
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

function AdminPage() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [formMode, setFormMode] = useState(null); // null | "add" | "edit"
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [importPreview, setImportPreview] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [adminTab, setAdminTab] = useState("programs");
  const [leaguesList, setLeaguesList] = useState([]);
  const [conferencesList, setConferencesList] = useState([]);

  useEffect(() => onAuthStateChanged(auth, u => { setUser(u); setAuthLoading(false); }), []);

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

  useEffect(() => {
    if (user) { loadPrograms(); loadLeagues(); loadConferences(); }
  }, [user]);

  async function handleSave(data) {
    if (formMode === "add") {
      await addDoc(collection(db, "programs"), data);
    } else {
      await updateDoc(doc(db, "programs", editing.id), data);
    }
    localStorage.removeItem("crp_cache");
    setFormMode(null); setEditing(null);
    loadPrograms();
  }

  async function handleDelete() {
    setDeleting(true);
    await deleteDoc(doc(db, "programs", deleteTarget.id));
    localStorage.removeItem("crp_cache");
    setDeleteTarget(null); setDeleting(false);
    loadPrograms();
  }

  function handleImportFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      const text = evt.target.result;
      const rows = adminTab === "programs" ? parseCSV(text)
        : adminTab === "conferences" ? parseGenericCSV(text, CONF_COLS)
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
      : adminTab === "conferences" ? "conferences" : "leagues";
    const reload = adminTab === "programs" ? loadPrograms
      : adminTab === "conferences" ? loadConferences : loadLeagues;
    for (let i = 0; i < importPreview.length; i++) {
      await addDoc(collection(db, colName), importPreview[i]);
      setImportProgress(i + 1);
    }
    localStorage.removeItem("crp_cache");
    setImporting(false);
    setImportPreview(null);
    reload();
  }

  if (authLoading) return <div style={{ padding:40, textAlign:"center", color:"#64748b" }}>Loading...</div>;

  if (!user) return (
    <div style={{ maxWidth:400, margin:"60px auto", textAlign:"center",
      background:"#fff", borderRadius:16, padding:40,
      boxShadow:"0 1px 3px rgba(0,0,0,0.08)", border:"1px solid #e2e8f0" }}>
      <RugbyBall size={48} />
      <h2 style={{ margin:"16px 0 8px", color:"#0f172a" }}>Admin Login</h2>
      <p style={{ color:"#64748b", fontSize:14, marginBottom:24 }}>
        Sign in with your Google account to manage programs.
      </p>
      <button onClick={() => signInWithPopup(auth, googleProvider)} style={{
        display:"inline-flex", alignItems:"center", gap:10, padding:"11px 24px",
        borderRadius:8, border:"1px solid #e2e8f0", background:"#fff",
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
  const adminConferences = conferencesList.map(c => ({ name: c.conference, league: c.league || "" }));
  const adminSchoolTypes = [...new Set(programs.map(p => p.schoolType).filter(Boolean))].sort();

  return (
    <div>
      {/* Admin header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
        marginBottom:20, flexWrap:"wrap", gap:12 }}>
        <div>
          <h2 style={{ margin:"0 0 4px", fontSize:20, color:"#0f172a" }}>Admin</h2>
          <div style={{ fontSize:13, color:"#64748b" }}>{programs.length} total programs</div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ fontSize:13, color:"#64748b" }}>
            Signed in as <strong>{user.email}</strong>
          </div>
          <button onClick={() => {
            if (adminTab === "programs") exportCSV(programs, "programs-backup.csv");
            else if (adminTab === "conferences") exportGenericCSV(CONF_COLS, conferencesList, "conferences-backup.csv");
            else exportGenericCSV(LEAGUE_COLS, leaguesList, "leagues-backup.csv");
          }} style={{
            padding:"7px 14px", borderRadius:8, border:"1px solid #e2e8f0",
            background:"#fff", color:"#475569", fontWeight:600, fontSize:13, cursor:"pointer" }}>
            ⬇ Export {adminTab === "programs" ? "Programs" : adminTab === "conferences" ? "Conferences" : "Leagues"}
          </button>
          <label style={{
            padding:"7px 14px", borderRadius:8, border:"1px solid #e2e8f0",
            background:"#fff", color:"#475569", fontWeight:600, fontSize:13, cursor:"pointer" }}>
            ⬆ Import {adminTab === "programs" ? "Programs" : adminTab === "conferences" ? "Conferences" : "Leagues"}
            <input type="file" accept=".csv" onChange={handleImportFile} style={{ display:"none" }} />
          </label>
          <button onClick={() => signOut(auth)} style={{
            padding:"7px 14px", borderRadius:8, border:"1px solid #e2e8f0",
            background:"#fff", color:"#475569", fontWeight:600, fontSize:13, cursor:"pointer" }}>
            Sign Out
          </button>
          <button onClick={() => { setEditing(null); setFormMode("add"); }} style={{
            padding:"8px 18px", borderRadius:8, border:"none", background:"#1a56db",
            color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer" }}>
            + Add Program
          </button>
        </div>
      </div>

      {/* Admin tabs */}
      <div style={{ display:"flex", gap:8, marginBottom:20 }}>
        {[["programs","Programs"],["conferences","Conferences"],["leagues","Leagues"]].map(([key, label]) => (
          <button key={key} onClick={() => setAdminTab(key)} style={{
            padding:"9px 20px", borderRadius:10, border:"none", cursor:"pointer",
            fontWeight:600, fontSize:14,
            background: adminTab === key ? "#1a56db" : "#fff",
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
            <h3 style={{ margin:"0 0 12px", color:"#0f172a" }}>Delete Program?</h3>
            <p style={{ margin:"0 0 20px", color:"#475569", fontSize:14 }}>
              Are you sure you want to delete <strong>{deleteTarget.school}</strong>? This cannot be undone.
            </p>
            <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
              <button onClick={() => setDeleteTarget(null)} style={{
                padding:"8px 18px", borderRadius:8, border:"1px solid #e2e8f0",
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
            <h3 style={{ margin:"0 0 12px", color:"#0f172a" }}>Confirm Import</h3>
            <p style={{ margin:"0 0 8px", color:"#475569", fontSize:14 }}>
              <strong>{importPreview.length} programs</strong> parsed from CSV.
              These will be added as new records — existing programs are not replaced.
            </p>
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
              <div style={{ margin:"16px 0 0", fontSize:13, color:"#1a56db" }}>
                Importing {importProgress} / {importPreview.length}...
              </div>
            )}
            <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:20 }}>
              <button onClick={() => setImportPreview(null)} disabled={importing} style={{
                padding:"8px 18px", borderRadius:8, border:"1px solid #e2e8f0",
                background:"#fff", color:"#475569", fontWeight:600, cursor:"pointer" }}>
                Cancel
              </button>
              <button onClick={handleImportConfirm} disabled={importing} style={{
                padding:"8px 18px", borderRadius:8, border:"none",
                background: importing ? "#93c5fd" : "#1a56db",
                color:"#fff", fontWeight:700, cursor:"pointer" }}>
                {importing ? "Importing..." : `Import ${importPreview.length} Programs`}
              </button>
            </div>
          </div>
        </div>
      )}

      {adminTab === "leagues" && (
        <AdminLeagues leagues={leaguesList} onRefresh={loadLeagues} />
      )}

      {adminTab === "conferences" && (
        <AdminConferences conferences={conferencesList} leagues={leaguesList} onRefresh={loadConferences} />
      )}

      {adminTab === "programs" && (
        <>
          {/* Add new program form (top) */}
          {formMode === "add" && (
            <div style={{ background:"#fff", borderRadius:12, padding:28, marginBottom:20,
              border:"1px solid #e2e8f0", boxShadow:"0 1px 3px rgba(0,0,0,0.06)" }}>
              <h3 style={{ margin:"0 0 20px", fontSize:16, color:"#0f172a" }}>Add New Program</h3>
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

          {/* Search */}
          <div style={{ marginBottom:14 }}>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search programs..."
              style={{ padding:"9px 14px", borderRadius:8, border:"1px solid #e2e8f0",
                fontSize:13, width:280, boxSizing:"border-box" }} />
          </div>

          {/* Table */}
          {loading ? (
            <div style={{ padding:40, textAlign:"center", color:"#64748b" }}>Loading programs...</div>
          ) : (
            <div style={{ background:"#fff", borderRadius:12, border:"1px solid #e2e8f0",
              boxShadow:"0 1px 3px rgba(0,0,0,0.06)", overflow:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                <thead>
                  <tr style={{ background:"#f8fafc", borderBottom:"2px solid #e2e8f0" }}>
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
                          <td style={{ padding:"10px 14px", fontWeight:600, color:"#0f172a" }}>{p.school}</td>
                          <td style={{ padding:"10px 14px", color:"#475569" }}>{p.state}</td>
                          <td style={{ padding:"10px 14px", color:"#475569" }}>{p.gender === "mens" ? "Men's" : "Women's"}</td>
                          <td style={{ padding:"10px 14px", color:"#475569" }}>{p.conference || "—"}</td>
                          <td style={{ padding:"10px 14px" }}>{p.rugbyScholarship ? "✓" : ""}</td>
                          <td style={{ padding:"10px 14px" }}>
                            <div style={{ display:"flex", gap:8 }}>
                              <button onClick={() => { setEditing(p); setFormMode(isEditing ? null : "edit"); }} style={{
                                padding:"5px 12px", borderRadius:6, border:"1px solid #e2e8f0",
                                background: isEditing ? "#eff6ff" : "#fff",
                                color:"#1a56db", fontWeight:600, fontSize:12, cursor:"pointer" }}>
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
                              borderBottom:"2px solid #1a56db" }}>
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

const CSV_COLS = [
  ["school","School"],["state","State"],["city","City"],["gender","Gender"],
  ["conference","Conference"],["league","League"],["ncaaDivision","NCAA Division"],
  ["schoolType","School Type"],["gpa","GPA"],["sat","SAT"],["acceptanceRate","Acceptance Rate"],
  ["enrollment","Enrollment"],["inStateTuition","In-State Tuition"],
  ["outStateTuition","Out-of-State Tuition"],["rugbyRanking","Rugby Ranking"],
  ["rugbyScholarship","Rugby Scholarship"],["schoolFunded","School Funded"],
  ["contact","Coach"],["contactTitle","Coach Title"],["email","Email"],["website","Website"],
];

const CSV_NUM_FIELDS = new Set(["gpa","sat","acceptanceRate","enrollment","inStateTuition","outStateTuition","rugbyRanking"]);
const CSV_BOOL_FIELDS = new Set(["rugbyScholarship","schoolFunded"]);

const CONF_COLS = [
  ["conference","Abbreviation"],["fullName","Full Name"],["league","League"],["email","Email"],
];
const LEAGUE_COLS = [["name","Name"]];

function exportGenericCSV(cols, rows, filename) {
  const header = cols.map(([,l]) => l).join(",");
  const lines = rows.map(r =>
    cols.map(([k]) => {
      const v = r[k]; if (v == null) return "";
      const s = String(v);
      return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g,'""')}"` : s;
    }).join(",")
  );
  const blob = new Blob([[header,...lines].join("\n")], { type:"text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function parseGenericCSV(text, cols) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const labelToKey = Object.fromEntries(cols.map(([k,l]) => [l,k]));
  const headers = parseCSVLine(lines[0]).map(h => labelToKey[h.trim()] || h.trim());
  return lines.slice(1).filter(l => l.trim()).map(line => {
    const vals = parseCSVLine(line);
    const obj = {};
    headers.forEach((key, i) => { if (vals[i]?.trim()) obj[key] = vals[i].trim(); });
    return obj;
  });
}

function exportCSV(programs, filename = "rugby-programs-report.csv") {
  const header = CSV_COLS.map(([,label]) => label).join(",");
  const rows = programs.map(p =>
    CSV_COLS.map(([key]) => {
      const v = p[key];
      if (v == null) return "";
      const s = String(v);
      return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(",")
  );
  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function parseCSVLine(line) {
  const result = []; let cur = ""; let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { if (inQ && line[i+1] === '"') { cur += '"'; i++; } else inQ = !inQ; }
    else if (ch === ',' && !inQ) { result.push(cur); cur = ""; }
    else cur += ch;
  }
  result.push(cur);
  return result;
}

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const labelToKey = Object.fromEntries(CSV_COLS.map(([k, l]) => [l, k]));
  const headers = parseCSVLine(lines[0]).map(h => labelToKey[h.trim()] || h.trim());
  return lines.slice(1).filter(l => l.trim()).map(line => {
    const vals = parseCSVLine(line);
    const obj = {};
    headers.forEach((key, i) => {
      let v = vals[i] ?? "";
      if (CSV_NUM_FIELDS.has(key)) { const n = parseFloat(v); if (!isNaN(n)) obj[key] = n; }
      else if (CSV_BOOL_FIELDS.has(key)) obj[key] = v.toLowerCase() === "true";
      else if (v !== "") obj[key] = v;
    });
    return obj;
  });
}

export default function App() {
  // Hidden admin route — not linked in navigation
  if (window.location.pathname === "/admin") {
    return (
      <div style={{ minHeight: "100vh", background: "#f1f5f9",
        fontFamily: "'Inter', system-ui, sans-serif", padding: "40px 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
            <RugbyBall size={28} />
            <span style={{ fontWeight: 800, fontSize: 18, color: "#0f172a" }}>
              College Rugby Portal — Admin
            </span>
          </div>
          <AdminPage />
        </div>
      </div>
    );
  }

  const [programs, setPrograms] = useState([]);
  const [conferences, setConferences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("programs");
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [viewMode, setViewMode] = useState("cards");

  // Filters
  const [search, setSearch] = useState("");
  const [genderFilter, setGenderFilter] = useState("all");
  const [stateFilter, setStateFilter] = useState("");
  const [conferenceFilter, setConferenceFilter] = useState("");
  const [leagueFilter, setLeagueFilter] = useState("");
  const [minGPA, setMinGPA] = useState("");
  const [maxTuition, setMaxTuition] = useState("");
  const [scholarshipOnly, setScholarshipOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const CACHE_KEY = "crp_cache";
    const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

    async function fetchData() {
      // Try cache first
      try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (raw) {
          const { ts, programs: p, conferences: c } = JSON.parse(raw);
          if (Date.now() - ts < CACHE_TTL) {
            setPrograms(p);
            setConferences(c);
            setLoading(false);
            return;
          }
        }
      } catch (_) { /* ignore bad cache */ }

      // Cache miss or expired — fetch from Firestore
      try {
        const [progSnap, confSnap] = await Promise.all([
          getDocs(collection(db, "programs")),
          getDocs(collection(db, "conferences")),
        ]);
        const p = progSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const c = confSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setPrograms(p);
        setConferences(c);
        localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), programs: p, conferences: c }));
      } catch (e) {
        setError("Failed to load data. Please check your Firebase config.");
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const uniqueLeagues = useMemo(() =>
    [...new Set(programs.map(p => p.league).filter(Boolean))].sort(), [programs]);

  const uniqueConferences = useMemo(() => {
    const source = leagueFilter
      ? programs.filter(p => p.league === leagueFilter)
      : programs;
    return [...new Set(source.map(p => p.conference).filter(Boolean))].sort();
  }, [programs, leagueFilter]);

  const filtered = useMemo(() => {
    return programs.filter(p => {
      if (genderFilter !== "all" && p.gender !== genderFilter) return false;
      if (stateFilter && p.state !== stateFilter) return false;
      if (conferenceFilter && p.conference !== conferenceFilter) return false;
      if (leagueFilter && p.league !== leagueFilter) return false;
      if (minGPA && (!p.gpa || p.gpa < parseFloat(minGPA))) return false;
      if (maxTuition) {
        const tuition = p.inStateTuition;
        if (!tuition || tuition > parseInt(maxTuition)) return false;
      }
      if (scholarshipOnly && !p.rugbyScholarship) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          p.school?.toLowerCase().includes(q) ||
          p.city?.toLowerCase().includes(q) ||
          p.conference?.toLowerCase().includes(q) ||
          p.contact?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [programs, search, genderFilter, stateFilter, conferenceFilter, leagueFilter, minGPA, maxTuition, scholarshipOnly]);

  const confSearch = useMemo(() => {
    if (!search || activeTab !== "conferences") return conferences;
    const q = search.toLowerCase();
    return conferences.filter(c =>
      c.conference?.toLowerCase().includes(q) ||
      c.fullName?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q)
    );
  }, [conferences, search, activeTab]);

  const activeFiltersCount = [stateFilter, conferenceFilter, leagueFilter, minGPA, maxTuition, scholarshipOnly].filter(Boolean).length;
  const [disclaimerDismissed, setDisclaimerDismissed] = useState(false);

  if (loading) return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      height: "100vh", flexDirection: "column", gap: 20, position: "relative",
      backgroundImage: "url('/rugby.jpg')",
      backgroundSize: "cover", backgroundPosition: "center 40%",
    }}>
      <div style={{ position: "absolute", inset: 0,
        background: "linear-gradient(to right, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.55) 50%, rgba(0,0,0,0.75) 100%)" }} />
      <div style={{ position: "relative", animation: "spin 1.2s linear infinite", display: "flex" }}>
        <RugbyBall size={64} />
      </div>
      <div style={{ position: "relative", fontSize: 20, fontWeight: 700, color: "#fff", letterSpacing: "-0.01em" }}>
        College Rugby Portal
      </div>
      <div style={{ position: "relative", fontSize: 14, color: "#93c5fd" }}>Loading programs...</div>
      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  );

  if (error) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center",
      height: "100vh", flexDirection: "column", gap: 16, background: "#f8fafc", padding: 24 }}>
      <div style={{ fontSize: 40 }}>⚠️</div>
      <div style={{ fontSize: 18, fontWeight: 600, color: "#dc2626", textAlign: "center" }}>{error}</div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#f1f5f9", fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* Header */}
      <div style={{
        backgroundImage: "url('/rugby.jpg')",
        backgroundSize: "cover", backgroundPosition: "center 40%",
        padding: "36px 24px 88px", color: "#fff", position: "relative", overflow: "hidden",
      }}>
        {/* Dark vignette overlay — lets the gritty photo show through */}
        <div style={{ position: "absolute", inset: 0,
          background: "linear-gradient(to right, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.45) 50%, rgba(0,0,0,0.65) 100%)",
          pointerEvents: "none" }} />
        {/* Bottom fade into page background */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 80,
          background: "linear-gradient(to bottom, transparent, rgba(241,245,249,0.15))",
          pointerEvents: "none" }} />

        <div style={{ maxWidth: 1100, margin: "0 auto", position: "relative" }}>

          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 10 }}>
            <RugbyBall size={38} />
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em",
              background: "linear-gradient(90deg, #fff 0%, #93c5fd 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              College Rugby Portal
            </h1>
          </div>

          <p style={{ margin: "0 0 28px", color: "#93c5fd", fontSize: 15 }}>
            Find your perfect college rugby program — {programs.length} programs across the USA
          </p>

          {/* Search bar */}
          <div style={{ position: "relative", maxWidth: 600 }}>
            <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
              fontSize: 16, color: "#94a3b8" }}>🔍</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search schools, cities, conferences, coaches..."
              style={{
                width: "100%", padding: "14px 16px 14px 44px", border: "none",
                borderRadius: 12, fontSize: 15, outline: "none", boxSizing: "border-box",
                boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
              }}
            />
          </div>
        </div>
      </div>

      {/* Main content */}
      <div style={{ maxWidth: 1100, margin: "-48px auto 40px", padding: "0 24px", position: "relative", zIndex: 1 }}>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {[
            { key: "programs", label: `Programs (${filtered.length})` },
            { key: "conferences", label: `Conferences (${conferences.length})` },
            { key: "contact", label: "📬 Submit Info" },
            { key: "about", label: "About" },
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
              padding: "10px 20px", borderRadius: 10, border: "none", cursor: "pointer",
              fontWeight: 600, fontSize: 14, transition: "all 0.15s",
              background: activeTab === tab.key ? "#1a56db" : "#fff",
              color: activeTab === tab.key ? "#fff" : "#475569",
              boxShadow: activeTab === tab.key ? "0 4px 12px rgba(26,86,219,0.3)" : "0 1px 3px rgba(0,0,0,0.08)",
            }}>{tab.label}</button>
          ))}
        </div>

        {/* Data disclaimer banner */}
        {!disclaimerDismissed && (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            gap: 12, background: "#fffbeb", border: "1px solid #fde68a",
            borderRadius: 10, padding: "10px 16px", marginBottom: 16, flexWrap: "wrap",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#92400e" }}>
              <span style={{ fontSize: 16 }}>⚠️</span>
              <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span>Program data was collected from public sources and may not be fully up to date.</span>
                <span>
                  See something incorrect?{" "}
                  <button onClick={() => setActiveTab("contact")} style={{
                    background: "none", border: "none", padding: 0, color: "#b45309",
                    fontWeight: 700, cursor: "pointer", fontSize: 13, textDecoration: "underline",
                  }}>Submit a correction</button>
                  {" "}and we'll review it promptly.
                </span>
              </span>
            </div>
            <button onClick={() => setDisclaimerDismissed(true)} style={{
              background: "none", border: "none", fontSize: 18, cursor: "pointer",
              color: "#d97706", lineHeight: 1, flexShrink: 0,
            }}>×</button>
          </div>
        )}

        {activeTab === "programs" && (
          <>
            {/* Filter bar */}
            <div style={{ background: "#fff", borderRadius: 12, padding: 16, marginBottom: 20,
              boxShadow: "0 1px 3px rgba(0,0,0,0.06)", display: "flex", gap: 10, flexWrap: "wrap",
              alignItems: "center" }}>

              {/* Gender */}
              <div style={{ display: "flex", borderRadius: 8, overflow: "hidden", border: "1px solid #e2e8f0" }}>
                {[["all","All"],["mens","Men's"],["womens","Women's"]].map(([val, label]) => (
                  <button key={val} onClick={() => setGenderFilter(val)} style={{
                    padding: "7px 14px", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
                    background: genderFilter === val ? "#1a56db" : "#fff",
                    color: genderFilter === val ? "#fff" : "#64748b",
                  }}>{label}</button>
                ))}
              </div>

              <select value={stateFilter} onChange={e => setStateFilter(e.target.value)}
                style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0",
                  fontSize: 13, color: "#475569", background: "#fff", cursor: "pointer" }}>
                <option value="">All States</option>
                {Object.entries(US_STATES).sort((a,b) => a[1].localeCompare(b[1])).map(([abbr, name]) => (
                  <option key={abbr} value={abbr}>{name}</option>
                ))}
              </select>

              <select value={leagueFilter} onChange={e => { setLeagueFilter(e.target.value); setConferenceFilter(""); }}
                style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0",
                  fontSize: 13, color: "#475569", background: "#fff", cursor: "pointer", maxWidth: 180 }}>
                <option value="">All Leagues</option>
                {uniqueLeagues.map(l => <option key={l} value={l}>{l}</option>)}
              </select>

              <select value={conferenceFilter} onChange={e => setConferenceFilter(e.target.value)}
                style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0",
                  fontSize: 13, color: "#475569", background: "#fff", cursor: "pointer", maxWidth: 200 }}>
                <option value="">All Conferences</option>
                {uniqueConferences.map(c => <option key={c} value={c}>{c}</option>)}
              </select>

              <button onClick={() => setShowFilters(!showFilters)} style={{
                padding: "8px 14px", borderRadius: 8, border: "1px solid #e2e8f0",
                background: showFilters ? "#f0f7ff" : "#fff", color: "#475569",
                cursor: "pointer", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6,
              }}>
                ⚙ More Filters {activeFiltersCount > 0 && (
                  <span style={{ background: "#1a56db", color: "#fff", borderRadius: "50%",
                    width: 18, height: 18, fontSize: 11, display: "flex", alignItems: "center",
                    justifyContent: "center" }}>{activeFiltersCount}</span>
                )}
              </button>

              {(stateFilter || conferenceFilter || leagueFilter || minGPA || maxTuition || scholarshipOnly) && (
                <button onClick={() => { setStateFilter(""); setConferenceFilter(""); setLeagueFilter("");
                  setMinGPA(""); setMaxTuition(""); setScholarshipOnly(false); }}
                  style={{ padding: "8px 12px", borderRadius: 8, border: "none",
                    background: "#fee2e2", color: "#dc2626", cursor: "pointer",
                    fontSize: 13, fontWeight: 600 }}>✕ Clear</button>
              )}
            </div>

            {/* Advanced filters */}
            {showFilters && (
              <div style={{ background: "#fff", borderRadius: 12, padding: 16, marginBottom: 20,
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)", display: "flex", gap: 16, flexWrap: "wrap",
                alignItems: "flex-end" }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600,
                    color: "#64748b", marginBottom: 6 }}>Min GPA</label>
                  <input type="number" value={minGPA} onChange={e => setMinGPA(e.target.value)}
                    placeholder="e.g. 3.5" step="0.1" min="0" max="4"
                    style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0",
                      fontSize: 13, width: 100 }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600,
                    color: "#64748b", marginBottom: 6 }}>Max In-State Tuition ($)</label>
                  <input type="number" value={maxTuition} onChange={e => setMaxTuition(e.target.value)}
                    placeholder="e.g. 20000" step="1000"
                    style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0",
                      fontSize: 13, width: 140 }} />
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer",
                  fontSize: 13, fontWeight: 600, color: "#475569" }}>
                  <input type="checkbox" checked={scholarshipOnly}
                    onChange={e => setScholarshipOnly(e.target.checked)}
                    style={{ width: 16, height: 16, cursor: "pointer" }} />
                  Rugby Scholarships Only
                </label>
              </div>
            )}

            {/* Results count + view toggle + export */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
              <div style={{ fontSize: 13, color: "#64748b", flex: 1 }}>
                Showing <strong>{filtered.length}</strong> of {programs.length} programs
              </div>

              {/* View toggle */}
              <div style={{ display: "flex", borderRadius: 8, overflow: "hidden", border: "1px solid #e2e8f0" }}>
                {[["cards","⊞ Cards"],["table","≡ Table"]].map(([mode, label]) => (
                  <button key={mode} onClick={() => setViewMode(mode)} style={{
                    padding: "7px 14px", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
                    background: viewMode === mode ? "#1a56db" : "#fff",
                    color: viewMode === mode ? "#fff" : "#64748b",
                  }}>{label}</button>
                ))}
              </div>

              {/* Export CSV */}
              <button onClick={() => exportCSV(filtered)} style={{
                padding: "7px 16px", borderRadius: 8, border: "1px solid #e2e8f0",
                background: "#fff", color: "#475569", cursor: "pointer",
                fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6,
              }}>⬇ Export Report ({filtered.length})</button>
            </div>

            {/* Program grid or table */}
            {filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 24px", color: "#94a3b8" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
                <div style={{ fontSize: 17, fontWeight: 600 }}>No programs found</div>
                <div style={{ fontSize: 14, marginTop: 8 }}>Try adjusting your filters</div>
              </div>
            ) : viewMode === "cards" ? (
              <div style={{ display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
                {filtered.map((p, i) => (
                  <ProgramCard key={p.id || i} program={p} onClick={setSelectedProgram} />
                ))}
              </div>
            ) : (
              <ProgramTable programs={filtered} onRowClick={setSelectedProgram} />
            )}
          </>
        )}

        {activeTab === "contact" && <ContactPage programs={programs} />}
        {activeTab === "about" && <AboutPage />}

        {activeTab === "conferences" && (
          <>
            <div style={{ fontSize: 13, color: "#64748b", marginBottom: 20 }}>
              {confSearch.length} conferences across {uniqueLeagues.length} leagues
            </div>
            {(() => {
              // Group conferences by league
              const confByLeague = {};
              confSearch.forEach(c => {
                const league = c.league || "Other";
                if (!confByLeague[league]) confByLeague[league] = [];
                confByLeague[league].push(c);
              });
              const leagueOrder = [...uniqueLeagues, "Other"];
              return leagueOrder.filter(l => confByLeague[l]).map(league => (
                <div key={league} style={{ marginBottom: 32 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                    <div style={{ fontWeight: 800, fontSize: 16, color: "#0f172a" }}>{league}</div>
                    <div style={{ fontSize: 12, color: "#94a3b8", background: "#f1f5f9",
                      borderRadius: 20, padding: "2px 10px" }}>
                      {confByLeague[league].length} conferences
                    </div>
                    <button onClick={() => { setLeagueFilter(league); setConferenceFilter(""); setActiveTab("programs"); }}
                      style={{ fontSize: 12, color: "#1a56db", background: "none", border: "none",
                        cursor: "pointer", fontWeight: 600, padding: 0 }}>
                      View all programs →
                    </button>
                  </div>
                  <div style={{ display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 10 }}>
                    {confByLeague[league].map((c, i) => {
                      const count = programs.filter(p => p.conference === c.conference).length;
                      return (
                        <ConferenceCard key={c.id || i} conf={c} programCount={count}
                          onClick={() => {
                            setLeagueFilter(league);
                            setConferenceFilter(c.conference);
                            setActiveTab("programs");
                          }} />
                      );
                    })}
                  </div>
                </div>
              ));
            })()}
          </>
        )}
      </div>

      {/* Program detail modal */}
      <ProgramModal program={selectedProgram} onClose={() => setSelectedProgram(null)} />

      <Footer onNavigate={setActiveTab} />
    </div>
  );
}
