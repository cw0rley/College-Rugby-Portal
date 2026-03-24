import React, { useState, useEffect } from "react";
import { subscribeToConversations, markAsRead } from "../utils/messaging.js";
import ConversationView from "./ConversationView.jsx";
import AuthGate from "./ui/AuthGate.jsx";

function timeAgo(ts) {
  if (!ts) return "";
  const date = ts.toDate ? ts.toDate() : new Date(ts.seconds * 1000);
  const diff = Date.now() - date.getTime();
  if (diff < 60000) return "Just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d`;
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function MessagesPage({ user, activeConversationId, onConversationOpened }) {
  const [conversations, setConversations] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [showConversation, setShowConversation] = useState(false);

  const isMobile = Math.min(window.innerWidth, screen.width) <= 900;

  // Subscribe to conversations
  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToConversations(user.uid, setConversations);
    return unsub;
  }, [user]);

  // Handle external navigation to a conversation
  useEffect(() => {
    if (activeConversationId) {
      setSelectedId(activeConversationId);
      setShowConversation(true);
      if (onConversationOpened) onConversationOpened();
    }
  }, [activeConversationId]);

  return (
    <AuthGate user={user} title="Messages" description="Sign in to access your messages.">
      {(() => {
        const selectedConversation = conversations.find(c => c.id === selectedId);

        // Mobile: show either list or conversation
        if (isMobile) {
          if (showConversation && selectedId && selectedConversation) {
            return (
              <div style={{
                background: "#fff", borderRadius: 12, overflow: "hidden",
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: "1px solid #E5E7EB",
                height: "calc(100vh - 280px)", display: "flex", flexDirection: "column",
              }}>
                <ConversationView
                  conversationId={selectedId}
                  conversation={selectedConversation}
                  user={user}
                  onBack={() => { setShowConversation(false); setSelectedId(null); }}
                />
              </div>
            );
          }
          return (
            <div>
              <h2 style={{ margin: "0 0 16px", fontSize: 20, fontWeight: 800, color: "#0A1F44" }}>Messages</h2>
              {conversations.length === 0 ? (
                <div style={{ textAlign: "center", padding: "60px 24px", color: "#94a3b8" }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>&#128172;</div>
                  <div style={{ fontSize: 17, fontWeight: 600 }}>No messages yet</div>
                  <div style={{ fontSize: 14, marginTop: 8 }}>
                    Start a conversation from a program page or the coach dashboard
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {conversations.map(conv => {
                    const otherUid = conv.participants?.find(uid => uid !== user.uid);
                    const otherInfo = conv.participantInfo?.[otherUid] || {};
                    const unread = conv.unreadCounts?.[user.uid] || 0;
                    return (
                      <button key={conv.id} onClick={() => { setSelectedId(conv.id); setShowConversation(true); }} style={{
                        display: "flex", alignItems: "center", gap: 12, padding: "14px 16px",
                        background: "#fff", border: "1px solid #E5E7EB", borderRadius: 10,
                        cursor: "pointer", textAlign: "left", width: "100%",
                      }}>
                        <div style={{
                          width: 40, height: 40, borderRadius: "50%", background: "#0A1F44",
                          color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                          fontWeight: 800, fontSize: 15, flexShrink: 0,
                        }}>
                          {(otherInfo.name || "?")[0].toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{
                              fontWeight: unread > 0 ? 800 : 600, fontSize: 14, color: "#0A1F44",
                              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                            }}>
                              {otherInfo.name || "Unknown"}
                            </span>
                            <span style={{ fontSize: 11, color: "#94a3b8", textTransform: "capitalize", flexShrink: 0 }}>
                              {otherInfo.role || ""}
                            </span>
                          </div>
                          <div style={{
                            fontSize: 13, color: unread > 0 ? "#0A1F44" : "#94a3b8",
                            fontWeight: unread > 0 ? 600 : 400,
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 2,
                          }}>
                            {conv.lastMessage || "No messages yet"}
                          </div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                          <span style={{ fontSize: 11, color: "#94a3b8" }}>{timeAgo(conv.lastMessageAt)}</span>
                          {unread > 0 && (
                            <span style={{
                              width: 20, height: 20, borderRadius: "50%", background: "#00CC00",
                              color: "#0A1F44", fontSize: 11, fontWeight: 800,
                              display: "flex", alignItems: "center", justifyContent: "center",
                            }}>{unread}</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        }

        // Desktop: side-by-side layout
        return (
          <div style={{
            display: "flex", gap: 0, background: "#fff", borderRadius: 12,
            overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            border: "1px solid #E5E7EB", height: "calc(100vh - 280px)", minHeight: 500,
          }}>
            {/* Conversations list */}
            <div style={{
              width: 320, flexShrink: 0, borderRight: "1px solid #E5E7EB",
              display: "flex", flexDirection: "column", overflow: "hidden",
            }}>
              <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid #E5E7EB", flexShrink: 0 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#0A1F44" }}>Messages</h3>
              </div>
              <div style={{ flex: 1, overflowY: "auto" }}>
                {conversations.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px 16px", color: "#94a3b8", fontSize: 13 }}>
                    No conversations yet
                  </div>
                ) : (
                  conversations.map(conv => {
                    const otherUid = conv.participants?.find(uid => uid !== user.uid);
                    const otherInfo = conv.participantInfo?.[otherUid] || {};
                    const unread = conv.unreadCounts?.[user.uid] || 0;
                    const isActive = selectedId === conv.id;
                    return (
                      <button key={conv.id} onClick={() => { setSelectedId(conv.id); setShowConversation(true); }} style={{
                        display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
                        background: isActive ? "#f0f7ff" : "#fff", border: "none",
                        borderBottom: "1px solid #f1f5f9",
                        cursor: "pointer", textAlign: "left", width: "100%",
                        transition: "background 0.1s",
                      }}
                        onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "#f8fafc"; }}
                        onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "#fff"; }}
                      >
                        <div style={{
                          width: 38, height: 38, borderRadius: "50%", background: "#0A1F44",
                          color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                          fontWeight: 800, fontSize: 14, flexShrink: 0,
                        }}>
                          {(otherInfo.name || "?")[0].toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                            <span style={{
                              fontWeight: unread > 0 ? 800 : 600, fontSize: 13, color: "#0A1F44",
                              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                            }}>
                              {otherInfo.name || "Unknown"}
                            </span>
                            <span style={{ fontSize: 10, color: "#94a3b8", flexShrink: 0 }}>{timeAgo(conv.lastMessageAt)}</span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                            <span style={{
                              fontSize: 12, color: unread > 0 ? "#0A1F44" : "#94a3b8",
                              fontWeight: unread > 0 ? 600 : 400,
                              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1,
                            }}>
                              {conv.lastMessage || "No messages yet"}
                            </span>
                            {unread > 0 && (
                              <span style={{
                                minWidth: 18, height: 18, borderRadius: "50%", background: "#00CC00",
                                color: "#0A1F44", fontSize: 10, fontWeight: 800,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                padding: "0 4px", flexShrink: 0,
                              }}>{unread}</span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Conversation view */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
              {selectedId && selectedConversation ? (
                <ConversationView
                  conversationId={selectedId}
                  conversation={selectedConversation}
                  user={user}
                />
              ) : (
                <div style={{
                  flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#94a3b8", fontSize: 14, flexDirection: "column", gap: 8,
                }}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  <span>Select a conversation to start messaging</span>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </AuthGate>
  );
}
