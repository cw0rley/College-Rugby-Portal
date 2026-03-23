import React, { useState, useEffect, useMemo } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase.js";
import { US_STATES } from "./constants.js";
import { exportCSV } from "./utils/csv.js";

// Components
import ProgramCard from "./components/ProgramCard.jsx";
import ProgramModal from "./components/ProgramModal.jsx";
import ProgramTable from "./components/ProgramTable.jsx";
import ConferenceCard from "./components/ConferenceCard.jsx";
import ContactPage from "./components/ContactPage.jsx";
import AboutPage from "./components/AboutPage.jsx";
import Footer from "./components/Footer.jsx";
import LeagueHierarchyPage from "./components/LeagueHierarchyPage.jsx";
import RankingsPage from "./components/RankingsPage.jsx";
import AdminPage from "./components/admin/AdminPage.jsx";

export default function App() {
  // Hidden admin route — not linked in navigation
  if (window.location.pathname === "/admin") {
    return (
      <div style={{ minHeight: "100vh", background: "#f1f5f9",
        fontFamily: "'Inter', system-ui, sans-serif", padding: "40px 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
            <img src="/logo-icon.svg" alt="" style={{ width: 28, height: 28 }} />
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
  const [confContacts, setConfContacts] = useState([]);
  const [programContacts, setProgramContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("programs");
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [viewMode, setViewMode] = useState("cards");
  const [sortBy, setSortBy] = useState("school");

  // Filters
  const [search, setSearch] = useState("");
  const [genderFilter, setGenderFilter] = useState("all");
  const [stateFilter, setStateFilter] = useState("");
  const [conferenceFilter, setConferenceFilter] = useState("");
  const [leagueFilter, setLeagueFilter] = useState("");
  const [minGPA, setMinGPA] = useState("");
  const [maxTuition, setMaxTuition] = useState("");
  const [scholarshipOnly, setScholarshipOnly] = useState(false);
  const [schoolFundedOnly, setSchoolFundedOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const CACHE_KEY = "crp_cache_v3";
    const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

    async function fetchData() {
      // Try cache first
      try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (raw) {
          const { ts, programs: p, conferences: c, confContacts: cc, programContacts: pc } = JSON.parse(raw);
          if (Date.now() - ts < CACHE_TTL) {
            setPrograms(p);
            setConferences(c);
            if (cc) setConfContacts(cc);
            if (pc) setProgramContacts(pc);
            setLoading(false);
            return;
          }
        }
      } catch (_) { /* ignore bad cache */ }

      // Cache miss or expired — fetch from Firestore
      try {
        const [progSnap, confSnap, ccSnap, pcSnap] = await Promise.all([
          getDocs(collection(db, "programs")),
          getDocs(collection(db, "conferences")),
          getDocs(collection(db, "conferenceContacts")).catch(() => ({ docs: [] })),
          getDocs(collection(db, "programContacts")).catch(() => ({ docs: [] })),
        ]);
        const p = progSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const c = confSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const cc = ccSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const pc = pcSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setPrograms(p);
        setConferences(c);
        setConfContacts(cc);
        setProgramContacts(pc);
        localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), programs: p, conferences: c, confContacts: cc, programContacts: pc }));
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

  const confNameMap = useMemo(() =>
    Object.fromEntries(conferences.map(c => [c.conference, c.fullName || c.conference])),
    [conferences]);

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
      if (schoolFundedOnly && !p.schoolFunded) return false;
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
  }, [programs, search, genderFilter, stateFilter, conferenceFilter, leagueFilter, minGPA, maxTuition, scholarshipOnly, schoolFundedOnly]);

  const confSearch = useMemo(() => {
    if (!search || activeTab !== "conferences") return conferences;
    const q = search.toLowerCase();
    return conferences.filter(c =>
      c.conference?.toLowerCase().includes(q) ||
      c.fullName?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q)
    );
  }, [conferences, search, activeTab]);

  const contactsByProgramId = useMemo(() => {
    const map = {};
    programContacts.forEach(c => {
      if (!map[c.programId]) map[c.programId] = [];
      map[c.programId].push(c);
    });
    return map;
  }, [programContacts]);

  const sorted = useMemo(() => {
    const list = filtered.map(p => ({
      ...p,
      _contacts: (contactsByProgramId[p.id] || []).map(c => ({
        name: c.contact, title: c.contactTitle, email: c.email,
      })),
    }));
    list.sort((a, b) => {
      if (sortBy === "school") return (a.school||"").localeCompare(b.school||"");
      if (sortBy === "rank") {
        const ar = a.rugbyRanking, br = b.rugbyRanking;
        if (!ar && !br) return 0;
        if (!ar) return 1;
        if (!br) return -1;
        return ar - br;
      }
      if (sortBy === "cost") {
        const ac = a.inStateTuition, bc = b.inStateTuition;
        if (!ac && !bc) return 0;
        if (!ac) return 1;
        if (!bc) return -1;
        return ac - bc;
      }
      if (sortBy === "sizeDesc" || sortBy === "sizeAsc") {
        const as = a.enrollment, bs = b.enrollment;
        if (!as && !bs) return 0;
        if (!as) return 1;
        if (!bs) return -1;
        return sortBy === "sizeDesc" ? bs - as : as - bs;
      }
      return 0;
    });
    return list;
  }, [filtered, contactsByProgramId, sortBy]);

  const activeFiltersCount = [stateFilter, conferenceFilter, leagueFilter, minGPA, maxTuition, scholarshipOnly, schoolFundedOnly].filter(Boolean).length;
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
      <img src="/logo-icon.svg" alt="" style={{ width: 120, height: 120, position: "relative" }} />
      <div style={{ position: "relative", textAlign: "center" }}>
        <div style={{ fontSize: 42, fontWeight: 800, color: "#F4F4F4", letterSpacing: "-0.03em",
          fontFamily: "'Montserrat', 'Inter', system-ui, sans-serif" }}>
          College Rugby Portal
        </div>
        <div style={{ fontSize: 32, fontWeight: 700, color: "#00FF00", marginTop: 8,
          letterSpacing: "-0.02em" }}>
          Connect. Get Recruited. Play.
        </div>
      </div>
      <div style={{ position: "relative", fontSize: 13, color: "#94a3b8", marginTop: 8 }}>Loading programs...</div>
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
        background: "#0A1F44",
        padding: "28px 24px 36px", color: "#fff",
      }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>

          <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 24 }}>
            <img src="/logo-icon.svg" alt="" style={{ width: 80, height: 80, flexShrink: 0 }} />
            <div>
              <h1 style={{ margin: 0, fontSize: 32, fontWeight: 800, letterSpacing: "-0.03em",
                color: "#F4F4F4", fontFamily: "'Montserrat', 'Inter', system-ui, sans-serif" }}>
                College Rugby Portal
              </h1>
              <p style={{ margin: "6px 0 0", color: "#69BE28", fontSize: 22, fontWeight: 700,
                letterSpacing: "-0.02em" }}>
                Connect. Get Recruited. Play.
              </p>
            </div>
          </div>

          {/* Search bar */}
          <div style={{ position: "relative", maxWidth: 600 }}>
            <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
              fontSize: 16, color: "#94a3b8" }}>🔍</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={`Search ${programs.length} programs — schools, cities, conferences...`}
              style={{
                width: "100%", padding: "14px 16px 14px 44px", border: "none",
                borderRadius: 12, fontSize: 15, outline: "none", boxSizing: "border-box",
                boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
              }}
            />
          </div>
        </div>
      </div>

      {/* Main content */}
      <div style={{ maxWidth: 1100, margin: "24px auto 40px", padding: "0 24px" }}>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          {[
            { key: "programs", label: `Programs (${sorted.length})` },
            { key: "conferences", label: `Conferences (${conferences.length})` },
            { key: "structure", label: "Leagues" },
            { key: "rankings", label: "Rankings" },
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
                {uniqueConferences.map(c => <option key={c} value={c}>{confNameMap[c] || c}</option>)}
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

              {(stateFilter || conferenceFilter || leagueFilter || minGPA || maxTuition || scholarshipOnly || schoolFundedOnly) && (
                <button onClick={() => { setStateFilter(""); setConferenceFilter(""); setLeagueFilter("");
                  setMinGPA(""); setMaxTuition(""); setScholarshipOnly(false); setSchoolFundedOnly(false); }}
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
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer",
                  fontSize: 13, fontWeight: 600, color: "#475569" }}>
                  <input type="checkbox" checked={schoolFundedOnly}
                    onChange={e => setSchoolFundedOnly(e.target.checked)}
                    style={{ width: 16, height: 16, cursor: "pointer" }} />
                  School Funded Only
                </label>
              </div>
            )}

            {/* Results count + sort + view toggle + export */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
              <div style={{ fontSize: 13, color: "#64748b", flex: 1 }}>
                Showing <strong>{sorted.length}</strong> of {programs.length} programs
              </div>

              {/* Sort */}
              <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0",
                  fontSize: 13, color: "#475569", background: "#fff", cursor: "pointer" }}>
                <option value="school">Sort: School Name</option>
                <option value="rank">Sort: Ranking</option>
                <option value="cost">Sort: Cost (Low → High)</option>
                <option value="sizeDesc">Sort: Size (Large → Small)</option>
                <option value="sizeAsc">Sort: Size (Small → Large)</option>
              </select>

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
            {sorted.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 24px", color: "#94a3b8" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
                <div style={{ fontSize: 17, fontWeight: 600 }}>No programs found</div>
                <div style={{ fontSize: 14, marginTop: 8 }}>Try adjusting your filters</div>
              </div>
            ) : viewMode === "cards" ? (
              <div style={{ display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
                {sorted.map((p, i) => (
                  <ProgramCard key={p.id || i} program={p} confNameMap={confNameMap} onClick={setSelectedProgram} />
                ))}
              </div>
            ) : (
              <ProgramTable programs={sorted} confNameMap={confNameMap} onRowClick={setSelectedProgram} />
            )}
          </>
        )}

        {activeTab === "contact" && <ContactPage programs={programs} />}
        {activeTab === "about" && <AboutPage />}
        {activeTab === "structure" && (
          <LeagueHierarchyPage
            programs={programs}
            conferences={conferences}
            onSelectProgram={setSelectedProgram}
          />
        )}
        {activeTab === "rankings" && (
          <RankingsPage
            programs={programs}
            confNameMap={confNameMap}
            onSelectProgram={setSelectedProgram}
          />
        )}

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
      <ProgramModal program={selectedProgram} confNameMap={confNameMap} onClose={() => setSelectedProgram(null)} />

      <Footer onNavigate={setActiveTab} />
    </div>
  );
}
