import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AuthGate from "../../components/ui/AuthGate.jsx";

describe("AuthGate", () => {
  const verifiedUser = {
    uid: "user1",
    email: "test@example.com",
    emailVerified: true,
    providerData: [{ providerId: "google.com" }],
  };

  const unverifiedUser = {
    uid: "user2",
    email: "test@example.com",
    emailVerified: false,
    providerData: [{ providerId: "password" }],
  };

  it("renders children when user is verified", () => {
    render(
      <AuthGate user={verifiedUser} title="Test" description="Test desc">
        <div>Protected Content</div>
      </AuthGate>
    );
    expect(screen.getByText("Protected Content")).toBeInTheDocument();
  });

  it("renders children for Google OAuth users (always verified)", () => {
    const googleUser = { ...verifiedUser, emailVerified: false, providerData: [{ providerId: "google.com" }] };
    render(
      <AuthGate user={googleUser} title="Test" description="Test desc">
        <div>Protected Content</div>
      </AuthGate>
    );
    expect(screen.getByText("Protected Content")).toBeInTheDocument();
  });

  it("shows verification prompt for unverified email/password user", () => {
    render(
      <AuthGate user={unverifiedUser} title="Test" description="Test desc">
        <div>Protected Content</div>
      </AuthGate>
    );
    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
    expect(screen.getByText("Verify Your Email")).toBeInTheDocument();
    expect(screen.getByText(/test@example.com/)).toBeInTheDocument();
  });

  it("shows sign-in form when no user", () => {
    render(
      <AuthGate user={null} title="Sign In Required" description="Please sign in">
        <div>Protected Content</div>
      </AuthGate>
    );
    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
    expect(screen.getByText("Sign In Required")).toBeInTheDocument();
    expect(screen.getByText("Please sign in")).toBeInTheDocument();
  });

  it("shows Google sign-in button", () => {
    render(
      <AuthGate user={null} title="Test" description="Test">
        <div>Content</div>
      </AuthGate>
    );
    expect(screen.getByText("Sign in with Google")).toBeInTheDocument();
  });

  it("shows email and password inputs", () => {
    render(
      <AuthGate user={null} title="Test" description="Test">
        <div>Content</div>
      </AuthGate>
    );
    expect(screen.getByPlaceholderText("Email address")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Password")).toBeInTheDocument();
  });

  it("shows Sign In button by default", () => {
    render(
      <AuthGate user={null} title="Test" description="Test">
        <div>Content</div>
      </AuthGate>
    );
    expect(screen.getByText("Sign In")).toBeInTheDocument();
  });

  it("toggles to signup mode", () => {
    render(
      <AuthGate user={null} title="Test" description="Test">
        <div>Content</div>
      </AuthGate>
    );
    fireEvent.click(screen.getByText("Don't have an account? Create one"));
    expect(screen.getByText("Create Account")).toBeInTheDocument();
    expect(screen.getByText("Already have an account? Sign in")).toBeInTheDocument();
  });

  it("toggles back to login mode", () => {
    render(
      <AuthGate user={null} title="Test" description="Test">
        <div>Content</div>
      </AuthGate>
    );
    fireEvent.click(screen.getByText("Don't have an account? Create one"));
    fireEvent.click(screen.getByText("Already have an account? Sign in"));
    expect(screen.getByText("Sign In")).toBeInTheDocument();
  });

  it("shows sign-out button on verification screen", () => {
    render(
      <AuthGate user={unverifiedUser} title="Test" description="Test">
        <div>Content</div>
      </AuthGate>
    );
    expect(screen.getByText("Sign out")).toBeInTheDocument();
  });
});
