"use client";

import { useEffect, useRef } from "react";
import { handVisible, neural, useNeural } from "@/lib/neural/engine";

/**
 * Turns the tracked hand into a pointer:
 *  ✋ the palm centre aims · ✊ close your hand (fist) to click · 🤏 pinch + move drags the page (with a little fling).
 */
export function HandCursor() {
  const { handStatus } = useNeural();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (handStatus !== "on") return;
    let raf = 0;
    let sx = innerWidth / 2;
    let sy = innerHeight / 2;
    let hovered: Element | null = null;
    // pinch state: a short pinch clicks, a pinch that moves drags the page
    let pinchOn = false;
    let startY = 0;
    let lastY = 0;
    let dragging = false;
    let vel = 0; // fling momentum after release
    let wasFist = false;
    let lastClick = 0;

    const setHover = (el: Element | null) => {
      if (el === hovered) return;
      hovered?.classList.remove("hand-hover");
      hovered = el;
      hovered?.classList.add("hand-hover");
    };
    const click = (x: number, y: number) => {
      const target = document.elementFromPoint(x, y);
      if (!target) return;
      const opts = { bubbles: true, cancelable: true, clientX: x, clientY: y, view: window };
      target.dispatchEvent(new PointerEvent("pointerdown", opts));
      target.dispatchEvent(new MouseEvent("mousedown", opts));
      target.dispatchEvent(new PointerEvent("pointerup", opts));
      target.dispatchEvent(new MouseEvent("mouseup", opts));
      target.dispatchEvent(new MouseEvent("click", opts));
      (target.closest("input,textarea") as HTMLElement | null)?.focus();
    };

    const tick = () => {
      raf = requestAnimationFrame(tick);
      const el = ref.current;
      if (!el) return;
      if (!handVisible()) {
        el.style.opacity = "0";
        neural.cursor.active = false;
        pinchOn = dragging = false;
        setHover(null);
        return;
      }
      const h = neural.hand;
      // aim with the palm centre — it stays put whether you pinch or close your hand
      const map = (v: number, a: number, b: number) => Math.max(0, Math.min(1, (v - a) / (b - a)));
      const ax = (h[0] + h[5 * 3] + h[9 * 3] + h[13 * 3] + h[17 * 3]) / 5;
      const ay = (h[1] + h[5 * 3 + 1] + h[9 * 3 + 1] + h[13 * 3 + 1] + h[17 * 3 + 1]) / 5;
      const tx = map(1 - ax, 0.18, 0.82) * innerWidth;
      const ty = map(ay, 0.15, 0.75) * innerHeight;
      const g = neural.gesture;
      const pinch = g === "pinch";
      // steadier while pinching so a click lands where you aimed
      const fist = g === "fist";
      const k = (pinch && !dragging) || fist ? 0.15 : 0.35;
      sx += (tx - sx) * k;
      sy += (ty - sy) * k;
      neural.cursor.x = sx;
      neural.cursor.y = sy;
      neural.cursor.active = true;
      neural.cursor.pinch = pinch;

      el.style.opacity = "1";
      el.style.transform = `translate3d(${sx}px, ${sy}px, 0)`;
      el.dataset.g = dragging ? "drag" : fist ? "pinch" : g;

      if (!dragging) {
        const target = document.elementFromPoint(sx, sy);
        setHover(target?.closest("a,button,[role=button],input,textarea,summary,[data-hand]") ?? null);
      }

      const now = performance.now();
      // ✊ closing the hand clicks where you're aiming
      if (fist && !wasFist && !pinchOn && now - lastClick > 700) {
        lastClick = now;
        click(sx, sy);
      }
      wasFist = fist;
      if (pinch && !pinchOn) {
        // pinch starts
        pinchOn = true;
        startY = sy;
        lastY = ty;
        dragging = false;
        vel = 0;
      } else if (pinch && pinchOn) {
        // pinch held: past a small threshold it becomes a drag — like a finger on a touchscreen
        if (!dragging && Math.abs(ty - startY) > 28) dragging = true;
        if (dragging) {
          const dy = (lastY - ty) * 2.4;
          window.scrollBy(0, dy);
          vel = vel * 0.6 + dy * 0.4;
        }
        lastY = ty;
      } else if (!pinch && pinchOn) {
        // pinch released (pinch is for scrolling only — clicks are the fist)
        pinchOn = false;
        dragging = false;
      } else if (Math.abs(vel) > 0.5) {
        window.scrollBy(0, vel);
        vel *= 0.9;
      }
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      setHover(null);
      neural.cursor.active = false;
    };
  }, [handStatus]);

  if (handStatus !== "on") return null;
  return (
    <div
      ref={ref}
      aria-hidden
      className="hand-cursor pointer-events-none fixed left-0 top-0 z-[100] opacity-0 transition-opacity"
    >
      <div className="hand-cursor-ring" />
    </div>
  );
}
