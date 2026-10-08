"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { faceVisible, headTurn } from "@/lib/neural/engine";
import type { GNode } from "./graph";

/**
 * The System: a living network globe with a glowing brain at its core.
 *  - brain: point-cloud hemispheres + cerebellum, activity waves and synapse sparks
 *  - inner shell: projects / roles / school · outer shell: skills · links carry flowing light
 *  - everything breathes and drifts; scroll progress (0 → 1 through the section) flies the camera
 *    in from far away, spins the globe, then dives toward the brain on the way out
 */

type Props = {
  nodes: GNode[];
  edges: [number, number][];
  selected: string;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  onReady?: (ok: boolean) => void;
  /** 0 → 1 as the section scrolls past */
  progress?: React.RefObject<number>;
  /** shift the globe sideways (fraction of width, + = left) to leave room for text */
  shift?: number;
};

const R1 = 3.3; // projects / roles shell
const R2 = 5.6; // skills shell
const SIZE = [0, 34, 13]; // px per tier (before DPR) — tier 0 is the brain

function fibonacci(i: number, n: number, r: number) {
  const y = 1 - ((i + 0.5) / n) * 2;
  const rad = Math.sqrt(1 - y * y);
  const t = i * Math.PI * (3 - Math.sqrt(5));
  return new THREE.Vector3(Math.cos(t) * rad * r, y * r, Math.sin(t) * rad * r);
}

/** Lay nodes out: tier-1 on a Fibonacci sphere, skills pulled toward the work that uses them. */
function layout(nodes: GNode[], edges: [number, number][]) {
  const pos = nodes.map(() => new THREE.Vector3());
  const t1 = nodes.map((n, i) => (n.tier === 1 ? i : -1)).filter((i) => i >= 0);
  t1.forEach((idx, k) => pos[idx].copy(fibonacci(k, t1.length, R1)));
  const t2 = nodes.map((n, i) => (n.tier === 2 ? i : -1)).filter((i) => i >= 0);
  t2.forEach((idx, k) => {
    const acc = new THREE.Vector3();
    for (const [a, b] of edges) if (b === idx && nodes[a].tier === 1) acc.add(pos[a]);
    const fib = fibonacci(k, t2.length, 1);
    pos[idx].copy(acc.lengthSq() > 0.01 ? acc.normalize().multiplyScalar(0.7).add(fib.multiplyScalar(0.45)) : fib).normalize().multiplyScalar(R2);
  });
  for (let it = 0; it < 60; it++) {
    for (const a of t2)
      for (const b of t2) {
        if (a >= b) continue;
        const d = pos[a].distanceTo(pos[b]);
        if (d < 1.25) {
          const push = pos[a].clone().sub(pos[b]).normalize().multiplyScalar((1.25 - d) * 0.25);
          pos[a].add(push);
          pos[b].sub(push);
        }
      }
    for (const a of t2) pos[a].normalize().multiplyScalar(R2);
  }
  return pos;
}

/** Point cloud shaped like a brain: two folded hemispheres with a fissure, cerebellum and stem. */
function brainCloud(n: number, scale: number) {
  let seed = 98765;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const pts: number[] = [];
  const v = new THREE.Vector3();
  const nCortex = Math.round(n * 0.84), nCereb = Math.round(n * 0.12);
  for (let i = 0; i < nCortex; i++) {
    v.set(rnd() * 2 - 1, rnd() * 2 - 1, rnd() * 2 - 1).normalize();
    const side = v.x >= 0 ? 1 : -1;
    // gyri / sulci folds
    const g =
      0.07 * Math.sin(v.x * 13 + Math.sin(v.z * 8) * 1.6) * Math.sin(v.y * 11 + v.z * 5) +
      0.035 * Math.sin(v.z * 21 + v.y * 6 + v.x * 3);
    const fissure = Math.exp(-((v.x / 0.11) ** 2)) * (v.y > -0.2 ? 0.28 : 0.08);
    const r = 1 + g - fissure;
    let y = v.y * 0.66 * r;
    if (y < 0) y *= 0.72; // flatter underside
    pts.push((v.x * 0.78 * r + side * 0.05) * scale, (y + 0.1) * scale, v.z * 1.0 * r * scale);
    // a few points inside for volume
    if (rnd() < 0.18) {
      const k = 0.35 + rnd() * 0.5;
      pts.push(pts[pts.length - 3] * k, pts[pts.length - 2] * k, pts[pts.length - 1] * k);
    }
  }
  for (let i = 0; i < nCereb; i++) {
    v.set(rnd() * 2 - 1, rnd() * 2 - 1, rnd() * 2 - 1).normalize();
    const stripes = 1 + 0.05 * Math.sin(v.y * 30);
    pts.push(v.x * 0.46 * stripes * scale, (-0.42 + v.y * 0.22 * stripes) * scale, (-0.62 + v.z * 0.3) * scale);
  }
  for (let i = 0; i < n * 0.04; i++) {
    const a = rnd() * Math.PI * 2, h = rnd();
    pts.push(Math.cos(a) * 0.1 * scale, (-0.45 - h * 0.45) * scale, (-0.3 + Math.sin(a) * 0.1 - h * 0.12) * scale);
  }
  return new Float32Array(pts);
}

export function SystemScene({ nodes, edges, selected, onSelect, onHover, onReady, progress, shift = 0 }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const labelsRef = useRef<HTMLDivElement>(null);
  const sel = useRef(selected);
  const cb = useRef({ onSelect, onHover });
  const shiftRef = useRef(shift);

  useEffect(() => {
    sel.current = selected;
  }, [selected]);
  useEffect(() => {
    cb.current = { onSelect, onHover };
  }, [onSelect, onHover]);
  useEffect(() => {
    shiftRef.current = shift;
  }, [shift]);

  useEffect(() => {
    const el = host.current;
    const labelHost = labelsRef.current;
    if (!el || !labelHost) return;

    const probe = document.createElement("canvas");
    if (!(probe.getContext("webgl2") || probe.getContext("webgl"))) {
      onReady?.(false);
      return;
    }

    const small = matchMedia("(max-width: 768px)").matches;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const renderer = new THREE.WebGLRenderer({ antialias: !small, alpha: true, powerPreference: "high-performance" });
    const dpr = Math.min(devicePixelRatio, small ? 1.5 : 1.75);
    renderer.setPixelRatio(dpr);
    renderer.setClearColor(0x000000, 0);
    el.appendChild(renderer.domElement);
    Object.assign(renderer.domElement.style, { display: "block", width: "100%", height: "100%", touchAction: "pan-y", cursor: "grab" });

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 120);
    const BASE_Z = 17.5;
    camera.position.set(0, 0, BASE_Z);
    const world = new THREE.Group();
    scene.add(world);

    const pos = layout(nodes, edges);
    const N = nodes.length;
    const live = pos.map((p) => p.clone()); // animated (drifting) positions
    const seeds = nodes.map((_, i) => (Math.sin(i * 12.9898) * 43758.5453) % 1);
    const c = new THREE.Color();

    /* ---------- shared glow-point shader ---------- */
    const glowMat = () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { dpr: { value: dpr }, time: { value: 0 }, twinkle: { value: 0 } },
        vertexShader: /* glsl */ `
          attribute vec3 color; attribute float size; attribute float glow;
          uniform float dpr; uniform float time; uniform float twinkle;
          varying vec3 vC; varying float vG; varying float vDepth;
          void main(){
            vec4 mv = modelViewMatrix * vec4(position,1.0);
            vC = color; vG = glow;
            vDepth = clamp((-mv.z - 10.0) / 12.0, 0.0, 1.0);
            float tw = 1.0 + twinkle * 0.25 * sin(time * 2.4 + position.x * 3.1 + position.y * 1.7);
            gl_PointSize = size * dpr * (16.0 / -mv.z) * (1.0 + glow * 0.6) * tw;
            gl_Position = projectionMatrix * mv;
          }`,
        fragmentShader: /* glsl */ `
          varying vec3 vC; varying float vG; varying float vDepth;
          void main(){
            float d = length(gl_PointCoord - 0.5) * 2.0;
            float core = smoothstep(0.32, 0.0, d);
            float halo = pow(smoothstep(1.0, 0.0, d), 2.0) * 0.6;
            float a = (core + halo) * mix(1.0, 0.3, vDepth) * (0.75 + vG * 0.6);
            gl_FragColor = vec4(mix(vC, vec3(1.0), core * 0.6), a);
          }`,
      });

    /* ---------- globe skin: dotted sphere + orbit rings ---------- */
    const GS = small ? 900 : 1800;
    const gPos = new Float32Array(GS * 3), gCol = new Float32Array(GS * 3), gSize = new Float32Array(GS);
    for (let i = 0; i < GS; i++) {
      fibonacci(i, GS, R2 * 1.24).toArray(gPos, i * 3);
      c.set(i % 9 === 0 ? "#ff7ae5" : "#5b8cff").toArray(gCol, i * 3);
      gSize[i] = i % 9 === 0 ? 3.2 : 2.2;
    }
    const globeGeo = new THREE.BufferGeometry();
    globeGeo.setAttribute("position", new THREE.BufferAttribute(gPos, 3));
    globeGeo.setAttribute("color", new THREE.BufferAttribute(gCol, 3));
    globeGeo.setAttribute("size", new THREE.BufferAttribute(gSize, 1));
    globeGeo.setAttribute("glow", new THREE.BufferAttribute(new Float32Array(GS), 1));
    const globeMat = glowMat();
    globeMat.uniforms.twinkle.value = 1;
    const globe = new THREE.Points(globeGeo, globeMat);
    world.add(globe);

    const rings: THREE.Line[] = [];
    for (const [r, tilt, col, op] of [
      [R2 * 1.32, 0.35, "#00f0ff", 0.22],
      [R2 * 1.4, -0.6, "#ff2bd6", 0.16],
      [R1 * 1.25, 1.1, "#a78bfa", 0.18],
    ] as const) {
      const pts: THREE.Vector3[] = [];
      for (let k = 0; k <= 160; k++) {
        const a = (k / 160) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r));
      }
      const ring = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineDashedMaterial({ color: col, transparent: true, opacity: op, dashSize: 0.35, gapSize: 0.22, depthWrite: false, blending: THREE.AdditiveBlending }),
      );
      ring.computeLineDistances();
      ring.rotation.x = Math.PI / 2 + tilt;
      ring.rotation.z = tilt * 0.6;
      world.add(ring);
      rings.push(ring);
    }

    /* ---------- the brain ---------- */
    const brainPos = brainCloud(small ? 2600 : 5200, 1.55);
    const BN = brainPos.length / 3;
    const bSeed = new Float32Array(BN);
    for (let i = 0; i < BN; i++) bSeed[i] = Math.random();
    const brainGeo = new THREE.BufferGeometry();
    brainGeo.setAttribute("position", new THREE.BufferAttribute(brainPos, 3));
    brainGeo.setAttribute("seed", new THREE.BufferAttribute(bSeed, 1));
    const brainMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { time: { value: 0 }, dpr: { value: dpr }, boost: { value: 0 } },
      vertexShader: /* glsl */ `
        attribute float seed; uniform float time; uniform float dpr; uniform float boost;
        varying vec3 vC; varying float vA;
        void main(){
          vec3 p = position;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          // activity: waves sweeping through the cortex + random firing
          float w1 = exp(-pow(dot(p, normalize(vec3(0.3, 0.2, 1.0))) * 0.9 - (fract(time * 0.22) * 5.0 - 2.5), 2.0) * 5.0);
          float w2 = exp(-pow(length(p.xy) * 1.2 - fract(time * 0.31 + 0.5) * 3.4, 2.0) * 7.0);
          float fire = step(0.992, fract(sin(seed * 91.7 + floor(time * 7.0 + seed * 13.0)) * 43758.5));
          float act = w1 * 0.8 + w2 * 0.6 + fire * 1.6;
          vec3 pinkC = vec3(1.0, 0.17, 0.84), cyanC = vec3(0.0, 0.94, 1.0), violet = vec3(0.55, 0.36, 1.0);
          vec3 col = mix(pinkC, cyanC, smoothstep(-1.2, 1.2, p.z));
          col = mix(col, violet, smoothstep(0.4, 1.2, p.y) * 0.5);
          vC = mix(col, vec3(1.0), clamp(act * 0.5, 0.0, 0.8));
          vA = (0.32 + act * 0.9) * (1.0 + boost);
          gl_PointSize = (1.6 + act * 2.4 + seed * 0.8) * dpr * (16.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        varying vec3 vC; varying float vA;
        void main(){
          float d = length(gl_PointCoord - 0.5) * 2.0;
          gl_FragColor = vec4(vC, smoothstep(1.0, 0.0, d) * vA);
        }`,
    });
    const brain = new THREE.Points(brainGeo, brainMat);
    brain.rotation.y = -0.5;
    world.add(brain);

    // synapse sparks: bright points racing between random brain points
    const SP = small ? 24 : 56;
    const spPos = new Float32Array(SP * 3), spCol = new Float32Array(SP * 3), spSize = new Float32Array(SP).fill(small ? 7 : 9);
    const spA = new Int32Array(SP), spB = new Int32Array(SP), spT = new Float32Array(SP), spV = new Float32Array(SP);
    const resetSpark = (i: number) => {
      spA[i] = (Math.random() * BN) | 0;
      spB[i] = (Math.random() * BN) | 0;
      spT[i] = 0;
      spV[i] = 0.8 + Math.random() * 1.4;
      c.set(Math.random() < 0.5 ? "#ffffff" : Math.random() < 0.5 ? "#ff7ae5" : "#7af6ff").toArray(spCol, i * 3);
    };
    for (let i = 0; i < SP; i++) {
      resetSpark(i);
      spT[i] = Math.random();
    }
    const spGeo = new THREE.BufferGeometry();
    const spPosAttr = new THREE.BufferAttribute(spPos, 3);
    spGeo.setAttribute("position", spPosAttr);
    spGeo.setAttribute("color", new THREE.BufferAttribute(spCol, 3));
    spGeo.setAttribute("size", new THREE.BufferAttribute(spSize, 1));
    spGeo.setAttribute("glow", new THREE.BufferAttribute(new Float32Array(SP), 1));
    const sparks = new THREE.Points(spGeo, glowMat());
    brain.add(sparks);

    // soft bloom behind the brain
    const bloomTex = (() => {
      const cv = document.createElement("canvas");
      cv.width = cv.height = 128;
      const g = cv.getContext("2d")!;
      const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      grd.addColorStop(0, "rgba(255,255,255,0.55)");
      grd.addColorStop(0.2, "rgba(190,90,255,0.35)");
      grd.addColorStop(0.5, "rgba(255,43,214,0.12)");
      grd.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = grd;
      g.fillRect(0, 0, 128, 128);
      return new THREE.CanvasTexture(cv);
    })();
    const bloom = new THREE.Sprite(new THREE.SpriteMaterial({ map: bloomTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    bloom.scale.setScalar(6);
    world.add(bloom);

    /* ---------- nodes ---------- */
    const nPos = new Float32Array(N * 3);
    const nCol = new Float32Array(N * 3);
    const nSize = new Float32Array(N);
    const nGlow = new Float32Array(N);
    nodes.forEach((n, i) => {
      pos[i].toArray(nPos, i * 3);
      c.set(n.color).toArray(nCol, i * 3);
      nSize[i] = SIZE[n.tier] * (small ? 0.9 : 1);
    });
    const nodeGeo = new THREE.BufferGeometry();
    const nPosAttr = new THREE.BufferAttribute(nPos, 3);
    nodeGeo.setAttribute("position", nPosAttr);
    nodeGeo.setAttribute("color", new THREE.BufferAttribute(nCol, 3));
    nodeGeo.setAttribute("size", new THREE.BufferAttribute(nSize, 1));
    const glowAttr = new THREE.BufferAttribute(nGlow, 1);
    nodeGeo.setAttribute("glow", glowAttr);
    const nodeMat = glowMat();
    nodeMat.uniforms.twinkle.value = 1;
    world.add(new THREE.Points(nodeGeo, nodeMat));

    /* ---------- edges with light flowing along them ---------- */
    const E = edges.length;
    const ePos = new Float32Array(E * 6);
    const eCol = new Float32Array(E * 6);
    const eAlong = new Float32Array(E * 2);
    const eSeed = new Float32Array(E * 2);
    edges.forEach(([a, b], k) => {
      c.set(nodes[a].tier === 0 ? nodes[b].color : nodes[a].color).toArray(eCol, k * 6);
      c.set(nodes[b].color).toArray(eCol, k * 6 + 3);
      eAlong[k * 2] = 0;
      eAlong[k * 2 + 1] = 1;
      eSeed[k * 2] = eSeed[k * 2 + 1] = Math.random();
    });
    const edgeGeo = new THREE.BufferGeometry();
    const ePosAttr = new THREE.BufferAttribute(ePos, 3);
    edgeGeo.setAttribute("position", ePosAttr);
    edgeGeo.setAttribute("color", new THREE.BufferAttribute(eCol, 3));
    edgeGeo.setAttribute("along", new THREE.BufferAttribute(eAlong, 1));
    edgeGeo.setAttribute("eseed", new THREE.BufferAttribute(eSeed, 1));
    const edgeMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { time: { value: 0 }, base: { value: 0.16 } },
      vertexShader: /* glsl */ `
        attribute vec3 color; attribute float along; attribute float eseed;
        varying vec3 vC; varying float vAl; varying float vS;
        void main(){ vC = color; vAl = along; vS = eseed; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: /* glsl */ `
        uniform float time; uniform float base; varying vec3 vC; varying float vAl; varying float vS;
        void main(){
          float pulse = smoothstep(0.82, 1.0, fract(vAl * 1.5 - time * (0.35 + vS * 0.3) + vS));
          gl_FragColor = vec4(mix(vC, vec3(1.0), pulse * 0.5), base + pulse * base * 3.0);
        }`,
    });
    world.add(new THREE.LineSegments(edgeGeo, edgeMat));

    // highlighted edges for the focused node
    const hiGeo = new THREE.BufferGeometry();
    const hiMat = new THREE.LineBasicMaterial({ color: 0x3dff9a, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false });
    world.add(new THREE.LineSegments(hiGeo, hiMat));

    /* ---------- data packets ---------- */
    const PK = small ? 28 : 72;
    const pkPos = new Float32Array(PK * 3);
    const pkCol = new Float32Array(PK * 3);
    const pkSize = new Float32Array(PK).fill(small ? 8 : 10);
    const pkEdge = new Int32Array(PK);
    const pkT = new Float32Array(PK);
    const pkV = new Float32Array(PK);
    const resetPacket = (i: number, focus: number[] | null) => {
      const pool = focus && focus.length && Math.random() < 0.7 ? focus : null;
      pkEdge[i] = pool ? pool[(Math.random() * pool.length) | 0] : (Math.random() * E) | 0;
      pkT[i] = 0;
      pkV[i] = 0.25 + Math.random() * 0.45;
      c.set(Math.random() < 0.5 ? "#ff2bd6" : "#00f0ff").toArray(pkCol, i * 3);
    };
    for (let i = 0; i < PK; i++) {
      resetPacket(i, null);
      pkT[i] = Math.random();
    }
    const pkGeo = new THREE.BufferGeometry();
    const pkPosAttr = new THREE.BufferAttribute(pkPos, 3);
    pkGeo.setAttribute("position", pkPosAttr);
    const pkColAttr = new THREE.BufferAttribute(pkCol, 3);
    pkGeo.setAttribute("color", pkColAttr);
    pkGeo.setAttribute("size", new THREE.BufferAttribute(pkSize, 1));
    pkGeo.setAttribute("glow", new THREE.BufferAttribute(new Float32Array(PK), 1));
    world.add(new THREE.Points(pkGeo, glowMat()));

    /* ---------- ambient dust (outside the world so it parallaxes) ---------- */
    const DN = small ? 260 : 700;
    const dPos = new Float32Array(DN * 3);
    const dCol = new Float32Array(DN * 3);
    const dSize = new Float32Array(DN);
    for (let i = 0; i < DN; i++) {
      new THREE.Vector3().randomDirection().multiplyScalar(R2 * (1.5 + Math.random() * 2.2)).toArray(dPos, i * 3);
      c.set(Math.random() < 0.8 ? "#3a6dff" : Math.random() < 0.5 ? "#ff7ae5" : "#ffb070").toArray(dCol, i * 3);
      dSize[i] = 1.5 + Math.random() * 3;
    }
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute("position", new THREE.BufferAttribute(dPos, 3));
    dustGeo.setAttribute("color", new THREE.BufferAttribute(dCol, 3));
    dustGeo.setAttribute("size", new THREE.BufferAttribute(dSize, 1));
    dustGeo.setAttribute("glow", new THREE.BufferAttribute(new Float32Array(DN), 1));
    const dustMat = glowMat();
    dustMat.uniforms.twinkle.value = 1;
    const dust = new THREE.Points(dustGeo, dustMat);
    scene.add(dust);

    /* ---------- HTML labels ---------- */
    const labels = nodes.map((n) => {
      const d = document.createElement("div");
      d.className = `sys-label sys-t${n.tier}`;
      d.textContent = n.label;
      d.style.setProperty("--c", n.color);
      labelHost.appendChild(d);
      return d;
    });

    /* ---------- sizing ---------- */
    let W = 1, H = 1;
    const resize = () => {
      W = el.clientWidth || 1;
      H = el.clientHeight || 1;
      renderer.setSize(W, H, false);
      camera.aspect = W / H;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();

    /* ---------- interaction ---------- */
    let rotY = 0.6, rotX = 0.18, velY = reduced ? 0 : 0.06, velX = 0;
    let dragging = false, moved = 0, lx = 0, ly = 0, lastInput = 0;
    let hover = -1;
    const screen = new Float32Array(N * 3);
    const v3 = new THREE.Vector3();

    const pick = (x: number, y: number) => {
      let best = -1, bd = Infinity;
      for (let i = 0; i < N; i++) {
        const dx = screen[i * 3] - x, dy = screen[i * 3 + 1] - y;
        const reach = nodes[i].tier === 2 ? 14 : nodes[i].tier === 0 ? 46 : 24;
        const d = dx * dx + dy * dy;
        if (d < reach * reach && d - screen[i * 3 + 2] * 40 < bd) {
          bd = d - screen[i * 3 + 2] * 40;
          best = i;
        }
      }
      return best;
    };
    const local = (e: PointerEvent | MouseEvent) => {
      const r = el.getBoundingClientRect();
      return [e.clientX - r.left, e.clientY - r.top];
    };
    const onDown = (e: PointerEvent) => {
      dragging = true;
      moved = 0;
      [lx, ly] = local(e);
      renderer.domElement.style.cursor = "grabbing";
    };
    const onMove = (e: PointerEvent) => {
      const [x, y] = local(e);
      if (!dragging && (x < 0 || y < 0 || x > W || y > H)) {
        if (hover !== -1) {
          hover = -1;
          cb.current.onHover(null);
        }
        return;
      }
      if (dragging) {
        const dx = x - lx, dy = y - ly;
        moved += Math.abs(dx) + Math.abs(dy);
        velY = dx * 0.006;
        velX = dy * 0.004;
        rotY += velY;
        rotX = Math.max(-0.9, Math.min(0.9, rotX + velX));
        lx = x;
        ly = y;
        lastInput = performance.now();
      }
      const h = pick(x, y);
      if (h !== hover) {
        hover = h;
        cb.current.onHover(h >= 0 ? nodes[h].id : null);
        renderer.domElement.style.cursor = h >= 0 ? "pointer" : dragging ? "grabbing" : "grab";
      }
    };
    const onUp = (e: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      renderer.domElement.style.cursor = "grab";
      if (moved < 6) {
        const [x, y] = local(e);
        const h = pick(x, y);
        if (h >= 0) cb.current.onSelect(nodes[h].id);
      }
    };
    const onLeave = () => {
      dragging = false;
      if (hover !== -1) {
        hover = -1;
        cb.current.onHover(null);
      }
    };
    // synthetic clicks (hand cursor)
    const onClick = (e: MouseEvent) => {
      if (e.isTrusted) return;
      const [x, y] = local(e);
      const h = pick(x, y);
      if (h >= 0) cb.current.onSelect(nodes[h].id);
    };
    const cv = renderer.domElement;
    cv.addEventListener("pointerdown", onDown);
    addEventListener("pointermove", onMove, { passive: true });
    addEventListener("pointerup", onUp);
    cv.addEventListener("pointerleave", onLeave);
    cv.addEventListener("click", onClick);

    /* ---------- focus ---------- */
    let focusKey = "";
    let focusEdges: number[] = [];
    const neighbours = new Set<number>();
    const applyFocus = (idx: number) => {
      const key = String(idx);
      if (key === focusKey) return;
      focusKey = key;
      neighbours.clear();
      focusEdges = [];
      if (idx >= 0) {
        neighbours.add(idx);
        edges.forEach(([a, b], k) => {
          if (a === idx || b === idx) {
            neighbours.add(a === idx ? b : a);
            focusEdges.push(k);
          }
        });
      }
      hiGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(focusEdges.length * 6), 3));
      hiMat.color.set(idx >= 0 ? nodes[idx].color : "#3dff9a");
      for (let i = 0; i < N; i++) nGlow[i] = idx < 0 ? 0 : neighbours.has(i) ? (i === idx ? 1.5 : 0.8) : -0.55;
      glowAttr.needsUpdate = true;
      edgeMat.uniforms.base.value = idx < 0 ? 0.16 : 0.05;
    };

    /* ---------- loop ---------- */
    let visible = true;
    const io = new IntersectionObserver(([en]) => (visible = en.isIntersecting), { threshold: 0.01 });
    io.observe(el);
    let raf = 0, last = performance.now();
    const indexOf = new Map(nodes.map((n, i) => [n.id, i]));
    const ease = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
    const sa = new THREE.Vector3(), sb = new THREE.Vector3();

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (!visible || document.hidden) {
        last = now;
        return;
      }
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const time = now / 1000;

      // scroll choreography
      const p = progress?.current ?? 0.5;
      const enter = ease(p / 0.32);
      const exit = ease((p - 0.8) / 0.2);
      const fit = Math.max(1, 1.05 / camera.aspect);
      camera.position.z = BASE_Z * fit * (1 + (1 - enter) * 1.1) * (1 - exit * 0.55);
      // shift the globe sideways via the projection (keeps perspective centred on it)
      const sh = shiftRef.current;
      if (sh) camera.setViewOffset(W, H, W * sh, 0, W, H);
      else camera.clearViewOffset();
      el.style.opacity = String(Math.min(1, 0.15 + enter * 1.1) * (1 - exit * 0.85));
      brainMat.uniforms.boost.value = exit * 1.4;

      // rotation: inertia → idle spin; scroll adds a turn; head steering with the neural link
      if (!dragging) {
        velY *= 0.95;
        velX *= 0.9;
        rotY += velY;
        rotX = Math.max(-0.9, Math.min(0.9, rotX + velX));
        if (now - lastInput > 2500 && !reduced) rotY += dt * 0.08;
      }
      let yaw = rotY + (reduced ? 0 : p * 2.4), pitch = rotX;
      if (faceVisible()) {
        const h = headTurn();
        yaw += h.x * 0.9;
        pitch += h.y * 0.5;
      }
      world.rotation.y += (yaw - world.rotation.y) * Math.min(1, dt * 6);
      world.rotation.x += (pitch - world.rotation.x) * Math.min(1, dt * 6);
      const breathe = reduced ? 1 : 1 + Math.sin(time * 1.1) * 0.012;
      world.scale.setScalar(breathe);
      globe.rotation.y = time * 0.025;
      rings[0].rotation.z += dt * 0.05;
      rings[1].rotation.z -= dt * 0.035;
      rings[2].rotation.z += dt * 0.08;
      dust.rotation.y = time * 0.008;
      brain.rotation.y = -0.5 + Math.sin(time * 0.25) * 0.25;
      bloom.scale.setScalar(6 + Math.sin(time * 1.8) * 0.4 + exit * 3);

      // nodes drift a little — the network is alive
      for (let i = 1; i < N; i++) {
        const s = seeds[i] * 6.28;
        const amp = reduced ? 0 : nodes[i].tier === 1 ? 0.12 : 0.18;
        live[i].set(
          pos[i].x + Math.sin(time * 0.6 + s) * amp,
          pos[i].y + Math.sin(time * 0.5 + s * 1.7) * amp,
          pos[i].z + Math.cos(time * 0.55 + s * 1.3) * amp,
        );
        live[i].toArray(nPos, i * 3);
      }
      nPosAttr.needsUpdate = true;
      edges.forEach(([a, b], k) => {
        live[a].toArray(ePos, k * 6);
        live[b].toArray(ePos, k * 6 + 3);
      });
      ePosAttr.needsUpdate = true;

      const focusIdx = hover >= 0 ? hover : (indexOf.get(sel.current) ?? -1);
      applyFocus(focusIdx === 0 ? -1 : focusIdx);
      if (focusEdges.length) {
        const hp = hiGeo.attributes.position as THREE.BufferAttribute;
        focusEdges.forEach((k, j) => {
          const [a, b] = edges[k];
          hp.setXYZ(j * 2, live[a].x, live[a].y, live[a].z);
          hp.setXYZ(j * 2 + 1, live[b].x, live[b].y, live[b].z);
        });
        hp.needsUpdate = true;
      }

      // packets + sparks
      for (let i = 0; i < PK; i++) {
        pkT[i] += dt * pkV[i];
        if (pkT[i] >= 1) resetPacket(i, focusEdges);
        const [a, b] = edges[pkEdge[i]];
        v3.copy(live[a]).lerp(live[b], pkT[i]).toArray(pkPos, i * 3);
      }
      pkPosAttr.needsUpdate = true;
      pkColAttr.needsUpdate = true;
      for (let i = 0; i < SP; i++) {
        spT[i] += dt * spV[i];
        if (spT[i] >= 1) resetSpark(i);
        sa.fromArray(brainPos, spA[i] * 3);
        sb.fromArray(brainPos, spB[i] * 3);
        v3.copy(sa).lerp(sb, spT[i]).multiplyScalar(1 - Math.sin(spT[i] * Math.PI) * 0.25).toArray(spPos, i * 3);
      }
      spPosAttr.needsUpdate = true;

      for (const m of [nodeMat, globeMat, dustMat, brainMat, edgeMat]) m.uniforms.time.value = time;
      world.updateMatrixWorld();
      renderer.render(scene, camera);

      // labels + screen positions for picking
      for (let i = 0; i < N; i++) {
        v3.copy(live[i]).applyMatrix4(world.matrixWorld);
        const depth = (v3.z + R2) / (2 * R2);
        v3.project(camera);
        const x = (v3.x * 0.5 + 0.5) * W, y = (-v3.y * 0.5 + 0.5) * H;
        screen[i * 3] = x;
        screen[i * 3 + 1] = y;
        screen[i * 3 + 2] = depth;
        const lab = labels[i];
        const tier = nodes[i].tier;
        const lit = neighbours.has(i);
        const show = tier === 0 || (tier === 1 ? depth > (small ? 0.66 : 0.48) || lit : lit && focusIdx > 0);
        const op = (!show ? 0 : tier === 0 ? 1 : lit ? 1 : 0.35 + depth * 0.65) * enter * (1 - exit);
        lab.style.opacity = op.toFixed(2);
        lab.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, ${tier === 0 ? "-50%" : "14px"})`;
        lab.dataset.lit = lit && focusIdx >= 0 ? "1" : "0";
      }
    };
    raf = requestAnimationFrame(tick);
    onReady?.(true);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      cv.removeEventListener("pointerdown", onDown);
      removeEventListener("pointermove", onMove);
      removeEventListener("pointerup", onUp);
      cv.removeEventListener("pointerleave", onLeave);
      cv.removeEventListener("click", onClick);
      labels.forEach((l) => l.remove());
      scene.traverse((o) => {
        const m = o as unknown as { geometry?: { dispose: () => void }; material?: { dispose: () => void } };
        m.geometry?.dispose();
        m.material?.dispose();
      });
      bloomTex.dispose();
      renderer.dispose();
      cv.remove();
    };
    // nodes/edges are static for the lifetime of the page
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative h-full w-full">
      <div ref={host} className="absolute inset-0" />
      <div ref={labelsRef} className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden />
    </div>
  );
}
