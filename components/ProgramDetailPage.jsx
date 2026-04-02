import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { doc, getDoc, collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase.js";
import SchoolLogo from "./ui/SchoolLogo.jsx";
import Badge from "./ui/Badge.jsx";

function renderMarkdown(text) {
  if (!text) return null;
  // Sanitize HTML entities
  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const lines = text.split("\n");
  const html = lines.map(line => {
    // Headers
    if (/^### (.+)/.test(line)) return `<h4 style="margin:12px 0 4px;font-size:14px;font-weight:700;color:#0A1F44">${esc(line.slice(4))}</h4>`;
    if (/^## (.+)/.test(line)) return `<h3 style="margin:14px 0 4px;font-size:15px;font-weight:700;color:#0A1F44">${esc(line.slice(3))}</h3>`;
    if (/^# (.+)/.test(line)) return `<h3 style="margin:16px 0 6px;font-size:16px;font-weight:800;color:#0A1F44">${esc(line.slice(2))}</h3>`;
    // List items
    if (/^[-*] (.+)/.test(line)) {
      const content = esc(line.slice(2));
      return `<div style="display:flex;gap:8px;margin:2px 0 2px 8px"><span style="color:#00CC00;font-weight:700">&#8226;</span><span>${applyInline(content)}</span></div>`;
    }
    // Empty line
    if (line.trim() === "") return `<div style="height:8px"></div>`;
    // Regular paragraph
    return `<p style="margin:4px 0">${applyInline(esc(line))}</p>`;
  }).join("");

  function applyInline(s) {
    return s
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/\[(.+?)\]\((https?:\/\/.+?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color:#00CC00;font-weight:600;text-decoration:none">$1</a>');
  }

  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}

function StatRow({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0",
      borderBottom: "1px solid #E5E7EB" }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b",
        textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: "#0A1F44" }}>{value}</span>
    </div>
  );
}

function SectionHeader({ children }) {
  return (
    <div style={{ fontSize: 12, fontWeight: 800, color: "#0A1F44", textTransform: "uppercase",
      letterSpacing: "0.06em", padding: "14px 0 6px",
      borderBottom: "2px solid #0A1F44", marginBottom: 4 }}>
      {children}
    </div>
  );
}

const HeartIcon = ({ filled, size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? "#dc2626" : "none"}
    stroke={filled ? "#dc2626" : "#94a3b8"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

export default function ProgramDetailPage({ programs = [], confNameMap = {}, user, favoriteIds = new Set(), onToggleFavorite, coachProgramIds = [], onOpenMessage, onToggleCompare, compareIds = [] }) {
  const { id } = useParams();
  const navigate = useNavigate();

  const backTo = sessionStorage.getItem("programListFrom") || "/";
  const backLabel = backTo === "/rankings" ? "Back to rankings"
    : backTo === "/leagues" ? "Back to leagues"
    : backTo.startsWith("/conference") ? "Back to conference"
    : backTo === "/favorites" ? "Back to favorites"
    : "Back to programs";

  function goBack() {
    navigate(backTo, { state: { restoreScroll: true } });
  }

  // Scroll to top when arriving at a program detail page
  useEffect(() => { window.scrollTo(0, 0); }, [id]);

  const [fetchedProgram, setFetchedProgram] = useState(null);
  const [fetchedContacts, setFetchedContacts] = useState([]);
  const [loading, setLoading] = useState(false);

  // Try to find program from props first
  const fromProps = programs.find(p => p.id === id);
  const program = fromProps || fetchedProgram;

  // Fallback: fetch from Firestore if not found in props (direct URL access)
  useEffect(() => {
    if (fromProps || !id) return;
    setLoading(true);
    async function fetchProgram() {
      try {
        const snap = await getDoc(doc(db, "programs", id));
        if (snap.exists()) {
          setFetchedProgram({ id: snap.id, ...snap.data() });
          // Also fetch contacts for this program
          const cSnap = await getDocs(query(collection(db, "programContacts"), where("programId", "==", id)));
          setFetchedContacts(cSnap.docs.map(d => ({ name: d.data().contact, title: d.data().contactTitle, email: d.data().email })));
        }
      } catch (err) {
        console.error("Failed to fetch program:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchProgram();
  }, [id, fromProps]);

  // Set document title
  useEffect(() => {
    if (program) {
      document.title = `${program.school} — College Rugby Portal`;
    }
    return () => { document.title = "College Rugby Portal"; };
  }, [program]);

  const isMobile = Math.min(window.innerWidth, screen.width) <= 900;

  if (loading) return (
    <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>Loading program...</div>
  );

  if (!program) return (
    <div style={{ textAlign: "center", padding: "60px 24px" }}>
      <div style={{ fontSize: 40, marginBottom: 16 }}>🔍</div>
      <div style={{ fontSize: 17, fontWeight: 600, color: "#0A1F44", marginBottom: 12 }}>Program not found</div>
      <a onClick={() => goBack()} style={{ color: "#1a56db", fontWeight: 600, fontSize: 14, textDecoration: "none", cursor: "pointer" }}>
        ← {backLabel}
      </a>
    </div>
  );

  const genderColor = program.gender === "mens" ? "#0A1F44" : "#d61f69";
  const contacts = program._contacts || fetchedContacts || [];
  const confDisplay = program.conference
    ? (confNameMap[program.conference] || program.conference)
    : null;
  const isFavorited = favoriteIds.has(program.id);
  const isComparing = compareIds.includes(program.id);

  return (
    <div>
      {/* Back link */}
      <a onClick={() => goBack()} style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        color: "#1a56db", fontWeight: 600, fontSize: 14, textDecoration: "none",
        marginBottom: 20, cursor: "pointer",
      }}>
        ← {backLabel}
      </a>

      <div style={{
        background: "#fff", borderRadius: 16,
        boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
        overflow: "hidden",
      }}>

        {/* Sidebar / Top section */}
        <div style={{
          width: isMobile ? "100%" : 280,
          flexShrink: 0,
          padding: isMobile ? "24px 20px" : "32px 24px",
          background: "#F4F4F4",
          borderRight: isMobile ? "none" : "1px solid #E5E7EB",
          borderBottom: isMobile ? "1px solid #E5E7EB" : "none",
          display: "flex", flexDirection: "column", gap: 16,
        }}>

          <div style={{ textAlign: "center" }}>
            <SchoolLogo program={program} size={isMobile ? 64 : 80} />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 12 }}>
              <h1 style={{ margin: "0 0 4px", fontSize: isMobile ? 18 : 22, fontWeight: 800, color: "#0A1F44",
                lineHeight: 1.2 }}>{program.school}</h1>
              {onToggleFavorite && (
                <button
                  onClick={() => onToggleFavorite(program.id)}
                  style={{
                    background: "none", border: "none", cursor: "pointer", padding: 2,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}
                  title={isFavorited ? "Remove from favorites" : "Add to favorites"}
                >
                  <HeartIcon filled={isFavorited} size={24} />
                </button>
              )}
            </div>
            <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap", marginTop: 8 }}>
              <Badge label={program.gender === "mens" ? "Men's" : "Women's"} color={genderColor} />
              {program.league && <Badge label={program.league} color="#00CC00" />}
            </div>
          </div>

          {/* Compare button */}
          {onToggleCompare && (
            <button
              onClick={() => onToggleCompare(program.id)}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                padding: "8px 14px", borderRadius: 8,
                border: isComparing ? "1px solid #00CC00" : "1px solid #E5E7EB",
                background: isComparing ? "rgba(0,204,0,0.08)" : "#fff",
                color: isComparing ? "#00CC00" : "#64748b",
                cursor: "pointer", fontSize: 13, fontWeight: 600,
              }}
            >
              {isComparing ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                </svg>
              )}
              {isComparing ? "Comparing" : "Compare"}
            </button>
          )}

          {/* Address */}
          <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.6, textAlign: "center" }}>
            {program.city && <div>{program.city}{program.state ? `, ${program.state}` : ""}</div>}
            {!program.city && program.state && <div>{program.state}</div>}
          </div>

          {/* Links */}
          {program.website && (
            <a href={program.website} target="_blank" rel="noreferrer" style={{
              fontSize: 13, color: "#00CC00", fontWeight: 600, textDecoration: "none",
              wordBreak: "break-all",
            }}>{program.website.replace(/^https?:\/\/(www\.)?/, "")}</a>
          )}
          {program.rugbyWebsite && (
            <a href={program.rugbyWebsite} target="_blank" rel="noreferrer" style={{
              fontSize: 13, color: "#00CC00", fontWeight: 600, textDecoration: "none",
              wordBreak: "break-all",
            }}>Rugby: {program.rugbyWebsite.replace(/^https?:\/\/(www\.)?/, "")}</a>
          )}

          {/* Contacts */}
          {contacts.length > 0 && (
            <div style={{ borderTop: "1px solid #E5E7EB", paddingTop: 14 }}>
              {[...contacts].sort((a, b) => {
                const aHead = (a.title || "").toLowerCase().includes("head coach") ? 0 : 1;
                const bHead = (b.title || "").toLowerCase().includes("head coach") ? 0 : 1;
                return aHead - bHead;
              }).map((ct, i) => (
                <div key={i} style={{ marginBottom: i < contacts.length - 1 ? 16 : 0 }}>
                  {ct.title && (
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b",
                      textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 2 }}>
                      {ct.title}
                    </div>
                  )}
                  {ct.name && <div style={{ fontSize: 14, fontWeight: 600, color: "#0A1F44" }}>{ct.name}</div>}
                  {ct.email && (
                    <a href={`mailto:${ct.email}`} style={{
                      display: "block", fontSize: 12, color: "#00CC00", textDecoration: "none",
                      marginTop: 2, wordBreak: "break-all",
                    }}>{ct.email}</a>
                  )}
                  {/* Message button - hidden for now */}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Content section */}
        <div style={{ flex: 1, padding: isMobile ? "20px" : "28px 32px", minWidth: 0 }}>

          {/* Badges row */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
            {program.ncaaDivision && <Badge label={program.ncaaDivision} color="#0694a2" />}
            {program.schoolType && <Badge label={program.schoolType} color="#64748b" />}
            {program.rugbyScholarship && <Badge label="Rugby Scholarship" color="#00CC00" />}
            {program.schoolFunded && <Badge label="School Funded" color="#ff5a1f" />}
          </div>

          {/* Academics */}
          <SectionHeader>Academics</SectionHeader>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "0 24px" }}>
            <StatRow label="Avg GPA" value={program.gpa ? program.gpa.toFixed(2) : null} />
            <StatRow label="Avg SAT" value={program.sat ? program.sat.toFixed(0) : null} />
            <StatRow label="Acceptance Rate" value={program.acceptanceRate ? `${program.acceptanceRate}%` : null} />
            {program.usNewsRank && (
              <StatRow label={program.usNewsCategory ? `US News (${program.usNewsCategory})` : "US News Rank"} value={
                program.usNewsUrl
                  ? <a href={program.usNewsUrl} target="_blank" rel="noreferrer" style={{ color: "#00CC00", textDecoration: "none", fontWeight: 600 }}>#{program.usNewsRank}</a>
                  : `#${program.usNewsRank}`
              } />
            )}
            <StatRow label="Enrollment" value={program.enrollment ? program.enrollment.toLocaleString() : null} />
          </div>
          {program.topPrograms && (
            <div style={{ marginTop: 8, fontSize: 13, color: "#475569", lineHeight: 1.6 }}>
              <span style={{ fontWeight: 700, color: "#0A1F44" }}>Top Programs: </span>
              {program.topPrograms}
            </div>
          )}

          {/* Tuition */}
          <SectionHeader>Tuition</SectionHeader>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "0 24px" }}>
            <StatRow label="In-State Tuition" value={program.inStateTuition ? `$${program.inStateTuition.toLocaleString()}` : null} />
            <StatRow label="Out-of-State Tuition" value={program.outStateTuition ? `$${program.outStateTuition.toLocaleString()}` : null} />
          </div>

          {/* Rugby */}
          <SectionHeader>Rugby</SectionHeader>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "0 24px" }}>
            <StatRow label="Gender" value={program.gender === "mens" ? "Men's Team" : "Women's Team"} />
            <StatRow label="National Ranking" value={program.rugbyRanking ? `#${program.rugbyRanking}` : null} />
            <StatRow label="Conference" value={confDisplay} />
            <StatRow label="League" value={program.league} />
            <StatRow label="Scholarship" value={program.rugbyScholarship ? "Yes" : "No"} />
            <StatRow label="School Funded" value={program.schoolFunded ? "Yes" : "No"} />
          </div>

          {/* Notes / Bio */}
          {program.notes && (
            <>
              <SectionHeader>Program Notes</SectionHeader>
              <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.8, padding: "8px 0" }}>
                {renderMarkdown(program.notes)}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
