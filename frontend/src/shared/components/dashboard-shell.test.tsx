// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { AccessPolicy, User } from "@/modules/auth/domain/types";

const mocks = vi.hoisted(() => ({
  getAccessPolicy: vi.fn(),
  getCurrentUser: vi.fn(),
  getMembershipStatus: vi.fn(),
  getSstCalculatorAccess: vi.fn(),
  getStoredToken: vi.fn(),
  router: { push: vi.fn(), replace: vi.fn() },
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/mi-espacio",
  useRouter: () => mocks.router,
}));
vi.mock("@/modules/auth/infrastructure/auth-api", () => ({
  getAccessPolicy: mocks.getAccessPolicy,
  getCurrentUser: mocks.getCurrentUser,
}));
vi.mock("@/modules/auth/infrastructure/auth-storage", () => ({ getStoredToken: mocks.getStoredToken }));
vi.mock("@/modules/membership/infrastructure/membership-api", () => ({ getMembershipStatus: mocks.getMembershipStatus }));
vi.mock("@/modules/membership/domain/types", () => ({ membershipPathForStatus: () => "/dashboard" }));
vi.mock("@/modules/sst-calculator/infrastructure/sst-calculator-api", () => ({ getSstCalculatorAccess: mocks.getSstCalculatorAccess }));
vi.mock("@/shared/components/app-header", () => ({ AppHeader: () => <header>Member header</header> }));
vi.mock("@/shared/components/app-sidebar", () => ({
  AppSidebar: ({ navigation }: { navigation: Array<{ label: string; href: string }> }) => (
    <nav>{navigation.map((item) => <a href={item.href} key={item.href}>{item.label}</a>)}</nav>
  ),
}));
vi.mock("@/shared/components/route-loader", () => ({ RouteLoader: () => <div>loading</div> }));

import { DashboardShell } from "./dashboard-shell";

const member: User = {
  id: 7,
  name: "Miembro",
  email: "member@example.com",
  state_id: 1,
  email_verified_at: null,
  last_conexion: null,
  must_change_password: false,
  roles: ["miembro"],
  access_level: "member",
  allowed_routes: ["/mi-espacio"],
  profile: null,
};
const policy: AccessPolicy = {
  roles: ["miembro"],
  access_level: "member",
  allowed_routes: ["/mi-espacio"],
  navigation: [{ label: "Mi espacio", href: "/mi-espacio" }],
};

beforeEach(() => {
  mocks.getStoredToken.mockReturnValue("token");
  mocks.getCurrentUser.mockResolvedValue(member);
  mocks.getAccessPolicy.mockResolvedValue(policy);
  mocks.getMembershipStatus.mockResolvedValue({});
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("DashboardShell SST navigation", () => {
  it("adds Calcular SST only after eligibility is confirmed", async () => {
    mocks.getSstCalculatorAccess.mockResolvedValue({ allowed: true, balance_status: "al_dia", pending_balance: "0.00", reason: null });

    render(<DashboardShell><div>dashboard content</div></DashboardShell>);

    expect(await screen.findByRole("link", { name: "Calcular SST" })).toHaveAttribute("href", "/mi-espacio/calcular-sst");
    expect(screen.getByText("dashboard content")).toBeInTheDocument();
    expect(policy.navigation).toEqual([{ label: "Mi espacio", href: "/mi-espacio" }]);
  });

  it("keeps the navigation hidden when access validation fails", async () => {
    mocks.getSstCalculatorAccess.mockRejectedValue(new Error("network"));

    render(<DashboardShell><div>dashboard content</div></DashboardShell>);

    await screen.findByText("dashboard content");
    await waitFor(() => expect(mocks.getSstCalculatorAccess).toHaveBeenCalledOnce());
    expect(screen.queryByRole("link", { name: "Calcular SST" })).not.toBeInTheDocument();
    expect(mocks.router.replace).not.toHaveBeenCalled();
  });
});
