"use client";

/**
 * NEURAL LINK engine — one shared, opt-in camera tracker for the whole site.
 * Everything runs in the visitor's browser (MediaPipe Tasks, WebAssembly + GPU).
 * No frame ever leaves the device.
 *
 * Consumers read the mutable `neural` object inside their own animation loops
 * (no React re-render per frame). React components that only need status use
 * `useNeural()`.
 */
import { useSyncExternalStore } from "react";

const VERSION = "1.0.1"; // must match @mediapipe/tasks-vision in package.json
const WASM = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VERSION}/wasm`;
const FACE_MODEL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
const HAND_MODEL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

export type LinkStatus = "off" | "loading" | "on" | "error";
type Conn = { start: number; end: number }[];

export type Gesture = "none" | "point" | "pinch" | "fist" | "open";

export const neural = {
  status: "off" as LinkStatus,
  error: null as string | null,
  handStatus: "off" as LinkStatus,

  video: null as HTMLVideoElement | null,
  vw: 640,
  vh: 480,

  /** normalised image-space landmarks, 478 × (x,y,z) */
  face: new Float32Array(478 * 3),
  faceAt: 0,
  blend: {} as Record<string, number>,

  /** 21 × (x,y,z) normalised */
  hand: new Float32Array(21 * 3),
  handAt: 0,
  gesture: "none" as Gesture,

  /** virtual pointer driven by the hand (viewport px) */
  cursor: { x: 0, y: 0, active: false, pinch: false },

  fps: 0,
  connections: null as null | {
    oval: Conn;
    lips: Conn;
    leftEye: Conn;
    rightEye: Conn;
    leftIris: Conn;
    rightIris: Conn;
    leftBrow: Conn;
    rightBrow: Conn;
    hand: Conn;
  },
};

/* ---------------- status subscription for React ---------------- */
const listeners = new Set<() => void>();
let snap = { status: neural.status, error: neural.error, handStatus: neural.handStatus };
function emit() {
  snap = { status: neural.status, error: neural.error, handStatus: neural.handStatus };
  listeners.forEach((l) => l());
}
function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}
const serverSnap = { status: "off" as LinkStatus, error: null as string | null, handStatus: "off" as LinkStatus };
export function useNeural() {
  return useSyncExternalStore(subscribe, () => snap, () => serverSnap);
}

/* ---------------- engine ---------------- */
type Landmarker = {
  detectForVideo: (v: HTMLVideoElement, t: number) => unknown;
  close: () => void;
};

let faceLm: Landmarker | null = null;
let handLm: Landmarker | null = null;
let stream: MediaStream | null = null;
let running = false;
let rafId = 0;
let vfcId = 0;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let vision: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let fileset: any = null;

async function loadVision() {
  if (!vision) vision = await import("@mediapipe/tasks-vision");
  if (!fileset) fileset = await vision.FilesetResolver.forVisionTasks(WASM);
  return vision;
}

async function createWithFallback<T>(make: (delegate: "GPU" | "CPU") => Promise<T>): Promise<T> {
  try {
    return await make("GPU");
  } catch {
    return await make("CPU");
  }
}

export async function startLink() {
  if (neural.status === "on" || neural.status === "loading") return;
  neural.status = "loading";
  neural.error = null;
  emit();
  try {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error("no-camera-api");
    // Ask for the camera first so the permission prompt appears immediately.
    stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user", frameRate: { ideal: 30, max: 30 } },
      audio: false,
    });
    const v = await loadVision();
    faceLm = await createWithFallback((delegate) =>
      v.FaceLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: FACE_MODEL, delegate },
        runningMode: "VIDEO",
        numFaces: 1,
        outputFaceBlendshapes: true,
      }),
    );
    const FL = v.FaceLandmarker;
    neural.connections = {
      oval: FL.FACE_LANDMARKS_FACE_OVAL,
      lips: FL.FACE_LANDMARKS_LIPS,
      leftEye: FL.FACE_LANDMARKS_LEFT_EYE,
      rightEye: FL.FACE_LANDMARKS_RIGHT_EYE,
      leftIris: FL.FACE_LANDMARKS_LEFT_IRIS,
      rightIris: FL.FACE_LANDMARKS_RIGHT_IRIS,
      leftBrow: FL.FACE_LANDMARKS_LEFT_EYEBROW,
      rightBrow: FL.FACE_LANDMARKS_RIGHT_EYEBROW,
      hand: v.HandLandmarker.HAND_CONNECTIONS,
    };

    const video = document.createElement("video");
    video.srcObject = stream;
    video.muted = true;
    video.playsInline = true;
    await video.play();
    neural.video = video;
    neural.vw = video.videoWidth || 640;
    neural.vh = video.videoHeight || 480;

    running = true;
    neural.status = "on";
    emit();
    loop();
    // hand control comes on together with face tracking
    void setHandControl(true);
  } catch (e) {
    stopLink(false);
    const name = e instanceof Error ? e.name : "";
    neural.status = "error";
    neural.error =
      name === "NotAllowedError"
        ? "Camera permission was denied."
        : name === "NotFoundError"
          ? "No camera found on this device."
          : "Couldn't start the neural link on this device.";
    emit();
  }
}

export function stopLink(notify = true) {
  running = false;
  cancelAnimationFrame(rafId);
  const v = neural.video as (HTMLVideoElement & { cancelVideoFrameCallback?: (id: number) => void }) | null;
  if (v && vfcId && v.cancelVideoFrameCallback) v.cancelVideoFrameCallback(vfcId);
  stream?.getTracks().forEach((t) => t.stop());
  stream = null;
  faceLm?.close();
  handLm?.close();
  faceLm = null;
  handLm = null;
  neural.video = null;
  neural.faceAt = 0;
  neural.handAt = 0;
  neural.cursor.active = false;
  neural.handStatus = "off";
  neural.gesture = "none";
  if (notify) {
    neural.status = "off";
    emit();
  }
}

export async function setHandControl(on: boolean) {
  if (!on) {
    handLm?.close();
    handLm = null;
    neural.handStatus = "off";
    neural.cursor.active = false;
    neural.gesture = "none";
    emit();
    return;
  }
  if (neural.status !== "on" || neural.handStatus === "loading" || neural.handStatus === "on") return;
  neural.handStatus = "loading";
  emit();
  try {
    const v = await loadVision();
    handLm = await createWithFallback((delegate) =>
      v.HandLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: HAND_MODEL, delegate },
        runningMode: "VIDEO",
        numHands: 1,
      }),
    );
    neural.handStatus = "on";
  } catch {
    neural.handStatus = "error";
  }
  emit();
}

/* ---------------- per-frame processing ---------------- */
let frame = 0;
let lastTs = 0;
let fpsAcc = 0;
let fpsN = 0;
let lastProcessed = -1;

function loop() {
  if (!running || !neural.video) return;
  const v = neural.video as HTMLVideoElement & {
    requestVideoFrameCallback?: (cb: () => void) => number;
  };
  const next = () => {
    if (!running) return;
    process();
    if (v.requestVideoFrameCallback) vfcId = v.requestVideoFrameCallback(next);
    else rafId = requestAnimationFrame(next);
  };
  if (v.requestVideoFrameCallback) vfcId = v.requestVideoFrameCallback(next);
  else rafId = requestAnimationFrame(next);
}

function process() {
  const v = neural.video;
  if (!v || v.readyState < 2) return;
  if (document.hidden) return;
  if (v.currentTime === lastProcessed) return;
  lastProcessed = v.currentTime;
  const now = performance.now();
  frame++;

  // Face every frame; hand on alternate frames to keep it light.
  if (faceLm) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = faceLm.detectForVideo(v, now) as any;
    const lm = r?.faceLandmarks?.[0];
    if (lm && lm.length >= 478) {
      const f = neural.face;
      for (let i = 0; i < 478; i++) {
        f[i * 3] = lm[i].x;
        f[i * 3 + 1] = lm[i].y;
        f[i * 3 + 2] = lm[i].z;
      }
      neural.faceAt = now;
      const cats = r.faceBlendshapes?.[0]?.categories;
      if (cats) for (const c of cats) neural.blend[c.categoryName] = c.score;
    }
  }
  if (handLm && frame % 2 === 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = handLm.detectForVideo(v, now + 0.5) as any;
    const lm = r?.landmarks?.[0];
    if (lm) {
      const h = neural.hand;
      for (let i = 0; i < 21; i++) {
        h[i * 3] = lm[i].x;
        h[i * 3 + 1] = lm[i].y;
        h[i * 3 + 2] = lm[i].z;
      }
      neural.handAt = now;
      neural.gesture = classify(h);
    } else if (now - neural.handAt > 300) {
      neural.gesture = "none";
    }
  }

  if (lastTs) {
    fpsAcc += 1000 / (now - lastTs);
    fpsN++;
    if (fpsN >= 15) {
      neural.fps = Math.round(fpsAcc / fpsN);
      fpsAcc = 0;
      fpsN = 0;
    }
  }
  lastTs = now;
}

/* ---------------- gestures ---------------- */
const d = (h: Float32Array, a: number, b: number) =>
  Math.hypot(h[a * 3] - h[b * 3], h[a * 3 + 1] - h[b * 3 + 1]);

let pinched = false;
function classify(h: Float32Array): Gesture {
  const scale = d(h, 0, 9) || 1e-3; // wrist → middle knuckle
  const pinch = d(h, 4, 8) / scale;
  // hysteresis: close below 0.3, open above 0.45 — no flicker mid-drag
  pinched = pinched ? pinch < 0.45 : pinch < 0.3;
  // finger extended if tip is further from wrist than its PIP joint
  const ext = (tip: number, pip: number) => d(h, 0, tip) > d(h, 0, pip) * 1.1;
  const index = ext(8, 6), middle = ext(12, 10), ring = ext(16, 14), pinky = ext(20, 18);
  if (pinched) return "pinch";
  if (!index && !middle && !ring && !pinky) return "fist";
  if (index && !middle && !ring && !pinky) return "point";
  if (index && middle && ring && pinky) return "open";
  return "point";
}

export function faceVisible(maxAgeMs = 700) {
  return neural.status === "on" && performance.now() - neural.faceAt < maxAgeMs;
}
export function handVisible(maxAgeMs = 700) {
  return neural.handStatus === "on" && performance.now() - neural.handAt < maxAgeMs;
}

/** Rough head turn in -1..1 (mirrored, like a selfie). Cheap — for steering scenes. */
export function headTurn() {
  const f = neural.face;
  const lx = f[234 * 3], rx = f[454 * 3], nx = f[1 * 3];
  const ty = f[10 * 3 + 1], by = f[152 * 3 + 1], ny = f[1 * 3 + 1];
  const x = -((nx - lx) / ((rx - lx) || 1) - 0.5) * 2.2;
  const y = ((ny - ty) / ((by - ty) || 1) - 0.55) * 2.2;
  return { x: Math.max(-1, Math.min(1, x)), y: Math.max(-1, Math.min(1, y)) };
}
