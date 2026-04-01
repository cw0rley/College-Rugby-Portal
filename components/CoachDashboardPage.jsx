import React, { useState, useEffect, useMemo } from "react";
import { loadInterestedPlayers } from "../utils/programInterest.js";
import { doc, updateDoc, collection, getDocs, addDoc, deleteDoc, query, where } from "firebase/firestore";
import { db } from "../firebase.js";
import { logChange } from "../utils/changelog.js";
import { loadRecruits, updateRecruitRating, updateRecruitNotes, removeRecruit } from "../utils/recruits.js";
import InterestedPlayersTab from "./coach/InterestedPlayersTab.jsx";
import RecruitsTab from "./coach/RecruitsTab.jsx";
import EditProgramTab from "./coach/EditProgramTab.jsx";

const POSITIONS = [
  "Loosehead Prop", "Hooker", "Tighthead Prop",
  "Lock", "Blindside Flanker", "Openside Flanker", "Number 8",
  "Scrum Half", "Fly Half", "Inside Center", "Outside Center",
  "Left Wing", "Right Wing", "Fullback",
];

const currentYear = new Date().getFullYear();
const GRAD_YEARS = [];
for (let y = currentYear; y <= currentYear + 5; y++) GRAD_YEARS.push(y);

export default function CoachDashboardPage({ coachProgramIds, programs, user, onOpenMessage }) {
  const [playersByProgram, setPlayersByProgram] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeProgramId, setActiveProgramId] = useState(coachProgramIds[0] || "");
  const [search, setSearch] = useState("");
  const [posFilter, setPosFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [activeTab, setActiveTab] = useState("players");

  // Edit Program state
  const [editForm, setEditForm] = useState({});
  const [editSaving, setEditSaving] = useState(false);
  const [editMsg, setEditMsg] = useState("");

  // Contacts state
  const [contacts, setContacts] = useState([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactEdits, setContactEdits] = useState({});
  const [contactSaving, setContactSaving] = useState({});
  const [newContact, setNewContact] = useState({ contact: "", contactTitle: "", email: "" });
  const [addingContact, setAddingContact] = useState(false);

  // Recruits state
  const [recruits, setRecruits] = useState([]);
  const [recruitsLoading, setRecruitsLoading] = useState(false);
  const [recruitSearch, setRecruitSearch] = useState("");
  const [recruitPosFilter, setRecruitPosFilter] = useState("");
  const [recruitYearFilter, setRecruitYearFilter] = useState("");
  const [recruitSortBy, setRecruitSortBy] = useState("rating");
  const [expandedNotes, setExpandedNotes] = useState({});
  const [noteDrafts, setNoteDrafts] = useState({});
  const [noteSaving, setNoteSaving] = useState({});

  const isMobile = window.innerWidth <= 900;

  // Sync activeProgramId when coachProgramIds updates
  useEffect(() => {
    console.log("DEBUG CoachDashboard coachProgramIds:", coachProgramIds, "activeProgramId:", activeProgramId);
    if (coachProgramIds.length > 0 && !coachProgramIds.includes(activeProgramId)) {
      setActiveProgramId(coachProgramIds[0]);
    }
  }, [coachProgramIds]);

  useEffect(() => {
    if (!coachProgramIds.length) return;
    setLoading(true);
    Promise.all(
      coachProgramIds.map(pid =>
        loadInterestedPlayers(pid).then(players => ({ pid, players }))
      )
    ).then(results => {
      const map = {};
      results.forEach(r => { map[r.pid] = r.players; });
      setPlayersByProgram(map);
    }).catch(err => console.error("Failed to load interested players:", err))
      .finally(() => setLoading(false));
  }, [coachProgramIds]);

  // Load recruits on mount and when tab switches to recruits
  useEffect(() => {
    if (!user) return;
    setRecruitsLoading(true);
    loadRecruits(user.uid)
      .then(list => {
        setRecruits(list);
        const drafts = {};
        list.forEach(r => { drafts[r.playerUid] = r.notes || ""; });
        setNoteDrafts(drafts);
      })
      .catch(err => console.error("Failed to load recruits:", err))
      .finally(() => setRecruitsLoading(false));
  }, [user]);

  const coachPrograms = useMemo(() =>
    coachProgramIds.map(pid => programs.find(p => p.id === pid)).filter(Boolean),
    [coachProgramIds, programs]
  );

  const activeProgram = coachPrograms.find(p => p.id === activeProgramId) || coachPrograms[0];
  const players = playersByProgram[activeProgram?.id] || [];

  // Initialize edit form when activeProgram changes or tab switches to edit
  useEffect(() => {
    if (activeProgram && activeTab === "edit") {
      setEditForm({
        rugbyWebsite: activeProgram.rugbyWebsite || "",
        logoUrl: activeProgram.logoUrl || "",
        rugbyScholarship: !!activeProgram.rugbyScholarship,
        schoolFunded: !!activeProgram.schoolFunded,
        notes: activeProgram.notes || "",
      });
      loadContacts(activeProgram.id);
    }
  }, [activeProgram?.id, activeTab]);

  async function loadContacts(programId) {
    setContactsLoading(true);
    try {
      const snap = await getDocs(query(collection(db, "programContacts"), where("programId", "==", programId)));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Sort Head Coach to top
      list.sort((a, b) => {
        const aHead = (a.contactTitle || "").toLowerCase().includes("head coach") ? 0 : 1;
        const bHead = (b.contactTitle || "").toLowerCase().includes("head coach") ? 0 : 1;
        return aHead - bHead;
      });
      setContacts(list);
      // Initialize edits
      const edits = {};
      list.forEach(c => { edits[c.id] = { contact: c.contact || "", contactTitle: c.contactTitle || "", email: c.email || "" }; });
      setContactEdits(edits);
    } catch (err) {
      console.error("Failed to load contacts:", err);
    } finally {
      setContactsLoading(false);
    }
  }

  function setEditField(k, v) { setEditForm(f => ({ ...f, [k]: v })); }

  async function handleSaveProgram() {
    if (!activeProgram) return;
    setEditSaving(true);
    try {
      const updates = {
        rugbyWebsite: editForm.rugbyWebsite,
        logoUrl: editForm.logoUrl,
        rugbyScholarship: editForm.rugbyScholarship,
        schoolFunded: editForm.schoolFunded,
        notes: editForm.notes,
      };
      await updateDoc(doc(db, "programs", activeProgram.id), updates);
      await logChange("update", "programs", activeProgram.id, updates, user.email);
      localStorage.removeItem("crp_cache_v5");
      // Update local program object so UI reflects changes
      Object.assign(activeProgram, updates);
      setEditMsg("Program saved successfully!");
      setTimeout(() => setEditMsg(""), 3000);
    } catch (err) {
      console.error("Failed to save program:", err);
      setEditMsg("Error saving: " + err.message);
    } finally {
      setEditSaving(false);
    }
  }

  async function handleSaveContact(contactId) {
    const edits = contactEdits[contactId];
    if (!edits) return;
    setContactSaving(s => ({ ...s, [contactId]: true }));
    try {
      await updateDoc(doc(db, "programContacts", contactId), {
        contact: edits.contact,
        contactTitle: edits.contactTitle,
        email: edits.email,
      });
      localStorage.removeItem("crp_cache_v5");
      await loadContacts(activeProgram.id);
    } catch (err) {
      console.error("Failed to save contact:", err);
      alert("Error saving contact: " + err.message);
    } finally {
      setContactSaving(s => ({ ...s, [contactId]: false }));
    }
  }

  async function handleDeleteContact(contactId) {
    if (!confirm("Remove this contact?")) return;
    try {
      await deleteDoc(doc(db, "programContacts", contactId));
      localStorage.removeItem("crp_cache_v5");
      await loadContacts(activeProgram.id);
    } catch (err) {
      console.error("Failed to delete contact:", err);
      alert("Error deleting contact: " + err.message);
    }
  }

  async function handleAddContact() {
    if (!newContact.contact.trim()) return;
    setAddingContact(true);
    try {
      await addDoc(collection(db, "programContacts"), {
        programId: activeProgram.id,
        contact: newContact.contact,
        contactTitle: newContact.contactTitle,
        email: newContact.email,
      });
      localStorage.removeItem("crp_cache_v5");
      setNewContact({ contact: "", contactTitle: "", email: "" });
      await loadContacts(activeProgram.id);
    } catch (err) {
      console.error("Failed to add contact:", err);
      alert("Error adding contact: " + err.message);
    } finally {
      setAddingContact(false);
    }
  }

  // Recruit actions
  async function handleRecruitRating(playerUid, newRating) {
    const prev = recruits.find(r => r.playerUid === playerUid)?.rating || 0;
    setRecruits(list => list.map(r => r.playerUid === playerUid ? { ...r, rating: newRating } : r));
    try {
      await updateRecruitRating(user.uid, playerUid, newRating);
    } catch (err) {
      console.error("Failed to update rating:", err);
      setRecruits(list => list.map(r => r.playerUid === playerUid ? { ...r, rating: prev } : r));
    }
  }

  async function handleRecruitNotesSave(playerUid) {
    const notes = noteDrafts[playerUid] || "";
    setNoteSaving(s => ({ ...s, [playerUid]: true }));
    try {
      await updateRecruitNotes(user.uid, playerUid, notes);
      setRecruits(list => list.map(r => r.playerUid === playerUid ? { ...r, notes } : r));
    } catch (err) {
      console.error("Failed to save notes:", err);
    } finally {
      setNoteSaving(s => ({ ...s, [playerUid]: false }));
    }
  }

  async function handleRemoveRecruit(playerUid) {
    if (!confirm("Remove this player from your recruit list?")) return;
    const removed = recruits.find(r => r.playerUid === playerUid);
    setRecruits(list => list.filter(r => r.playerUid !== playerUid));
    try {
      await removeRecruit(user.uid, playerUid);
    } catch (err) {
      console.error("Failed to remove recruit:", err);
      if (removed) setRecruits(list => [...list, removed]);
    }
  }

  const filtered = useMemo(() => {
    return players.filter(p => {
      if (posFilter && p.position !== posFilter && p.secondaryPosition !== posFilter) return false;
      if (yearFilter && String(p.graduationYear) !== yearFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const name = ((p.firstName || "") + " " + (p.lastName || "")).toLowerCase();
        return (
          name.includes(q) ||
          (p.city || "").toLowerCase().includes(q) ||
          (p.currentClub || "").toLowerCase().includes(q) ||
          (p.position || "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [players, search, posFilter, yearFilter]);

  // Filtered and sorted recruits
  const filteredRecruits = useMemo(() => {
    let list = recruits.filter(r => {
      const pd = r.playerData || {};
      if (recruitPosFilter && pd.position !== recruitPosFilter && pd.secondaryPosition !== recruitPosFilter) return false;
      if (recruitYearFilter && String(pd.graduationYear) !== recruitYearFilter) return false;
      if (recruitSearch) {
        const q = recruitSearch.toLowerCase();
        const name = ((pd.firstName || "") + " " + (pd.lastName || "")).toLowerCase();
        return (
          name.includes(q) ||
          (pd.city || "").toLowerCase().includes(q) ||
          (pd.currentClub || "").toLowerCase().includes(q) ||
          (pd.position || "").toLowerCase().includes(q)
        );
      }
      return true;
    });
    // Sort
    list = [...list];
    if (recruitSortBy === "rating") {
      list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (recruitSortBy === "name") {
      list.sort((a, b) => {
        const aName = ((a.playerData?.lastName || "") + (a.playerData?.firstName || "")).toLowerCase();
        const bName = ((b.playerData?.lastName || "") + (b.playerData?.firstName || "")).toLowerCase();
        return aName.localeCompare(bName);
      });
    } else if (recruitSortBy === "position") {
      list.sort((a, b) => (a.playerData?.position || "").localeCompare(b.playerData?.position || ""));
    } else if (recruitSortBy === "year") {
      list.sort((a, b) => (a.playerData?.graduationYear || 9999) - (b.playerData?.graduationYear || 9999));
    }
    return list;
  }, [recruits, recruitSearch, recruitPosFilter, recruitYearFilter, recruitSortBy]);

  if (loading) return (
    <div style={{ padding: 40, textAlign: "center", color: "#64748b" }}>Loading dashboard...</div>
  );

  return (
    <div>
      {/* Program header */}
      {activeProgram && (
        <div style={{
          background: "#fff", borderRadius: 12, padding: isMobile ? 16 : 24, marginBottom: 20,
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: "1px solid #E5E7EB",
        }}>
          <h2 style={{ margin: "0 0 4px", fontSize: isMobile ? 18 : 22, fontWeight: 800, color: "#0A1F44" }}>
            {activeProgram.school}
          </h2>
          <div style={{ fontSize: 14, color: "#64748b" }}>
            Coach Dashboard — {players.length} interested player{players.length !== 1 ? "s" : ""}
          </div>
        </div>
      )}

      {/* Program tabs if coach has multiple programs */}
      {coachPrograms.length > 1 && (
        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          {coachPrograms.map(prog => (
            <button key={prog.id} onClick={() => setActiveProgramId(prog.id)} style={{
              padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer",
              fontWeight: 600, fontSize: 13, transition: "all 0.15s",
              background: activeProgramId === prog.id ? "#0A1F44" : "#fff",
              color: activeProgramId === prog.id ? "#fff" : "#475569",
              boxShadow: activeProgramId === prog.id
                ? "0 4px 12px rgba(10,31,68,0.3)"
                : "0 1px 3px rgba(0,0,0,0.08)",
            }}>
              {prog.school} ({prog.gender === "mens" ? "M" : "W"})
            </button>
          ))}
        </div>
      )}

      {/* Tab toggle: Interested Players | My Recruits | Edit Program */}
      <div style={{ display: "flex", gap: 0, marginBottom: 20, flexWrap: "wrap" }}>
        <button onClick={() => setActiveTab("players")} style={{
          padding: "10px 24px", borderRadius: "8px 0 0 8px", border: "1px solid #E5E7EB",
          borderRight: "none", cursor: "pointer", fontWeight: 700, fontSize: 14,
          transition: "all 0.15s",
          background: activeTab === "players" ? "#0A1F44" : "#fff",
          color: activeTab === "players" ? "#fff" : "#475569",
        }}>
          Interested Players ({players.length})
        </button>
        <button onClick={() => setActiveTab("recruits")} style={{
          padding: "10px 24px", borderRadius: 0, border: "1px solid #E5E7EB",
          borderRight: "none", cursor: "pointer", fontWeight: 700, fontSize: 14,
          transition: "all 0.15s",
          background: activeTab === "recruits" ? "#0A1F44" : "#fff",
          color: activeTab === "recruits" ? "#fff" : "#475569",
        }}>
          My Recruits ({recruits.length})
        </button>
        <button onClick={() => setActiveTab("edit")} style={{
          padding: "10px 24px", borderRadius: "0 8px 8px 0", border: "1px solid #E5E7EB",
          cursor: "pointer", fontWeight: 700, fontSize: 14,
          transition: "all 0.15s",
          background: activeTab === "edit" ? "#0A1F44" : "#fff",
          color: activeTab === "edit" ? "#fff" : "#475569",
        }}>
          Edit Program
        </button>
      </div>

      {/* ========== INTERESTED PLAYERS TAB ========== */}
      {activeTab === "players" && (
        <InterestedPlayersTab
          filtered={filtered}
          search={search}
          setSearch={setSearch}
          posFilter={posFilter}
          setPosFilter={setPosFilter}
          yearFilter={yearFilter}
          setYearFilter={setYearFilter}
          isMobile={isMobile}
          onOpenMessage={onOpenMessage}
        />
      )}

      {/* ========== MY RECRUITS TAB ========== */}
      {activeTab === "recruits" && (
        <RecruitsTab
          recruits={recruits}
          filteredRecruits={filteredRecruits}
          recruitsLoading={recruitsLoading}
          recruitSearch={recruitSearch}
          setRecruitSearch={setRecruitSearch}
          recruitPosFilter={recruitPosFilter}
          setRecruitPosFilter={setRecruitPosFilter}
          recruitYearFilter={recruitYearFilter}
          setRecruitYearFilter={setRecruitYearFilter}
          recruitSortBy={recruitSortBy}
          setRecruitSortBy={setRecruitSortBy}
          expandedNotes={expandedNotes}
          setExpandedNotes={setExpandedNotes}
          noteDrafts={noteDrafts}
          setNoteDrafts={setNoteDrafts}
          noteSaving={noteSaving}
          onRatingChange={handleRecruitRating}
          onNotesSave={handleRecruitNotesSave}
          onRemove={handleRemoveRecruit}
          onOpenMessage={onOpenMessage}
          isMobile={isMobile}
        />
      )}

      {/* ========== EDIT PROGRAM TAB ========== */}
      {activeTab === "edit" && activeProgram && (
        <EditProgramTab
          activeProgram={activeProgram}
          editForm={editForm}
          setEditField={setEditField}
          editSaving={editSaving}
          editMsg={editMsg}
          onSaveProgram={handleSaveProgram}
          contacts={contacts}
          contactsLoading={contactsLoading}
          contactEdits={contactEdits}
          setContactEdits={setContactEdits}
          contactSaving={contactSaving}
          onSaveContact={handleSaveContact}
          onDeleteContact={handleDeleteContact}
          newContact={newContact}
          setNewContact={setNewContact}
          addingContact={addingContact}
          onAddContact={handleAddContact}
          isMobile={isMobile}
        />
      )}
    </div>
  );
}
