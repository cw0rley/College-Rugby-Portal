import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { onSnapshot } from "firebase/firestore";
import NotificationBell from "../../components/ui/NotificationBell.jsx";

// Mock notifications module
vi.mock("../../utils/notifications.js", () => ({
  subscribeToNotifications: vi.fn((uid, cb) => {
    // Store callback for test control
    NotificationBell.__testCallback = cb;
    return vi.fn(); // unsub
  }),
  markNotificationRead: vi.fn(() => Promise.resolve()),
  markAllNotificationsRead: vi.fn(() => Promise.resolve()),
  requestBrowserNotificationPermission: vi.fn(() => Promise.resolve(false)),
  showBrowserNotification: vi.fn(),
}));

describe("NotificationBell", () => {
  const mockUser = { uid: "user1", displayName: "Test" };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing when no user", () => {
    const { container } = render(<NotificationBell user={null} isMobile={false} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders bell button when user is signed in", () => {
    render(<NotificationBell user={mockUser} isMobile={false} />);
    expect(screen.getByRole("button", { name: /notifications/i })).toBeInTheDocument();
  });

  it("opens dropdown on click", () => {
    render(<NotificationBell user={mockUser} isMobile={false} />);
    fireEvent.click(screen.getByRole("button", { name: /notifications/i }));
    expect(screen.getByText("Notifications")).toBeInTheDocument();
    expect(screen.getByText("No notifications yet")).toBeInTheDocument();
  });
});
