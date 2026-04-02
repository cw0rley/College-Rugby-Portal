import React, { useRef, useState } from "react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../../firebase.js";

const inp = { padding: "8px 10px", borderRadius: 8, border: "1px solid #E5E7EB",
  fontSize: 13, width: "100%", boxSizing: "border-box" };
const lbl = { fontSize: 11, fontWeight: 700, color: "#64748b",
  textTransform: "uppercase", letterSpacing: "0.04em", display: "block", marginBottom: 4 };

export default function EditProgramTab({
  activeProgram, editForm, setEditField,
  editSaving, editMsg, onSaveProgram,
  contacts, contactsLoading, contactEdits, setContactEdits,
  contactSaving, onSaveContact, onDeleteContact,
  newContact, setNewContact, addingContact, onAddContact,
  isMobile,
}) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  return (
    <div>
      {/* Program Info Card */}
      <div style={{
        background: "#fff", borderRadius: 12, padding: isMobile ? 16 : 24, marginBottom: 20,
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: "1px solid #E5E7EB",
      }}>
        <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 800, color: "#0A1F44" }}>
          Edit Program Info
        </h3>

        {/* Read-only fields */}
        <div style={{ fontWeight: 700, fontSize: 12, color: "#94a3b8", textTransform: "uppercase",
          letterSpacing: "0.06em", marginBottom: 10 }}>School Details (read-only)</div>
        <div style={{
          display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr",
          gap: 12, marginBottom: 20,
        }}>
          <div>
            <label style={lbl}>School</label>
            <div style={{ ...inp, background: "#f8fafc", color: "#64748b" }}>{activeProgram.school || "\u2014"}</div>
          </div>
          <div>
            <label style={lbl}>City</label>
            <div style={{ ...inp, background: "#f8fafc", color: "#64748b" }}>{activeProgram.city || "\u2014"}</div>
          </div>
          <div>
            <label style={lbl}>State</label>
            <div style={{ ...inp, background: "#f8fafc", color: "#64748b" }}>{activeProgram.state || "\u2014"}</div>
          </div>
        </div>

        {/* Editable fields */}
        <div style={{ fontWeight: 700, fontSize: 12, color: "#94a3b8", textTransform: "uppercase",
          letterSpacing: "0.06em", marginBottom: 10 }}>Editable Fields</div>

        <div style={{
          display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
          gap: 12, marginBottom: 16,
        }}>
          <div>
            <label style={lbl}>Rugby Website URL</label>
            <input type="url" value={editForm.rugbyWebsite || ""} onChange={e => setEditField("rugbyWebsite", e.target.value)}
              placeholder="https://..." style={inp} />
          </div>
          <div>
            <label style={lbl}>Logo URL</label>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <input type="url" value={editForm.logoUrl || ""} onChange={e => setEditField("logoUrl", e.target.value)}
                  placeholder="https://..." style={inp} />
              </div>
            </div>
          </div>
        </div>

        {/* Logo upload + preview */}
        <div style={{ display: "flex", gap: 16, alignItems: "flex-start", marginBottom: 16 }}>
          {editForm.logoUrl && (
            <img src={editForm.logoUrl} alt="Logo preview" style={{
              width: 64, height: 64, borderRadius: 8, objectFit: "contain",
              background: "#f8fafc", border: "1px solid #E5E7EB", flexShrink: 0,
            }} onError={e => { e.target.style.display = "none"; }} />
          )}
          <div>
            <input type="file" ref={fileRef} accept="image/*" style={{ display: "none" }}
              onChange={async e => {
                const file = e.target.files?.[0];
                if (!file) return;
                setUploading(true);
                try {
                  const ext = file.name.split(".").pop() || "png";
                  const path = `logos/${(activeProgram.school || "unknown").replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()}-${activeProgram.gender || "unknown"}.${ext}`;
                  const storageRef = ref(storage, path);
                  await uploadBytes(storageRef, file);
                  const url = await getDownloadURL(storageRef);
                  setEditField("logoUrl", url);
                } catch (err) {
                  console.error("Upload failed:", err);
                  alert("Upload failed: " + err.message);
                } finally {
                  setUploading(false);
                  e.target.value = "";
                }
              }}
            />
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} style={{
              padding: "7px 16px", borderRadius: 6, border: "1px solid #E5E7EB",
              background: uploading ? "#f1f5f9" : "#fff", color: "#0A1F44",
              fontWeight: 600, fontSize: 12, cursor: uploading ? "default" : "pointer",
            }}>{uploading ? "Uploading..." : "Upload Logo"}</button>
          </div>
        </div>

        {/* Checkboxes */}
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginBottom: 16 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13 }}>
            <input type="checkbox" checked={!!editForm.rugbyScholarship}
              onChange={e => setEditField("rugbyScholarship", e.target.checked)} style={{ width: 16, height: 16 }} />
            Rugby Scholarship
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13 }}>
            <input type="checkbox" checked={!!editForm.schoolFunded}
              onChange={e => setEditField("schoolFunded", e.target.checked)} style={{ width: 16, height: 16 }} />
            School Funded
          </label>
        </div>

        {/* Notes */}
        <div style={{ marginBottom: 20 }}>
          <label style={lbl}>Notes / Program Description</label>
          <textarea value={editForm.notes || ""} onChange={e => setEditField("notes", e.target.value)}
            placeholder={"Describe your program. Supports formatting:\n# Heading\n**bold text**\n*italic text*\n- bullet point\n[link text](https://url)"}
            rows={6} style={{ ...inp, resize: "vertical" }}
            onKeyDown={e => {
              if ((e.ctrlKey || e.metaKey) && (e.key === "b" || e.key === "i")) {
                e.preventDefault();
                const ta = e.target;
                const start = ta.selectionStart;
                const end = ta.selectionEnd;
                const text = ta.value;
                const selected = text.substring(start, end);
                const wrap = e.key === "b" ? "**" : "*";
                const newText = text.substring(0, start) + wrap + (selected || "text") + wrap + text.substring(end);
                setEditField("notes", newText);
                setTimeout(() => {
                  ta.focus();
                  if (selected) { ta.selectionStart = start; ta.selectionEnd = end + wrap.length * 2; }
                  else { ta.selectionStart = start + wrap.length; ta.selectionEnd = start + wrap.length + 4; }
                }, 0);
              }
            }} />
          <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>
            Ctrl+B bold, Ctrl+I italic, - bullet points, # heading, [link](url)
          </div>
        </div>

        {/* Save button + message */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={onSaveProgram} disabled={editSaving} style={{
            padding: "9px 24px", borderRadius: 8, border: "none",
            background: editSaving ? "#E5E7EB" : "#69BE28",
            color: editSaving ? "#94a3b8" : "#fff", fontWeight: 700, fontSize: 14,
            cursor: editSaving ? "default" : "pointer", transition: "background 0.15s",
          }}>{editSaving ? "Saving..." : "Save Program"}</button>
          {editMsg && (
            <span style={{
              fontSize: 13, fontWeight: 600,
              color: editMsg.startsWith("Error") ? "#dc2626" : "#16a34a",
            }}>{editMsg}</span>
          )}
        </div>
      </div>

      {/* Contacts Card */}
      <div style={{
        background: "#fff", borderRadius: 12, padding: isMobile ? 16 : 24, marginBottom: 20,
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: "1px solid #E5E7EB",
      }}>
        <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 800, color: "#0A1F44" }}>
          Program Contacts
        </h3>

        {contactsLoading ? (
          <div style={{ padding: 20, textAlign: "center", color: "#64748b" }}>Loading contacts...</div>
        ) : contacts.length === 0 ? (
          <div style={{ padding: 20, textAlign: "center", color: "#94a3b8", fontSize: 14 }}>
            No contacts yet. Add one below.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
            {contacts.map(c => (
              <div key={c.id} style={{
                border: "1px solid #E5E7EB", borderRadius: 8, padding: 12,
                display: "flex", flexDirection: isMobile ? "column" : "row",
                gap: 10, alignItems: isMobile ? "stretch" : "flex-end",
              }}>
                <div style={{ flex: 1 }}>
                  <label style={lbl}>Name</label>
                  <input value={contactEdits[c.id]?.contact || ""} onChange={e => setContactEdits(prev => ({
                    ...prev, [c.id]: { ...prev[c.id], contact: e.target.value }
                  }))} style={inp} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={lbl}>Title</label>
                  <input value={contactEdits[c.id]?.contactTitle || ""} onChange={e => setContactEdits(prev => ({
                    ...prev, [c.id]: { ...prev[c.id], contactTitle: e.target.value }
                  }))} style={inp} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={lbl}>Email</label>
                  <input type="email" value={contactEdits[c.id]?.email || ""} onChange={e => setContactEdits(prev => ({
                    ...prev, [c.id]: { ...prev[c.id], email: e.target.value }
                  }))} style={inp} />
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button onClick={() => onSaveContact(c.id)} disabled={contactSaving[c.id]} style={{
                    padding: "7px 14px", borderRadius: 6, border: "none",
                    background: contactSaving[c.id] ? "#E5E7EB" : "#69BE28",
                    color: "#fff", fontWeight: 600, fontSize: 12,
                    cursor: contactSaving[c.id] ? "default" : "pointer",
                  }}>{contactSaving[c.id] ? "..." : "Save"}</button>
                  <button onClick={() => onDeleteContact(c.id)} style={{
                    padding: "7px 12px", borderRadius: 6, border: "none",
                    background: "#fee2e2", color: "#dc2626",
                    fontWeight: 600, fontSize: 12, cursor: "pointer",
                  }}>Remove</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Contact form */}
        <div style={{ fontWeight: 700, fontSize: 12, color: "#94a3b8", textTransform: "uppercase",
          letterSpacing: "0.06em", marginBottom: 10 }}>Add New Contact</div>
        <div style={{
          border: "1px dashed #E5E7EB", borderRadius: 8, padding: 12,
          display: "flex", flexDirection: isMobile ? "column" : "row",
          gap: 10, alignItems: isMobile ? "stretch" : "flex-end",
        }}>
          <div style={{ flex: 1 }}>
            <label style={lbl}>Name</label>
            <input value={newContact.contact} onChange={e => setNewContact(nc => ({ ...nc, contact: e.target.value }))}
              placeholder="Contact name" style={inp} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={lbl}>Title</label>
            <input value={newContact.contactTitle} onChange={e => setNewContact(nc => ({ ...nc, contactTitle: e.target.value }))}
              placeholder="e.g. Head Coach" style={inp} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={lbl}>Email</label>
            <input type="email" value={newContact.email} onChange={e => setNewContact(nc => ({ ...nc, email: e.target.value }))}
              placeholder="email@school.edu" style={inp} />
          </div>
          <button onClick={onAddContact} disabled={addingContact || !newContact.contact.trim()} style={{
            padding: "7px 18px", borderRadius: 6, border: "none", flexShrink: 0,
            background: addingContact || !newContact.contact.trim() ? "#E5E7EB" : "#0A1F44",
            color: addingContact || !newContact.contact.trim() ? "#94a3b8" : "#fff",
            fontWeight: 700, fontSize: 12,
            cursor: addingContact || !newContact.contact.trim() ? "default" : "pointer",
          }}>{addingContact ? "Adding..." : "Add Contact"}</button>
        </div>
      </div>
    </div>
  );
}
