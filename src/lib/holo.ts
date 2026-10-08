/**
 * Shared "puppet strings" for the holographic face. Anything on the page can make the face talk,
 * gesture or look somewhere; HoloFace reads these every frame.
 */
export type Gesture = "nod" | "shake" | "tilt" | "wink" | "surprise" | "smile" | "lookAround" | "think";

export const holo = {
  /** true while text is being "spoken" — drives the lip flap */
  speaking: false,
  /** current one-shot gesture */
  gesture: null as null | { kind: Gesture; at: number; dur: number },
  /** gaze override in screen space (-1…1), null = follow the pointer / wander */
  look: null as null | { x: number; y: number },
  /** 0…1 — the face is brighter while it's doing something */
  attention: 0,
  /** 0…1 — how far the face has popped forward into the Nabeel.AI pod (written by HoloFace) */
  focus: 0,
};

export function gesture(kind: Gesture, seconds = 1.6) {
  holo.gesture = { kind, at: performance.now(), dur: seconds * 1000 };
}

/* ---- optional voice (off by default; remembered per browser) ---- */
const VOICE_KEY = "holo-voice";
const voiceListeners = new Set<() => void>();
let voiceOn = false;
try {
  voiceOn = typeof localStorage !== "undefined" && localStorage.getItem(VOICE_KEY) === "1";
} catch {}

export const voice = {
  get: () => voiceOn,
  set(on: boolean) {
    voiceOn = on;
    try {
      localStorage.setItem(VOICE_KEY, on ? "1" : "0");
    } catch {}
    if (!on && typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
    voiceListeners.forEach((l) => l());
  },
  subscribe(l: () => void) {
    voiceListeners.add(l);
    return () => voiceListeners.delete(l);
  },
};

/** speak out loud if the visitor turned the voice on; keeps the lips moving while audio plays */
export function speak(text: string) {
  if (!voiceOn || typeof speechSynthesis === "undefined") return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text.replace(/[*_`#>]|https?:\S+/g, "").slice(0, 600));
  u.rate = 1.05;
  u.pitch = 0.95;
  const en = speechSynthesis.getVoices().find((v) => /en[-_](US|GB|CA)/i.test(v.lang) && /male|daniel|alex|google uk english male/i.test(v.name));
  if (en) u.voice = en;
  u.onstart = () => (holo.speaking = true);
  u.onend = u.onerror = () => (holo.speaking = false);
  speechSynthesis.speak(u);
}
