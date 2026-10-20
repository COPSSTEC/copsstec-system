"use client";

import { useEffect, useRef } from "react";

export function SignaturePad({ onChange, clearSignal }: { onChange: (data: string) => void; clearSignal: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height); onChange("");
  }, [clearSignal, onChange]);

  function point(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = event.currentTarget; const rect = canvas.getBoundingClientRect();
    return { x: (event.clientX - rect.left) * canvas.width / rect.width, y: (event.clientY - rect.top) * canvas.height / rect.height };
  }
  function down(event: React.PointerEvent<HTMLCanvasElement>) {
    event.preventDefault(); const canvas = event.currentTarget; canvas.setPointerCapture(event.pointerId); drawing.current = true;
    const context = canvas.getContext("2d"); const p = point(event); if (!context) return;
    context.strokeStyle = "#153e55"; context.lineWidth = 3.5; context.lineCap = "round"; context.lineJoin = "round";
    context.beginPath(); context.moveTo(p.x, p.y); context.lineTo(p.x + 0.2, p.y + 0.2); context.stroke(); onChange(canvas.toDataURL("image/png"));
  }
  function move(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return; event.preventDefault(); const context = event.currentTarget.getContext("2d"); const p = point(event); if (!context) return;
    context.lineTo(p.x, p.y); context.stroke(); onChange(event.currentTarget.toDataURL("image/png"));
  }
  return <canvas aria-label="Área para dibujar la firma" className="sst-signature-pad" height={230} onPointerCancel={() => { drawing.current = false; }} onPointerDown={down} onPointerMove={move} onPointerUp={() => { drawing.current = false; }} ref={canvasRef} width={660} />;
}
