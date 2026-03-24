import React, { useState, useMemo } from "react";
import SchoolLogo from "./ui/SchoolLogo.jsx";
import Badge from "./ui/Badge.jsx";

function dedupCount(progs) {
  const seen = new Set();
  progs.forEach(p => seen.add(`${(p.school||"").toLowerCase()}|${p.gender||""}`));
  return seen.size;
}

export default function RankingsPage({ programs, confNameMap = {}, onSelectProgram }) {
  const [genderFilter, setGenderFilter] = useState("mens");

  const filteredPrograms = programs.filter(p => p.gender === genderFilter);

  // Group ranked programs by league
  const ranked = useMemo(() => {
    const withRank = filteredPrograms.filter(p => p.rugbyRanking);
    withRank.sort((a, b) => a.rugbyRanking - b.rugbyRanking);

    const byLeague = {};
    withRank.forEach(p => {
      const league = p.league || "Other";
      if (!byLeague[league]) byLeague[league] = [];
      byLeague[league].push(p);
    });

    // Sort leagues alphabetically, "Other" last
    const leagueOrder = Object.keys(byLeague).filter(l => l !== "Other").sort();
    if (byLeague["Other"]) leagueOrder.push("Other");

    return { byLeague, leagueOrder, total: dedupCount(withRank) };
  }, [filteredPrograms]);

  const unranked = dedupCount(filteredPrograms.filter(p => !p.rugbyRanking));
  const genderLabel = genderFilter === "mens" ? "Men's" : "Women's";

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>

      {/* Hero */}
      <div style={{
        background: "linear-gradient(135deg, #0A1F44, #244B86)", borderRadius: 16,
        padding: 32, marginBottom: 24, color: "#fff",
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between",
          flexWrap: "wrap", gap: 16, marginBottom: 16 }}>
          <div>
            <h2 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 800 }}>
              National Rugby Rankings
            </h2>
            <p style={{ margin: 0, fontSize: 14, color: "#94a3b8", lineHeight: 1.7 }}>
              {genderLabel} collegiate rugby programs ranked nationally, organized by league.
            </p>
          </div>

          {/* Gender toggle */}
          <div style={{ display: "flex", borderRadius: 10, overflow: "hidden",
            border: "1px solid rgba(255,255,255,0.2)", flexShrink: 0 }}>
            {[["mens", "Men's"], ["womens", "Women's"]].map(([val, label]) => (
              <button key={val} onClick={() => setGenderFilter(val)} style={{
                padding: "10px 22px", border: "none", cursor: "pointer",
                fontSize: 14, fontWeight: 700, transition: "all 0.15s",
                background: genderFilter === val
                  ? (val === "mens" ? "#0A1F44" : "#d61f69")
                  : "rgba(255,255,255,0.08)",
                color: genderFilter === val ? "#fff" : "#94a3b8",
              }}>{label}</button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 24 }}>🏆</span>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800 }}>{ranked.total}</div>
              <div style={{ fontSize: 11, color: "#00FF00", textTransform: "uppercase",
                letterSpacing: "0.06em" }}>Ranked Programs</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 24 }}>📊</span>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800 }}>{ranked.leagueOrder.length}</div>
              <div style={{ fontSize: 11, color: "#00FF00", textTransform: "uppercase",
                letterSpacing: "0.06em" }}>Leagues</div>
            </div>
          </div>
          {unranked > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 24 }}>➖</span>
              <div>
                <div style={{ fontSize: 22, fontWeight: 800 }}>{unranked}</div>
                <div style={{ fontSize: 11, color: "#00FF00", textTransform: "uppercase",
                  letterSpacing: "0.06em" }}>Unranked</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {ranked.total === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 24px", color: "#94a3b8" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🏆</div>
          <div style={{ fontSize: 17, fontWeight: 600 }}>No ranked {genderLabel.toLowerCase()} programs</div>
          <div style={{ fontSize: 14, marginTop: 8 }}>Rankings data hasn't been added yet</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          {ranked.leagueOrder.map(league => {
            const progs = ranked.byLeague[league];
            return (
              <div key={league}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                  <div style={{ fontWeight: 800, fontSize: 16, color: "#0A1F44" }}>{league}</div>
                  <div style={{ fontSize: 12, color: "#94a3b8", background: "#f1f5f9",
                    borderRadius: 20, padding: "2px 10px" }}>
                    {dedupCount(progs)} ranked
                  </div>
                </div>

                <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E5E7EB",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.06)", overflow: "hidden" }}>
                  {progs.map((p, idx) => {
                    const isTop3 = p.rugbyRanking <= 3;
                    const medalColors = { 1: "#fbbf24", 2: "#94a3b8", 3: "#d97706" };
                    const medalColor = medalColors[p.rugbyRanking];

                    return (
                      <div key={p.id || idx}
                        onClick={() => onSelectProgram(p)}
                        style={{
                          display: "flex", alignItems: "center", gap: 14,
                          padding: "12px 18px", cursor: "pointer",
                          borderBottom: idx < progs.length - 1 ? "1px solid #f1f5f9" : "none",
                          background: isTop3 ? "#fffbeb" : "",
                          transition: "background 0.1s",
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = isTop3 ? "#fef3c7" : "#f8fafc"}
                        onMouseLeave={e => e.currentTarget.style.background = isTop3 ? "#fffbeb" : ""}
                      >
                        {/* Rank */}
                        <div style={{
                          width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontWeight: 800, fontSize: isTop3 ? 16 : 14,
                          background: medalColor ? `${medalColor}20` : "#f1f5f9",
                          color: medalColor || "#64748b",
                          border: medalColor ? `2px solid ${medalColor}` : "1px solid #E5E7EB",
                        }}>
                          {p.rugbyRanking}
                        </div>

                        {/* School */}
                        <SchoolLogo program={p} size={34} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontWeight: 700, fontSize: 14, color: "#0A1F44",
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          }}>{p.school}</div>
                          {p.state && (
                            <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 1 }}>{p.state}</div>
                          )}
                        </div>

                        {/* Conference */}
                        {p.conference && (
                          <Badge label={confNameMap[p.conference] || p.conference} color="#0694a2" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
