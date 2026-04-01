import { describe, it, expect, vi, beforeEach } from "vitest";
import { getDocs, setDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { loadRecruits, saveRecruit, updateRecruitRating, updateRecruitNotes, removeRecruit } from "../../utils/recruits.js";

describe("recruits", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("loadRecruits", () => {
    it("returns array of recruit objects with playerUid", async () => {
      getDocs.mockResolvedValueOnce({
        docs: [
          { id: "player1", data: () => ({ rating: 4, notes: "Good" }) },
          { id: "player2", data: () => ({ rating: 2, notes: "" }) },
        ],
      });

      const result = await loadRecruits("coach1");
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ playerUid: "player1", rating: 4, notes: "Good" });
      expect(result[1]).toEqual({ playerUid: "player2", rating: 2, notes: "" });
    });

    it("returns empty array when no recruits", async () => {
      getDocs.mockResolvedValueOnce({ docs: [] });
      const result = await loadRecruits("coach1");
      expect(result).toEqual([]);
    });
  });

  describe("saveRecruit", () => {
    it("saves recruit with player data snapshot", async () => {
      const playerData = {
        firstName: "John",
        lastName: "Doe",
        position: "Fly-half",
        secondaryPosition: "Fullback",
        graduationYear: 2026,
        city: "Austin",
        gpa: "3.8",
        currentClub: "Austin RFC",
      };

      await saveRecruit("coach1", "player1", playerData, 5);
      expect(setDoc).toHaveBeenCalled();

      const savedData = setDoc.mock.calls[0][1];
      expect(savedData.rating).toBe(5);
      expect(savedData.notes).toBe("");
      expect(savedData.playerData.firstName).toBe("John");
      expect(savedData.playerData.position).toBe("Fly-half");
    });

    it("defaults rating to 0", async () => {
      await saveRecruit("coach1", "player1", { firstName: "Test" });
      const savedData = setDoc.mock.calls[0][1];
      expect(savedData.rating).toBe(0);
    });

    it("handles missing player fields gracefully", async () => {
      await saveRecruit("coach1", "player1", {});
      const savedData = setDoc.mock.calls[0][1];
      expect(savedData.playerData.firstName).toBe("");
      expect(savedData.playerData.graduationYear).toBeNull();
    });
  });

  describe("updateRecruitRating", () => {
    it("updates rating on the recruit doc", async () => {
      await updateRecruitRating("coach1", "player1", 3);
      expect(updateDoc).toHaveBeenCalled();
      expect(updateDoc.mock.calls[0][1]).toEqual({ rating: 3 });
    });
  });

  describe("updateRecruitNotes", () => {
    it("updates notes on the recruit doc", async () => {
      await updateRecruitNotes("coach1", "player1", "Great prospect");
      expect(updateDoc).toHaveBeenCalled();
      expect(updateDoc.mock.calls[0][1]).toEqual({ notes: "Great prospect" });
    });
  });

  describe("removeRecruit", () => {
    it("deletes the recruit doc", async () => {
      await removeRecruit("coach1", "player1");
      expect(deleteDoc).toHaveBeenCalled();
    });
  });
});
