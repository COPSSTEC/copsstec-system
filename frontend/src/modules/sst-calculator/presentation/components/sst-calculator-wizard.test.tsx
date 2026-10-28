// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { CiiuActivity } from "../../domain/types";
import { SstCalculatorWizard } from "./sst-calculator-wizard";

vi.mock("./signature-pad", () => ({ SignaturePad: () => <canvas aria-label="Área para dibujar la firma" /> }));
vi.mock("./proposal-preview", () => ({ ProposalPreview: () => <div>proposal preview</div> }));

const catalog: CiiuActivity[] = [{ code: "A0111.11", description: "Cultivo de trigo", risk: "Bajo" }];

beforeEach(() => {
  window.scrollTo = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function next(): void {
  fireEvent.click(screen.getByRole("button", { name: "Siguiente →" }));
}

function completeFirstStep(): void {
  fireEvent.change(screen.getByLabelText("Empresa / cliente"), { target: { value: "Cliente SST" } });
  fireEvent.click(screen.getByRole("button", { name: /A0111\.11 · Riesgo Bajo/ }));
  fireEvent.change(screen.getByLabelText("Nombre o identificación"), { target: { value: "Matriz" } });
  fireEvent.change(screen.getByLabelText("Ciudad / provincia / dirección"), { target: { value: "Quito" } });
}

function reachResultStep(): void {
  completeFirstStep();
  next();
  expect(screen.getByRole("heading", { name: "Exigencia normativa" })).toBeInTheDocument();
  next();
  expect(screen.getByRole("heading", { name: "Equipo técnico" })).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Base mensual décimo cuarto (USD)"), { target: { value: "460" } });
  next();
  expect(screen.getByRole("heading", { name: "Visitas y servicios" })).toBeInTheDocument();
  next();
  expect(screen.getByRole("heading", { name: "Negociación y contrato" })).toBeInTheDocument();
  next();
  expect(screen.getByRole("heading", { name: "Resultado y propuesta" })).toBeInTheDocument();
}

describe("SstCalculatorWizard", () => {
  it("blocks an incomplete first step and navigates the essential six-stage flow", () => {
    render(<SstCalculatorWizard catalog={catalog} />);

    next();
    expect(screen.getByRole("alert")).toHaveTextContent("Ingresa la empresa o cliente.");
    expect(screen.getByRole("heading", { name: "Empresa y actividad" })).toBeInTheDocument();

    completeFirstStep();
    next();
    next();
    next();
    expect(screen.getByRole("alert")).toHaveTextContent("Ingresa salarios positivos y la base vigente para el décimo cuarto.");
    expect(screen.getByRole("heading", { name: "Equipo técnico" })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Base mensual décimo cuarto (USD)"), { target: { value: "460" } });
    next();
    next();
    next();
    expect(screen.getByRole("heading", { name: "Resultado y propuesta" })).toBeInTheDocument();
    expect(screen.getByText("6", { selector: ".sst-step-count" })).toBeInTheDocument();
  });

  it("rejects unsupported and oversized signature files in the result flow", () => {
    render(<SstCalculatorWizard catalog={catalog} />);
    reachResultStep();
    const signatureInput = screen.getByLabelText("Firma autorizada (PNG, JPEG o WebP)");

    fireEvent.change(signatureInput, { target: { files: [new File(["text"], "signature.txt", { type: "text/plain" })] } });
    expect(screen.getByRole("alert")).toHaveTextContent("Formato de archivo de firma no admitido");

    const oversized = new File(["x"], "signature.png", { type: "image/png" });
    Object.defineProperty(oversized, "size", { value: 1_500_001 });
    fireEvent.change(signatureInput, { target: { files: [oversized] } });
    expect(screen.getByRole("alert")).toHaveTextContent("El archivo de firma debe pesar máximo 1,5 MB.");
  });

  it("renders the complete CIIU description in a selectable result", () => {
    const description = `Servicios especializados ${"con descripción completa ".repeat(30)}sin truncamiento`;

    render(<SstCalculatorWizard catalog={[{ code: "M7490.01", description, risk: "Medio" }]} />);

    expect(screen.getByText(description)).toHaveClass("sst-ciiu-description");
  });
});
