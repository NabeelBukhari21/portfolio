"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { faceVisible, handVisible, neural, setHandControl, stopLink, useNeural } from "@/lib/neural/engine";

type Readout = {
  face: boolean;
  hand: boolean;
  yaw: number;
  pitch: number;
  eyeL: number;
  eyeR: number;
  jaw: number;
  smile: number;
  brow: number;
  lookX: number;
  lookY: number;
  gesture: string;
  fps: number;
};

const EMPTY: Readout = { face: false, hand: false, yaw: 0, pitch: 0, eyeL: 1, eyeR: 1, jaw: 0, smile: 0, brow: 0, lookX: 0, lookY: 0, gesture: "none", fps: 0 };

function Bar({ label, value, tone = "cyan" }: { label: string; value: number; tone?: "cyan" | "pink" | "volt" }) {
  const c = tone === "cyan" ? "bg-cyan" : tone === "pink" ? "bg-pink" : "bg-volt";
  return (
    <div className="flex items-center gap-2">
      <span className="w-12 shrink-0 text-dim">{label}</span>
      <div className="h-1.5 flex-1 bg-panel-2">
        <div className={`h-full ${c} transition-[width] duration-100`} style={{ width: `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%` }} />
      </div>
      <span className="w-8 text-right tabular-nums">{Math.round(value * 100)}</span>
    </div>
  );
}

const GESTURE_LABEL: Record<string, string> = {
  none: "—",
  point: "👆 aiming",
  pinch: "🤏 scroll grip",
  fist: "✊ click",
  open: "✋ idle",
};

export function NeuralHUD() {
  const { status, error, handStatus } = useNeural();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [r, setR] = useState<Readout>(EMPTY);
  // start collapsed on phones so the panel never covers the page
  const [min, setMin] = useState(() => typeof window !== "undefined" && window.innerWidth < 640);

  // Live feed + overlay at ~20fps
  useEffect(() => {
    if (status !== "on" || min) return;
    let raf = 0;
    let last = 0;
    const draw = (t: number) => {
      raf = requestAnimationFrame(draw);
      if (t - last < 50) return;
      last = t;
      const cv = canvasRef.current;
      const v = neural.video;
      if (!cv || !v) return;
      const ctx = cv.getContext("2d");
      if (!ctx) return;
      const W = cv.width, H = cv.height;
      ctx.save();
      ctx.translate(W, 0);
      ctx.scale(-1, 1); // mirror like a selfie
      ctx.filter = "grayscale(0.6) contrast(1.1) brightness(0.7)";
      ctx.drawImage(v, 0, 0, W, H);
      ctx.filter = "none";
      const C = neural.connections;
      const f = neural.face;
      const line = (conn: { start: number; end: number }[] | undefined, color: string, w = 1) => {
        if (!conn) return;
        ctx.strokeStyle = color;
        ctx.lineWidth = w;
        ctx.beginPath();
        for (const { start, end } of conn) {
          ctx.moveTo(f[start * 3] * W, f[start * 3 + 1] * H);
          ctx.lineTo(f[end * 3] * W, f[end * 3 + 1] * H);
        }
        ctx.stroke();
      };
      if (faceVisible()) {
        ctx.fillStyle = "rgba(0,240,255,0.55)";
        for (let i = 0; i < 468; i += 2) ctx.fillRect(f[i * 3] * W - 0.6, f[i * 3 + 1] * H - 0.6, 1.2, 1.2);
        line(C?.oval, "rgba(0,240,255,0.7)");
        line(C?.leftEye, "#ff2bd6", 1.4);
        line(C?.rightEye, "#ff2bd6", 1.4);
        line(C?.leftBrow, "rgba(255,43,214,0.7)");
        line(C?.rightBrow, "rgba(255,43,214,0.7)");
        line(C?.lips, "#f2ff3c", 1.4);
        line(C?.leftIris, "#3dff9a", 1.6);
        line(C?.rightIris, "#3dff9a", 1.6);
      }
      if (handVisible() && C?.hand) {
        const h = neural.hand;
        ctx.strokeStyle = "#3dff9a";
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        for (const { start, end } of C.hand) {
          ctx.moveTo(h[start * 3] * W, h[start * 3 + 1] * H);
          ctx.lineTo(h[end * 3] * W, h[end * 3 + 1] * H);
        }
        ctx.stroke();
        ctx.fillStyle = "#f2ff3c";
        for (const i of [4, 8]) {
          ctx.beginPath();
          ctx.arc(h[i * 3] * W, h[i * 3 + 1] * H, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
      // scanline
      const y = ((t / 12) % H) | 0;
      ctx.fillStyle = "rgba(0,240,255,0.08)";
      ctx.fillRect(0, y, W, 2);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [status, min]);

  // Numeric readouts at 10fps (cheap React updates)
  useEffect(() => {
    if (status !== "on") return;
    const id = setInterval(() => {
      const b = neural.blend;
      const f = neural.face;
      // head yaw/pitch estimate from nose vs face edges (display only)
      const nx = f[1 * 3], lx = f[234 * 3], rx = f[454 * 3];
      const ny = f[1 * 3 + 1], ty = f[10 * 3 + 1], by = f[152 * 3 + 1];
      const yaw = ((nx - lx) / ((rx - lx) || 1) - 0.5) * -120;
      const pitch = ((ny - ty) / ((by - ty) || 1) - 0.55) * -110;
      setR({
        face: faceVisible(),
        hand: handVisible(),
        yaw,
        pitch,
        eyeL: 1 - (b.eyeBlinkRight ?? 0), // mirrored
        eyeR: 1 - (b.eyeBlinkLeft ?? 0),
        jaw: b.jawOpen ?? 0,
        smile: ((b.mouthSmileLeft ?? 0) + (b.mouthSmileRight ?? 0)) / 2,
        brow: b.browInnerUp ?? 0,
        lookX: (b.eyeLookOutRight ?? 0) - (b.eyeLookInRight ?? 0),
        lookY: (b.eyeLookUpRight ?? 0) - (b.eyeLookDownRight ?? 0),
        gesture: neural.gesture,
        fps: neural.fps,
      });
    }, 100);
    return () => clearInterval(id);
  }, [status]);

  const show = status === "on" || status === "loading" || status === "error";

  return (
    <AnimatePresence>
      {show && (
        <motion.aside
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-3 left-3 z-[75] w-[min(80vw,270px)] sm:left-auto sm:right-3 print:hidden"
          aria-label="Neural link tracking panel"
        >
          <div className="cut panel font-mono text-[10.5px] shadow-[0_0_40px_-10px_rgba(0,240,255,0.6)]">
          <div className="flex items-center justify-between border-b border-line px-3 py-1.5">
            <span>
              NEURAL LINK{" "}
              <span className={status === "on" ? "text-ok" : status === "error" ? "text-pink" : "text-volt"}>
                ● {status === "on" ? (r.face ? "TRACKING" : "SEARCHING") : status.toUpperCase()}
              </span>
            </span>
            <span className="flex gap-2">
              {status === "on" && (
                <button onClick={() => setMin((m) => !m)} className="text-dim hover:text-cyan" aria-label={min ? "Expand panel" : "Minimise panel"}>
                  {min ? "▢" : "–"}
                </button>
              )}
              <button onClick={() => stopLink()} className="text-pink hover:underline" aria-label="Disconnect neural link">
                ✕
              </button>
            </span>
          </div>

          {status === "loading" && <div className="p-3 text-dim">Booting on-device vision models… allow camera access when asked.</div>}
          {status === "error" && <div className="p-3 text-pink">{error}</div>}

          {status === "on" && !min && (
            <div className="space-y-2 p-2.5">
              <div className="relative">
                <canvas ref={canvasRef} width={320} height={240} className="block w-full border border-line bg-void" />
                <div className="pointer-events-none absolute left-1 top-1 bg-void/70 px-1 text-[9px] text-cyan">LIVE · {r.fps} FPS · ON-DEVICE</div>
                <div className="pointer-events-none absolute bottom-1 right-1 flex gap-1 text-[9px]">
                  <span className="bg-void/70 px-1 text-cyan">face</span>
                  <span className="bg-void/70 px-1 text-pink">eyes</span>
                  <span className="bg-void/70 px-1 text-volt">mouth</span>
                  <span className="bg-void/70 px-1 text-ok">iris/hand</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-3 text-[10px]">
                <div>
                  HEAD yaw <span className="text-cyan tabular-nums">{r.face ? Math.round(r.yaw) : "--"}°</span>
                </div>
                <div>
                  pitch <span className="text-cyan tabular-nums">{r.face ? Math.round(r.pitch) : "--"}°</span>
                </div>
              </div>
              <div className="space-y-1">
                <Bar label="eye L" value={r.eyeL} tone="pink" />
                <Bar label="eye R" value={r.eyeR} tone="pink" />
                <Bar label="mouth" value={r.jaw} tone="volt" />
                <Bar label="smile" value={r.smile} tone="volt" />
                <Bar label="brows" value={r.brow} />
              </div>

              <div className="border-t border-line pt-2">
                <div className="flex items-center justify-between">
                  <span>
                    HAND CONTROL{" "}
                    <span className={handStatus === "on" ? "text-ok" : handStatus === "loading" ? "text-volt" : "text-dim"}>
                      {handStatus === "on" ? (r.hand ? GESTURE_LABEL[r.gesture] : "show your hand") : handStatus}
                    </span>
                  </span>
                  <button
                    onClick={() => setHandControl(handStatus !== "on")}
                    disabled={handStatus === "loading"}
                    className={`border px-1.5 py-0.5 ${handStatus === "on" ? "border-pink text-pink" : "border-cyan text-cyan"} disabled:opacity-50`}
                  >
                    {handStatus === "on" ? "off" : handStatus === "loading" ? "…" : "on"}
                  </button>
                </div>
                {handStatus === "on" && (
                  <p className="mt-1 leading-relaxed text-dim">✋ your palm aims · ✊ close your hand to click · 🤏 pinch + move up/down to scroll</p>
                )}
              </div>
              <p className="leading-relaxed text-dim/80">Processed 100% on your device. Nothing is recorded or uploaded.</p>
            </div>
          )}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
