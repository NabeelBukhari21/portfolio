"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { faceVisible, neural } from "@/lib/neural/engine";
import { stage } from "@/lib/stage";
import { holo } from "@/lib/holo";
import { fitSimilarity, toMetric, unproject, type Similarity } from "@/lib/neural/rig";

/**
 * 3D holographic head built from a scan of Nabeel's photo: 478-point face mesh + a hair cap grown
 * over the head (extra vertices after 478), wearing a neon cyber visor.
 * Idle: follows the mouse, blinks, eyes track the pointer.
 * Neural link on: mirrors the visitor — head pose, blinks, gaze, mouth, brows.
 * background: renders as a fixed full-screen layer behind the whole page — sits on the right of
 * the hero, then glides to the centre, dims and keeps turning as you scroll.
 */

type FaceData = { base: number[]; canon: number[]; uv: number[]; tris: number[]; mirror: number[] };

// upper/lower eyelid pairs (MediaPipe topology)
const LIDS: [number, number][] = [
  [246, 7], [161, 163], [160, 144], [159, 145], [158, 153], [157, 154], [173, 155],
  [466, 249], [388, 390], [387, 373], [386, 374], [385, 380], [384, 381], [398, 382],
];
const IRIS = [
  { c: 468, ring: [469, 470, 471, 472], up: 159, lo: 145 },
  { c: 473, ring: [474, 475, 476, 477], up: 386, lo: 374 },
];

const noopSubscribe = () => () => {};

type HairStyle = "anime" | "photo" | "slick" | "crop" | "neon" | "wire";
const DEFAULT_HAIR: HairStyle = "anime";

export type HoloStatus = "loading" | "ready" | "unsupported";

export function HoloFace({
  className = "",
  onStatus,
  background = false,
}: {
  className?: string;
  onStatus?: (s: HoloStatus) => void;
  background?: boolean;
}) {
  const host = useRef<HTMLDivElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<HoloStatus>("loading");
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);

  useEffect(() => {
    onStatus?.(status);
  }, [status, onStatus]);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const wrapEl = wrap.current;
    let disposed = false;
    let cleanup = () => {};

    (async () => {
      // WebGL support check
      const test = document.createElement("canvas");
      if (!(test.getContext("webgl2") || test.getContext("webgl"))) {
        setStatus("unsupported");
        return;
      }
      const [THREE, data] = await Promise.all([
        import("three"),
        fetch("/face/face.json").then((r) => r.json() as Promise<FaceData>),
      ]);
      if (disposed) return;

      const small = matchMedia("(max-width: 768px)").matches;
      const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
      const N = 478; // tracked landmarks
      const base = new Float32Array(data.base);
      const NV = base.length / 3; // + hair-cap vertices
      const canon = new Float32Array(data.canon);

      // hairstyle (preview others with ?hair=anime|photo|slick|crop|neon|wire)
      const HAIR = (new URLSearchParams(location.search).get("hair") ?? DEFAULT_HAIR) as HairStyle;
      // flatter cap for the sleeker cuts
      const squash = HAIR === "crop" ? 0.58 : HAIR === "slick" ? 0.78 : 1;
      if (squash !== 1) {
        const y10 = base[10 * 3 + 1];
        for (let i = N; i < NV; i++) {
          const dy = base[i * 3 + 1] - y10;
          if (dy > 0) base[i * 3 + 1] = y10 + dy * squash;
          base[i * 3] *= 1 - (1 - squash) * 0.25 * Math.min(1, Math.max(0, dy / 6));
        }
      }

      // centre the whole head (face + hair) on its bounding box
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, cz = 0;
      for (let i = 0; i < NV; i++) {
        minX = Math.min(minX, base[i * 3]); maxX = Math.max(maxX, base[i * 3]);
        minY = Math.min(minY, base[i * 3 + 1]); maxY = Math.max(maxY, base[i * 3 + 1]);
      }
      for (let i = 0; i < 468; i++) cz += base[i * 3 + 2] / 468;
      const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
      for (let i = 0; i < NV; i++) { base[i * 3] -= cx; base[i * 3 + 1] -= cy; base[i * 3 + 2] -= cz; }
      const faceH = maxY - minY;
      // 0 on the face, rising 0 → 1 up the hair (used to fade the top of the scan out)
      const capT = new Float32Array(NV);
      const yBrow = base[10 * 3 + 1];
      for (let i = N; i < NV; i++) capT[i] = Math.max(0, Math.min(1, (base[i * 3 + 1] - yBrow) / (maxY - cy - yBrow)));

      /* ---------- expression rig (talking, smiling, brows) — soft weights around landmarks ---------- */
      const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
      const bx = (i: number) => base[i * 3], by = (i: number) => base[i * 3 + 1];
      const yLip = (by(13) + by(14)) / 2;
      const mCx = (bx(61) + bx(291)) / 2;
      const mHalf = Math.abs(bx(61) - bx(291)) / 2 || 1;
      const lipGap = Math.abs(by(13) - by(14)) + faceH * 0.012;
      const BROW = [70, 63, 105, 66, 107, 336, 296, 334, 293, 300];
      const jawW = new Float32Array(N), smileW = new Float32Array(N), smileSide = new Float32Array(N), browW = new Float32Array(N);
      for (let i = 0; i < 468; i++) {
        const x = bx(i), y = by(i);
        if (y < yLip) jawW[i] = clamp01((yLip - y) / lipGap) * clamp01(1 - (Math.abs(x - mCx) - mHalf * 1.1) / (mHalf * 1.4));
        for (const c of [61, 291]) {
          const d = Math.hypot(x - bx(c), y - by(c)) / (mHalf * 0.55);
          smileW[i] = Math.max(smileW[i], Math.exp(-d * d));
        }
        smileSide[i] = Math.sign(x - mCx);
        let db = Infinity;
        for (const c of BROW) db = Math.min(db, Math.hypot(x - bx(c), y - by(c)));
        db /= mHalf * 0.55;
        browW[i] = Math.exp(-db * db);
      }
      let mouth = 0, smileS = 0, browS = 0, focus = 0;
      let pod: HTMLElement | null = null;

      /* ---------- renderer ---------- */
      const renderer = new THREE.WebGLRenderer({ antialias: !small, alpha: true, powerPreference: "high-performance" });
      renderer.setPixelRatio(Math.min(devicePixelRatio, background ? (small ? 1.25 : 1.5) : small ? 1.5 : 1.75));
      renderer.setClearColor(0x000000, 0);
      el.appendChild(renderer.domElement);
      renderer.domElement.style.display = "block";
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(28, 1, 1, 400);
      const dist = (faceH * 0.5) / Math.tan((28 * Math.PI) / 360) * 1.75;
      camera.position.set(0, 0, dist);

      const root = new THREE.Group();
      scene.add(root);
      const head = new THREE.Group();
      root.add(head);

      /* ---------- face mesh ---------- */
      const pos = new Float32Array(base);
      const geo = new THREE.BufferGeometry();
      const posAttr = new THREE.BufferAttribute(pos, 3);
      posAttr.setUsage(THREE.DynamicDrawUsage);
      geo.setAttribute("position", posAttr);
      geo.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(data.uv), 2));
      geo.setAttribute("cap", new THREE.BufferAttribute(capT, 1));
      geo.setIndex(data.tris);
      geo.computeVertexNormals();

      const tex = await new THREE.TextureLoader().loadAsync("/face/face.jpg");
      tex.colorSpace = THREE.SRGBColorSpace;
      const pink = new THREE.Color("#ff2bd6");
      const cyan = new THREE.Color("#00f0ff");

      const faceMat = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: true,
        uniforms: {
          map: { value: tex }, time: { value: 0 }, skin: { value: 0.9 }, pink: { value: pink }, cyan: { value: cyan },
          hairMode: { value: HAIR === "wire" ? 1 : HAIR === "anime" ? 2 : 0 }, hairDim: { value: HAIR === "neon" ? 0.35 : HAIR === "wire" ? 0.25 : 1 },
        },
        vertexShader: /* glsl */ `
          attribute float cap;
          varying vec3 vN; varying vec2 vUv; varying vec3 vP; varying float vCap;
          void main(){
            vUv = uv; vP = position; vCap = cap;
            vN = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
          }`,
        fragmentShader: /* glsl */ `
          uniform sampler2D map; uniform float time; uniform float skin; uniform vec3 pink; uniform vec3 cyan;
          uniform float hairMode; uniform float hairDim;
          varying vec3 vN; varying vec2 vUv; varying vec3 vP; varying float vCap;
          void main(){
            vec3 n = normalize(vN);
            vec3 tex = texture2D(map, vUv).rgb;
            float lum = dot(tex, vec3(.299,.587,.114));
            // face lit from the front, hair from above-front so the top of the head isn't in shadow
            float key = max(dot(n, normalize(vec3(0.0, mix(-0.35, 0.9, vCap), 1.0))), 0.0);
            key = mix(key, 0.55 + 0.45 * key, step(0.001, vCap));
            // lift black hair so its curls and grey strands read
            lum = mix(lum, pow(lum, 0.6) * 1.15, step(0.001, vCap));
            vec3 tone = mix(vec3(lum) * 1.25, tex, 0.3);
            vec3 col = tone * mix(vec3(1.0), pink * 1.7, 0.6) * (0.25 + 1.0 * key) * skin;
            float fres = pow(1.0 - max(n.z, 0.0), 2.4) * mix(1.0, 0.45, step(0.001, vCap));
            col += cyan * fres * 1.1;
            float band = smoothstep(0.985, 1.0, sin(vP.y * 0.9 - time * 2.2)) * 0.28;
            col += cyan * band;
            float grain = fract(sin(dot(gl_FragCoord.xy + time, vec2(12.9898,78.233))) * 43758.5453);
            col += (grain - 0.5) * 0.04;
            float a = clamp(0.35 + skin * 0.6 + fres * 0.5, 0.0, 1.0);
            // hair: soft silhouette (the strand layer carries the outline) + dissolves near the crown
            float onCap = step(0.001, vCap);
            col *= mix(1.0, hairDim, onCap);
            if (hairMode > 1.5 && onCap > 0.5) {
              // anime: the scalp is a dark toon base under the locks (no photo texture → no cut-off edges)
              float k = max(dot(n, normalize(vec3(0.2, 0.9, 0.6))), 0.0);
              col = mix(vec3(0.035, 0.02, 0.08), vec3(0.13, 0.07, 0.26), step(0.45, k));
              col += mix(cyan, pink, 0.5) * pow(1.0 - abs(n.z), 3.0) * 0.25;
              gl_FragColor = vec4(col, 1.0);
              return;
            }
            if (hairMode > 0.5 && onCap > 0.5) {
              // holographic flow lines combed across the scalp
              float g = fract(vP.y * 1.25 + sin(vP.x * 0.8 + vP.z * 0.4) * 0.8 + time * 0.08);
              float line = 1.0 - smoothstep(0.0, 0.09, abs(g - 0.5));
              col += mix(cyan, pink, clamp(vCap * 1.2, 0.0, 1.0)) * line * 1.3;
              a = max(a * 0.55, line * 0.9);
            }
            a *= mix(1.0, smoothstep(0.0, 0.3, abs(n.z)), onCap);
            a *= 1.0 - smoothstep(0.75, 1.0, vCap) * 0.6;
            gl_FragColor = vec4(col, a);
          }`,
      });
      const faceMesh = new THREE.Mesh(geo, faceMat);
      let hairMat: InstanceType<typeof THREE.ShaderMaterial> | null = null;
      head.add(faceMesh);

      /* ---------- anime curly hair: tapered, curling ribbon locks with toon shading ---------- */
      if (NV > N && HAIR === "anime") {
        const nrmA = geo.attributes.normal as InstanceType<typeof THREE.BufferAttribute>;
        const roots: { p: InstanceType<typeof THREE.Vector3>; n: InstanceType<typeof THREE.Vector3> }[] = [];
        const ta = new THREE.Vector3(), tb = new THREE.Vector3(), tc = new THREE.Vector3();
        const capTris: number[] = [], areas: number[] = [];
        let total = 0;
        for (let t = 0; t < data.tris.length; t += 3) {
          const id = [data.tris[t], data.tris[t + 1], data.tris[t + 2]];
          if (id.every((i) => i < N)) continue;
          ta.fromArray(base, id[0] * 3); tb.fromArray(base, id[1] * 3); tc.fromArray(base, id[2] * 3);
          const ar = tb.clone().sub(ta).cross(tc.clone().sub(ta)).length() / 2;
          capTris.push(t); areas.push(ar); total += ar;
        }
        let seed = 424242;
        const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
        const LOCKS = reduced ? 90 : small ? 110 : 150;
        for (let k = 0; k < LOCKS; k++) {
          let r = rnd() * total, j = 0;
          while (j < areas.length - 1 && r > areas[j]) { r -= areas[j]; j++; }
          const t = capTris[j];
          let w1 = rnd(), w2 = rnd();
          if (w1 + w2 > 1) { w1 = 1 - w1; w2 = 1 - w2; }
          const w = [1 - w1 - w2, w1, w2];
          const p = new THREE.Vector3(), nn = new THREE.Vector3();
          for (let m = 0; m < 3; m++) {
            const vi = data.tris[t + m];
            p.x += base[vi * 3] * w[m]; p.y += base[vi * 3 + 1] * w[m]; p.z += base[vi * 3 + 2] * w[m];
            nn.x += nrmA.getX(vi) * w[m]; nn.y += nrmA.getY(vi) * w[m]; nn.z += nrmA.getZ(vi) * w[m];
          }
          roots.push({ p, n: nn.normalize() });
        }
        // the visor top: fringe tips must stay above it
        const yGuard = (base[105 * 3 + 1] + base[334 * 3 + 1]) / 2 + 0.9;
        // fringe: extra locks rooted along the hairline, falling over the forehead
        const HAIRLINE = [54, 103, 67, 109, 10, 338, 297, 332, 284];
        const fringe = new Set<number>();
        for (let k = 0; k < HAIRLINE.length * 2 - 1; k++) {
          const a = HAIRLINE[Math.floor(k / 2)], b = HAIRLINE[Math.ceil(k / 2)];
          const p = new THREE.Vector3().fromArray(base, a * 3).lerp(new THREE.Vector3().fromArray(base, b * 3), (k % 2) * 0.5);
          p.y += 0.9; p.z -= 0.3;
          fringe.add(roots.length);
          roots.push({ p, n: new THREE.Vector3(p.x * 0.05, 0.55, 1).normalize() });
        }
        // rough head centre, to keep locks from sinking into the scalp
        const hc = new THREE.Vector3();
        let hcN = 0;
        for (let i = N; i < NV; i++) { hc.x += base[i * 3]; hc.y += base[i * 3 + 1]; hc.z += base[i * 3 + 2]; hcN++; }
        hc.divideScalar(hcN); hc.y -= 2.5; hc.z -= 3;

        const SEG = small ? 14 : 20, RAD = 7;
        const per = (SEG + 1) * RAD;
        const P = new Float32Array(roots.length * per * 3);
        const UV = new Float32Array(roots.length * per * 2);
        const SD = new Float32Array(roots.length * per);
        const idx: number[] = [];
        const dir = new THREE.Vector3(), side = new THREE.Vector3(), nrm2 = new THREE.Vector3(), axis = new THREE.Vector3(), pos2 = new THREE.Vector3(), flow = new THREE.Vector3();
        const q = new THREE.Quaternion();
        roots.forEach(({ p, n }, li) => {
          const isFringe = fringe.has(li);
          const front = isFringe || (n.z > 0.25 && p.y < yBrow + 5);
          const sideLock = Math.abs(n.x) > 0.6;
          // fall direction: fringe forward/down, sides down/out, top swept forward
          flow.set(p.x * 0.1, sideLock ? -1 : -0.35, sideLock ? 0.1 : 1);
          flow.addScaledVector(n, -flow.dot(n)).normalize();
          dir.copy(n).multiplyScalar(isFringe ? 0.15 : 0.3).addScaledVector(flow, 1).normalize();
          // fade: short, flat sides; big defined curls on top; long fringe
          const L = isFringe ? 3.6 + rnd() * 1.2 : sideLock ? 1.3 + rnd() * 0.6 : 4.4 + rnd() * 1.8;
          const W = isFringe ? 1.5 + rnd() * 0.4 : sideLock ? 0.7 + rnd() * 0.2 : 1.4 + rnd() * 0.7; // lock width
          const curl = (sideLock ? 0.5 : 1.2 + rnd() * 0.6) * Math.PI * (rnd() < 0.5 ? 1 : -1); // total twist into a curl
          const rootDist = p.distanceTo(hc);
          // curl axis ≈ the scalp normal → the ringlet rolls sideways along the head (a "C"), not outward into a hook
          axis.crossVectors(dir, n).normalize().multiplyScalar(-0.3).add(n).normalize();
          const s0 = rnd();
          pos2.copy(p).addScaledVector(n, -0.15);
          const step = L / SEG;
          for (let i = 0; i <= SEG; i++) {
            const f = i / SEG;
            if (i > 0) {
              // lie along the head, then curl tightly near the tip (ringlet)
              q.setFromAxisAngle(axis, (curl / SEG) * (f < 0.35 ? 0.2 : 1.9 * (f - 0.2)));
              dir.applyQuaternion(q);
              dir.normalize();
              pos2.addScaledVector(dir, step);
              // stay on/above the scalp
              const d = pos2.distanceTo(hc), want = rootDist + (sideLock ? 0.05 : 0.2 * Math.sin(f * Math.PI)) + 0.08;
              if (d < want) pos2.sub(hc).multiplyScalar(want / d).add(hc);
              if (front && pos2.y < yGuard) pos2.y += (yGuard - pos2.y) * 0.8;
            }
            side.crossVectors(dir, n).normalize();
            nrm2.crossVectors(side, dir).normalize();
            const width = W * (0.42 + 0.58 * Math.pow(1 - f, 0.8)) * (f > 0.9 ? 1 - (f - 0.9) * 6 : 1); // rounded, not needle tips
            const thick = width * 0.5;
            for (let rr = 0; rr < RAD; rr++) {
              const a = (rr / RAD) * Math.PI * 2;
              const o = (li * per + i * RAD + rr);
              const x = pos2.x + side.x * Math.cos(a) * width + nrm2.x * Math.sin(a) * thick;
              const y = pos2.y + side.y * Math.cos(a) * width + nrm2.y * Math.sin(a) * thick;
              const z = pos2.z + side.z * Math.cos(a) * width + nrm2.z * Math.sin(a) * thick;
              P[o * 3] = x; P[o * 3 + 1] = y; P[o * 3 + 2] = z;
              UV[o * 2] = rr / RAD; UV[o * 2 + 1] = f;
              SD[o] = s0;
            }
          }
          const b0 = li * per;
          for (let i = 0; i < SEG; i++)
            for (let rr = 0; rr < RAD; rr++) {
              const a0 = b0 + i * RAD + rr, a1 = b0 + i * RAD + ((rr + 1) % RAD);
              const c0 = a0 + RAD, c1 = a1 + RAD;
              idx.push(a0, c0, a1, a1, c0, c1);
            }
        });
        const hairGeo = new THREE.BufferGeometry();
        hairGeo.setAttribute("position", new THREE.BufferAttribute(P, 3));
        hairGeo.setAttribute("uv", new THREE.BufferAttribute(UV, 2));
        hairGeo.setAttribute("lockSeed", new THREE.BufferAttribute(SD, 1));
        hairGeo.setIndex(idx);
        hairGeo.computeVertexNormals();
        const animeMat = new THREE.ShaderMaterial({
          uniforms: { pink: { value: pink }, cyan: { value: cyan }, time: { value: 0 } },
          vertexShader: /* glsl */ `
            attribute float lockSeed;
            varying vec3 vN; varying vec3 vV; varying vec2 vUv; varying float vS; varying float vY;
            void main(){
              vUv = uv; vS = lockSeed; vY = position.y;
              vec4 mv = modelViewMatrix * vec4(position, 1.0);
              vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz);
              gl_Position = projectionMatrix * mv;
            }`,
          fragmentShader: /* glsl */ `
            uniform vec3 pink; uniform vec3 cyan; uniform float time;
            varying vec3 vN; varying vec3 vV; varying vec2 vUv; varying float vS; varying float vY;
            void main(){
              vec3 n = normalize(vN);
              if (!gl_FrontFacing) n = -n;
              vec3 L = normalize(vec3(0.35, 0.85, 0.55));
              float ndl = dot(n, L);
              // 3-tone cel shading: deep indigo-black hair
              vec3 shadow = vec3(0.02, 0.015, 0.045), mid = vec3(0.07, 0.045, 0.15), lit = vec3(0.17, 0.11, 0.32);
              vec3 col = ndl < -0.05 ? shadow : ndl < 0.45 ? mid : lit;
              // fine strand grooves running along each lock
              float g = abs(fract(vUv.x * 6.0 + vUv.y * 0.6 + vS * 3.0) - 0.5);
              col *= 0.78 + 0.22 * smoothstep(0.05, 0.22, g);
              // glossy anime highlight: sharp, broken into strands, on the lit upper part of each curl
              vec3 H = normalize(L + vV);
              float spec = pow(max(dot(n, H), 0.0), 60.0);
              float strands = step(0.35, fract(vUv.x * 9.0 + vS * 7.0));
              float hl = step(0.6, spec) * strands * smoothstep(0.1, 0.3, vUv.y) * (1.0 - smoothstep(0.6, 0.85, vUv.y));
              col = mix(col, mix(vec3(0.75, 0.95, 1.0), cyan, 0.45), hl * 0.7);
              // neon rim + tips fading to pink
              float rim = pow(1.0 - max(dot(n, vV), 0.0), 3.0);
              col += mix(cyan, pink, vUv.y) * rim * 0.55;
              col += pink * 0.08 * smoothstep(0.7, 1.0, vUv.y);
              // the same scan band that runs over the face
              col += cyan * smoothstep(0.985, 1.0, sin(vY * 0.9 - time * 2.2)) * 0.35;
              gl_FragColor = vec4(col, 1.0);
            }`,
        });
        const animeHair = new THREE.Mesh(hairGeo, animeMat);
        animeHair.renderOrder = 1;
        head.add(animeHair);
        hairMat = animeMat;
      }

      /* ---------- hair strands: short curls grown from the scalp, coloured from the photo ---------- */
      if (NV > N && (HAIR === "slick" || HAIR === "crop" || HAIR === "neon")) {
        const img = tex.image as HTMLImageElement;
        const sc = document.createElement("canvas");
        sc.width = sc.height = 256;
        const sg = sc.getContext("2d", { willReadFrequently: true })!;
        sg.drawImage(img, 0, 0, 256, 256);
        const px = sg.getImageData(0, 0, 256, 256).data;
        const uvA = data.uv;
        const nrm = geo.attributes.normal as InstanceType<typeof THREE.BufferAttribute>;
        // scalp triangles (any vertex beyond the tracked landmarks) with their areas
        const capTris: number[] = [];
        const areas: number[] = [];
        let total = 0;
        const va = new THREE.Vector3(), vb = new THREE.Vector3(), vc = new THREE.Vector3();
        for (let t = 0; t < data.tris.length; t += 3) {
          const [i0, i1, i2] = [data.tris[t], data.tris[t + 1], data.tris[t + 2]];
          if (i0 < N && i1 < N && i2 < N) continue;
          va.fromArray(base, i0 * 3); vb.fromArray(base, i1 * 3); vc.fromArray(base, i2 * 3);
          const ar = vb.clone().sub(va).cross(vc.clone().sub(va)).length() / 2;
          capTris.push(t); areas.push(ar); total += ar;
        }
        const SN = reduced ? 800 : small ? 1300 : 2600;
        const SEG = 6;
        const sPos = new Float32Array(SN * SEG * 2 * 3);
        const sCol = new Float32Array(SN * SEG * 2 * 3);
        const sTip = new Float32Array(SN * SEG * 2);
        const rnd = (() => { let x = 1234567; return () => ((x = (x * 16807) % 2147483647) / 2147483647); })();
        const p = new THREE.Vector3(), nn = new THREE.Vector3(), flow = new THREE.Vector3(), t2 = new THREE.Vector3(), q = new THREE.Vector3(), prev = new THREE.Vector3();
        let o = 0;
        for (let sIdx = 0; sIdx < SN; sIdx++) {
          // area-weighted triangle pick
          let r = rnd() * total, k = 0;
          while (k < areas.length - 1 && r > areas[k]) { r -= areas[k]; k++; }
          const t = capTris[k];
          const id = [data.tris[t], data.tris[t + 1], data.tris[t + 2]];
          let w1 = rnd(), w2 = rnd();
          if (w1 + w2 > 1) { w1 = 1 - w1; w2 = 1 - w2; }
          const w0 = 1 - w1 - w2;
          p.set(0, 0, 0); nn.set(0, 0, 0);
          let u = 0, v = 0;
          id.forEach((vi, m) => {
            const w = [w0, w1, w2][m];
            p.x += base[vi * 3] * w; p.y += base[vi * 3 + 1] * w; p.z += base[vi * 3 + 2] * w;
            nn.x += nrm.getX(vi) * w; nn.y += nrm.getY(vi) * w; nn.z += nrm.getZ(vi) * w;
            u += uvA[vi * 2] * w; v += uvA[vi * 2 + 1] * w;
          });
          nn.normalize();
          // colour from the photo
          const ix = Math.min(255, Math.max(0, Math.round(u * 255)));
          const iy = Math.min(255, Math.max(0, Math.round((1 - v) * 255)));
          const pi = (iy * 256 + ix) * 4;
          const cr = px[pi] / 255, cg = px[pi + 1] / 255, cb2 = px[pi + 2] / 255;
          // combed, wavy locks lying along the scalp: flow forward + down (fringe sweeps over the forehead,
          // sides fall toward the ears), coherent per lock so neighbouring strands move together
          const lock = Math.sin(p.x * 1.3 + p.z * 0.7) * 0.6 + Math.sin(p.y * 1.1 - p.x * 0.5) * 0.4;
          if (HAIR === "slick") flow.set(p.x * 0.06 + lock * 0.12, 0.35, -1); // combed straight back
          else flow.set(p.x * 0.08 + lock * 0.35, -0.55, 0.85 + Math.max(0, p.y - yBrow) * 0.02);
          flow.addScaledVector(nn, -flow.dot(nn)).normalize(); // project onto the scalp's tangent plane
          t2.crossVectors(nn, flow).normalize(); // side-to-side, for the wave
          const front = nn.z > 0.3 && p.y < yBrow + 4.5;
          const len = HAIR === "slick" ? 2.4 + rnd() * 1.2 : HAIR === "crop" ? 0.45 + rnd() * 0.4 : (front ? 1.1 : 1.5) + rnd() * 1.1;
          const wave = HAIR === "slick" ? 0.04 : HAIR === "crop" ? 0.05 : 0.12 + rnd() * 0.1;
          const lift = HAIR === "slick" ? 0.1 : HAIR === "crop" ? 0.12 : 0.28;
          const ph = lock * 3 + rnd() * 0.6;
          prev.copy(p).addScaledVector(nn, 0.04);
          for (let sgi = 1; sgi <= SEG; sgi++) {
            const f = sgi / SEG;
            q.copy(p)
              .addScaledVector(flow, len * f)
              .addScaledVector(nn, lift * Math.sin(f * Math.PI) * (1 - f * 0.4)) // lifts off the scalp, then settles
              .addScaledVector(t2, Math.sin(ph + f * Math.PI * 2.2) * wave * f);
            if (HAIR !== "slick") q.y -= (front ? 0.35 : 0.2) * f * f;
            for (const [pt, tipV] of [[prev, (sgi - 1) / SEG], [q, f]] as const) {
              pt.toArray(sPos, o * 3);
              sCol[o * 3] = cr; sCol[o * 3 + 1] = cg; sCol[o * 3 + 2] = cb2;
              sTip[o] = tipV;
              o++;
            }
            prev.copy(q);
          }
        }
        const sGeo = new THREE.BufferGeometry();
        sGeo.setAttribute("position", new THREE.BufferAttribute(sPos, 3));
        sGeo.setAttribute("color", new THREE.BufferAttribute(sCol, 3));
        sGeo.setAttribute("tip", new THREE.BufferAttribute(sTip, 1));
        const strandMat = new THREE.ShaderMaterial({
          transparent: true,
          depthWrite: false,
          blending: HAIR === "neon" ? THREE.AdditiveBlending : THREE.NormalBlending,
          uniforms: { pink: { value: pink }, cyan: { value: cyan }, time: { value: 0 }, neon: { value: HAIR === "neon" ? 1 : 0 } },
          vertexShader: /* glsl */ `
            attribute vec3 color; attribute float tip;
            varying vec3 vC; varying float vT; varying float vY;
            void main(){ vC = color; vT = tip; vY = position.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
          fragmentShader: /* glsl */ `
            uniform vec3 pink; uniform vec3 cyan; uniform float time; uniform float neon;
            varying vec3 vC; varying float vT; varying float vY;
            void main(){
              float lum = pow(dot(vC, vec3(.299,.587,.114)), 0.7) * 0.95;
              vec3 col = vec3(lum) * mix(vec3(1.0), pink * 1.6, 0.55) + cyan * 0.06;
              col += cyan * smoothstep(0.985, 1.0, sin(vY * 0.9 - time * 2.2)) * 0.3; // scan band like the face
              float a = (1.0 - vT * 0.7) * 0.55;
              if (neon > 0.5) { col = mix(cyan, pink, vT) * (0.5 + lum); a = (0.25 + vT * 0.5) * 0.55; } // fibre-optic: cyan roots → pink tips
              gl_FragColor = vec4(col, a);
            }`,
        });
        const strands = new THREE.LineSegments(sGeo, strandMat);
        strands.renderOrder = 1;
        head.add(strands);
        hairMat = strandMat;
      }

      // wireframe (unique edges)
      const edges: number[] = [];
      const seen = new Set<number>();
      for (let i = 0; i < data.tris.length; i += 3) {
        const t = [data.tris[i], data.tris[i + 1], data.tris[i + 2]];
        if (t[0] >= N || t[1] >= N || t[2] >= N) continue; // no wireframe over the hair
        for (let k = 0; k < 3; k++) {
          const a = Math.min(t[k], t[(k + 1) % 3]), b = Math.max(t[k], t[(k + 1) % 3]);
          const key = a * 1000 + b;
          if (!seen.has(key)) { seen.add(key); edges.push(a, b); }
        }
      }
      const wireGeo = new THREE.BufferGeometry();
      wireGeo.setAttribute("position", posAttr);
      wireGeo.setIndex(edges);
      const wire = new THREE.LineSegments(
        wireGeo,
        new THREE.LineBasicMaterial({ color: cyan, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false }),
      );
      wire.scale.setScalar(1.004);
      head.add(wire);

      // glowing vertex points
      const ptsGeo = new THREE.BufferGeometry();
      ptsGeo.setAttribute("position", posAttr);
      const seed = new Float32Array(N);
      for (let i = 0; i < N; i++) seed[i] = Math.random();
      ptsGeo.setAttribute("seed", new THREE.BufferAttribute(seed, 1));
      ptsGeo.setDrawRange(0, 468);
      const dotMat = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { time: { value: 0 }, color: { value: cyan }, size: { value: 2.0 * renderer.getPixelRatio() }, vis: { value: 0.75 } },
        vertexShader: /* glsl */ `
          attribute float seed; uniform float time; uniform float size; varying float vA;
          void main(){
            vec4 mv = modelViewMatrix * vec4(position,1.0);
            vA = 0.35 + 0.65 * (0.5 + 0.5 * sin(time * 2.0 + seed * 40.0));
            gl_PointSize = size * (60.0 / -mv.z);
            gl_Position = projectionMatrix * mv;
          }`,
        fragmentShader: /* glsl */ `
          uniform vec3 color; uniform float vis; varying float vA;
          void main(){
            float d = length(gl_PointCoord - 0.5);
            float a = smoothstep(0.5, 0.0, d) * vA * vis;
            gl_FragColor = vec4(color, a);
          }`,
      });
      const pts = new THREE.Points(ptsGeo, dotMat);
      pts.scale.setScalar(1.006);
      head.add(pts);

      // irises: discs textured with the real iris from the photo, so the eyes actually move (gaze + blinks)
      const uvs = data.uv;
      const ringMat = new THREE.MeshBasicMaterial({ color: cyan, transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
      const irises = IRIS.map((ir) => {
        const g = new THREE.Group();
        const uc = new THREE.Vector2(uvs[ir.c * 2], uvs[ir.c * 2 + 1]);
        let ur = 0;
        for (const k of ir.ring) ur += Math.hypot(uvs[k * 2] - uc.x, uvs[k * 2 + 1] - uc.y) / ir.ring.length;
        const mat = new THREE.ShaderMaterial({
          transparent: true,
          depthWrite: false,
          uniforms: { map: { value: tex }, uc: { value: uc }, ur: { value: ur * 1.25 }, pink: { value: pink }, cyan: { value: cyan }, skin: faceMat.uniforms.skin },
          vertexShader: /* glsl */ `varying vec2 vL; void main(){ vL = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
          fragmentShader: /* glsl */ `
            uniform sampler2D map; uniform vec2 uc; uniform float ur; uniform vec3 pink; uniform vec3 cyan; uniform float skin; varying vec2 vL;
            void main(){
              float d = length(vL);
              vec3 tex = texture2D(map, uc + vL * ur).rgb;
              float lum = dot(tex, vec3(.299,.587,.114));
              vec3 col = mix(vec3(lum) * 1.25, tex, 0.3) * mix(vec3(1.0), pink * 1.7, 0.6) * 1.05 * skin;
              col += cyan * smoothstep(0.25, 0.0, length(vL - vec2(-0.28, 0.3))) * 0.6; // catch-light
              gl_FragColor = vec4(col, smoothstep(1.0, 0.72, d));
            }`,
        });
        g.add(new THREE.Mesh(new THREE.CircleGeometry(1, 32), mat));
        const ring = new THREE.Mesh(new THREE.RingGeometry(1.08, 1.16, 40), ringMat);
        g.add(ring);
        head.add(g);
        return g;
      });

      /* ---------- cyber visor ---------- */
      const V = (i: number) => new THREE.Vector3(base[i * 3], base[i * 3 + 1], base[i * 3 + 2]);
      const xL = V(127).x - 0.45, xR = V(356).x + 0.45;
      const xm = (xL + xR) / 2, halfW = (xR - xL) / 2;
      const yTop = (V(105).y + V(159).y + V(334).y + V(386).y) / 4 + 0.2;
      const yBot = (V(118).y + V(347).y) / 2 - 0.25;
      // wrap: z = zc - a x² - b x⁴ — clears the eye corners, reaches the temples at the ends
      const zc = V(168).z + 1.05;
      const xe = (Math.abs(V(33).x - xm) + Math.abs(V(263).x - xm)) / 2;
      const dropE = zc - ((V(33).z + V(263).z) / 2 + 0.75);
      const dropT = zc - ((V(127).z + V(356).z) / 2 + 0.9);
      const bq = (dropT - (dropE * halfW * halfW) / (xe * xe)) / (halfW ** 4 - xe * xe * halfW * halfW);
      const aq = (dropE - bq * xe ** 4) / (xe * xe);
      const visorZ = (x: number) => zc - aq * (x - xm) ** 2 - bq * (x - xm) ** 4;
      const visorGeo = new THREE.PlaneGeometry(1, 1, 40, 8);
      const vp = visorGeo.attributes.position as InstanceType<typeof THREE.BufferAttribute>;
      for (let i = 0; i < vp.count; i++) {
        const x = xm + vp.getX(i) * 2 * halfW;
        const y = yBot + (vp.getY(i) + 0.5) * (yTop - yBot);
        vp.setXYZ(i, x, y, visorZ(x));
      }
      visorGeo.computeVertexNormals();
      const visorMat = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        uniforms: { time: { value: 0 }, cyan: { value: cyan }, pink: { value: pink } },
        vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: /* glsl */ `
          uniform float time; uniform vec3 cyan; uniform vec3 pink; varying vec2 vUv;
          void main(){
            float u = vUv.x, v = vUv.y, c = abs(u - 0.5) * 2.0;
            // shades outline: straight-ish top, nose notch + rounded outer corners at the bottom
            float bot = 0.46 * exp(-pow((u - 0.5) / 0.07, 2.0)) + 0.32 * pow(c, 7.0);
            float top = 1.0 - 0.1 * pow(c, 5.0);
            if (v < bot || v > top) discard;
            float e = min(v - bot, top - v) * 4.0;
            float rim = smoothstep(0.09, 0.0, e) + smoothstep(0.006, 0.0, 1.0 - c);
            vec3 neon = mix(cyan, pink, u);
            vec3 col = mix(vec3(0.015, 0.02, 0.06), neon, 0.18);
            float a = 0.58;
            // glass streaks + a slow scan line
            col += smoothstep(0.018, 0.0, abs(u * 1.3 - v * 0.75 - 0.18)) * 0.22 + smoothstep(0.01, 0.0, abs(u * 1.3 - v * 0.75 - 0.27)) * 0.14;
            float scan = exp(-pow((v - fract(time * 0.35)) * 16.0, 2.0));
            col += neon * scan * 0.45; a += scan * 0.15;
            // HUD: targeting reticle on the left lens, data bars on the right
            float ring = smoothstep(0.012, 0.0, abs(length((vUv - vec2(0.29, 0.6)) * vec2(3.2, 1.0)) - 0.12));
            col += cyan * ring * 0.8; a += ring * 0.3;
            vec2 q = vUv - vec2(0.68, 0.48);
            float bars = step(0.0, q.x) * step(q.x, 0.13) * step(0.0, q.y) * step(q.y, 0.24) * step(0.55, fract(q.y * 22.0));
            bars *= step(q.x / 0.13, 0.35 + 0.65 * fract(sin(floor(q.y * 22.0) * 12.9 + floor(time * 2.0)) * 43758.5));
            col += pink * bars * 0.7; a += bars * 0.25;
            col += neon * rim * 1.5; a = max(a, rim);
            gl_FragColor = vec4(col, clamp(a, 0.0, 1.0));
          }`,
      });
      const visor = new THREE.Mesh(visorGeo, visorMat);
      visor.renderOrder = 2;
      head.add(visor);
      // frame bar + arms back to the ears, with hinge LEDs
      const frameMat = new THREE.MeshBasicMaterial({ color: cyan });
      const frameGlow = new THREE.MeshBasicMaterial({ color: pink, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false });
      const topPts: InstanceType<typeof THREE.Vector3>[] = [];
      for (let k = 0; k <= 24; k++) {
        const x = xL + (k / 24) * (xR - xL);
        const c = Math.abs((x - xm) / halfW);
        topPts.push(new THREE.Vector3(x, yTop - 0.1 * c ** 5 * (yTop - yBot) + 0.05, visorZ(x) + 0.05));
      }
      const bar = new THREE.CatmullRomCurve3(topPts);
      head.add(new THREE.Mesh(new THREE.TubeGeometry(bar, 60, 0.11, 6, false), frameMat));
      head.add(new THREE.Mesh(new THREE.TubeGeometry(bar, 60, 0.32, 6, false), frameGlow));
      for (const [end, ear] of [[topPts[0], V(234)], [topPts[24], V(454)]] as const) {
        const arm = new THREE.CatmullRomCurve3([
          end,
          new THREE.Vector3(end.x + Math.sign(end.x) * 0.25, end.y - 0.1, end.z - 1.5),
          new THREE.Vector3(ear.x + Math.sign(end.x) * 0.55, ear.y + 0.9, ear.z - 2.5),
        ]);
        head.add(new THREE.Mesh(new THREE.TubeGeometry(arm, 24, 0.13, 6, false), frameMat));
        head.add(new THREE.Mesh(new THREE.TubeGeometry(arm, 24, 0.34, 6, false), frameGlow));
        const led = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.8, 0.9), new THREE.MeshBasicMaterial({ color: pink }));
        led.position.set(end.x + Math.sign(end.x) * 0.2, end.y - 0.45, end.z - 0.6);
        head.add(led);
      }

      /* ---------- background: HUD rings + data particles ---------- */
      const ringA = new THREE.Mesh(
        new THREE.RingGeometry(faceH * 0.78, faceH * 0.785, 128, 1, 0, Math.PI * 1.6),
        new THREE.MeshBasicMaterial({ color: cyan, transparent: true, opacity: 0.35, side: THREE.DoubleSide }),
      );
      const ringB = new THREE.Mesh(
        new THREE.RingGeometry(faceH * 0.86, faceH * 0.87, 128, 1, 0, Math.PI * 0.6),
        new THREE.MeshBasicMaterial({ color: pink, transparent: true, opacity: 0.5, side: THREE.DoubleSide }),
      );
      ringA.position.z = ringB.position.z = -8;
      root.add(ringA, ringB);

      const PN = small ? 260 : 600;
      const pp = new Float32Array(PN * 3);
      const ps = new Float32Array(PN);
      for (let i = 0; i < PN; i++) {
        const r = faceH * (0.7 + Math.random() * 1.1);
        const a = Math.random() * Math.PI * 2;
        pp[i * 3] = Math.cos(a) * r * 1.4;
        pp[i * 3 + 1] = Math.sin(a) * r;
        pp[i * 3 + 2] = -10 - Math.random() * 30;
        ps[i] = Math.random();
      }
      const bgGeo = new THREE.BufferGeometry();
      bgGeo.setAttribute("position", new THREE.BufferAttribute(pp, 3));
      bgGeo.setAttribute("seed", new THREE.BufferAttribute(ps, 1));
      const bgMat = dotMat.clone();
      bgMat.uniforms.color = { value: new THREE.Color("#5b8cff") };
      bgMat.uniforms.vis = { value: 0.5 };
      bgMat.uniforms.size = { value: 2.6 * renderer.getPixelRatio() };
      const bg = new THREE.Points(bgGeo, bgMat);
      scene.add(bg);

      /* ---------- sizing ---------- */
      const resize = () => {
        const w = el.clientWidth || 1, h = el.clientHeight || 1;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.position.z = dist * Math.max(1, 0.85 / camera.aspect);
        camera.updateProjectionMatrix();
      };
      const ro = new ResizeObserver(resize);
      ro.observe(el);
      resize();

      /* ---------- input: mouse ---------- */
      let px = 0, py = 0, lastPointer = -1e9;
      const onMove = (e: PointerEvent) => {
        px = (e.clientX / innerWidth) * 2 - 1;
        py = (e.clientY / innerHeight) * 2 - 1;
        lastPointer = performance.now();
      };
      let mx = 0, my = 0;
      addEventListener("pointermove", onMove, { passive: true });

      /* ---------- visibility: pause when off-screen / covered ---------- */
      let visible = true;
      const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting), { threshold: 0.01 });
      if (!background) io.observe(el);

      /* ---------- scroll choreography (background mode) ---------- */
      let sp = 0; // smoothed scroll progress through the hero (0 → 1)
      let lastOpacity = -1;
      let frame = 0;

      /* ---------- neural rig state ---------- */
      const live = new Float32Array(N * 3);
      const aligned = new Float32Array(N * 3);
      const neutral = new Float32Array(N * 3);
      const delta = new Float32Array(N * 3);
      let calibFrames = 0;
      let lastFaceAt = 0;
      let fit: Similarity | null = null;
      const q = new THREE.Quaternion();
      const q0inv = new THREE.Quaternion();
      const qTarget = new THREE.Quaternion();
      const qIdle = new THREE.Quaternion();
      const e = new THREE.Euler();
      let linkMix = 0; // 0 idle → 1 mirroring
      const mirror = data.mirror;

      // idle animation
      let blinkT = 0, nextBlink = 2 + Math.random() * 3;

      let raf = 0;
      let t0 = performance.now();
      const tmp = new THREE.Vector3();

      const tick = (now: number) => {
        raf = requestAnimationFrame(tick);
        // every ~half second: is an opaque full-screen section (Character Select, Business, Vault) covering us?
        if (background && frame % 30 === 0) {
          let hidden = false;
          for (const el of document.querySelectorAll<HTMLElement>("[data-covers-face]")) {
            const r = el.getBoundingClientRect();
            if (r.top <= 0 && r.bottom >= innerHeight) { hidden = true; break; }
          }
          stage.covers.section = hidden;
        }
        if (background && stage.faceCovered) {
          frame++;
          // a full-screen scene is on top — fade out and stop drawing
          if (wrapEl && lastOpacity !== 0) { wrapEl.style.opacity = "0"; lastOpacity = 0; }
          t0 = now;
          return;
        }
        if (!visible || document.hidden) { t0 = now; return; }
        // once the hero is behind us the face is a dim backdrop — 30 fps is plenty
        frame++;
        if (background && sp > 0.6 && focus < 0.05 && !holo.speaking && frame % (small ? 3 : 2) !== 0) return;
        const dt = Math.min(0.05, (now - t0) / 1000);
        t0 = now;
        const time = now / 1000;
        faceMat.uniforms.time.value = time;
        visorMat.uniforms.time.value = time;
        if (hairMat) hairMat.uniforms.time.value = time;
        dotMat.uniforms.time.value = time;
        bgMat.uniforms.time.value = time;

        // ---- live tracking ----
        const linked = faceVisible();
        if (linked && neural.faceAt !== lastFaceAt) {
          lastFaceAt = neural.faceAt;
          toMetric(neural.face, N, neural.vw, neural.vh, live);
          fit = fitSimilarity(canon, live, 468);
          unproject(fit, live, N, aligned);
          if (calibFrames < 12) {
            // average a neutral expression + pose over the first frames
            for (let i = 0; i < N * 3; i++) neutral[i] = calibFrames === 0 ? aligned[i] : neutral[i] + (aligned[i] - neutral[i]) / (calibFrames + 1);
            const [x, y, z, w] = fit.q;
            q.set(x, -y, -z, w);
            if (calibFrames === 0) q0inv.copy(q).invert();
            calibFrames++;
          }
          // mirrored per-vertex expression deltas
          for (let i = 0; i < N; i++) {
            const m = mirror[i];
            const k = 1.35;
            const dx = -(aligned[m * 3] - neutral[m * 3]) * k;
            const dy = (aligned[m * 3 + 1] - neutral[m * 3 + 1]) * k;
            const dz = (aligned[m * 3 + 2] - neutral[m * 3 + 2]) * k;
            delta[i * 3] += (dx - delta[i * 3]) * 0.55;
            delta[i * 3 + 1] += (dy - delta[i * 3 + 1]) * 0.55;
            delta[i * 3 + 2] += (dz - delta[i * 3 + 2]) * 0.55;
          }
          const [x, y, z, w] = fit.q;
          qTarget.set(x, -y, -z, w).premultiply(q0inv);
        }
        if (!linked) calibFrames = 0;
        linkMix += ((linked ? 1 : 0) - linkMix) * Math.min(1, dt * 4);

        // ---- idle motion: follow the pointer, or glance around on its own (touch screens) ----
        // one-shot gestures from the director / chat (nod, shake, wink, think…)
        let gk = "", gp = 0;
        if (holo.gesture) {
          gp = (now - holo.gesture.at) / holo.gesture.dur;
          if (gp >= 1 || gp < 0) holo.gesture = null;
          else gk = holo.gesture.kind;
        }
        const env = gk ? Math.sin(gp * Math.PI) : 0;
        const wander = now - lastPointer > 3000 && !reduced;
        let tx = wander ? Math.sin(time * 0.45) * 0.55 + Math.sin(time * 1.3) * 0.08 : px;
        let ty = wander ? Math.sin(time * 0.31) * 0.3 : py;
        if (holo.look) ({ x: tx, y: ty } = holo.look);
        if (gk === "lookAround") { tx = Math.sin(gp * Math.PI * 3) * 0.9; ty = -0.15; }
        if (gk === "think") { tx = -0.55; ty = -0.7; }
        mx += (tx - mx) * Math.min(1, dt * 3);
        my += (ty - my) * Math.min(1, dt * 3);
        blinkT += dt;
        let blink = 0;
        if (blinkT > nextBlink) {
          const p = (blinkT - nextBlink) / 0.18;
          blink = p < 1 ? Math.sin(p * Math.PI) : 0;
          if (p >= 1) { blinkT = 0; nextBlink = 2.5 + Math.random() * 4; }
        }
        const breathe = reduced ? 0 : Math.sin(time * 1.2) * 0.02;
        const nodA = gk === "nod" ? Math.sin(gp * Math.PI * 4) * 0.14 * env : 0;
        const shakeA = gk === "shake" ? Math.sin(gp * Math.PI * 4) * 0.22 * env : 0;
        const tiltA = gk === "tilt" || gk === "wink" ? 0.14 * env : gk === "think" ? -0.08 * env : 0;
        e.set(my * 0.28 + breathe + nodA, mx * 0.55 + shakeA, -mx * 0.04 + tiltA);
        qIdle.setFromEuler(e);

        // ---- compose vertex positions ----
        const idle = 1 - linkMix;
        for (let i = 0; i < N * 3; i++) pos[i] = base[i] + delta[i] * linkMix;
        if (idle > 0.01) {
          for (const [u, l] of LIDS) {
            for (let c = 0; c < 3; c++) pos[u * 3 + c] += (pos[l * 3 + c] - pos[u * 3 + c]) * blink * 0.92 * idle;
          }
          for (let i = 468; i < N; i++) {
            pos[i * 3] += mx * 0.2 * idle;
            pos[i * 3 + 1] -= my * 0.12 * idle;
          }
        }
        // talking / smiling / brows — only when we're not mirroring the visitor
        const talk = holo.speaking ? 0.2 + 0.8 * Math.abs(Math.sin(time * 13) * Math.sin(time * 4.7 + 1)) : 0;
        mouth += (Math.max(talk, gk === "surprise" ? env * 0.75 : 0) - mouth) * Math.min(1, dt * 20);
        smileS += (Math.max(gk === "smile" || gk === "wink" ? env : 0, holo.speaking ? 0.2 : 0.06) - smileS) * Math.min(1, dt * 6);
        browS += ((gk === "surprise" ? env : gk === "think" ? env * 0.6 : holo.speaking ? 0.15 * Math.abs(Math.sin(time * 2.1)) : 0) - browS) * Math.min(1, dt * 8);
        if (idle > 0.01) {
          const jaw = mouth * faceH * 0.06 * idle, sm = smileS * faceH * 0.02 * idle, br = browS * faceH * 0.03 * idle;
          for (let i = 0; i < 468; i++) {
            if (jawW[i]) pos[i * 3 + 1] -= jawW[i] * jaw;
            if (smileW[i] > 0.01) {
              pos[i * 3 + 1] += smileW[i] * sm;
              pos[i * 3] += smileSide[i] * smileW[i] * sm * 0.6;
            }
            if (browW[i] > 0.01) pos[i * 3 + 1] += browW[i] * br;
          }
          if (gk === "wink") {
            for (const [u, l] of LIDS.slice(0, 7)) for (let c = 0; c < 3; c++) pos[u * 3 + c] += (pos[l * 3 + c] - pos[u * 3 + c]) * Math.min(1, env * 1.6) * 0.92 * idle;
          }
        }
        if (linkMix < 0.999) for (let i = 0; i < N * 3; i++) delta[i] *= linked ? 1 : 0.92;
        posAttr.needsUpdate = true;
        geo.computeVertexNormals();

        // irises follow their landmarks; fade out when the lids close
        IRIS.forEach((ir, k) => {
          const g = irises[k];
          g.position.set(pos[ir.c * 3], pos[ir.c * 3 + 1], pos[ir.c * 3 + 2] + 0.25);
          const r = tmp.set(pos[ir.ring[0] * 3] - pos[ir.c * 3], pos[ir.ring[0] * 3 + 1] - pos[ir.c * 3 + 1], 0).length();
          const open = Math.abs(pos[ir.up * 3 + 1] - pos[ir.lo * 3 + 1]);
          const openBase = Math.abs(base[ir.up * 3 + 1] - base[ir.lo * 3 + 1]) || 1;
          const o = Math.max(0, Math.min(1, (open / openBase - 0.25) / 0.5));
          g.scale.set(r * 1.25, r * 1.25 * Math.max(0.05, o), 1);
          g.visible = o > 0.02;
        });

        // ---- head rotation ----
        if (linkMix > 0.001) q.copy(qIdle).slerp(qTarget, linkMix);
        else q.copy(qIdle);
        head.quaternion.slerp(q, Math.min(1, dt * 10));

        ringA.rotation.z += dt * 0.15;
        ringB.rotation.z -= dt * 0.25;
        bg.rotation.z += dt * 0.01;
        root.position.y = reduced ? 0 : Math.sin(time * 0.8) * 0.15;

        if (background) {
          const y = scrollY;
          const target = Math.min(1, y / (innerHeight * 0.85));
          sp += (target - sp) * Math.min(1, dt * 6);
          const ease = sp * sp * (3 - 2 * sp);
          // visible half-extents of the z=0 plane
          const hh = Math.tan((camera.fov * Math.PI) / 360) * camera.position.z;
          const hw = hh * camera.aspect;
          const wide = camera.aspect > 1.05;
          const heroX = wide ? hw * 0.44 : 0;
          const heroY = wide ? 0 : hh * 0.36;
          const heroS = wide ? 1.4 : 0.95;
          const bgS = wide ? 1.55 : 1.3;
          root.position.x = heroX * (1 - ease);
          root.position.y += heroY * (1 - ease);
          root.scale.setScalar(heroS + (bgS - heroS) * ease);
          // keep turning as the page scrolls past
          if (!reduced) {
            root.rotation.y = Math.sin(y * 0.0011) * 0.32 * ease;
            root.rotation.x = Math.sin(y * 0.0007 + 1.3) * 0.08 * ease;
          }
          let op = (wide ? 1 : 0.7) + ((wide ? 0.17 : 0.13) - (wide ? 1 : 0.7)) * ease;
          op = Math.min(1, op + holo.attention * 0.18 * ease);

          // pop out: the Nabeel.AI pod pulls the face to the front and it becomes the speaker
          if (!pod || frame % 60 === 0) pod = document.getElementById("ask-pod");
          let fT = 0, podX = 0, podY = 0, podS = 1;
          if (pod) {
            const r = pod.getBoundingClientRect();
            if (r.bottom > 0 && r.top < innerHeight && r.height > 0) {
              const pc = r.top + r.height / 2;
              fT = clamp01(1.7 * (1 - Math.abs(pc - innerHeight / 2) / (innerHeight * 0.8)));
              podX = ((r.left + r.width / 2) / innerWidth * 2 - 1) * hw;
              podY = -(pc / innerHeight * 2 - 1) * hh;
              podS = Math.min(3, ((Math.min(r.height, r.width * 1.2) / innerHeight) * 2 * hh * 0.66) / faceH);
            }
          }
          focus += (fT - focus) * Math.min(1, dt * 5);
          holo.focus = focus;
          if (focus > 0.001) {
            const fe = focus * focus * (3 - 2 * focus);
            root.position.x += (podX - root.position.x) * fe;
            root.position.y += (podY - hh * 0.04 + (reduced ? 0 : Math.sin(time * 0.8) * 0.1) - root.position.y) * fe;
            root.scale.setScalar(root.scale.x + (podS - root.scale.x) * fe);
            root.rotation.y += ((wide ? 0.32 : 0) - root.rotation.y) * fe;
            root.rotation.x += (0 - root.rotation.x) * fe;
            op += (1 - op) * fe;
          }
          if (wrapEl && Math.abs(op - lastOpacity) > 0.004) {
            wrapEl.style.opacity = op.toFixed(3);
            lastOpacity = op;
          }
          if (label.current) label.current.style.opacity = String(Math.max(0, 1 - ease * 3) * (1 - focus));
        }

        if (label.current) {
          label.current.dataset.state = linked ? (calibFrames < 12 ? "calib" : "live") : "idle";
        }
        renderer.render(scene, camera);
      };
      raf = requestAnimationFrame(tick);
      setStatus("ready");

      cleanup = () => {
        cancelAnimationFrame(raf);
        removeEventListener("pointermove", onMove);
        ro.disconnect();
        io.disconnect();
        scene.traverse((o) => {
          const m = o as unknown as { geometry?: { dispose: () => void }; material?: { dispose: () => void } };
          m.geometry?.dispose();
          m.material?.dispose();
        });
        tex.dispose();
        renderer.dispose();
        renderer.domElement.remove();
      };
    })().catch(() => setStatus("unsupported"));

    return () => {
      disposed = true;
      cleanup();
    };
  }, [background, mounted]);

  const layer = (
    <div
      ref={wrap}
      aria-hidden
      className={background ? "pointer-events-none fixed inset-0 -z-10 transition-opacity duration-500 print:hidden" : `relative ${className}`}
    >
      <div ref={host} className="absolute inset-0" />
      <div
        ref={label}
        data-state="idle"
        className={`holo-label pointer-events-none absolute hidden whitespace-nowrap font-mono text-[10px] tracking-[0.25em] md:block ${
          background ? "bottom-6 right-[29%] translate-x-1/2" : "bottom-3 left-1/2 -translate-x-1/2"
        }`}
      />
    </div>
  );
  if (!background) return layer;
  return mounted ? createPortal(layer, document.body) : null;
}
