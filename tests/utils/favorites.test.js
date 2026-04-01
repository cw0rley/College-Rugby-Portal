import { describe, it, expect, vi, beforeEach } from "vitest";
import { getDocs, setDoc, deleteDoc, doc, collection } from "firebase/firestore";
import { loadFavorites, addFavorite, removeFavorite } from "../../utils/favorites.js";

vi.mock("../../utils/programInterest.js", () => ({
  writeInterest: vi.fn(() => Promise.resolve()),
  removeInterest: vi.fn(() => Promise.resolve()),
}));

import { writeInterest, removeInterest } from "../../utils/programInterest.js";

describe("favorites", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("loadFavorites", () => {
    it("returns a Set of favorite program IDs", async () => {
      getDocs.mockResolvedValueOnce({
        docs: [{ id: "prog1" }, { id: "prog2" }, { id: "prog3" }],
      });

      const result = await loadFavorites("user123");
      expect(result).toBeInstanceOf(Set);
      expect(result.size).toBe(3);
      expect(result.has("prog1")).toBe(true);
      expect(result.has("prog2")).toBe(true);
      expect(result.has("prog3")).toBe(true);
    });

    it("returns empty Set when user has no favorites", async () => {
      getDocs.mockResolvedValueOnce({ docs: [] });
      const result = await loadFavorites("user123");
      expect(result.size).toBe(0);
    });
  });

  describe("addFavorite", () => {
    it("writes to Firestore favorites subcollection", async () => {
      await addFavorite("user123", "prog1", null);
      expect(setDoc).toHaveBeenCalled();
    });

    it("writes to programInterest when player profile is public", async () => {
      const playerData = { firstName: "John", profilePublic: true };
      await addFavorite("user123", "prog1", playerData);
      expect(writeInterest).toHaveBeenCalledWith("prog1", "user123", playerData);
    });

    it("does NOT write to programInterest when profile is private", async () => {
      const playerData = { firstName: "John", profilePublic: false };
      await addFavorite("user123", "prog1", playerData);
      expect(writeInterest).not.toHaveBeenCalled();
    });

    it("does NOT write to programInterest when no player data", async () => {
      await addFavorite("user123", "prog1", null);
      expect(writeInterest).not.toHaveBeenCalled();
    });
  });

  describe("removeFavorite", () => {
    it("deletes from favorites and removes interest", async () => {
      await removeFavorite("user123", "prog1");
      expect(deleteDoc).toHaveBeenCalled();
      expect(removeInterest).toHaveBeenCalledWith("prog1", "user123");
    });
  });
});
