import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Footer from "../../components/Footer.jsx";

describe("Footer", () => {
  const renderFooter = () =>
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>
    );

  it("renders the site name", () => {
    renderFooter();
    expect(screen.getByText("College Rugby Portal")).toBeInTheDocument();
  });

  it("renders navigation links", () => {
    renderFooter();
    expect(screen.getByText("Programs")).toBeInTheDocument();
    expect(screen.getByText("Conferences")).toBeInTheDocument();
    expect(screen.getByText("Leagues")).toBeInTheDocument();
    expect(screen.getByText("Rankings")).toBeInTheDocument();
    expect(screen.getByText("Player Directory")).toBeInTheDocument();
    expect(screen.getByText("Submit Program Info")).toBeInTheDocument();
    expect(screen.getByText("Player Profile")).toBeInTheDocument();
    expect(screen.getByText("About")).toBeInTheDocument();
  });

  it("renders contact email", () => {
    renderFooter();
    expect(screen.getByText("admin@collegerugbyportal.com")).toBeInTheDocument();
  });

  it("renders copyright with current year", () => {
    renderFooter();
    const year = new Date().getFullYear();
    expect(screen.getByText(new RegExp(`${year}`))).toBeInTheDocument();
  });

  it("renders disclaimer", () => {
    renderFooter();
    expect(screen.getByText(/Not affiliated with USA Rugby/)).toBeInTheDocument();
  });

  it("has correct href for email link", () => {
    renderFooter();
    const emailLink = screen.getByText("admin@collegerugbyportal.com");
    expect(emailLink.closest("a").href).toBe("mailto:admin@collegerugbyportal.com");
  });
});
