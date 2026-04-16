import React, { useState, useEffect, useMemo, Suspense } from "react";
import { Routes, Route, NavLink, Navigate, useNavigate, useLocation } from "react-router-dom";
import { collection, getDocs, doc, getDoc, setDoc } from "firebase/firestore";
import { onAuthStateChanged, signInWithPopup, signInWithRedirect, sendEmailVerification } from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { db, auth, googleProvider, functions } from "./firebase.js";
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
import NotificationBell from "./components/ui/NotificationBell.jsx";
import ErrorBoundary from "./components/ui/ErrorBoundary.jsx";
import { ToastProvider } from "./components/ui/Toast.jsx";

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
const ConferenceDetailPage = React.lazy(() => import("./components/ConferenceDetailPage.jsx"));

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
  const [authReady, setAuthReady] = useState(false);
  const [userAccess, setUserAccess] = useState(() => {
    try {
      const cached = sessionStorage.getItem("crp_userAccess");
      if (cached) {
        const parsed = JSON.parse(cached);
        const lastUid = sessionStorage.getItem("crp_last_uid");
        if (parsed._uid && parsed._uid === lastUid) return parsed;
      }
    } catch (_) {}
    return null;
  });
  const [hasPlayerProfile, setHasPlayerProfile] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const prevUserUidRef = React.useRef(sessionStorage.getItem("crp_last_uid"));
  useEffect(() => onAuthStateChanged(auth, async u => {
    // Reload user to get fresh emailVerified status
    if (u && !u.emailVerified && u.providerData?.[0]?.providerId === "password") {
      await u.reload().catch(() => {});
    }
    setEmailVerified(u?.emailVerified || false);
    // Only expire cache when a *different* user signs in (not on page reload)
    if (u && prevUserUidRef.current && prevUserUidRef.current !== u.uid) {
      try {
        const raw = localStorage.getItem("crp_cache_v7");
        if (raw) {
          const cached = JSON.parse(raw);
          cached.ts = 0;
          localStorage.setItem("crp_cache_v7", JSON.stringify(cached));
        }
      } catch (_) {}
    }
    sessionStorage.setItem("crp_last_uid", u ? u.uid : "");
    prevUserUidRef.current = u ? u.uid : "";
    setUser(u);
    setAuthReady(true);
    if (u) {
      const userRef = doc(db, "users", u.uid);
      getDoc(userRef).then(snap => {
        if (snap.exists()) {
          const data = snap.data();
          setUserAccess(data);
          sessionStorage.setItem("crp_userAccess", JSON.stringify({ ...data, _uid: u.uid }));
          // Backfill any missing fields from the auth user
          const updates = {};
          if (u.email && !data.email) updates.email = u.email;
          if (u.displayName && !data.displayName) updates.displayName = u.displayName;
          if (u.emailVerified && !data.emailVerified) updates.emailVerified = true;
          if (Object.keys(updates).length > 0) {
            setDoc(userRef, updates, { merge: true }).catch(() => {});
          }
        } else {
          // Skip creating user doc if email is missing — prevents orphan records
          if (!u.email) {
            console.warn("Skipping user doc creation — no email on auth user");
            return;
          }
          // Create user doc on first sign-in with all known fields in one write
          const userData = {
            email: u.email,
            displayName: u.displayName || "",
            emailVerified: !!u.emailVerified,
            isCoach: false,
            approved: false,
            createdAt: new Date().toISOString(),
          };
          setDoc(userRef, userData).catch(() => {});
          setUserAccess(userData);
          sessionStorage.setItem("crp_userAccess", JSON.stringify({ ...userData, _uid: u.uid }));
        }
      }).catch(() => setUserAccess(null));
      // Check if user has a player profile
      getDoc(doc(db, "playerProfiles", u.uid)).then(snap => {
        setHasPlayerProfile(snap.exists() && !!snap.data().firstName);
      }).catch(() => setHasPlayerProfile(false));
      // Send verification email via Resend on first signup only
      if (!u.emailVerified && u.providerData?.[0]?.providerId === "password") {
        const sentKey = `verificationSent_${u.uid}`;
        if (!localStorage.getItem(sentKey)) {
          localStorage.setItem(sentKey, "1");
          const sendVerification = httpsCallable(functions, "sendVerificationEmail");
          sendVerification().catch((err) => {
            console.warn("Verification email send failed:", err.message);
            // Fall back to Firebase native email
            sendEmailVerification(u).catch(() => {});
          });
        }
      }
    } else {
      setUserAccess(null);
      setHasPlayerProfile(false);
      sessionStorage.removeItem("crp_userAccess");
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
    const result = [...ids];
    return result;
  }, [user, programContacts, userAccess]);

  // Auto-grant coach status if user's email matches a Head Coach contact
  // ONLY if email is verified (Google sign-in is always verified, email/password requires clicking the verification link)
  useEffect(() => {
    if (!user || !programContacts.length || !userAccess) return;
    if (userAccess.isCoach) return; // already a coach
    if (!emailVerified) return; // must verify email first
    const email = user.email?.toLowerCase();
    if (!email) return;
    const isCoachContact = programContacts.some(c => {
      if (c.email?.toLowerCase() !== email) return false;
      const title = (c.contactTitle || "").toLowerCase();
      return title.includes("head coach") || title.includes("recruiting") || title.includes("director");
    });
    if (isCoachContact) {
      // Collect all program IDs this coach is associated with
      const matchedProgramIds = programContacts
        .filter(c => c.email?.toLowerCase() === email)
        .map(c => c.programId);
      const existingIds = userAccess?.assignedProgramIds || [];
      const mergedIds = [...new Set([...existingIds, ...matchedProgramIds])];
      const userRef = doc(db, "users", user.uid);
      setDoc(userRef, { isCoach: true, approved: true, assignedProgramIds: mergedIds }, { merge: true }).then(() => {
        setUserAccess(prev => ({ ...prev, isCoach: true, approved: true, assignedProgramIds: mergedIds }));
      }).catch(() => {});
    }
  }, [user, programContacts, userAccess, emailVerified]);

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
    const isMobile = window.innerWidth <= 900 || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) { signInWithRedirect(auth, googleProvider); return; }
    try { await signInWithPopup(auth, googleProvider); }
    catch { signInWithRedirect(auth, googleProvider); }
    setShowSignInPrompt(false);
  }

  // Analytics: track route changes
  useEffect(() => { trackPageView(location.pathname); setMobileMenuOpen(false); }, [location.pathname]);

  // Restore scroll position when navigating back from program detail
  useEffect(() => {
    if (location.state?.restoreScroll) {
      const savedScroll = sessionStorage.getItem("programListScroll");
      if (savedScroll) {
        requestAnimationFrame(() => {
          setTimeout(() => window.scrollTo(0, parseInt(savedScroll, 10)), 50);
        });
      }
    }
  }, [location]);

  // Analytics: track search (debounced inside the helper)
  useEffect(() => { trackSearch(search); }, [search]);

  // Navigate to program detail page
  function handleSelectProgram(p) {
    if (p) {
      sessionStorage.setItem("programListScroll", String(window.scrollY));
      sessionStorage.setItem("programListFrom", location.pathname);
      trackProgramView(p);
      navigate(`/program/${p.id}/${toSlug(p.school)}`);
    }
  }

  useEffect(() => {
    const CACHE_KEY = "crp_cache_v7";
    const CACHE_TTL = 60 * 60 * 1000; // 1 hour

    async function fetchFromFirestore() {
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
    }

    async function fetchData() {
      // Try cache first — serve immediately even if stale
      let hasCache = false;
      let cacheTs = 0;
      try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (raw) {
          const { ts, programs: p, conferences: c, confContacts: cc, programContacts: pc } = JSON.parse(raw);
          setPrograms(p);
          setConferences(c);
          if (cc) setConfContacts(cc);
          if (pc) setProgramContacts(pc);
          setLoading(false);
          hasCache = true;
          cacheTs = ts;
          // If cache is still fresh, check if admin has busted it
          if (Date.now() - ts < CACHE_TTL) {
            // Quick check: has admin published changes since our cache was built?
            getDoc(doc(db, "config", "cache")).then(snap => {
              if (snap.exists()) {
                const bustAt = snap.data().bustAt?.toMillis?.() || 0;
                if (bustAt > ts) fetchFromFirestore().catch(() => {});
              }
            }).catch(() => {});
            return;
          }
        }
      } catch (_) { /* ignore bad cache */ }

      // Fetch from Firestore — in background if we have stale cache, blocking if no cache
      if (hasCache) {
        fetchFromFirestore().catch(() => {});
      } else {
        try {
          await fetchFromFirestore();
        } catch (e) {
          console.warn("First fetch attempt failed, retrying...", e);
          // Retry once after a short delay
          try {
            await new Promise(r => setTimeout(r, 2000));
            await fetchFromFirestore();
          } catch (e2) {
            setError("Unable to load programs. Please check your connection and refresh the page.");
            console.error(e2);
          }
        } finally {
          setLoading(false);
        }
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
      if (conferenceFilter && p.conference !== conferenceFilter && !p.conference?.includes(conferenceFilter)) return false;
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
    if (userAccess?.isCoach || hasPlayerProfile) {
      t.push({ to: "/messages", label: totalUnread > 0 ? `Messages (${totalUnread})` : "Messages" });
    }
    if (userAccess?.isCoach) {
      t.push({ to: "/directory", label: "Player Directory" });
    }
    t.push({ to: "/submit", label: "Submit Program Info" });
    if (!userAccess?.isCoach) {
      t.push({ to: "/player-profile", label: "Player Profile" });
    }
    t.push({ to: "/about", label: "About" });
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
          Explore. Connect. Play.
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

  // Admin route — separate layout, AdminPage handles its own auth
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
              {/* Export button hidden for now */}
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
                const count = programs.filter(p => p.conference === c.conference || p.conference?.includes(c.conference)).length;
                return (
                  <ConferenceCard key={c.id || i} conf={c} programCount={count}
                    onClick={() => navigate(`/conference/${c.conference}`)} />
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
    padding: isMobile ? "8px 10px" : "8px 14px", borderRadius: 8, border: "none", cursor: "pointer",
    fontWeight: 600, fontSize: isMobile ? 12 : 13, transition: "all 0.15s", textAlign: "center",
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
    <ToastProvider>
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
                Explore. Connect. Play.
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 0 : 8 }}>
              {!isMobile && <NotificationBell user={user} isMobile={false} onNavigate={path => navigate(path)} />}
              {!isMobile && authReady && <HeaderAuth user={user} isMobile={false} />}
            </div>
          </div>
          {isMobile && (
            <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <NotificationBell user={user} isMobile={true} onNavigate={path => navigate(path)} />
              {authReady && <HeaderAuth user={user} isMobile={true} />}
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
      <div onClick={() => { if (!disclaimerDismissed) setDisclaimerDismissed(true); }} style={{ maxWidth: 1100, margin: "24px auto 40px", padding: isMobile ? "0 8px" : "0 24px", paddingBottom: isMobile ? Math.max(compareIds.length > 0 ? 70 : 0, 90) : (compareIds.length > 0 ? 70 : 0) }}>

        {/* Nav — bottom tab bar on mobile, tabs on desktop */}
        {isMobile ? (
          <>
            {/* "More" menu overlay */}
            {mobileMenuOpen && (
              <div style={{ marginBottom: 20 }}>
                <div style={{
                  background: "#fff", borderRadius: 12, overflow: "hidden",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.12)", border: "1px solid #E5E7EB",
                }}>
                  {navItems.filter(item => {
                    // Exclude items already in the bottom bar
                    const bottomPaths = userAccess?.isCoach
                      ? ["/", "/coach", "/directory", "/messages"]
                      : ["/", "/favorites", "/player-profile", "/messages"];
                    return !bottomPaths.includes(item.to);
                  }).map(item => (
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
              </div>
            )}
          </>
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

        {/* Email verification banner */}
        {/* Email verification banner disabled for now */}
        {false && user && !user.emailVerified && user.providerData?.[0]?.providerId === "password" && !userAccess?.isCoach && !userAccess?.isAdmin && (
          <div style={{
            display: "flex", alignItems: "center", gap: 12,
            background: "#dbeafe", border: "1px solid #93c5fd",
            borderRadius: 10, padding: "10px 16px", marginBottom: 16,
            fontSize: 13, color: "#1e40af",
          }}>
            <span style={{ fontSize: 16 }}>📧</span>
            <span style={{ flex: 1 }}>
              Please check your email and click the verification link to activate your account.
              {" "}
              <button onClick={() => {
                sendEmailVerification(user).then(() => alert("Verification email sent!")).catch((err) => alert("Could not send: " + (err.message || "Try again later.")));
              }} style={{
                background: "none", border: "none", color: "#1e40af", fontWeight: 700,
                cursor: "pointer", fontSize: 13, textDecoration: "underline", padding: 0,
              }}>Resend verification email</button>
            </span>
          </div>
        )}

        {/* Data disclaimer banner */}
        {!disclaimerDismissed && !user && !isMobile && (
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
        <ErrorBoundary>
        <Suspense fallback={<LazyFallback />}>
          <Routes>
            <Route path="/" element={programGridContent(false)} />
            <Route path="/favorites" element={programGridContent(true)} />
            <Route path="/conferences" element={conferencesContent} />
            <Route path="/conference/:abbr" element={
              <ConferenceDetailPage
                programs={programs}
                conferences={conferences}
                confNameMap={confNameMap}
                contactsByProgramId={contactsByProgramId}
                onSelectProgram={handleSelectProgram}
                onToggleCompare={handleToggleCompare}
                compareIds={compareIds}
                favoriteIds={favoriteIds}
                onToggleFavorite={handleToggleFavorite}
                isMobile={isMobile}
              />
            } />
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
            <Route path="/player-profile" element={
              <AuthGate user={user} title="Player Profile" description="Verify your email to create your player profile.">
                <PlayerSubmitPage user={user} />
              </AuthGate>
            } />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/directory" element={
              userAccess?.isCoach ? (
                <AuthGate user={user} title="Player Directory" description="Verify your email to access the player directory.">
                  <PlayerDirectoryPage user={user} onOpenMessage={handleOpenMessage} />
                </AuthGate>
              ) : <Navigate to="/" />
            } />
            <Route path="/coach" element={
              (coachProgramIds.length > 0 || userAccess?.isCoach) ? (
                <AuthGate user={user} title="My Program" description="Verify your email to access your program dashboard.">
                  <CoachDashboardPage
                    coachProgramIds={coachProgramIds}
                    programs={programs}
                    conferences={conferences}
                    user={user}
                    onOpenMessage={handleOpenMessage}
                  />
                </AuthGate>
              ) : <Navigate to="/" />
            } />
            <Route path="/messages" element={
              (userAccess?.isCoach || hasPlayerProfile) ? (
                <AuthGate user={user} title="Messages" description="Verify your email to access messages.">
                  <MessagesPage
                    user={user}
                    activeConversationId={pendingConversationId}
                    onConversationOpened={() => setPendingConversationId(null)}
                  />
                </AuthGate>
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
        </ErrorBoundary>
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

      {/* Mobile bottom tab bar */}
      {isMobile && !isAdminRoute && (() => {
        const isCoach = userAccess?.isCoach;
        const bottomTabs = isCoach ? [
          { to: "/", label: "Programs", end: true, icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg> },
          { to: "/coach", label: "My Program", icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> },
          { to: "/directory", label: "Players", icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
          { to: "/messages", label: "Messages", icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>, badge: totalUnread },
        ] : [
          { to: "/", label: "Programs", end: true, icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg> },
          { to: "/favorites", label: "Favorites", icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg> },
          { to: "/player-profile", label: "Profile", icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
          ...(hasPlayerProfile ? [{ to: "/messages", label: "Messages", icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>, badge: totalUnread }] : []),
        ];
        // Add "More" tab
        bottomTabs.push({ to: "#more", label: "More", icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg> });
        return (
          <div style={{
            position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 900,
            background: "#fff", borderTop: "1px solid #E5E7EB",
            display: "flex", justifyContent: "space-around", alignItems: "center",
            paddingBottom: "max(env(safe-area-inset-bottom, 0px), 8px)",
            boxShadow: "0 -2px 10px rgba(0,0,0,0.06)",
          }}>
            {bottomTabs.map(tab => {
              const isMore = tab.to === "#more";
              const isActive = isMore ? mobileMenuOpen : (tab.end ? location.pathname === tab.to : location.pathname.startsWith(tab.to));
              return (
                <NavLink
                  key={tab.to}
                  to={isMore ? location.pathname : tab.to}
                  end={tab.end || false}
                  onClick={e => {
                    if (isMore) { e.preventDefault(); setMobileMenuOpen(!mobileMenuOpen); }
                    else { setMobileMenuOpen(false); }
                  }}
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                    padding: "8px 4px 6px", textDecoration: "none", flex: 1, position: "relative",
                    color: isActive ? "#00CC00" : "#94a3b8",
                  }}
                >
                  <div style={{ position: "relative" }}>
                    {tab.icon}
                    {tab.badge > 0 && (
                      <span style={{
                        position: "absolute", top: -4, right: -8,
                        background: "#dc2626", color: "#fff", borderRadius: 10,
                        padding: "0 5px", fontSize: 9, fontWeight: 700,
                        minWidth: 14, textAlign: "center", lineHeight: "16px",
                      }}>{tab.badge}</span>
                    )}
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 600 }}>{tab.label}</span>
                </NavLink>
              );
            })}
          </div>
        );
      })()}
    </div>
    </ToastProvider>
  );
}
