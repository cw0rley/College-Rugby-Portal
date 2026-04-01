import React, { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ProgramCard from "./ProgramCard.jsx";
import Avatar from "./ui/Avatar.jsx";

export default function ConferenceDetailPage({
  programs, conferences, confNameMap, contactsByProgramId,
  onSelectProgram, onToggleCompare, compareIds,
  favoriteIds, onToggleFavorite, isMobile,
}) {
  const { abbr } = useParams();
  const navigate = useNavigate();
  const [genderFilter, setGenderFilter] = useState("all");

  const conf = conferences.find(c => c.conference === abbr);
  const fullName = confNameMap?.[abbr] || conf?.fullName || abbr;

  // All programs in this conference
  const allPrograms = useMemo(() =>
    programs.filter(p => p.conference === abbr || p.conference?.includes(abbr)),
    [programs, abbr]
  );

  // Check which genders exist
  const hasGenders = useMemo(() => {
    const genders = new Set(allPrograms.map(p => p.gender));
    return { mens: genders.has("mens"), womens: genders.has("womens"), both: genders.has("mens") && genders.has("womens") };
  }, [allPrograms]);

  // Apply gender filter
  const filtered = useMemo(() => {
    let list = allPrograms;
    if (genderFilter !== "all") list = list.filter(p => p.gender === genderFilter);
    return list.map(p => ({
      ...p,
      _contacts: (contactsByProgramId[p.id] || []).map(c => ({
        name: c.contact, title: c.contactTitle, email: c.email,
      })),
    })).sort((a, b) => (a.school || "").localeCompare(b.school || ""));
  }, [allPrograms, genderFilter, contactsByProgramId]);

  if (!conf && allPrograms.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: 60 }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>&#128269;</div>
        <h2 style={{ color: "#0A1F44", margin: "0 0 8px" }}>Conference not found</h2>
        <p style={{ color: "#64748b", fontSize: 14, marginBottom: 20 }}>
          No conference matches "{abbr}".
        </p>
        <button onClick={() => navigate("/conferences")} style={{
          padding: "10px 24px", borderRadius: 8, border: "none",
          background: "#0A1F44", color: "#fff", fontWeight: 600,
          fontSize: 14, cursor: "pointer",
        }}>Back to Conferences</button>
      </div>
    );
  }

  return (
    <>
      {/* Back link */}
      <button onClick={() => navigate("/conferences")} style={{
        background: "none", border: "none", color: "#1a56db", cursor: "pointer",
        fontWeight: 600, fontSize: 13, padding: 0, marginBottom: 20, display: "flex",
        alignItems: "center", gap: 6,
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        All Conferences
      </button>

      {/* Conference header */}
      <div style={{
        background: "#fff", borderRadius: 12, padding: isMobile ? 20 : 28,
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)", marginBottom: 24,
        display: "flex", alignItems: isMobile ? "flex-start" : "center",
        gap: 18, flexDirection: isMobile ? "column" : "row",
      }}>
        <Avatar name={fullName} size={56} />
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: isMobile ? 20 : 24, fontWeight: 800, color: "#0A1F44" }}>
            {fullName}
          </h1>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 6, fontSize: 13, color: "#64748b" }}>
            <span style={{
              background: "#f1f5f9", borderRadius: 20, padding: "2px 10px",
              fontWeight: 600, color: "#475569",
            }}>{abbr}</span>
            {conf?.notes && <span>{conf.notes}</span>}
          </div>
        </div>
        <div style={{ textAlign: "center", flexShrink: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 28, color: "#0A1F44" }}>{allPrograms.length}</div>
          <div style={{ fontSize: 12, color: "#94a3b8" }}>programs</div>
        </div>
      </div>

      {/* Gender toggle — only shown if conference has both genders */}
      {hasGenders.both && (
        <div style={{
          display: "flex", borderRadius: 8, overflow: "hidden",
          border: "1px solid #e2e8f0", marginBottom: 20,
          width: isMobile ? "100%" : "auto", alignSelf: "flex-start",
        }}>
          {[["all", `All (${allPrograms.length})`], ["mens", `Men's (${allPrograms.filter(p => p.gender === "mens").length})`], ["womens", `Women's (${allPrograms.filter(p => p.gender === "womens").length})`]].map(([val, label]) => (
            <button key={val} onClick={() => setGenderFilter(val)} style={{
              padding: "7px 14px", border: "none", cursor: "pointer",
              fontSize: 13, fontWeight: 600,
              flex: isMobile ? 1 : "none",
              background: genderFilter === val ? "#1a56db" : "#fff",
              color: genderFilter === val ? "#fff" : "#64748b",
            }}>{label}</button>
          ))}
        </div>
      )}

      {/* Results count */}
      <div style={{ fontSize: 13, color: "#64748b", marginBottom: 16 }}>
        {filtered.length} program{filtered.length !== 1 ? "s" : ""}
      </div>

      {/* Program grid */}
      <div className="crp-card-grid" style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(300px, 1fr))",
        gap: isMobile ? 12 : 10,
      }}>
        {filtered.map(p => (
          <ProgramCard
            key={p.id}
            program={p}
            onClick={onSelectProgram}
            isComparing={compareIds.includes(p.id)}
            onToggleCompare={onToggleCompare}
            isFavorited={favoriteIds.has(p.id)}
            onToggleFavorite={onToggleFavorite}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: 40, color: "#94a3b8", fontSize: 14 }}>
          No programs found for this filter.
        </div>
      )}
    </>
  );
}
