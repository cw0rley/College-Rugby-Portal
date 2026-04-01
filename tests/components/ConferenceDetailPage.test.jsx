import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ConferenceDetailPage from "../../components/ConferenceDetailPage.jsx";

const programs = [
  { id: "1", school: "Penn State", conference: "B1G", gender: "mens", city: "State College", state: "PA", gpa: 3.5, league: "NCR D1A" },
  { id: "2", school: "Ohio State", conference: "B1G", gender: "mens", city: "Columbus", state: "OH", gpa: 3.3, league: "NCR D1A" },
  { id: "3", school: "Michigan", conference: "B1G", gender: "womens", city: "Ann Arbor", state: "MI", gpa: 3.7, league: "NCR D1A" },
  { id: "4", school: "UCLA", conference: "PAC", gender: "mens", city: "Los Angeles", state: "CA", gpa: 3.9, league: "NCR D1A" },
];

const conferences = [
  { id: "c1", conference: "B1G", fullName: "Big Ten Conference", notes: "Power conference" },
  { id: "c2", conference: "PAC", fullName: "Pacific Conference" },
];

const confNameMap = { B1G: "Big Ten Conference", PAC: "Pacific Conference" };
const contactsByProgramId = {};

function renderPage(abbr, overrides = {}) {
  return render(
    <MemoryRouter initialEntries={[`/conference/${abbr}`]}>
      <Routes>
        <Route path="/conference/:abbr" element={
          <ConferenceDetailPage
            programs={programs}
            conferences={conferences}
            confNameMap={confNameMap}
            contactsByProgramId={contactsByProgramId}
            onSelectProgram={vi.fn()}
            onToggleCompare={vi.fn()}
            compareIds={[]}
            favoriteIds={new Set()}
            onToggleFavorite={vi.fn()}
            isMobile={false}
            {...overrides}
          />
        } />
      </Routes>
    </MemoryRouter>
  );
}

describe("ConferenceDetailPage", () => {
  it("renders the conference full name", () => {
    renderPage("B1G");
    expect(screen.getByText("Big Ten Conference")).toBeInTheDocument();
  });

  it("renders the abbreviation badge", () => {
    renderPage("B1G");
    expect(screen.getByText("B1G")).toBeInTheDocument();
  });

  it("shows total program count", () => {
    renderPage("B1G");
    expect(screen.getByText("3")).toBeInTheDocument(); // 3 B1G programs
  });

  it("renders all programs in the conference", () => {
    renderPage("B1G");
    expect(screen.getByText("Penn State")).toBeInTheDocument();
    expect(screen.getByText("Ohio State")).toBeInTheDocument();
    expect(screen.getByText("Michigan")).toBeInTheDocument();
  });

  it("does not render programs from other conferences", () => {
    renderPage("B1G");
    expect(screen.queryByText("UCLA")).not.toBeInTheDocument();
  });

  it("shows gender toggle when both genders exist", () => {
    renderPage("B1G");
    expect(screen.getByText(/^All \(/)).toBeInTheDocument();
    expect(screen.getByText(/^Men's \(/)).toBeInTheDocument();
    expect(screen.getByText(/^Women's \(/)).toBeInTheDocument();
  });

  it("does not show gender toggle when only one gender", () => {
    renderPage("PAC"); // Only mens
    expect(screen.queryByText(/^Women's \(/)).not.toBeInTheDocument();
  });

  it("filters to men's programs only", () => {
    renderPage("B1G");
    fireEvent.click(screen.getByText(/^Men's \(/));
    expect(screen.getByText("Penn State")).toBeInTheDocument();
    expect(screen.getByText("Ohio State")).toBeInTheDocument();
    expect(screen.queryByText("Michigan")).not.toBeInTheDocument();
  });

  it("filters to women's programs only", () => {
    renderPage("B1G");
    fireEvent.click(screen.getByText(/^Women's \(/));
    expect(screen.getByText("Michigan")).toBeInTheDocument();
    expect(screen.queryByText("Penn State")).not.toBeInTheDocument();
  });

  it("shows all programs when All is clicked", () => {
    renderPage("B1G");
    fireEvent.click(screen.getByText(/^Women's \(/));
    fireEvent.click(screen.getByText(/^All \(/));
    expect(screen.getByText("Penn State")).toBeInTheDocument();
    expect(screen.getByText("Michigan")).toBeInTheDocument();
  });

  it("shows not-found state for invalid conference", () => {
    renderPage("FAKE");
    expect(screen.getByText("Conference not found")).toBeInTheDocument();
  });

  it("renders back to conferences link", () => {
    renderPage("B1G");
    expect(screen.getByText("All Conferences")).toBeInTheDocument();
  });

  it("shows conference notes when available", () => {
    renderPage("B1G");
    expect(screen.getByText("Power conference")).toBeInTheDocument();
  });

  it("calls onSelectProgram when a program card is clicked", () => {
    const onSelect = vi.fn();
    renderPage("B1G", { onSelectProgram: onSelect });
    fireEvent.click(screen.getByText("Penn State"));
    expect(onSelect).toHaveBeenCalled();
  });
});
