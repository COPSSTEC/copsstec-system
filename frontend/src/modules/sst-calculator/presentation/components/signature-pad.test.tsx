// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SignaturePad } from "./signature-pad";

const canvasContext = {
  beginPath: vi.fn(),
  clearRect: vi.fn(),
  lineCap: "",
  lineJoin: "",
  lineTo: vi.fn(),
  lineWidth: 0,
  moveTo: vi.fn(),
  stroke: vi.fn(),
  strokeStyle: "",
};

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(canvasContext as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue("data:image/png;base64,signature");
  Object.defineProperty(HTMLCanvasElement.prototype, "setPointerCapture", { configurable: true, value: vi.fn() });
  vi.spyOn(HTMLCanvasElement.prototype, "getBoundingClientRect").mockReturnValue({
    bottom: 130, height: 130, left: 0, right: 660, top: 0, width: 660, x: 0, y: 0, toJSON: () => ({}),
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  Object.values(canvasContext).forEach((value) => typeof value === "function" && value.mockClear());
});

describe("SignaturePad", () => {
  it("captures pointer drawing and clears when clearSignal changes", () => {
    const onChange = vi.fn();
    const { rerender } = render(<SignaturePad clearSignal={0} onChange={onChange} />);
    const canvas = screen.getByLabelText("Área para dibujar la firma");

    onChange.mockClear();
    fireEvent.pointerDown(canvas, { clientX: 20, clientY: 30, pointerId: 1 });
    fireEvent.pointerMove(canvas, { clientX: 40, clientY: 50, pointerId: 1 });
    fireEvent.pointerUp(canvas, { pointerId: 1 });
    expect(onChange).toHaveBeenCalledWith("data:image/png;base64,signature");
    expect(canvasContext.stroke).toHaveBeenCalled();

    onChange.mockClear();
    canvasContext.clearRect.mockClear();
    rerender(<SignaturePad clearSignal={1} onChange={onChange} />);
    expect(canvasContext.clearRect).toHaveBeenCalledWith(0, 0, 660, 230);
    expect(onChange).toHaveBeenCalledWith("");
  });
});
