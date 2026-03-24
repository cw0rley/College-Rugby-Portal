import React from "react";
import SchoolLogo from "./ui/SchoolLogo.jsx";

function fmt(val) {
  if (val === null || val === undefined || val === "") return "—";
  return val;
}

function fmtMoney(val) {
  if (!val) return "—";
  return "$" + Number(val).toLocaleString();
}

function fmtPct(val) {
  if (!val && val !== 0) return "—";
  return val + "%";
}

function fmtNum(val) {
  if (!val && val !== 0) return "—";
  return Number(val).toLocaleString();
}

function bestValue(programs, getter, mode) {
  const vals = programs.map(p => {
    const v = getter(p);
    return (v !== null && v !== undefined && v !== "" && v !== "—") ? Number(v) : null;
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
          Compare Programs
        </h2>
        <button onClick={onClose} style={{
          background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "50%",
          width: 36, height: 36, fontSize: 20, cursor: "pointer", color: "#fff",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>×</button>
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
            </div>
          ))}
        </div>

        {/* Academics */}
        <SectionHeader label="Academics" colCount={programs.length} />
        <CompareRow label="GPA" programs={programs} getter={p => p.gpa} formatter={v => v ? Number(v).toFixed(2) : "—"} highlight="high" />
        <CompareRow label="SAT" programs={programs} getter={p => p.sat} formatter={v => v ? Number(v).toFixed(0) : "—"} highlight="high" />
        <CompareRow label="Accept. Rate" programs={programs} getter={p => p.acceptanceRate} formatter={fmtPct} highlight="high" />
        <CompareRow label="Enrollment" programs={programs} getter={p => p.enrollment} formatter={fmtNum} />

        {/* Tuition */}
        <SectionHeader label="Tuition" colCount={programs.length} />
        <CompareRow label="In-State" programs={programs} getter={p => p.inStateTuition} formatter={fmtMoney} highlight="low" />
        <CompareRow label="Out-of-State" programs={programs} getter={p => p.outStateTuition} formatter={fmtMoney} highlight="low" />

        {/* Rugby */}
        <SectionHeader label="Rugby" colCount={programs.length} />
        <CompareRow label="Gender" programs={programs} getter={p => p.gender === "mens" ? "Men's" : "Women's"} />
        <CompareRow label="Ranking" programs={programs} getter={p => p.rugbyRanking} formatter={v => v ? `#${v}` : "—"} highlight="low" />
        <CompareRow label="Conference" programs={programs} getter={p => p.conference} />
        <CompareRow label="League" programs={programs} getter={p => p.league} />
        <CompareRow label="Scholarship" programs={programs} getter={p => p.rugbyScholarship ? "Yes" : "No"} />
        <CompareRow label="School Funded" programs={programs} getter={p => p.schoolFunded ? "Yes" : "No"} />

        {/* Bottom padding */}
        <div style={{ height: 60 }} />
      </div>
    </div>
  );
}
