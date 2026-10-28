// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createInitialQuote } from "../../domain/types";

const qrToDataUrl = vi.hoisted(() => vi.fn());
vi.mock("qrcode", () => ({ default: { toDataURL: qrToDataUrl } }));

import { ProposalPreview } from "./proposal-preview";
import { BRAND_MEDIA } from "@/config/brand-media";

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
  it("renders the issuer in the header, COPSSTEC in the footer and a user-facing QR validation message", async () => {
    const input = {
      ...createInitialQuote(),
      company: "Cliente SST",
      activity: { code: "A0111.11", description: "Cultivo de trigo", risk: "Bajo" as const },
      centers: [{ name: "Matriz", place: "Quito", workers: 35, visits: 2 }],
      sbu: 460,
      signer: "Profesional SST",
      signerRole: "Consultor SST",
    };

    render(<ProposalPreview input={input} issuerLogo="data:image/png;base64,issuer" onClose={vi.fn()} signature="data:image/png;base64,signature" />);

    expect(await screen.findByRole("img", { name: "QR identificativo" })).toHaveAttribute("src", "data:image/png;base64,qr");
    const header = document.querySelector(".sst-iso-header");
    const footer = document.querySelector(".sst-pdf-footer");
    expect(header).not.toBeNull();
    expect(footer).not.toBeNull();
    expect(within(header as HTMLElement).getByRole("img", { name: "Logotipo del emisor" })).toHaveAttribute("src", "data:image/png;base64,issuer");
    expect(within(footer as HTMLElement).getByRole("img", { name: "Logo institucional COPSSTEC" })).toHaveAttribute("src", BRAND_MEDIA.logoLong);
    expect(within(footer as HTMLElement).queryByRole("img", { name: "Logotipo del emisor" })).not.toBeInTheDocument();
    expect(screen.getByText(/^Código de validación: COPS-\d{8}-\d+$/)).toHaveClass("sst-validation-code");
    expect(screen.getByText("Escanea el código QR para validar la autenticidad de este documento.")).toBeInTheDocument();
    expect(screen.queryByText(/SHA-256|abcd/)).not.toBeInTheDocument();
    await waitFor(() => expect(crypto.subtle.digest).toHaveBeenCalledWith("SHA-256", expect.anything()));
    expect(qrToDataUrl).toHaveBeenCalledWith(expect.stringContaining("Cliente SST"), expect.objectContaining({ width: 180, errorCorrectionLevel: "M" }));

    fireEvent.click(screen.getByRole("button", { name: "Guardar PDF / Imprimir" }));
    expect(window.print).toHaveBeenCalledOnce();
  });

  it("keeps the institutional footer logo when the issuer has no logo", () => {
    const input = { ...createInitialQuote(), company: "Cliente SST", signer: "Profesional SST" };

    render(<ProposalPreview input={input} issuerLogo="" onClose={vi.fn()} signature="data:image/png;base64,signature" />);

    expect(document.querySelector(".sst-iso-header img")).not.toBeInTheDocument();
    expect(within(document.querySelector(".sst-iso-header") as HTMLElement).getByText("Propuesta emitida por el profesional o proveedor")).toBeInTheDocument();
    expect(within(document.querySelector(".sst-pdf-footer") as HTMLElement).getByRole("img", { name: "Logo institucional COPSSTEC" })).toBeInTheDocument();
  });
});
