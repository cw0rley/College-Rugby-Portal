import React, { useState, useEffect, useMemo, Suspense } from "react";
import { Routes, Route, NavLink, Navigate, useNavigate, useLocation } from "react-router-dom";
import { collection, getDocs, doc, getDoc, setDoc } from "firebase/firestore";
import { onAuthStateChanged, signInWithPopup, signInWithRedirect } from "firebase/auth";
import { db, auth, googleProvider } from "./firebase.js";
import { US_STATES } from "./constants.js";
import { exportCSV } from "./utils/csv.js";
import { trackPageView, trackProgramView, trackSearch, trackFilter, trackExport } from "./utils/analytics.js";
import { loadFavorites, addFavorite, removeFavorite } from "./utils/favorites.js";
import { getOrCreateConversation, subscribeToConversations } from "./utils/messaging.js";
import { toSlug } from "./utils/slug.js";

// Eagerly loaded components (used on first render)
import ProgramCard from "./components/ProgramCard.jsx";
import ProgramTable from "./components/ProgramTable.jsx";
import ConferenceCard from "./components/ConferenceCard.jsx";
import Footer from "./components/Footer.jsx";
import CompareBar from "./components/CompareBar.jsx";
import ProgramDetailPage from "./components/ProgramDetailPage.jsx";
import HeaderAuth from "./components/ui/HeaderAuth.jsx";
import AuthGate from "./components/ui/AuthGate.jsx";

// Lazy-loaded components (loaded on demand)
const ContactPage = React.lazy(() => import("./components/ContactPage.jsx"));
const PlayerSubmitPage = React.lazy(() => import("./components/PlayerSubmitPage.jsx"));
const AboutPage = React.lazy(() => import("./components/AboutPage.jsx"));
const LeagueHierarchyPage = React.lazy(() => import("./components/LeagueHierarchyPage.jsx"));
const RankingsPage = React.lazy(() => import("./components/RankingsPage.jsx"));
const AdminPage = React.lazy(() => import("./components/admin/AdminPage.jsx"));
const CompareView = React.lazy(() => import("./components/CompareView.jsx"));
const PlayerDirectoryPage = React.lazy(() => import("./components/PlayerDirectoryPage.jsx"));
const CoachDashboardPage = React.lazy(() => import("./components/CoachDashboardPage.jsx"));
const MessagesPage = React.lazy(() => import("./components/MessagesPage.jsx"));

const LazyFallback = () => (
  <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>Loading...</div>
);

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 900);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 900);
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Auth state
  const [user, setUser] = useState(null);
  const [userAccess, setUserAccess] = useState(null); // { isCoach, hasProfile, emailVerified, ... }
  const [hasPlayerProfile, setHasPlayerProfile] = useState(false);
  useEffect(() => onAuthStateChanged(auth, u => {
    setUser(u);
    if (u) {
      const userRef = doc(db, "users", u.uid);
      getDoc(userRef).then(snap => {
        if (snap.exists()) {
          setUserAccess(snap.data());
        } else {
          // Create user doc on first sign-in
          const userData = { email: u.email || "", displayName: u.displayName || "", isCoach: false, approved: false, createdAt: new Date().toISOString() };
          setDoc(userRef, userData).catch(() => {});
          setUserAccess(userData);
        }
      }).catch(() => setUserAccess(null));
      // Check if user has a player profile
      getDoc(doc(db, "playerProfiles", u.uid)).then(snap => {
        setHasPlayerProfile(snap.exists() && !!snap.data().firstName);
      }).catch(() => setHasPlayerProfile(false));
      // Send email verification if not verified (email/password users)
      if (!u.emailVerified && u.providerData?.[0]?.providerId === "password") {
        import("firebase/auth").then(({ sendEmailVerification }) => {
          sendEmailVerification(u).catch(() => {});
        });
      }
    } else {
      setUserAccess(null);
      setHasPlayerProfile(false);
    }
  }), []);

  const [programs, setPrograms] = useState([]);
  const [conferences, setConferences] = useState([]);
  const [confContacts, setConfContacts] = useState([]);
  const [programContacts, setProgramContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Compare state
  const [compareIds, setCompareIds] = useState([]);
  const [showCompare, setShowCompare] = useState(false);

  // Favorites state
  const [favoriteIds, setFavoriteIds] = useState(new Set());
  const [showSignInPrompt, setShowSignInPrompt] = useState(false);

  // Load favorites when user changes
  useEffect(() => {
    if (!user) { setFavoriteIds(new Set()); return; }
    loadFavorites(user.uid).then(setFavoriteIds).catch(() => {});
  }, [user]);

  // Coach detection: derive program IDs where user is a listed contact
  const coachProgramIds = useMemo(() => {
    if (!user) return [];
    const ids = new Set();
    // From email match in programContacts
    const email = user.email?.toLowerCase();
    if (email && programContacts.length) {
      programContacts.filter(c => c.email?.toLowerCase() === email).forEach(c => ids.add(c.programId));
    }
    // From admin-assigned programs in user doc
    if (userAccess?.assignedProgramIds) {
      userAccess.assignedProgramIds.forEach(id => ids.add(id));
    }
    return [...ids];
  }, [user, programContacts, userAccess]);

  // Auto-grant coach status if user's email matches a Head Coach contact
  useEffect(() => {
    if (!user || !programContacts.length || !userAccess) return;
    if (userAccess.isCoach) return; // already a coach
    const email = user.email?.toLowerCase();
    if (!email) return;
    const isHeadCoach = programContacts.some(c =>
      c.email?.toLowerCase() === email &&
      (c.contactTitle || "").toLowerCase().includes("head coach")
    );
    if (isHeadCoach) {
      const userRef = doc(db, "users", user.uid);
      setDoc(userRef, { isCoach: true, approved: true }, { merge: true }).then(() => {
        setUserAccess(prev => ({ ...prev, isCoach: true, approved: true }));
      }).catch(() => {});
    }
  }, [user, programContacts, userAccess]);

  // Messaging state
  const [totalUnread, setTotalUnread] = useState(0);
  const [pendingConversationId, setPendingConversationId] = useState(null);

  // Subscribe to conversations for unread count
  useEffect(() => {
    if (!user) { setTotalUnread(0); return; }
    const unsub = subscribeToConversations(user.uid, convos => {
      const count = convos.reduce((sum, c) => sum + (c.unreadCounts?.[user.uid] || 0), 0);
      setTotalUnread(count);
    });
    return unsub;
  }, [user]);

  // Open message handler for CoachDashboard and ProgramDetailPage
  async function handleOpenMessage(theirUid, theirName, theirRole, programId) {
    if (!user) {
      setShowSignInPrompt(true);
      return;
    }
    try {
      const myName = user.displayName || user.email || "User";
      const myRole = coachProgramIds.length > 0 ? "coach" : "player";
      const convId = await getOrCreateConversation(user.uid, myName, myRole, theirUid, theirName, theirRole, programId);
      setPendingConversationId(convId);
      navigate("/messages");
    } catch (err) {
      console.error("Failed to open message:", err);
    }
  }

  function handleToggleCompare(programId) {
    setCompareIds(prev => {
      if (prev.includes(programId)) return prev.filter(id => id !== programId);
      if (prev.length >= 3) return prev;
      return [...prev, programId];
    });
  }

  function handleToggleFavorite(programId) {
    if (!user) {
      setShowSignInPrompt(true);
      return;
    }
    setFavoriteIds(prev => {
      const next = new Set(prev);
      if (next.has(programId)) {
        next.delete(programId);
        removeFavorite(user.uid, programId).catch(() => {});
      } else {
        next.add(programId);
        // Fetch player profile data to pass along for programInterest
        getDoc(doc(db, "playerProfiles", user.uid)).then(snap => {
          const playerData = snap.exists() ? {
            firstName: snap.data().firstName || "",
            lastName: snap.data().lastName || "",
            position: snap.data().position || "",
            secondaryPosition: snap.data().secondaryPosition || "",
            graduationYear: snap.data().graduationYear || null,
            city: snap.data().city || "",
            currentClub: snap.data().currentClub || "",
            gpa: snap.data().gpa || "",
            profilePublic: snap.data().profilePublic || false,
          } : null;
          addFavorite(user.uid, programId, playerData).catch(() => {});
        }).catch(() => {
          addFavorite(user.uid, programId).catch(() => {});
        });
      }
      return next;
    });
  }

  async function handleSignInForFavorites() {
    try { await signInWithPopup(auth, googleProvider); }
    catch { signInWithRedirect(auth, googleProvider); }
    setShowSignInPrompt(false);
  }

  // Analytics: track route changes
  useEffect(() => { trackPageView(location.pathname); setMobileMenuOpen(false); }, [location.pathname]);

  // Analytics: track search (debounced inside the helper)
  useEffect(() => { trackSearch(search); }, [search]);

  // Navigate to program detail page
  function handleSelectProgram(p) {
    if (p) {
      trackProgramView(p);
      navigate(`/program/${p.id}/${toSlug(p.school)}`);
    }
  }

  useEffect(() => {
    const CACHE_KEY = "crp_cache_v4";
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

  // Determine if we're on the favorites route
  const isFavoritesRoute = location.pathname === "/favorites";

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
    if (!search || location.pathname !== "/conferences") return conferences;
    const q = search.toLowerCase();
    return conferences.filter(c =>
      c.conference?.toLowerCase().includes(q) ||
      c.fullName?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q)
    );
  }, [conferences, search, location.pathname]);

  const contactsByProgramId = useMemo(() => {
    const map = {};
    programContacts.forEach(c => {
      if (!map[c.programId]) map[c.programId] = [];
      map[c.programId].push(c);
    });
    return map;
  }, [programContacts]);

  const sorted = useMemo(() => {
    let base = filtered;
    // If on favorites route, filter to only favorited programs
    if (isFavoritesRoute) {
      base = base.filter(p => favoriteIds.has(p.id));
    }
    const list = base.map(p => ({
      ...p,
      _contacts: (contactsByProgramId[p.id] || []).map(c => ({
        name: c.contact, title: c.contactTitle, email: c.email,
      })),
    }));
    const sortFn = (a, b) => {
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
    };
    // Featured programs appear first, each group sorted by current criteria
    const featured = list.filter(p => p.featured);
    const nonFeatured = list.filter(p => !p.featured);
    featured.sort(sortFn);
    nonFeatured.sort(sortFn);
    return [...featured, ...nonFeatured];
  }, [filtered, contactsByProgramId, sortBy, isFavoritesRoute, favoriteIds]);

  const comparePrograms = useMemo(() =>
    programs.filter(p => compareIds.includes(p.id)),
    [programs, compareIds]);

  const activeFiltersCount = [stateFilter, conferenceFilter, leagueFilter, minGPA, maxTuition, scholarshipOnly, schoolFundedOnly].filter(Boolean).length;
  const [disclaimerDismissed, setDisclaimerDismissed] = useState(false);

  // Build nav items
  const navItems = useMemo(() => {
    const t = [
      { to: "/", label: `Programs (${isFavoritesRoute ? filtered.filter(p => favoriteIds.has(p.id)).length : sorted.length})`, end: true },
      { to: "/conferences", label: `Conferences (${conferences.length})` },
      { to: "/leagues", label: "Leagues" },
      { to: "/rankings", label: "Rankings" },
      { to: "/favorites", label: `Favorites (${favoriteIds.size})` },
    ];
    if (coachProgramIds.length > 0 || userAccess?.isCoach) {
      t.push({ to: "/coach", label: "My Program" });
    }
    // Messages: coaches always, players only if they have a profile
    if (userAccess?.isCoach || hasPlayerProfile) {
      t.push({ to: "/messages", label: totalUnread > 0 ? `Messages (${totalUnread})` : "Messages" });
    }
    if (userAccess?.isCoach) {
      t.push({ to: "/directory", label: "Player Directory" });
    }
    t.push(
      { to: "/submit", label: "Submit Program Info" },
      { to: "/player-profile", label: "Player Profile" },
      { to: "/about", label: "About" },
    );
    return t;
  }, [sorted.length, conferences.length, user, userAccess, hasPlayerProfile, favoriteIds.size, isFavoritesRoute, filtered, coachProgramIds.length, totalUnread]);

  // Check if current route is one that uses the admin layout
  const isAdminRoute = location.pathname === "/admin";

  if (loading) return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      height: "100vh", flexDirection: "column", gap: 24,
      background: "#0A1F44",
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      <img src="/logo-icon.svg" alt="" style={{ width: 120, height: 120 }} />
      <div style={{ textAlign: "center" }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, letterSpacing: "-0.03em",
          color: "#F4F4F4", fontFamily: "'Montserrat', 'Inter', system-ui, sans-serif" }}>
          College Rugby Portal
        </h1>
        <p style={{ margin: "6px 0 0", color: "#00ff00", fontSize: 16, fontWeight: 700,
          letterSpacing: "-0.02em", fontFamily: "'Montserrat', 'Inter', system-ui, sans-serif" }}>
          Connect. Get Recruited. Play.
        </p>
      </div>
      <div style={{ fontSize: 13, color: "#94a3b8" }}>Loading programs...</div>
    </div>
  );

  if (error) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center",
      height: "100vh", flexDirection: "column", gap: 16, background: "#f8fafc", padding: 24 }}>
      <div style={{ fontSize: 40 }}>&#9888;&#65039;</div>
      <div style={{ fontSize: 18, fontWeight: 600, color: "#dc2626", textAlign: "center" }}>{error}</div>
    </div>
  );

  // Admin route — separate layout
  if (isAdminRoute) {
    return (
      <div style={{ minHeight: "100vh", background: "#f1f5f9",
        fontFamily: "'Inter', system-ui, sans-serif", padding: "40px 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
            <img src="/logo-icon.svg" alt="" style={{ width: 28, height: 28 }} />
            <span style={{ fontWeight: 800, fontSize: 18, color: "#0f172a" }}>
              College Rugby Portal &mdash; Admin
            </span>
          </div>
          <Suspense fallback={<LazyFallback />}>
            <AdminPage />
          </Suspense>
        </div>
      </div>
    );
  }

  // Shared inline content for programs grid (used by both "/" and "/favorites")
  const programGridContent = (isFavorites) => (
    <>
      {/* Favorites tab: auth gate if not logged in */}
      {isFavorites && !user && (
        <AuthGate user={user} title="Favorites" description="Sign in to view and manage your favorite programs.">
          <div />
        </AuthGate>
      )}

      {/* Filter bar */}
      {(!isFavorites || (isFavorites && user)) && (
        <>
          <div style={{ background: "#fff", borderRadius: 12, padding: isMobile ? 12 : 16, marginBottom: 20,
            boxShadow: "0 1px 3px rgba(0,0,0,0.06)", display: "flex",
            flexDirection: isMobile ? "column" : "row",
            gap: isMobile ? 8 : 10, flexWrap: "wrap",
            alignItems: isMobile ? "stretch" : "center",
            width: "100%", boxSizing: "border-box" }}>

            {/* Gender */}
            <div style={{ display: "flex", borderRadius: 8, overflow: "hidden", border: "1px solid #e2e8f0",
              width: isMobile ? "100%" : "auto" }}>
              {[["all","All"],["mens","Men's"],["womens","Women's"]].map(([val, label]) => (
                <button key={val} onClick={() => setGenderFilter(val)} style={{
                  padding: "7px 14px", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
                  flex: isMobile ? 1 : "none",
                  background: genderFilter === val ? "#1a56db" : "#fff",
                  color: genderFilter === val ? "#fff" : "#64748b",
                }}>{label}</button>
              ))}
            </div>

            {isMobile ? (
              <>
                <div style={{ display: "flex", gap: 8 }}>
                  <select value={stateFilter} onChange={e => setStateFilter(e.target.value)}
                    style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0",
                      fontSize: 14, color: "#475569", background: "#fff", cursor: "pointer", flex: 1 }}>
                    <option value="">All States</option>
                    {Object.entries(US_STATES).sort((a,b) => a[1].localeCompare(b[1])).map(([abbr, name]) => (
                      <option key={abbr} value={abbr}>{name}</option>
                    ))}
                  </select>
                  <select value={leagueFilter} onChange={e => { setLeagueFilter(e.target.value); setConferenceFilter(""); }}
                    style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0",
                      fontSize: 14, color: "#475569", background: "#fff", cursor: "pointer", flex: 1 }}>
                    <option value="">All Leagues</option>
                    {uniqueLeagues.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <select value={conferenceFilter} onChange={e => setConferenceFilter(e.target.value)}
                  style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0",
                    fontSize: 14, color: "#475569", background: "#fff", cursor: "pointer", width: "100%" }}>
                  <option value="">All Conferences</option>
                  {uniqueConferences.map(c => <option key={c} value={c}>{confNameMap[c] || c}</option>)}
                </select>
              </>
            ) : (
              <>
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
              </>
            )}

            <button onClick={() => setShowFilters(!showFilters)} style={{
              padding: "8px 14px", borderRadius: 8, border: "1px solid #e2e8f0",
              background: showFilters ? "#f0f7ff" : "#fff", color: "#475569",
              cursor: "pointer", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center",
              justifyContent: isMobile ? "center" : "flex-start", gap: 6,
              width: isMobile ? "100%" : "auto",
            }}>
              &#9881; More Filters {activeFiltersCount > 0 && (
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
                  fontSize: 13, fontWeight: 600, width: isMobile ? "100%" : "auto", textAlign: "center" }}>&#10005; Clear</button>
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
          <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row",
            alignItems: isMobile ? "stretch" : "center", gap: isMobile ? 8 : 10, marginBottom: 16, flexWrap: "wrap" }}>
            <div style={{ fontSize: 13, color: "#64748b", flex: isMobile ? "none" : 1 }}>
              Showing <strong>{sorted.length}</strong>{isFavorites ? " favorited" : ` of ${programs.length}`} programs
            </div>

            {/* Sort */}
            <select value={sortBy} onChange={e => setSortBy(e.target.value)}
              style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0",
                fontSize: isMobile ? 14 : 13, color: "#475569", background: "#fff", cursor: "pointer",
                width: isMobile ? "100%" : "auto" }}>
              <option value="school">Sort: School Name</option>
              <option value="rank">Sort: Ranking</option>
              <option value="cost">Sort: Cost (Low → High)</option>
              <option value="sizeDesc">Sort: Size (Large → Small)</option>
              <option value="sizeAsc">Sort: Size (Small → Large)</option>
            </select>

            {/* View toggle + Export */}
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ display: "flex", borderRadius: 8, overflow: "hidden", border: "1px solid #e2e8f0",
                flex: isMobile ? 1 : "none" }}>
                {[["cards","\u229E Cards"],["table","\u2261 Table"]].map(([mode, label]) => (
                  <button key={mode} onClick={() => setViewMode(mode)} style={{
                    padding: "7px 14px", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
                    flex: isMobile ? 1 : "none",
                    background: viewMode === mode ? "#1a56db" : "#fff",
                    color: viewMode === mode ? "#fff" : "#64748b",
                  }}>{label}</button>
                ))}
              </div>
              <button onClick={() => { trackExport(filtered.length); exportCSV(filtered); }} style={{
                padding: "7px 16px", borderRadius: 8, border: "1px solid #e2e8f0",
                background: "#fff", color: "#475569", cursor: "pointer",
                fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center",
                gap: 6, flex: isMobile ? 1 : "none",
              }}>{"\u2B07"} Export Report ({filtered.length})</button>
            </div>
          </div>

          {/* Program grid or table */}
          {sorted.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 24px", color: "#94a3b8" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>{isFavorites ? "\u2764\uFE0F" : "\uD83D\uDD0D"}</div>
              <div style={{ fontSize: 17, fontWeight: 600 }}>
                {isFavorites ? "No favorites yet" : "No programs found"}
              </div>
              <div style={{ fontSize: 14, marginTop: 8 }}>
                {isFavorites
                  ? "Click the heart icon on any program to add it to your favorites"
                  : "Try adjusting your filters"}
              </div>
            </div>
          ) : viewMode === "cards" ? (
            <div style={{ display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(300px, 1fr))", gap: isMobile ? 12 : 16,
              maxWidth: "100%", overflow: "hidden" }}>
              {sorted.map((p, i) => (
                <ProgramCard
                  key={p.id || i}
                  program={p}
                  confNameMap={confNameMap}
                  onClick={handleSelectProgram}
                  isComparing={compareIds.includes(p.id)}
                  onToggleCompare={handleToggleCompare}
                  isFavorited={favoriteIds.has(p.id)}
                  onToggleFavorite={handleToggleFavorite}
                />
              ))}
            </div>
          ) : (
            <ProgramTable programs={sorted} confNameMap={confNameMap} onRowClick={handleSelectProgram} />
          )}
        </>
      )}
    </>
  );

  // Conferences content
  const conferencesContent = (
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
              <button onClick={() => { setLeagueFilter(league); setConferenceFilter(""); navigate("/"); }}
                style={{ fontSize: 12, color: "#1a56db", background: "none", border: "none",
                  cursor: "pointer", fontWeight: 600, padding: 0 }}>
                View all programs &rarr;
              </button>
            </div>
            <div className="crp-card-grid" style={{ display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(300px, 1fr))", gap: isMobile ? 12 : 10 }}>
              {confByLeague[league].map((c, i) => {
                const count = programs.filter(p => p.conference === c.conference).length;
                return (
                  <ConferenceCard key={c.id || i} conf={c} programCount={count}
                    onClick={() => {
                      setLeagueFilter(league);
                      setConferenceFilter(c.conference);
                      navigate("/");
                    }} />
                );
              })}
            </div>
          </div>
        ));
      })()}
    </>
  );

  // NavLink styling
  const navBaseStyle = {
    padding: isMobile ? "10px 12px" : "10px 20px", borderRadius: 10, border: "none", cursor: "pointer",
    fontWeight: 600, fontSize: isMobile ? 13 : 14, transition: "all 0.15s", textAlign: "center",
    textDecoration: "none", display: "inline-block", whiteSpace: "nowrap", flexShrink: 0,
  };
  const navActiveStyle = {
    background: "#1a56db", color: "#fff",
    boxShadow: "0 4px 12px rgba(26,86,219,0.3)",
  };
  const navInactiveStyle = {
    background: "#fff", color: "#475569",
    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f1f5f9", fontFamily: "'Inter', system-ui, sans-serif", overflowX: "hidden", maxWidth: "100vw" }}>

      {/* Header */}
      <div style={{
        background: "#0A1F44",
        padding: isMobile ? "16px 8px 24px" : "28px 24px 36px", color: "#fff",
      }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>

          <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 12 : 20, marginBottom: isMobile ? 16 : 24 }}>
            <img src="/logo-icon.svg" alt="" style={{ width: isMobile ? 48 : 80, height: isMobile ? 48 : 80, flexShrink: 0, cursor: "pointer" }} onClick={() => navigate("/")} />
            <div style={{ flex: 1 }}>
              <h1 style={{ margin: 0, fontSize: isMobile ? 20 : 32, fontWeight: 800, letterSpacing: "-0.03em",
                color: "#F4F4F4", fontFamily: "'Montserrat', 'Inter', system-ui, sans-serif" }}>
                College Rugby Portal
              </h1>
              <p style={{ margin: "6px 0 0", color: "#00ff00", fontSize: isMobile ? 13 : 22, fontWeight: 700,
                letterSpacing: "-0.02em" }}>
                Connect. Get Recruited. Play.
              </p>
            </div>
            {!isMobile && <HeaderAuth user={user} isMobile={false} />}
          </div>
          {isMobile && (
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
              <HeaderAuth user={user} isMobile={true} />
            </div>
          )}

          {/* Search bar */}
          <div style={{ position: "relative", maxWidth: 600, width: "100%" }}>
            <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
              fontSize: 16, color: "#94a3b8" }}>&#128269;</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={`Search ${programs.length} programs \u2014 schools, cities, conferences...`}
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
      <div onClick={() => { if (!disclaimerDismissed) setDisclaimerDismissed(true); }} style={{ maxWidth: 1100, margin: "24px auto 40px", padding: isMobile ? "0 8px" : "0 24px", paddingBottom: compareIds.length > 0 ? 70 : 0 }}>

        {/* Nav — hamburger on mobile, tabs on desktop */}
        {isMobile ? (
          <div style={{ marginBottom: 20 }}>
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "10px 16px",
              borderRadius: 10, border: "none", cursor: "pointer",
              background: mobileMenuOpen ? "#0A1F44" : "#fff",
              color: mobileMenuOpen ? "#fff" : "#475569",
              fontWeight: 700, fontSize: 14,
              boxShadow: "0 1px 3px rgba(0,0,0,0.08)", width: "100%",
              justifyContent: "space-between",
            }}>
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  {mobileMenuOpen
                    ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>
                    : <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>
                  }
                </svg>
                {navItems.find(item => {
                  if (item.end) return location.pathname === item.to;
                  return location.pathname.startsWith(item.to);
                })?.label || "Menu"}
              </span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                style={{ transform: mobileMenuOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {mobileMenuOpen && (
              <div style={{
                marginTop: 6, background: "#fff", borderRadius: 12, overflow: "hidden",
                boxShadow: "0 4px 20px rgba(0,0,0,0.12)", border: "1px solid #E5E7EB",
              }}>
                {navItems.map(item => (
                  <NavLink key={item.to} to={item.to} end={item.end || false}
                    onClick={() => setMobileMenuOpen(false)}
                    style={({ isActive }) => ({
                      display: "block", padding: "12px 16px",
                      textDecoration: "none", fontWeight: 600, fontSize: 14,
                      borderBottom: "1px solid #f1f5f9",
                      background: isActive ? "#0A1F44" : "#fff",
                      color: isActive ? "#00FF00" : "#475569",
                    })}
                  >{item.label}</NavLink>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
            {navItems.map(item => (
              <NavLink key={item.to} to={item.to} end={item.end || false}
                style={({ isActive }) => ({
                  ...navBaseStyle,
                  ...(isActive ? navActiveStyle : navInactiveStyle),
                })}
              >{item.label}</NavLink>
            ))}
          </div>
        )}

        {/* Data disclaimer banner */}
        {!disclaimerDismissed && (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            gap: 12, background: "#fffbeb", border: "1px solid #fde68a",
            borderRadius: 10, padding: "10px 16px", marginBottom: 16, flexWrap: "wrap",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#92400e" }}>
              <span style={{ fontSize: 16 }}>&#9888;&#65039;</span>
              <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span>Program data was collected from public sources and may not be fully up to date.</span>
                <span>
                  See something incorrect?{" "}
                  <button onClick={() => navigate("/submit")} style={{
                    background: "none", border: "none", padding: 0, color: "#b45309",
                    fontWeight: 700, cursor: "pointer", fontSize: 13, textDecoration: "underline",
                  }}>Submit a correction</button>
                  {" "}and we&apos;ll review it promptly.
                </span>
              </span>
            </div>
            <button onClick={() => setDisclaimerDismissed(true)} style={{
              background: "none", border: "none", fontSize: 18, cursor: "pointer",
              color: "#d97706", lineHeight: 1, flexShrink: 0,
            }}>&times;</button>
          </div>
        )}

        {/* Routes */}
        <Suspense fallback={<LazyFallback />}>
          <Routes>
            <Route path="/" element={programGridContent(false)} />
            <Route path="/favorites" element={programGridContent(true)} />
            <Route path="/conferences" element={conferencesContent} />
            <Route path="/leagues" element={
              <LeagueHierarchyPage
                programs={programs}
                conferences={conferences}
                onSelectProgram={handleSelectProgram}
              />
            } />
            <Route path="/rankings" element={
              <RankingsPage
                programs={programs}
                confNameMap={confNameMap}
                onSelectProgram={handleSelectProgram}
              />
            } />
            <Route path="/submit" element={<ContactPage programs={programs} user={user} />} />
            <Route path="/player-profile" element={<PlayerSubmitPage user={user} />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/directory" element={
              userAccess?.isCoach ? <PlayerDirectoryPage user={user} /> : <Navigate to="/" />
            } />
            <Route path="/coach" element={
              (coachProgramIds.length > 0 || userAccess?.isCoach) ? (
                <CoachDashboardPage
                  coachProgramIds={coachProgramIds}
                  programs={programs}
                  user={user}
                  onOpenMessage={handleOpenMessage}
                />
              ) : <Navigate to="/" />
            } />
            <Route path="/messages" element={
              (userAccess?.isCoach || hasPlayerProfile) ? (
                <MessagesPage
                  user={user}
                  activeConversationId={pendingConversationId}
                  onConversationOpened={() => setPendingConversationId(null)}
                />
              ) : <Navigate to="/player-profile" />
            } />
            <Route path="/program/:id/:slug" element={
              <ProgramDetailPage
                programs={sorted.length > 0 ? sorted : programs.map(p => ({
                  ...p,
                  _contacts: (contactsByProgramId[p.id] || []).map(c => ({
                    name: c.contact, title: c.contactTitle, email: c.email,
                  })),
                }))}
                confNameMap={confNameMap}
                user={user}
                favoriteIds={favoriteIds}
                onToggleFavorite={handleToggleFavorite}
                coachProgramIds={coachProgramIds}
                onOpenMessage={handleOpenMessage}
                onToggleCompare={handleToggleCompare}
                compareIds={compareIds}
              />
            } />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
          {showCompare && <CompareView programs={comparePrograms} onClose={() => setShowCompare(false)} />}
        </Suspense>
      </div>

      {/* Sign-in toast for favorites/messaging */}
      {showSignInPrompt && (
        <div style={{
          position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
          zIndex: 1000, background: "#0A1F44", color: "#fff", borderRadius: 12,
          padding: "14px 20px", display: "flex", alignItems: "center", gap: 14,
          boxShadow: "0 8px 30px rgba(0,0,0,0.3)", maxWidth: 420, width: "calc(100% - 40px)",
        }}>
          <span style={{ fontSize: 14, fontWeight: 600, flex: 1 }}>Sign in to save favorites</span>
          <button onClick={handleSignInForFavorites} style={{
            padding: "8px 16px", borderRadius: 8, border: "none",
            background: "#00FF00", color: "#0A1F44", fontWeight: 700, fontSize: 13,
            cursor: "pointer", whiteSpace: "nowrap",
          }}>Sign In</button>
          <button onClick={() => setShowSignInPrompt(false)} style={{
            background: "none", border: "none", color: "#94a3b8", fontSize: 18,
            cursor: "pointer", lineHeight: 1, padding: 0,
          }}>&times;</button>
        </div>
      )}

      {/* Compare bar */}
      <CompareBar
        compareIds={compareIds}
        programs={programs}
        onRemove={handleToggleCompare}
        onClear={() => setCompareIds([])}
        onCompare={() => setShowCompare(true)}
      />

      <Footer />
    </div>
  );
}
