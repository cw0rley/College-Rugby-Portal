import { describe, it, expect, vi, beforeEach } from "vitest";
import { addDoc } from "firebase/firestore";
import { logChange } from "../../utils/changelog.js";

describe("changelog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("logs an add action", async () => {
    await logChange("add", "programs", "prog1", { school: "Test U" }, "admin@test.com");
    expect(addDoc).toHaveBeenCalled();
    const logData = addDoc.mock.calls[0][1];
    expect(logData.action).toBe("add");
    expect(logData.collection).toBe("programs");
    expect(logData.docId).toBe("prog1");
    expect(logData.data.school).toBe("Test U");
    expect(logData.userEmail).toBe("admin@test.com");
    expect(logData.timestamp).toBeDefined();
  });

  it("logs an update action", async () => {
    await logChange("update", "programs", "prog1", { school: "Updated U" }, "admin@test.com");
    expect(addDoc.mock.calls[0][1].action).toBe("update");
  });

  it("logs a delete action", async () => {
    await logChange("delete", "programs", "prog1", { school: "Deleted U" }, "admin@test.com");
    expect(addDoc.mock.calls[0][1].action).toBe("delete");
  });

  it("handles null docId for new documents", async () => {
    await logChange("add", "programs", null, {}, "admin@test.com");
    expect(addDoc.mock.calls[0][1].docId).toBeNull();
  });

  it("defaults userEmail to 'unknown'", async () => {
    await logChange("add", "programs", "prog1", {}, null);
    expect(addDoc.mock.calls[0][1].userEmail).toBe("unknown");
  });

  it("handles Firestore error gracefully without throwing", async () => {
    addDoc.mockRejectedValueOnce(new Error("Firestore error"));
    await expect(logChange("add", "programs", "prog1", {}, "a@b.com")).resolves.toBeUndefined();
  });
});
