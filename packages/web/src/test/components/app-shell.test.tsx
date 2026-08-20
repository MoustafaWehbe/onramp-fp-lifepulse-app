import { render, screen, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { AuthContext, type AuthUser } from "@/providers/auth-context";
import { apiClient } from "@/lib/api-client";

const coach: AuthUser = {
  id: "coach-1",
  email: "sam@example.com",
  name: "Sam Rivera",
  role: "coach",
};

const user: AuthUser = {
  id: "user-1",
  email: "ana@example.com",
  name: "Ana Diaz",
  role: "user",
};

function renderShell(as: AuthUser) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AuthContext.Provider
          value={{
            user: as,
            isLoading: false,
            login: vi.fn(),
            register: vi.fn(),
            logout: vi.fn(),
          }}
        >
          <AppShell>
            <p>page body</p>
          </AppShell>
        </AuthContext.Provider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/** The destination labels in the sidebar's nav, excluding the logo link. */
function sidebarLinks() {
  const sidebar = screen.getByLabelText("Primary navigation");
  const nav = within(sidebar).getByRole("navigation");
  return within(nav)
    .getAllByRole("link")
    .map((l) => l.textContent?.trim());
}

beforeEach(() => {
  vi.restoreAllMocks();
  // Queries that do run would hit the network under jsdom; stub the client so a
  // stray request fails the expectations below rather than the whole test.
  vi.spyOn(apiClient, "get").mockResolvedValue({ data: { data: [] } });
});

describe("AppShell navigation", () => {
  it("gives a coach exactly two destinations", () => {
    renderShell(coach);

    expect(sidebarLinks()).toEqual(["Coaching", "Profile"]);
  });

  it("does not show a coach the life-areas list or fetch one", () => {
    renderShell(coach);

    expect(screen.queryByText("My Areas")).not.toBeInTheDocument();
    // A coach has no areas, habits or check-ins, so the shell should ask the
    // API for none of them.
    expect(apiClient.get).not.toHaveBeenCalled();
  });

  it("points a coach's logo at their own home, not the habit dashboard", () => {
    renderShell(coach);

    const [home] = within(
      screen.getByLabelText("Primary navigation"),
    ).getAllByRole("link");
    expect(home).toHaveAttribute("href", "/coaching");
  });

  it("keeps the full app for a user account", () => {
    renderShell(user);

    expect(sidebarLinks()).toEqual([
      "Dashboard",
      "Today",
      "Progress",
      "Profile",
      "Coaching",
    ]);
    expect(screen.getByText("My Areas")).toBeInTheDocument();
  });
});
