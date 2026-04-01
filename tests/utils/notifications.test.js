import { describe, it, expect, vi, beforeEach } from "vitest";
import { getDocs, addDoc, updateDoc, onSnapshot, query, collection, where, doc, writeBatch } from "firebase/firestore";
import {
  subscribeToNotifications,
  createNotification,
  markNotificationRead,
  markAllNotificationsRead,
  requestBrowserNotificationPermission,
  showBrowserNotification,
} from "../../utils/notifications.js";

describe("notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("subscribeToNotifications", () => {
    it("returns an unsubscribe function", () => {
      const unsub = vi.fn();
      onSnapshot.mockReturnValueOnce(unsub);
      const result = subscribeToNotifications("user1", vi.fn());
      expect(result).toBe(unsub);
    });

    it("calls callback with mapped docs on snapshot", () => {
      const callback = vi.fn();
      onSnapshot.mockImplementationOnce((q, cb) => {
        cb({
          docs: [
            { id: "n1", data: () => ({ title: "Test", read: false }) },
            { id: "n2", data: () => ({ title: "Test 2", read: true }) },
          ],
        });
        return vi.fn();
      });
      subscribeToNotifications("user1", callback);
      expect(callback).toHaveBeenCalledWith([
        { id: "n1", title: "Test", read: false },
        { id: "n2", title: "Test 2", read: true },
      ]);
    });
  });

  describe("createNotification", () => {
    it("adds a notification doc with correct fields", async () => {
      await createNotification({
        recipientUid: "user1",
        type: "message",
        title: "New message",
        body: "Hello!",
        link: "/messages",
      });
      expect(addDoc).toHaveBeenCalled();
      const data = addDoc.mock.calls[0][1];
      expect(data.recipientUid).toBe("user1");
      expect(data.type).toBe("message");
      expect(data.title).toBe("New message");
      expect(data.body).toBe("Hello!");
      expect(data.link).toBe("/messages");
      expect(data.read).toBe(false);
    });

    it("defaults body and link when not provided", async () => {
      await createNotification({
        recipientUid: "user1",
        type: "submission",
        title: "New submission",
      });
      const data = addDoc.mock.calls[0][1];
      expect(data.body).toBe("");
      expect(data.link).toBeNull();
    });
  });

  describe("markNotificationRead", () => {
    it("updates the notification doc with read: true", async () => {
      await markNotificationRead("notif1");
      expect(updateDoc).toHaveBeenCalled();
      const updateCall = updateDoc.mock.calls[0][1];
      expect(updateCall.read).toBe(true);
    });
  });

  describe("markAllNotificationsRead", () => {
    it("does nothing when no unread notifications", async () => {
      getDocs.mockResolvedValueOnce({ empty: true, docs: [] });
      await markAllNotificationsRead("user1");
      // writeBatch should not be called
    });
  });

  describe("requestBrowserNotificationPermission", () => {
    it("returns false when Notification API not available", async () => {
      const origNotification = global.Notification;
      delete global.Notification;
      const result = await requestBrowserNotificationPermission();
      expect(result).toBe(false);
      global.Notification = origNotification;
    });

    it("returns true when already granted", async () => {
      global.Notification = { permission: "granted", requestPermission: vi.fn() };
      const result = await requestBrowserNotificationPermission();
      expect(result).toBe(true);
    });

    it("returns false when denied", async () => {
      global.Notification = { permission: "denied", requestPermission: vi.fn() };
      const result = await requestBrowserNotificationPermission();
      expect(result).toBe(false);
    });
  });

  describe("showBrowserNotification", () => {
    it("does nothing when Notification API not available", () => {
      const origNotification = global.Notification;
      delete global.Notification;
      // Should not throw
      showBrowserNotification("Test", "Body");
      global.Notification = origNotification;
    });

    it("does nothing when permission not granted", () => {
      global.Notification = vi.fn();
      global.Notification.permission = "denied";
      showBrowserNotification("Test", "Body");
      expect(global.Notification).not.toHaveBeenCalled();
    });
  });
});
