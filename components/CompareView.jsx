import React from "react";
import SchoolLogo from "./ui/SchoolLogo.jsx";

function fmt(val) {
  if (val === null || val === undefined || val === "") return "\u2014";
  return val;
}

function fmtMoney(val) {
  if (!val) return "\u2014";
  return "$" + Number(val).toLocaleString();
}

function fmtPct(val) {
  if (!val && val !== 0) return "\u2014";
  return val + "%";
}

function fmtNum(val) {
  if (!val && val !== 0) return "\u2014";
  return Number(val).toLocaleString();
}

function bestValue(programs, getter, mode) {
  const vals = programs.map(p => {
    const v = getter(p);
    return (v !== null && v !== undefined && v !== "" && v !== "\u2014") ? Number(v) : null;
  });
  if (vals.every(v => v === null)) return -1;
  if (mode === "low") {
    let best = Infinity, idx = -1;
    vals.forEach((v, i) => { if (v !== null && v < best) { best = v; idx = i; } });
    return idx;
  }
  if (mode === "high") {
    let best = -Infinity, idx = -1;
    vals.forEach((v, i) => { if (v !== null && v > best) { best = v; idx = i; } });
    return idx;
  }
  return -1;
}

function CompareRow({ label, programs, getter, formatter, highlight }) {
  const bestIdx = highlight ? bestValue(programs, getter, highlight) : -1;
  return (
    <div style={{ display: "flex", borderBottom: "1px solid #E5E7EB" }}>
      <div style={{
        width: 140, minWidth: 140, flexShrink: 0,
        padding: "10px 12px", fontSize: 11, fontWeight: 700,
        color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em",
        display: "flex", alignItems: "center",
      }}>{label}</div>
      {programs.map((p, i) => {
        const raw = getter(p);
        const display = formatter ? formatter(raw) : fmt(raw);
        const isBest = bestIdx === i;
        return (
          <div key={p.id} style={{
            width: 280, minWidth: 280, flexShrink: 0,
            padding: "10px 16px", fontSize: 13, fontWeight: 600, color: "#0A1F44",
            background: isBest ? "rgba(0,255,0,0.08)" : "transparent",
            display: "flex", alignItems: "center",
          }}>{display}</div>
        );
      })}
    </div>
  );
}

function LinkRow({ label, programs, getter, linkText }) {
  return (
    <div style={{ display: "flex", borderBottom: "1px solid #E5E7EB" }}>
      <div style={{
        width: 140, minWidth: 140, flexShrink: 0,
        padding: "10px 12px", fontSize: 11, fontWeight: 700,
        color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em",
        display: "flex", alignItems: "center",
      }}>{label}</div>
      {programs.map(p => {
        const url = getter(p);
        return (
          <div key={p.id} style={{
            width: 280, minWidth: 280, flexShrink: 0,
            padding: "10px 16px", fontSize: 13,
          }}>
            {url ? (
              <a href={url} target="_blank" rel="noopener noreferrer" style={{
                color: "#00CC00", fontWeight: 600, textDecoration: "none",
              }}>{linkText || "View"}</a>
            ) : "\u2014"}
          </div>
        );
      })}
    </div>
  );
}

function SectionHeader({ label, colCount }) {
  return (
    <div style={{
      display: "flex", borderBottom: "2px solid #0A1F44",
      background: "#f8fafc",
    }}>
      <div style={{
        width: 140, minWidth: 140, flexShrink: 0,
        padding: "10px 12px", fontSize: 12, fontWeight: 800,
        color: "#0A1F44", textTransform: "uppercase", letterSpacing: "0.05em",
      }}>{label}</div>
      {Array.from({ length: colCount }).map((_, i) => (
        <div key={i} style={{ width: 280, minWidth: 280, flexShrink: 0 }} />
      ))}
    </div>
  );
}

function BadgeRow({ label, programs, getter }) {
  return (
    <div style={{ display: "flex", borderBottom: "1px solid #E5E7EB" }}>
      <div style={{
        width: 140, minWidth: 140, flexShrink: 0,
        padding: "10px 12px", fontSize: 11, fontWeight: 700,
        color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em",
        display: "flex", alignItems: "center",
      }}>{label}</div>
      {programs.map(p => {
        const val = getter(p);
        const isYes = val === true || val === "Yes";
        return (
          <div key={p.id} style={{
            width: 280, minWidth: 280, flexShrink: 0,
            padding: "10px 16px", display: "flex", alignItems: "center",
          }}>
            <span style={{
              padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
              background: isYes ? "rgba(0,204,0,0.1)" : "rgba(148,163,184,0.1)",
              color: isYes ? "#00CC00" : "#94a3b8",
              border: `1px solid ${isYes ? "rgba(0,204,0,0.3)" : "rgba(148,163,184,0.2)"}`,
            }}>{val === true ? "Yes" : val === false ? "No" : fmt(val)}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function CompareView({ programs, onClose }) {
  if (!programs || programs.length === 0) return null;

  const isMobile = Math.min(window.innerWidth, screen.width) <= 900;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1100,
      background: "#fff", overflowY: "auto",
    }}>
      {/* Header */}
      <div style={{
        position: "sticky", top: 0, zIndex: 10,
        background: "#0A1F44", color: "#fff",
        padding: isMobile ? "12px 16px" : "16px 32px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <h2 style={{ margin: 0, fontSize: isMobile ? 16 : 20, fontWeight: 800 }}>
          Compare Programs ({programs.length})
        </h2>
        <button onClick={onClose} style={{
          background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "50%",
          width: 36, height: 36, fontSize: 20, cursor: "pointer", color: "#fff",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>&times;</button>
      </div>

      {/* Scrollable table */}
      <div style={{ overflowX: "auto", padding: isMobile ? "0" : "0 16px" }}>
        {/* School headers */}
        <div style={{ display: "flex", borderBottom: "2px solid #E5E7EB", position: "sticky", top: isMobile ? 52 : 60, background: "#fff", zIndex: 5 }}>
          <div style={{ width: 140, minWidth: 140, flexShrink: 0 }} />
          {programs.map(p => (
            <div key={p.id} style={{
              width: 280, minWidth: 280, flexShrink: 0,
              padding: "20px 16px", textAlign: "center",
            }}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
                <SchoolLogo program={p} size={56} />
              </div>
              <div style={{ fontWeight: 800, fontSize: 15, color: "#0A1F44", marginBottom: 4 }}>
                {p.school}
              </div>
              <div style={{ fontSize: 12, color: "#64748b" }}>
                {p.city}{p.city && p.state ? ", " : ""}{p.state}
              </div>
              <div style={{ display: "flex", justifyContent: "center", gap: 4, marginTop: 6, flexWrap: "wrap" }}>
                <span style={{
                  padding: "2px 8px", borderRadius: 12, fontSize: 10, fontWeight: 700,
                  background: p.gender === "mens" ? "rgba(10,31,68,0.1)" : "rgba(214,31,105,0.1)",
                  color: p.gender === "mens" ? "#0A1F44" : "#d61f69",
                }}>{p.gender === "mens" ? "Men's" : "Women's"}</span>
                {p.league && <span style={{
                  padding: "2px 8px", borderRadius: 12, fontSize: 10, fontWeight: 700,
                  background: "rgba(0,204,0,0.1)", color: "#00CC00",
                }}>{p.league}</span>}
              </div>
            </div>
          ))}
        </div>

        {/* Overview */}
        <SectionHeader label="Overview" colCount={programs.length} />
        <CompareRow label="School Type" programs={programs} getter={p => p.schoolType} />
        <CompareRow label="NCAA Div." programs={programs} getter={p => p.ncaaDivision} />
        <CompareRow label="US News Rank" programs={programs} getter={p => p.usNewsRank} formatter={v => v ? `#${v}` : "\u2014"} highlight="low" />
        <LinkRow label="Website" programs={programs} getter={p => p.website} linkText="Visit" />
        <LinkRow label="Rugby Site" programs={programs} getter={p => p.rugbyWebsite} linkText="Visit" />

        {/* Academics */}
        <SectionHeader label="Academics" colCount={programs.length} />
        <CompareRow label="GPA" programs={programs} getter={p => p.gpa} formatter={v => v ? Number(v).toFixed(2) : "\u2014"} highlight="high" />
        <CompareRow label="SAT" programs={programs} getter={p => p.sat} formatter={v => v ? Number(v).toFixed(0) : "\u2014"} highlight="high" />
        <CompareRow label="Accept. Rate" programs={programs} getter={p => p.acceptanceRate} formatter={fmtPct} highlight="high" />
        <CompareRow label="Enrollment" programs={programs} getter={p => p.enrollment} formatter={fmtNum} />
        {programs.some(p => p.topPrograms) && (
          <CompareRow label="Top Programs" programs={programs} getter={p => p.topPrograms} />
        )}

        {/* Tuition */}
        <SectionHeader label="Tuition" colCount={programs.length} />
        <CompareRow label="In-State" programs={programs} getter={p => p.inStateTuition} formatter={fmtMoney} highlight="low" />
        <CompareRow label="Out-of-State" programs={programs} getter={p => p.outStateTuition} formatter={fmtMoney} highlight="low" />
        {/* Tuition difference */}
        {programs.length === 2 && (() => {
          const t0 = Number(programs[0].outStateTuition) || 0;
          const t1 = Number(programs[1].outStateTuition) || 0;
          if (t0 && t1) {
            const diff = Math.abs(t0 - t1);
            const cheaper = t0 < t1 ? programs[0].school : programs[1].school;
            return (
              <div style={{ display: "flex", borderBottom: "1px solid #E5E7EB" }}>
                <div style={{ width: 140, minWidth: 140, flexShrink: 0, padding: "10px 12px", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em", display: "flex", alignItems: "center" }}>Savings</div>
                <div style={{ padding: "10px 16px", fontSize: 13, fontWeight: 600, color: "#00CC00" }}>
                  {cheaper} saves ${diff.toLocaleString()}/yr out-of-state
                </div>
              </div>
            );
          }
          return null;
        })()}

        {/* Rugby */}
        <SectionHeader label="Rugby" colCount={programs.length} />
        <CompareRow label="Ranking" programs={programs} getter={p => p.rugbyRanking} formatter={v => v ? `#${v}` : "\u2014"} highlight="low" />
        <CompareRow label="Conference" programs={programs} getter={p => p.conference} />
        <CompareRow label="League" programs={programs} getter={p => p.league} />
        <BadgeRow label="Scholarship" programs={programs} getter={p => p.rugbyScholarship} />
        <BadgeRow label="School Funded" programs={programs} getter={p => p.schoolFunded} />

        {/* Contacts */}
        {programs.some(p => p._contacts && p._contacts.length > 0) && (
          <>
            <SectionHeader label="Head Coach" colCount={programs.length} />
            <CompareRow label="Name" programs={programs} getter={p => {
              const hc = (p._contacts || []).find(c => /head\s*coach/i.test(c.title));
              return hc ? hc.name : (p._contacts || [])[0]?.name || "";
            }} />
            <CompareRow label="Email" programs={programs} getter={p => {
              const hc = (p._contacts || []).find(c => /head\s*coach/i.test(c.title));
              return hc ? hc.email : (p._contacts || [])[0]?.email || "";
            }} />
          </>
        )}

        {/* Bottom padding */}
        <div style={{ height: 60 }} />
      </div>
    </div>
  );
}
