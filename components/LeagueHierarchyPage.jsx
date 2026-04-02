import React, { useState } from "react";
import SchoolLogo from "./ui/SchoolLogo.jsx";
import Badge from "./ui/Badge.jsx";

function dedupCount(progs) {
  const seen = new Set();
  progs.forEach(p => seen.add(`${(p.school||"").toLowerCase()}|${p.gender||""}`));
  return seen.size;
}

export default function LeagueHierarchyPage({ programs, conferences, onSelectProgram }) {
  const [expandedLeagues, setExpandedLeagues] = useState({});
  const [genderFilter, setGenderFilter] = useState("mens");

  const filteredPrograms = programs.filter(p => p.gender === genderFilter);

  const leagues = [...new Set(filteredPrograms.map(p => p.league).filter(Boolean))].sort();

  const totalLeagues = leagues.length;
  const totalConfs = [...new Set(filteredPrograms.map(p => p.conference).filter(Boolean))].length;
  const totalTeams = dedupCount(filteredPrograms);

  const genderLabel = genderFilter === "mens" ? "Men's" : "Women's";

  const unaffiliated = filteredPrograms.filter(p => !p.league && !p.conference);

  function toggleLeague(league) {
    setExpandedLeagues(prev => ({ ...prev, [league]: !prev[league] }));
  }

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
              USA Collegiate Rugby Structure
            </h2>
            <p style={{ margin: 0, fontSize: 14, color: "#94a3b8", lineHeight: 1.7 }}>
              The landscape of college rugby in the United States, organized by league.
            </p>
          </div>

          {/* Gender toggle */}
          <div style={{ display: "flex", borderRadius: 10, overflow: "hidden",
            border: "1px solid rgba(255,255,255,0.2)", flexShrink: 0 }}>
            {[["mens", "Men's"], ["womens", "Women's"]].map(([val, label]) => (
              <button key={val} onClick={() => {
                setGenderFilter(val);
                setExpandedLeagues({});
              }} style={{
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
          {[
            [totalLeagues, "Leagues"],
            [totalConfs, "Conferences"],
            [totalTeams, `${genderLabel} Programs`],
          ].map(([count, label]) => (
            <div key={label}>
              <div style={{ fontSize: 22, fontWeight: 800 }}>{count}</div>
              <div style={{ fontSize: 11, color: "#00FF00", textTransform: "uppercase",
                letterSpacing: "0.06em" }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tree */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {leagues.map(league => {
          const leaguePrograms = filteredPrograms.filter(p => p.league === league)
            .sort((a, b) => {
              // Ranked programs first (by rank), then alphabetical
              const ra = a.rugbyRanking || 9999;
              const rb = b.rugbyRanking || 9999;
              if (ra !== rb) return ra - rb;
              return (a.school || "").localeCompare(b.school || "");
            });
          if (leaguePrograms.length === 0) return null;
          const confCount = [...new Set(leaguePrograms.map(p => p.conference).filter(Boolean))].length;
          const isExpanded = expandedLeagues[league];

          return (
            <div key={league} style={{
              background: "#fff", borderRadius: 14, border: "1px solid #E5E7EB",
              boxShadow: "0 1px 3px rgba(0,0,0,0.06)", overflow: "hidden",
            }}>
              {/* League header */}
              <div onClick={() => toggleLeague(league)} style={{
                padding: "18px 22px", cursor: "pointer", display: "flex",
                alignItems: "center", gap: 14,
                background: isExpanded ? "linear-gradient(135deg, #244B86, #1B3767)" : "#fff",
                transition: "all 0.2s",
              }}
              onMouseEnter={e => { if (!isExpanded) e.currentTarget.style.background = "#f8fafc"; }}
              onMouseLeave={e => { if (!isExpanded) e.currentTarget.style.background = "#fff"; }}
              >
                <span style={{
                  fontSize: 18, transition: "transform 0.2s", display: "inline-block",
                  transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                  color: isExpanded ? "#00FF00" : "#94a3b8",
                }}>&#9654;</span>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontWeight: 800, fontSize: 17,
                    color: isExpanded ? "#fff" : "#0A1F44",
                  }}>{league}</div>
                  <div style={{
                    fontSize: 12, marginTop: 3,
                    color: isExpanded ? "#00FF00" : "#94a3b8",
                  }}>
                    {confCount} conference{confCount !== 1 ? "s" : ""} &middot; {dedupCount(leaguePrograms)} program{dedupCount(leaguePrograms) !== 1 ? "s" : ""}
                  </div>
                </div>
                <Badge label={`${dedupCount(leaguePrograms)} teams`} color={isExpanded ? "#00FF00" : "#0A1F44"} />
              </div>

              {/* Teams directly under this league */}
              {isExpanded && (
                <div style={{ borderTop: "1px solid #E5E7EB" }}>
                  {leaguePrograms.map((team, idx) => (
                    <div key={team.id || idx}
                      onClick={() => onSelectProgram(team)}
                      style={{
                        padding: "10px 22px", display: "flex",
                        alignItems: "center", gap: 12, cursor: "pointer",
                        borderBottom: idx < leaguePrograms.length - 1 ? "1px solid #f1f5f9" : "none",
                        transition: "background 0.1s",
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                      onMouseLeave={e => e.currentTarget.style.background = ""}
                    >
                      {/* Ranking */}
                      <div style={{ width: 28, textAlign: "center", flexShrink: 0 }}>
                        {team.rugbyRanking ? (
                          <span style={{
                            fontWeight: 800, fontSize: 14, color: "#0A1F44",
                          }}>#{team.rugbyRanking}</span>
                        ) : (
                          <span style={{ fontSize: 11, color: "#cbd5e1" }}>&mdash;</span>
                        )}
                      </div>
                      <SchoolLogo program={team} size={28} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontWeight: 600, fontSize: 13, color: "#0A1F44",
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>{team.school}</div>
                      </div>
                      <div style={{ display: "flex", gap: 6, flexShrink: 0, alignItems: "center" }}>
                        {team.conference && (
                          <span style={{
                            fontSize: 11, fontWeight: 600, color: "#64748b",
                            background: "#f1f5f9", borderRadius: 12, padding: "2px 8px",
                          }}>{team.conference}</span>
                        )}
                        {team.state && (
                          <span style={{ fontSize: 11, color: "#94a3b8" }}>{team.state}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Unaffiliated programs */}
        {unaffiliated.length > 0 && (
          <div style={{
            background: "#fff", borderRadius: 14, border: "1px dashed #E5E7EB",
            boxShadow: "0 1px 3px rgba(0,0,0,0.06)", overflow: "hidden",
          }}>
            <div onClick={() => toggleLeague("__unaffiliated__")} style={{
              padding: "18px 22px", cursor: "pointer", display: "flex",
              alignItems: "center", gap: 14,
              background: expandedLeagues["__unaffiliated__"] ? "#fefce8" : "#fff",
            }}
            onMouseEnter={e => { if (!expandedLeagues["__unaffiliated__"]) e.currentTarget.style.background = "#f8fafc"; }}
            onMouseLeave={e => { if (!expandedLeagues["__unaffiliated__"]) e.currentTarget.style.background = expandedLeagues["__unaffiliated__"] ? "#fefce8" : "#fff"; }}
            >
              <span style={{
                fontSize: 18, transition: "transform 0.2s", display: "inline-block",
                transform: expandedLeagues["__unaffiliated__"] ? "rotate(90deg)" : "rotate(0deg)",
                color: "#d97706",
              }}>&#9654;</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 17, color: "#92400e" }}>Independent / Unaffiliated</div>
                <div style={{ fontSize: 12, color: "#b45309", marginTop: 3 }}>
                  Programs not currently assigned to a league or conference
                </div>
              </div>
              <Badge label={`${dedupCount(unaffiliated)} teams`} color="#d97706" />
            </div>
            {expandedLeagues["__unaffiliated__"] && (
              <div style={{ borderTop: "1px solid #fde68a" }}>
                {unaffiliated.sort((a, b) => (a.school || "").localeCompare(b.school || "")).map((team, idx) => (
                  <div key={team.id || idx}
                    onClick={() => onSelectProgram(team)}
                    style={{
                      padding: "10px 22px", display: "flex", alignItems: "center",
                      gap: 12, cursor: "pointer",
                      borderBottom: idx < unaffiliated.length - 1 ? "1px solid #f1f5f9" : "none",
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                    onMouseLeave={e => e.currentTarget.style.background = ""}
                  >
                    <div style={{ width: 28, textAlign: "center", flexShrink: 0 }}>
                      <span style={{ fontSize: 11, color: "#cbd5e1" }}>&mdash;</span>
                    </div>
                    <SchoolLogo program={team} size={28} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontWeight: 600, fontSize: 13, color: "#0A1F44",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>{team.school}</div>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexShrink: 0, alignItems: "center" }}>
                      {team.conference && (
                        <span style={{
                          fontSize: 11, fontWeight: 600, color: "#64748b",
                          background: "#f1f5f9", borderRadius: 12, padding: "2px 8px",
                        }}>{team.conference}</span>
                      )}
                      {team.state && (
                        <span style={{ fontSize: 11, color: "#94a3b8" }}>{team.state}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
