import React, { useState } from "react";
import Avatar from "./ui/Avatar.jsx";
import SchoolLogo from "./ui/SchoolLogo.jsx";
import Badge from "./ui/Badge.jsx";

function dedupCount(progs) {
  const seen = new Set();
  progs.forEach(p => seen.add(`${(p.school||"").toLowerCase()}|${p.gender||""}`));
  return seen.size;
}

export default function LeagueHierarchyPage({ programs, conferences, onSelectProgram }) {
  const [expandedLeagues, setExpandedLeagues] = useState({});
  const [expandedConfs, setExpandedConfs] = useState({});
  const [genderFilter, setGenderFilter] = useState("mens");

  // Filter programs by gender
  const filteredPrograms = programs.filter(p => p.gender === genderFilter);

  // Build the hierarchy: League → Conference → Teams
  const leagues = [...new Set(filteredPrograms.map(p => p.league).filter(Boolean))].sort();

  // Filter conferences by gender
  const confLookup = Object.fromEntries(conferences.map(c => [c.conference, c]));

  // Derive conference-to-league mapping from programs, then group conferences by league
  const confsByLeague = {};
  filteredPrograms.forEach(p => {
    if (p.conference && p.league && confLookup[p.conference]) {
      const key = `${p.league}|${p.conference}`;
      if (!confsByLeague[p.league]) confsByLeague[p.league] = {};
      confsByLeague[p.league][p.conference] = confLookup[p.conference];
    }
  });

  // Group programs by conference
  const programsByConf = {};
  filteredPrograms.forEach(p => {
    const conf = p.conference || "Independent";
    if (!programsByConf[conf]) programsByConf[conf] = [];
    programsByConf[conf].push(p);
  });

  // Programs with no league or conference
  const unaffiliated = filteredPrograms.filter(p => !p.league && !p.conference);

  function toggleLeague(league) {
    setExpandedLeagues(prev => ({ ...prev, [league]: !prev[league] }));
  }
  function toggleConf(conf) {
    setExpandedConfs(prev => ({ ...prev, [conf]: !prev[conf] }));
  }

  const leagueOrder = leagues;

  // Stats
  const totalLeagues = leagues.length;
  const totalConfs = [...new Set(filteredPrograms.map(p => p.conference).filter(Boolean))].length;
  const totalTeams = dedupCount(filteredPrograms);

  const genderLabel = genderFilter === "mens" ? "Men's" : "Women's";
  const genderColor = genderFilter === "mens" ? "#0A1F44" : "#d61f69";

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
              The landscape of college rugby in the United States, organized by league, conference, and team.
            </p>
          </div>

          {/* Gender toggle */}
          <div style={{ display: "flex", borderRadius: 10, overflow: "hidden",
            border: "1px solid rgba(255,255,255,0.2)", flexShrink: 0 }}>
            {[["mens", "Men's"], ["womens", "Women's"]].map(([val, label]) => (
              <button key={val} onClick={() => {
                setGenderFilter(val);
                setExpandedLeagues({});
                setExpandedConfs({});
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
            ["🏆", totalLeagues, "Leagues"],
            ["🏟", totalConfs, "Conferences"],
            ["🏉", totalTeams, `${genderLabel} Programs`],
          ].map(([icon, count, label]) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 24 }}>{icon}</span>
              <div>
                <div style={{ fontSize: 22, fontWeight: 800 }}>{count}</div>
                <div style={{ fontSize: 11, color: "#00FF00", textTransform: "uppercase",
                  letterSpacing: "0.06em" }}>{label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: 16, marginBottom: 20, fontSize: 12, color: "#64748b",
        flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Hierarchy:</span>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 12, height: 12, borderRadius: 3, background: "#244B86", display: "inline-block" }} />
          League
        </span>
        <span style={{ color: "#cbd5e1" }}>→</span>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 12, height: 12, borderRadius: 3, background: "#00FF00", display: "inline-block" }} />
          Conference
        </span>
        <span style={{ color: "#cbd5e1" }}>→</span>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 12, height: 12, borderRadius: 3, background: "#64748b", display: "inline-block" }} />
          Team
        </span>
      </div>

      {/* Tree */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {leagueOrder.map(league => {
          const leaguePrograms = filteredPrograms.filter(p => p.league === league);
          if (leaguePrograms.length === 0) return null;
          const confs = Object.values(confsByLeague[league] || {}).sort((a, b) =>
            (a.conference || "").localeCompare(b.conference || ""));
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
                }}>▶</span>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontWeight: 800, fontSize: 17,
                    color: isExpanded ? "#fff" : "#0A1F44",
                  }}>{league}</div>
                  <div style={{
                    fontSize: 12, marginTop: 3,
                    color: isExpanded ? "#00FF00" : "#94a3b8",
                  }}>
                    {confs.length} conference{confs.length !== 1 ? "s" : ""} · {dedupCount(leaguePrograms)} program{dedupCount(leaguePrograms) !== 1 ? "s" : ""}
                  </div>
                </div>
                <Badge label={`${dedupCount(leaguePrograms)} teams`} color={isExpanded ? "#00FF00" : "#0A1F44"} />
              </div>

              {/* Conferences under this league */}
              {isExpanded && (
                <div style={{ padding: "4px 12px 12px", background: "#f8fafc" }}>
                  {confs.length === 0 ? (
                    <div style={{ padding: "16px 20px", color: "#94a3b8", fontSize: 13, fontStyle: "italic" }}>
                      No conferences registered for this league
                    </div>
                  ) : confs.map(conf => {
                    const confTeams = (programsByConf[conf.conference] || [])
                      .filter(p => p.league === league)
                      .sort((a, b) => (a.school || "").localeCompare(b.school || ""));
                    const isConfExpanded = expandedConfs[`${league}:${conf.conference}`];

                    return (
                      <div key={conf.id || conf.conference} style={{
                        margin: "8px 0", borderRadius: 10, border: "1px solid #E5E7EB",
                        background: "#fff", overflow: "hidden",
                      }}>
                        {/* Conference header */}
                        <div onClick={() => toggleConf(`${league}:${conf.conference}`)} style={{
                          padding: "14px 18px", cursor: "pointer", display: "flex",
                          alignItems: "center", gap: 12,
                          background: isConfExpanded ? "#ecfdf5" : "#fff",
                          transition: "background 0.15s",
                        }}
                        onMouseEnter={e => { if (!isConfExpanded) e.currentTarget.style.background = "#f8fafc"; }}
                        onMouseLeave={e => { if (!isConfExpanded) e.currentTarget.style.background = isConfExpanded ? "#ecfdf5" : "#fff"; }}
                        >
                          <span style={{
                            fontSize: 14, transition: "transform 0.2s", display: "inline-block",
                            transform: isConfExpanded ? "rotate(90deg)" : "rotate(0deg)",
                            color: isConfExpanded ? "#00FF00" : "#cbd5e1",
                          }}>▶</span>
                          <Avatar name={conf.fullName || conf.conference} size={34} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: 14, color: "#0A1F44" }}>
                              {conf.conference}
                              {conf.fullName && (
                                <span style={{ fontWeight: 400, color: "#64748b", marginLeft: 8, fontSize: 13 }}>
                                  {conf.fullName}
                                </span>
                              )}
                            </div>
                            {conf.email && (
                              <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>{conf.email}</div>
                            )}
                          </div>
                          <span style={{
                            fontSize: 12, fontWeight: 700, color: "#00FF00",
                            background: "#ecfdf5", borderRadius: 20, padding: "3px 10px",
                            border: "1px solid #bbf7d0",
                          }}>
                            {dedupCount(confTeams)} team{dedupCount(confTeams) !== 1 ? "s" : ""}
                          </span>
                        </div>

                        {/* Teams under this conference */}
                        {isConfExpanded && (
                          <div style={{ borderTop: "1px solid #E5E7EB" }}>
                            {confTeams.length === 0 ? (
                              <div style={{ padding: "14px 20px", color: "#94a3b8", fontSize: 13, fontStyle: "italic" }}>
                                No programs listed in this conference
                              </div>
                            ) : confTeams.map((team, idx) => (
                              <div key={team.id || idx}
                                onClick={() => onSelectProgram(team)}
                                style={{
                                  padding: "10px 18px 10px 52px", display: "flex",
                                  alignItems: "center", gap: 12, cursor: "pointer",
                                  borderBottom: idx < confTeams.length - 1 ? "1px solid #f1f5f9" : "none",
                                  transition: "background 0.1s",
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                                onMouseLeave={e => e.currentTarget.style.background = ""}
                              >
                                <SchoolLogo program={team} size={28} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{
                                    fontWeight: 600, fontSize: 13, color: "#0A1F44",
                                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                                  }}>{team.school}</div>
                                </div>
                                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                                  <Badge label={team.gender === "mens" ? "M" : "W"}
                                    color={team.gender === "mens" ? "#0A1F44" : "#d61f69"} />
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

                  {/* Programs in this league but no matching conference */}
                  {(() => {
                    const confNames = new Set(confs.map(c => c.conference));
                    const orphans = leaguePrograms.filter(p => p.conference && !confNames.has(p.conference));
                    const orphanConfs = [...new Set(orphans.map(p => p.conference))].sort();
                    if (orphanConfs.length === 0) return null;
                    return orphanConfs.map(confName => {
                      const teams = orphans.filter(p => p.conference === confName)
                        .sort((a, b) => (a.school || "").localeCompare(b.school || ""));
                      const isConfExpanded = expandedConfs[`${league}:${confName}`];
                      return (
                        <div key={confName} style={{
                          margin: "8px 0", borderRadius: 10, border: "1px dashed #E5E7EB",
                          background: "#fff", overflow: "hidden",
                        }}>
                          <div onClick={() => toggleConf(`${league}:${confName}`)} style={{
                            padding: "14px 18px", cursor: "pointer", display: "flex",
                            alignItems: "center", gap: 12,
                            background: isConfExpanded ? "#ecfdf5" : "#fff",
                          }}
                          onMouseEnter={e => { if (!isConfExpanded) e.currentTarget.style.background = "#f8fafc"; }}
                          onMouseLeave={e => { if (!isConfExpanded) e.currentTarget.style.background = isConfExpanded ? "#ecfdf5" : "#fff"; }}
                          >
                            <span style={{
                              fontSize: 14, transition: "transform 0.2s", display: "inline-block",
                              transform: isConfExpanded ? "rotate(90deg)" : "rotate(0deg)",
                              color: isConfExpanded ? "#00FF00" : "#cbd5e1",
                            }}>▶</span>
                            <Avatar name={confName} size={34} />
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 700, fontSize: 14, color: "#0A1F44" }}>{confName}</div>
                            </div>
                            <span style={{
                              fontSize: 12, fontWeight: 700, color: "#00FF00",
                              background: "#ecfdf5", borderRadius: 20, padding: "3px 10px",
                              border: "1px solid #bbf7d0",
                            }}>
                              {dedupCount(teams)} team{dedupCount(teams) !== 1 ? "s" : ""}
                            </span>
                          </div>
                          {isConfExpanded && (
                            <div style={{ borderTop: "1px solid #E5E7EB" }}>
                              {teams.map((team, idx) => (
                                <div key={team.id || idx}
                                  onClick={() => onSelectProgram(team)}
                                  style={{
                                    padding: "10px 18px 10px 52px", display: "flex",
                                    alignItems: "center", gap: 12, cursor: "pointer",
                                    borderBottom: idx < teams.length - 1 ? "1px solid #f1f5f9" : "none",
                                  }}
                                  onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                                  onMouseLeave={e => e.currentTarget.style.background = ""}
                                >
                                  <SchoolLogo program={team} size={28} />
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{
                                      fontWeight: 600, fontSize: 13, color: "#0A1F44",
                                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                                    }}>{team.school}</div>
                                  </div>
                                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                                    <Badge label={team.gender === "mens" ? "M" : "W"}
                                      color={team.gender === "mens" ? "#0A1F44" : "#d61f69"} />
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
                    });
                  })()}
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
              }}>▶</span>
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
                    <SchoolLogo program={team} size={28} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontWeight: 600, fontSize: 13, color: "#0A1F44",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>{team.school}</div>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      <Badge label={team.gender === "mens" ? "M" : "W"}
                        color={team.gender === "mens" ? "#0A1F44" : "#d61f69"} />
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
