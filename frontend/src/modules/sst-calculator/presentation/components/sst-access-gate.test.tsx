// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { SstAccessGate } from "./sst-access-gate";

afterEach(cleanup);

describe("SstAccessGate", () => {
  it("hides the calculator and links payments when access is denied", () => {
    render(
      <SstAccessGate
        access={{ allowed: false, balance_status: "saldo_pendiente", pending_balance: "20.00", reason: "Debes estar al día con tus pagos." }}
        error={null}
        loading={false}
      >
        <div>calculator content</div>
      </SstAccessGate>,
    );

    expect(screen.queryByText("calculator content")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Calcular SST no está disponible" })).toBeInTheDocument();
    expect(screen.getByText("Saldo pendiente: USD 20.00")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Revisar mis pagos" })).toHaveAttribute("href", "/mi-espacio/pagos");
  });

  it("renders children only for an explicitly allowed member", () => {
    render(
      <SstAccessGate
        access={{ allowed: true, balance_status: "al_dia", pending_balance: "0.00", reason: null }}
        error={null}
        loading={false}
      >
        <div>calculator content</div>
      </SstAccessGate>,
    );

    expect(screen.getByText("calculator content")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Revisar mis pagos" })).not.toBeInTheDocument();
  });
});
