// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createInitialQuote } from "../../domain/types";

const qrToDataUrl = vi.hoisted(() => vi.fn());
vi.mock("qrcode", () => ({ default: { toDataURL: qrToDataUrl } }));

import { ProposalPreview } from "./proposal-preview";

beforeEach(() => {
  qrToDataUrl.mockResolvedValue("data:image/png;base64,qr");
  vi.stubGlobal("crypto", { subtle: { digest: vi.fn().mockResolvedValue(Uint8Array.from([0xab, 0xcd]).buffer) } });
  window.print = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("ProposalPreview", () => {
  it("renders locally generated QR/hash content and invokes window.print", async () => {
    const input = {
      ...createInitialQuote(),
      company: "Cliente SST",
      activity: { code: "A0111.11", description: "Cultivo de trigo", risk: "Bajo" as const },
      centers: [{ name: "Matriz", place: "Quito", workers: 35, visits: 2 }],
      sbu: 460,
      signer: "Profesional SST",
      signerRole: "Consultor SST",
    };

    render(<ProposalPreview input={input} issuerLogo="" onClose={vi.fn()} signature="data:image/png;base64,signature" />);

    expect(await screen.findByRole("img", { name: "QR identificativo" })).toHaveAttribute("src", "data:image/png;base64,qr");
    await waitFor(() => expect(screen.getByText(/SHA-256: abcd/)).toBeInTheDocument());
    expect(qrToDataUrl).toHaveBeenCalledWith(expect.stringContaining("Cliente SST"), expect.objectContaining({ width: 180, errorCorrectionLevel: "M" }));

    fireEvent.click(screen.getByRole("button", { name: "Guardar PDF / Imprimir" }));
    expect(window.print).toHaveBeenCalledOnce();
  });
});
