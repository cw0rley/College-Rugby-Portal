import React, { useState, useEffect } from "react";
import { collection, getDocs, query, orderBy, limit, where } from "firebase/firestore";
import { db } from "../../firebase.js";

function useIsMobile() {
  const [mobile, setMobile] = useState(window.innerWidth <= 900);
  useEffect(() => {
    const handler = () => setMobile(window.innerWidth <= 900);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return mobile;
}

function StatCard({ label, value, color }) {
  return (
    <div style={{
      background: "#fff", borderRadius: 12, padding: "20px 24px",
      border: "1px solid #E5E7EB", boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      flex: "1 1 180px", minWidth: 160,
    }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: "#64748b", textTransform: "uppercase",
        letterSpacing: "0.05em", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: color || "#0A1F44" }}>{value}</div>
    </div>
  );
}

function HorizontalBar({ label, value, maxValue, color }) {
  const pct = maxValue > 0 ? Math.round((value / maxValue) * 100) : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
      <div style={{ width: 120, fontSize: 13, color: "#475569", fontWeight: 500,
        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flexShrink: 0 }}>
        {label}
      </div>
      <div style={{ flex: 1, background: "#f1f5f9", borderRadius: 4, height: 20, overflow: "hidden" }}>
        <div style={{
          width: `${Math.max(pct, 2)}%`, height: "100%", borderRadius: 4,
          background: color || "#0A1F44", transition: "width 0.4s ease",
        }} />
      </div>
      <div style={{ width: 40, fontSize: 13, fontWeight: 600, color: "#0A1F44", textAlign: "right", flexShrink: 0 }}>
        {value}
      </div>
    </div>
  );
}

function SectionCard({ title, children }) {
  return (
    <div style={{
      background: "#fff", borderRadius: 12, padding: 24,
      border: "1px solid #E5E7EB", boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
    }}>
      <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 700, color: "#0A1F44" }}>{title}</h3>
      {children}
    </div>
  );
}

export default function AnalyticsDashboard() {
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPrograms: 0,
    totalPlayers: 0,
    totalSubmissions: 0,
    totalConversations: 0,
  });
  const [topPrograms, setTopPrograms] = useState([]);
  const [recentSubmissions, setRecentSubmissions] = useState([]);
  const [positionCounts, setPositionCounts] = useState([]);
  const [gradYearCounts, setGradYearCounts] = useState([]);
  const [stateCounts, setStateCounts] = useState([]);

  useEffect(() => {
    loadAnalytics();
  }, []);

  async function loadAnalytics() {
    setLoading(true);
    try {
      // Fetch all data in parallel
      const [programsSnap, playersSnap, submissionsSnap, conversationsSnap] = await Promise.all([
        getDocs(collection(db, "programs")),
        getDocs(collection(db, "playerProfiles")),
        getDocs(collection(db, "submissions")),
        getDocs(collection(db, "conversations")),
      ]);

      const programs = programsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const players = playersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const submissions = submissionsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      // Overview stats
      setStats({
        totalPrograms: programs.length,
        totalPlayers: players.length,
        totalSubmissions: submissions.length,
        totalConversations: conversationsSnap.size,
      });

      // Top programs — use viewCount if available, otherwise fall back to alphabetical with scholarship priority
      const sorted = [...programs].sort((a, b) => {
        if (a.viewCount != null || b.viewCount != null) {
          return (b.viewCount || 0) - (a.viewCount || 0);
        }
        // Fallback: prioritize programs with scholarships, then alphabetical
        if (a.rugbyScholarship && !b.rugbyScholarship) return -1;
        if (!a.rugbyScholarship && b.rugbyScholarship) return 1;
        return (a.school || "").localeCompare(b.school || "");
      });
      setTopPrograms(sorted.slice(0, 10));

      // Recent submissions — sort by createdAt descending
      const sortedSubmissions = [...submissions].sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || a.createdAt?.seconds * 1000 || 0;
        const bTime = b.createdAt?.toMillis?.() || b.createdAt?.seconds * 1000 || 0;
        return bTime - aTime;
      });
      setRecentSubmissions(sortedSubmissions.slice(0, 10));

      // Player stats — by position
      const posCounts = {};
      players.forEach(p => {
        const pos = p.position || "Unknown";
        posCounts[pos] = (posCounts[pos] || 0) + 1;
      });
      const posArr = Object.entries(posCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
      setPositionCounts(posArr);

      // Player stats — by graduation year
      const yearCounts = {};
      players.forEach(p => {
        const yr = p.graduationYear || p.gradYear || "Unknown";
        yearCounts[yr] = (yearCounts[yr] || 0) + 1;
      });
      const yearArr = Object.entries(yearCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => {
          if (a.name === "Unknown") return 1;
          if (b.name === "Unknown") return -1;
          return String(a.name).localeCompare(String(b.name));
        });
      setGradYearCounts(yearArr);

      // Geographic distribution — programs by state
      const stCounts = {};
      programs.forEach(p => {
        const st = p.state || "Unknown";
        stCounts[st] = (stCounts[st] || 0) + 1;
      });
      const stArr = Object.entries(stCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
      setStateCounts(stArr);

    } catch (err) {
      console.error("Analytics load error:", err);
    }
    setLoading(false);
  }

  function formatTimestamp(ts) {
    if (!ts) return "—";
    const ms = ts.toMillis?.() || ts.seconds * 1000;
    if (!ms) return "—";
    const d = new Date(ms);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      + " " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>
        Loading analytics...
      </div>
    );
  }

  const gridStyle = {
    display: "grid",
    gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
    gap: 20,
    marginBottom: 24,
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <h3 style={{ margin: 0, fontSize: 16, color: "#0A1F44", fontWeight: 700 }}>Analytics Overview</h3>
        <button onClick={loadAnalytics} style={{
          padding: "7px 16px", borderRadius: 8, border: "1px solid #E5E7EB",
          background: "#fff", color: "#475569", fontWeight: 600, fontSize: 13, cursor: "pointer",
        }}>Refresh</button>
      </div>

      {/* Overview cards */}
      <div style={{
        display: "flex", flexWrap: "wrap", gap: 14, marginBottom: 24,
      }}>
        <StatCard label="Total Programs" value={stats.totalPrograms} />
        <StatCard label="Total Players" value={stats.totalPlayers} color="#00CC00" />
        <StatCard label="Submissions" value={stats.totalSubmissions} />
        <StatCard label="Conversations" value={stats.totalConversations} />
      </div>

      <div style={gridStyle}>
        {/* Top programs */}
        <SectionCard title="Top Programs">
          {topPrograms.length === 0 ? (
            <div style={{ color: "#94a3b8", fontSize: 13 }}>No programs found.</div>
          ) : (
            topPrograms.map((p, i) => {
              const hasViews = p.viewCount != null;
              return (
                <div key={p.id} style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "8px 0",
                  borderBottom: i < topPrograms.length - 1 ? "1px solid #f1f5f9" : "none",
                }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: 6, background: "#0A1F44",
                    color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, fontWeight: 700, flexShrink: 0,
                  }}>{i + 1}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#0A1F44",
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {p.school}
                    </div>
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>
                      {p.state} &middot; {p.gender === "mens" ? "Men's" : "Women's"}
                    </div>
                  </div>
                  {hasViews && (
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#00CC00", flexShrink: 0 }}>
                      {p.viewCount} views
                    </div>
                  )}
                  {p.rugbyScholarship && (
                    <div style={{
                      fontSize: 10, fontWeight: 600, color: "#0A1F44", background: "#F4F4F4",
                      padding: "2px 6px", borderRadius: 4, flexShrink: 0,
                    }}>Scholarship</div>
                  )}
                </div>
              );
            })
          )}
        </SectionCard>

        {/* Recent activity */}
        <SectionCard title="Recent Submissions">
          {recentSubmissions.length === 0 ? (
            <div style={{ color: "#94a3b8", fontSize: 13 }}>No submissions yet.</div>
          ) : (
            recentSubmissions.map((s, i) => (
              <div key={s.id} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                gap: 10, padding: "8px 0",
                borderBottom: i < recentSubmissions.length - 1 ? "1px solid #f1f5f9" : "none",
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#0A1F44",
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {s.school || s.programName || "Unknown program"}
                  </div>
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>
                    {s.type || "update"} &middot; {s.email || s.submittedBy || "anonymous"}
                  </div>
                </div>
                <div style={{ flexShrink: 0 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 4,
                    background: s.status === "approved" ? "#ecfdf5" : s.status === "rejected" ? "#fef2f2" : "#fffbeb",
                    color: s.status === "approved" ? "#065f46" : s.status === "rejected" ? "#dc2626" : "#92400e",
                  }}>
                    {s.status || "pending"}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: "#94a3b8", flexShrink: 0, minWidth: 100, textAlign: "right" }}>
                  {formatTimestamp(s.createdAt)}
                </div>
              </div>
            ))
          )}
        </SectionCard>

        {/* Player stats — by position */}
        <SectionCard title="Players by Position">
          {positionCounts.length === 0 ? (
            <div style={{ color: "#94a3b8", fontSize: 13 }}>No player data.</div>
          ) : (
            positionCounts.slice(0, 12).map(p => (
              <HorizontalBar
                key={p.name}
                label={p.name}
                value={p.count}
                maxValue={positionCounts[0]?.count || 1}
                color="#00CC00"
              />
            ))
          )}
        </SectionCard>

        {/* Player stats — by graduation year */}
        <SectionCard title="Players by Graduation Year">
          {gradYearCounts.length === 0 ? (
            <div style={{ color: "#94a3b8", fontSize: 13 }}>No player data.</div>
          ) : (
            gradYearCounts.map(y => (
              <HorizontalBar
                key={y.name}
                label={String(y.name)}
                value={y.count}
                maxValue={gradYearCounts.reduce((max, c) => Math.max(max, c.count), 0)}
                color="#0A1F44"
              />
            ))
          )}
        </SectionCard>

        {/* Geographic distribution */}
        <SectionCard title="Programs by State (Top 10)">
          {stateCounts.length === 0 ? (
            <div style={{ color: "#94a3b8", fontSize: 13 }}>No state data.</div>
          ) : (
            stateCounts.map(s => (
              <HorizontalBar
                key={s.name}
                label={s.name}
                value={s.count}
                maxValue={stateCounts[0]?.count || 1}
                color="#0A1F44"
              />
            ))
          )}
        </SectionCard>
      </div>
    </div>
  );
}
