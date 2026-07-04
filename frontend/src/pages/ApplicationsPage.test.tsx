import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { App as AntApp } from "antd";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApplicationsPage } from "./ApplicationsPage";
import * as api from "../api/applications";

vi.mock("../api/applications");

function renderPage() {
  return render(
    <MemoryRouter>
      <AntApp>
        <ApplicationsPage />
      </AntApp>
    </MemoryRouter>
  );
}

describe("ApplicationsPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("calls the list endpoint and shows the empty state when there are none", async () => {
    vi.mocked(api.listApplications).mockResolvedValue([]);
    renderPage();
    expect(api.listApplications).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(screen.getByText(/no applications yet/i)).toBeInTheDocument();
    });
  });

  it("renders a row for each application with its pass/fail status", async () => {
    vi.mocked(api.listApplications).mockResolvedValue([
      {
        id: "a1",
        brand: "Old Tom Distillery",
        drinkType: "distilled-spirits",
        importedOrDomestic: "domestic",
        outcome: "fail",
        ranAt: "2026-07-03T14:00:00Z"
      }
    ]);
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Old Tom Distillery")).toBeInTheDocument();
    });
    expect(screen.getByText("fail")).toBeInTheDocument();
  });
});
