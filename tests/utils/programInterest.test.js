import { describe, it, expect, vi, beforeEach } from "vitest";
import { getDocs, setDoc, deleteDoc } from "firebase/firestore";
import { writeInterest, removeInterest, loadInterestedPlayers } from "../../utils/programInterest.js";

describe("programInterest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("writeInterest", () => {
    it("writes player data to programInterest subcollection", async () => {
      const playerData = { firstName: "John", position: "Hooker" };
      await writeInterest("prog1", "user1", playerData);
      expect(setDoc).toHaveBeenCalled();
      const savedData = setDoc.mock.calls[0][1];
      expect(savedData.firstName).toBe("John");
      expect(savedData.position).toBe("Hooker");
      expect(savedData.addedAt).toBeDefined();
    });
  });

  describe("removeInterest", () => {
    it("deletes player from programInterest subcollection", async () => {
      await removeInterest("prog1", "user1");
      expect(deleteDoc).toHaveBeenCalled();
    });
  });

  describe("loadInterestedPlayers", () => {
    it("returns array of player objects with uid", async () => {
      getDocs.mockResolvedValueOnce({
        docs: [
          { id: "user1", data: () => ({ firstName: "John" }) },
          { id: "user2", data: () => ({ firstName: "Jane" }) },
        ],
      });

      const result = await loadInterestedPlayers("prog1");
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ uid: "user1", firstName: "John" });
      expect(result[1]).toEqual({ uid: "user2", firstName: "Jane" });
    });

    it("returns empty array for program with no interest", async () => {
      getDocs.mockResolvedValueOnce({ docs: [] });
      const result = await loadInterestedPlayers("prog1");
      expect(result).toEqual([]);
    });
  });
});
