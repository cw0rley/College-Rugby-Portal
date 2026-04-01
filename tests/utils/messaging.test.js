import { describe, it, expect, vi, beforeEach } from "vitest";
import { getDocs, addDoc, updateDoc, onSnapshot, query, collection, where, doc } from "firebase/firestore";
import { getOrCreateConversation, sendMessage, markAsRead, subscribeToConversations, subscribeToMessages } from "../../utils/messaging.js";

describe("messaging", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getOrCreateConversation", () => {
    it("returns existing conversation ID when one exists", async () => {
      getDocs.mockResolvedValueOnce({
        docs: [{
          id: "conv123",
          data: () => ({ participants: ["user1", "user2"] }),
        }],
      });

      const id = await getOrCreateConversation("user1", "Coach Smith", "coach", "user2", "John Doe", "player", "prog1");
      expect(id).toBe("conv123");
      expect(addDoc).not.toHaveBeenCalled();
    });

    it("creates new conversation when none exists", async () => {
      getDocs.mockResolvedValueOnce({ docs: [] });
      addDoc.mockResolvedValueOnce({ id: "new-conv" });

      const id = await getOrCreateConversation("user1", "Coach", "coach", "user2", "Player", "player", "prog1");
      expect(id).toBe("new-conv");
      expect(addDoc).toHaveBeenCalled();

      const addDocCall = addDoc.mock.calls[0][1];
      expect(addDocCall.participants).toEqual(["user1", "user2"]);
      expect(addDocCall.programId).toBe("prog1");
      expect(addDocCall.participantInfo.user1.name).toBe("Coach");
      expect(addDocCall.participantInfo.user2.role).toBe("player");
    });

    it("handles null programId", async () => {
      getDocs.mockResolvedValueOnce({ docs: [] });
      addDoc.mockResolvedValueOnce({ id: "new-conv" });

      await getOrCreateConversation("u1", "A", "coach", "u2", "B", "player", null);
      const addDocCall = addDoc.mock.calls[0][1];
      expect(addDocCall.programId).toBeNull();
    });
  });

  describe("sendMessage", () => {
    it("adds message doc and updates conversation summary", async () => {
      await sendMessage("conv1", "sender1", "recipient1", "Hello there!");
      expect(addDoc).toHaveBeenCalled();
      expect(updateDoc).toHaveBeenCalled();

      const msgData = addDoc.mock.calls[0][1];
      expect(msgData.senderId).toBe("sender1");
      expect(msgData.text).toBe("Hello there!");
    });

    it("truncates lastMessage to 100 chars", async () => {
      const longMsg = "a".repeat(200);
      await sendMessage("conv1", "s", "r", longMsg);
      const updateCall = updateDoc.mock.calls[0][1];
      expect(updateCall.lastMessage).toHaveLength(100);
    });
  });

  describe("markAsRead", () => {
    it("sets unread count to 0 for the user", async () => {
      await markAsRead("conv1", "user1");
      expect(updateDoc).toHaveBeenCalled();
      const updateCall = updateDoc.mock.calls[0][1];
      expect(updateCall["unreadCounts.user1"]).toBe(0);
    });
  });

  describe("subscribeToConversations", () => {
    it("returns an unsubscribe function", () => {
      const unsub = vi.fn();
      onSnapshot.mockReturnValueOnce(unsub);
      const result = subscribeToConversations("user1", vi.fn());
      expect(result).toBe(unsub);
    });
  });

  describe("subscribeToMessages", () => {
    it("returns an unsubscribe function", () => {
      const unsub = vi.fn();
      onSnapshot.mockReturnValueOnce(unsub);
      const result = subscribeToMessages("conv1", vi.fn());
      expect(result).toBe(unsub);
    });
  });
});
