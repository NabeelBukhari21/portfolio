"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { faceVisible, headTurn } from "@/lib/neural/engine";

/**
 * ALCHE-style project reel: clean curved glass screens on the OUTSIDE of a big ring (the focused
 * one closest to you, neighbours curving away at the edges), in a cylindrical grid room. Each
 * screenshot sits slightly zoomed inside its glass and drifts with the ring + pointer (inner parallax).
 * The canvas is transparent so the site's gradient shows through; top/bottom fade into the page.
 * Scroll drives the ring. The page decides which screenshot the focused screen shows (shot ref),
 * so the on-page thumbnail strip and the screen stay in sync; screens crossfade between shots.
 */

export type StageItem = { slug: string; name: string; kind: string; color: string; images: string[] };
export type StageHud = { q: [number, number, number, number] };

type Props = {
  items: StageItem[];
  /** target position in "card units" (0 … items.length-1), written by the scroll handler */
  target: React.RefObject<number>;
  /** which screenshot the focused screen should show */
  shot: React.RefObject<{ i: number; k: number }>;
  onPick: (i: number) => void;
  /** click on the focused screen */
  onOpen: (i: number) => void;
  /** pointer over a screen (-1 = none) */
  onHover?: (i: number, x: number, y: number) => void;
  onHud?: (h: StageHud) => void;
  onReady?: (ok: boolean) => void;
};

const STEP = 0.6; // radians between screens
const R = 16; // ring radius (ring centre is behind the focused screen)
const CAM_D = 12; // camera distance from the focused screen

/* ---------- textures ---------- */

function coverCanvas(item: StageItem, w: number) {
  const h = Math.round(w * 0.6);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;
  const grd = g.createLinearGradient(0, 0, w, h);
  grd.addColorStop(0, "#0d0b19");
  grd.addColorStop(1, "#141127");
  g.fillStyle = grd;
  g.fillRect(0, 0, w, h);
  g.strokeStyle = item.color + "33";
  g.lineWidth = 1;
  for (let x = 0; x < w; x += w / 16) {
    g.beginPath();
    g.moveTo(x, 0);
    g.lineTo(x, h);
    g.stroke();
  }
  for (let y = 0; y < h; y += w / 16) {
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(w, y);
    g.stroke();
  }
  const glow = g.createRadialGradient(w * 0.7, h * 0.4, 0, w * 0.7, h * 0.4, w * 0.5);
  glow.addColorStop(0, item.color + "55");
  glow.addColorStop(1, "transparent");
  g.fillStyle = glow;
  g.fillRect(0, 0, w, h);
  g.fillStyle = item.color;
  g.font = `600 ${Math.round(w * 0.022)}px "JetBrains Mono", monospace`;
  g.fillText(`// ${item.kind.toUpperCase()} · CASE FILE`, w * 0.07, h * 0.2);
  g.fillStyle = "#e9e7f5";
  g.font = `700 ${Math.round(w * 0.075)}px "Chakra Petch", system-ui, sans-serif`;
  const words = item.name.toUpperCase().split(" ");
  let line = "";
  let y = h * 0.42;
  for (const word of words) {
    const t = line ? `${line} ${word}` : word;
    if (g.measureText(t).width > w * 0.86 && line) {
      g.fillText(line, w * 0.07, y);
      y += w * 0.085;
      line = word;
    } else line = t;
  }
  g.fillText(line, w * 0.07, y);
  return c;
}

function loadImage(src: string, maxW: number): Promise<HTMLCanvasElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      // downscale before upload — keeps GPU memory small on phones
      const s = Math.min(1, maxW / img.naturalWidth);
      const c = document.createElement("canvas");
      c.width = Math.max(2, Math.round(img.naturalWidth * s));
      c.height = Math.max(2, Math.round(img.naturalHeight * s));
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      res(c);
    };
    img.onerror = rej;
    img.src = src;
  });
}

function toTex(c: HTMLCanvasElement) {
  const t = new THREE.CanvasTexture(c);
  // custom shaders write colours straight out, so keep the texture in sRGB (no linear decode) — true-to-life brightness
  t.colorSpace = THREE.NoColorSpace;
  t.anisotropy = 4;
  return t;
}

/* ---------- shaders ---------- */

const cardVert = /* glsl */ `
  uniform vec2 uSize; uniform float uBend;
  varying vec2 vUv;
  void main(){
    vUv = uv;
    vec3 p = position;
    float nx = position.x * 2.0;
    p.xy *= uSize;
    p.z += (1.0 - nx * nx) * uBend; // gently convex glass screen
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }`;

const cardFrag = /* glsl */ `
  uniform sampler2D map; uniform sampler2D map2; uniform float uMix;
  uniform float uAsp1; uniform float uAsp2; uniform float uCardAspect;
  uniform float uFocus; uniform vec2 uPar; uniform vec3 uColor;
  varying vec2 vUv;
  vec2 cover(vec2 uv, float img){
    // picture sits zoomed inside the frame and drifts with the ring + pointer (parallax)
    uv = (uv - 0.5) / 1.18 + 0.5 + uPar;
    float r = img / uCardAspect;
    if (r < 1.0) uv.y = 1.0 - (1.0 - uv.y) * r - (1.0 - r) * 0.12; // keep near the top of tall screenshots
    else uv.x = 0.5 + (uv.x - 0.5) / r;
    return clamp(uv, 0.001, 0.999);
  }
  void main(){
    vec3 col = texture2D(map, cover(vUv, uAsp1)).rgb;
    if (uMix > 0.0) col = mix(col, texture2D(map2, cover(vUv, uAsp2)).rgb, uMix);
    // neon frame: thin cyan → pink line round the edge + brighter corner brackets
    vec2 d = abs(vUv - 0.5) * 2.0;
    float dx = (1.0 - d.x) * uCardAspect * 0.5; // distance to the side edge, in screen-heights
    float dy = (1.0 - d.y) * 0.5;               // distance to top/bottom edge
    float e = min(dx, dy);
    float frame = 1.0 - smoothstep(0.002, 0.006, e);
    float inCorner = step(dx, 0.07) * step(dy, 0.07);
    float corner = inCorner * (1.0 - smoothstep(0.008, 0.012, e));
    vec3 neon = mix(vec3(0.0, 0.94, 1.0), vec3(1.0, 0.17, 0.84), vUv.x);
    neon = mix(neon, uColor, 0.25);
    col = mix(col, neon * 1.2, clamp(frame + corner, 0.0, 1.0) * mix(0.6, 1.0, uFocus));
    col *= mix(0.8, 1.0, uFocus);
    gl_FragColor = vec4(col, 1.0);
  }`;

/** soft neon halo behind each screen */
const haloVert = /* glsl */ `
  uniform vec2 uSize; uniform float uBend;
  varying vec2 vUv;
  void main(){
    vUv = uv;
    vec3 p = position;
    float nx = position.x * 2.0;
    p.xy *= uSize * 1.22;
    p.z += (1.0 - nx * nx) * uBend - 0.25;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }`;
const haloFrag = /* glsl */ `
  uniform float uFocus; uniform vec3 uColor; uniform float uCardAspect;
  varying vec2 vUv;
  void main(){
    // distance outside the screen rectangle (screen = inner 1/1.22 of this quad)
    vec2 q = abs(vUv - 0.5) * 2.0 * 1.22;
    vec2 o = max(q - 1.0, 0.0) * vec2(uCardAspect, 1.0);
    float dist = length(o);
    float glow = exp(-dist * 9.0);
    vec3 neon = mix(vec3(0.0, 0.94, 1.0), vec3(1.0, 0.17, 0.84), vUv.x);
    neon = mix(neon, uColor, 0.3);
    gl_FragColor = vec4(neon, glow * 0.55 * uFocus);
  }`;

export function ProjectStage({ items, target, shot, onPick, onOpen, onHover, onHud, onReady }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const cb = useRef({ onPick, onOpen, onHover, onHud });
  useEffect(() => {
    cb.current = { onPick, onOpen, onHover, onHud };
  });

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const test = document.createElement("canvas");
    if (!(test.getContext("webgl2") || test.getContext("webgl"))) {
      onReady?.(false);
      return;
    }
    const small = matchMedia("(max-width: 768px)").matches;
    const maxW = small ? 720 : 1280;

    const renderer = new THREE.WebGLRenderer({ antialias: !small, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(devicePixelRatio, small ? 1.5 : 1.75));
    renderer.setClearColor(0x000000, 0);
    el.appendChild(renderer.domElement);
    Object.assign(renderer.domElement.style, { display: "block", width: "100%", height: "100%", touchAction: "pan-y" });

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);
    const rig = new THREE.Group(); // parallax wrapper
    scene.add(rig);
    rig.add(camera);
    camera.position.z = CAM_D;

    /* ---- backdrop: the focused screenshot, heavily blurred via mip bias ---- */
    const blank = toTex(coverCanvas(items[0], 64));
    const backMat = new THREE.ShaderMaterial({
      transparent: true,
      depthTest: false,
      depthWrite: false,
      uniforms: { a: { value: blank }, b: { value: blank }, mixAB: { value: 0 } },
      vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.999, 1.0); }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D a; uniform sampler2D b; uniform float mixAB; varying vec2 vUv;
        void main(){
          vec2 uv = (vUv - 0.5) * 0.7 + 0.5;
          vec3 c = mix(texture2D(a, uv, 7.0).rgb, texture2D(b, uv, 7.0).rgb, mixAB);
          float v = smoothstep(0.95, 0.1, length((vUv - 0.5) * vec2(1.3, 1.0)));
          gl_FragColor = vec4(c * 0.8, v * 0.3);
        }`,
    });
    const back = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), backMat);
    back.frustumCulled = false;
    // drawn in its own pass first — as a transparent object in the main scene it would be sorted
    // after the screens and veil them
    const backScene = new THREE.Scene();
    backScene.add(back);
    renderer.autoClear = false;

    /* ---- grid room: inside of a cylinder ---- */
    const gridMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
      vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: /* glsl */ `
        varying vec2 vUv;
        float line(float x, float w){ float f = abs(fract(x) - 0.5); return smoothstep(0.5 - w, 0.5, f); }
        void main(){
          vec2 g = vec2(vUv.x * 96.0, vUv.y * 30.0);
          float minor = max(line(g.x, 0.035), line(g.y, 0.035)) * 0.08;
          float major = max(line(g.x / 4.0, 0.012), line(g.y / 4.0, 0.012)) * 0.2;
          vec2 m = abs(fract(g / 4.0) - 0.5);
          float plus = (step(m.x, 0.004) * step(m.y, 0.035) + step(m.y, 0.004) * step(m.x, 0.035)) * 0.35;
          float fade = smoothstep(0.0, 0.3, vUv.y) * smoothstep(1.0, 0.7, vUv.y);
          gl_FragColor = vec4(vec3(0.72, 0.76, 0.95), (minor + major + plus) * fade);
        }`,
    });
    const room = new THREE.Mesh(new THREE.CylinderGeometry(34, 34, 50, 96, 1, true), gridMat);
    scene.add(room);

    /* ---- screens ---- */
    const geo = new THREE.PlaneGeometry(1, 1, 40, 1);
    type Card = {
      mesh: THREE.Mesh;
      refl: THREE.Mesh;
      u: Record<string, THREE.IUniform>;
      cover: THREE.Texture;
      tex: (THREE.Texture | null)[];
      loading: boolean[];
      showK: number; // screenshot currently on screen (-1 = generated cover)
      fadeTo: number; // screenshot fading in (-1 = none)
    };
    const aspect = (t: THREE.Texture) => (t.image as HTMLCanvasElement).width / (t.image as HTMLCanvasElement).height;
    const cards: Card[] = items.map((it) => {
      const cover = toTex(coverCanvas(it, small ? 512 : 768));
      const u: Record<string, THREE.IUniform> = {
        map: { value: cover },
        map2: { value: cover },
        uMix: { value: 0 },
        uAsp1: { value: aspect(cover) },
        uAsp2: { value: aspect(cover) },
        uCardAspect: { value: 1.7 },
        uSize: { value: new THREE.Vector2(1, 1) },
        uBend: { value: 0.4 },
        uFocus: { value: 0 },
        uPar: { value: new THREE.Vector2() },
        uColor: { value: new THREE.Color(it.color) },
      };
      const mesh = new THREE.Mesh(geo, new THREE.ShaderMaterial({ uniforms: u, vertexShader: cardVert, fragmentShader: cardFrag }));
      const refl = new THREE.Mesh(
        geo,
        new THREE.ShaderMaterial({
          uniforms: u,
          vertexShader: haloVert,
          fragmentShader: haloFrag,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }),
      );
      refl.renderOrder = -1;
      mesh.frustumCulled = refl.frustumCulled = false; // geometry is scaled in the shader
      scene.add(mesh, refl);
      return { mesh, refl, u, cover, tex: it.images.map(() => null), loading: it.images.map(() => false), showK: -1, fadeTo: -1 };
    });

    let disposed = false;
    const ensure = (i: number, k: number) => {
      const c = cards[i];
      if (!c || k < 0 || k >= items[i].images.length || c.tex[k] || c.loading[k]) return;
      c.loading[k] = true;
      loadImage(items[i].images[k], maxW)
        .then((cv) => {
          if (!disposed) c.tex[k] = toTex(cv);
        })
        .catch(() => {}) // missing screenshot → keeps the generated cover
        .finally(() => (c.loading[k] = false));
    };
    const release = (i: number) => {
      // far away: keep only the first screenshot
      const c = cards[i];
      c.tex.forEach((t, k) => {
        if (!t || k === 0) return;
        t.dispose();
        c.tex[k] = null;
      });
      if (c.showK > 0) show(c, c.tex[0] ? 0 : -1, true);
      c.fadeTo = -1;
      c.u.uMix.value = 0;
    };
    const show = (c: Card, k: number, instant = false) => {
      const t = k < 0 ? c.cover : c.tex[k];
      if (!t) return;
      if (instant || c.showK === -1) {
        c.u.map.value = t;
        c.u.uAsp1.value = aspect(t);
        c.showK = k;
        c.fadeTo = -1;
        c.u.uMix.value = 0;
        return;
      }
      c.u.map2.value = t;
      c.u.uAsp2.value = aspect(t);
      c.fadeTo = k;
      c.u.uMix.value = 0.0001;
    };

    /* ---- sizing ---- */
    let cardH = 4.6;
    let lift = 0.35; // phones: raise the screen to leave room for the caption
    const resize = () => {
      const w = el.clientWidth || 1, h = el.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      const visW = 2 * CAM_D * Math.tan((camera.fov * Math.PI) / 360) * camera.aspect;
      const cardW = visW * (camera.aspect < 1 ? 0.86 : 0.56);
      cardH = cardW * (camera.aspect < 1 ? 0.7 : 0.58);
      lift = camera.aspect < 1 ? cardH * 0.62 : 0.35;
      for (const c of cards) {
        (c.u.uSize.value as THREE.Vector2).set(cardW, cardH);
        c.u.uCardAspect.value = cardW / cardH;
        c.u.uBend.value = cardW * 0.035;
      }
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();

    /* ---- input ---- */
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const pick = (cx: number, cy: number) => {
      const r = el.getBoundingClientRect();
      ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      let best = -1, bestD = Infinity;
      cards.forEach((c, i) => {
        if (!c.mesh.visible) return;
        // test the screen as a flat quad at its real size
        c.mesh.scale.set((c.u.uSize.value as THREE.Vector2).x, cardH, 1);
        c.mesh.updateMatrixWorld();
        const hit = ray.intersectObject(c.mesh, false)[0];
        c.mesh.scale.set(1, 1, 1);
        c.mesh.updateMatrixWorld();
        if (hit && hit.distance < bestD) {
          bestD = hit.distance;
          best = i;
        }
      });
      return best;
    };
    let px = 0, py = 0;
    let hoverI = -1;
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      px = ((e.clientX - r.left) / r.width) * 2 - 1;
      py = ((e.clientY - r.top) / r.height) * 2 - 1;
      if (e.pointerType !== "mouse") return;
      const hit = pick(e.clientX, e.clientY);
      el.style.cursor = hit >= 0 ? "pointer" : "";
      if (hit !== hoverI || hit >= 0) cb.current.onHover?.(hit, e.clientX, e.clientY);
      hoverI = hit;
    };
    const onLeave = () => {
      hoverI = -1;
      cb.current.onHover?.(-1, 0, 0);
    };
    let downAt = { x: 0, y: 0 };
    const onDown = (e: PointerEvent) => (downAt = { x: e.clientX, y: e.clientY });
    const onClick = (e: MouseEvent) => {
      if (Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 8) return;
      const i = pick(e.clientX, e.clientY);
      if (i < 0) return;
      if (i === Math.round(cur)) cb.current.onOpen(i);
      else cb.current.onPick(i);
    };
    el.addEventListener("pointermove", onMove, { passive: true });
    el.addEventListener("pointerleave", onLeave);
    el.addEventListener("pointerdown", onDown, { passive: true });
    el.addEventListener("click", onClick);

    let visible = true;
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting), { threshold: 0 });
    io.observe(el);

    /* ---- loop ---- */
    let cur = target.current ?? 0;
    let mx = 0, my = 0;
    let raf = 0;
    let t0 = performance.now();
    let lastFocus = -1;
    let backFrom: THREE.Texture = blank, backTo: THREE.Texture = blank, backMix = 1;
    let hudTick = 0;
    const q = new THREE.Quaternion();
    const eul = new THREE.Euler();

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (!visible || document.hidden) {
        t0 = now;
        return;
      }
      const dt = Math.min(0.05, (now - t0) / 1000);
      t0 = now;

      const tgt = target.current ?? 0;
      cur += (tgt - cur) * Math.min(1, dt * 6);
      if (Math.abs(tgt - cur) < 0.0005) cur = tgt;

      const focus = Math.max(0, Math.min(cards.length - 1, Math.round(cur)));
      if (focus !== lastFocus) {
        lastFocus = focus;
        for (let i = 0; i < cards.length; i++) {
          if (Math.abs(i - focus) <= 2) ensure(i, 0);
          else release(i);
        }
      }

      // screenshots: first one shows as soon as it loads; the focused screen follows the page's shot index
      cards.forEach((c, i) => {
        if (c.showK === -1 && c.tex[0]) show(c, 0, true);
        if (i !== focus) return;
        const want = shot.current?.i === i ? shot.current.k : 0;
        ensure(i, want);
        ensure(i, want + 1); // prefetch the next one
        if (want !== c.showK && want !== c.fadeTo && c.tex[want]) show(c, want);
      });
      for (const c of cards) {
        if (c.fadeTo < 0) continue;
        c.u.uMix.value = Math.min(1, (c.u.uMix.value as number) + dt * 2.2);
        if ((c.u.uMix.value as number) >= 1) show(c, c.fadeTo, true);
      }

      // backdrop follows whatever the focused screen shows
      const fc = cards[focus];
      const showing = (fc.fadeTo >= 0 ? fc.u.map2.value : fc.u.map.value) as THREE.Texture;
      if (showing !== backTo && backMix >= 1) {
        backFrom = backTo;
        backTo = showing;
        backMix = 0;
      }
      backMix = Math.min(1, backMix + dt * 1.6);
      backMat.uniforms.a.value = backFrom;
      backMat.uniforms.b.value = backTo;
      backMat.uniforms.mixAB.value = backMix;

      cards.forEach((c, i) => {
        const a = (i - cur) * STEP;
        const vis = Math.abs(a) < 1.25;
        c.mesh.visible = c.refl.visible = vis;
        if (!vis) return;
        c.mesh.position.set(Math.sin(a) * R, lift, -R * (1 - Math.cos(a)));
        c.mesh.rotation.set(0, a, 0);
        // inner parallax: the picture slides against its frame as the ring turns and the pointer moves
        (c.u.uPar.value as THREE.Vector2).set(Math.max(-0.07, Math.min(0.07, -a * 0.11 + mx * 0.025)), my * 0.02);
        c.refl.position.copy(c.mesh.position);
        c.refl.rotation.copy(c.mesh.rotation);
        c.u.uFocus.value = Math.max(0, 1 - Math.abs(i - cur));
      });

      // parallax: pointer, or the visitor's head when the neural link is on
      const ht = faceVisible() ? headTurn() : null;
      const tx = ht ? ht.x * 0.9 : px;
      const ty = ht ? ht.y * 0.6 : py;
      mx += (tx - mx) * Math.min(1, dt * 3);
      my += (ty - my) * Math.min(1, dt * 3);
      rig.rotation.set(-my * 0.04, -mx * 0.06, 0);
      rig.position.set(mx * 0.35, -my * 0.15, 0);
      room.rotation.y = -cur * STEP * 0.25;

      renderer.clear();
      renderer.render(backScene, camera);
      renderer.render(scene, camera);

      if (++hudTick % 6 === 0 && cb.current.onHud) {
        eul.set(-my * 0.04, -cur * STEP, 0);
        q.setFromEuler(eul);
        cb.current.onHud({ q: [q.x, q.y, q.z, q.w] });
      }
    };
    raf = requestAnimationFrame(tick);
    onReady?.(true);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("click", onClick);
      for (const c of cards) {
        c.cover.dispose();
        c.tex.forEach((t) => t?.dispose());
        (c.mesh.material as THREE.Material).dispose();
        (c.refl.material as THREE.Material).dispose();
      }
      blank.dispose();
      geo.dispose();
      room.geometry.dispose();
      gridMat.dispose();
      back.geometry.dispose();
      backMat.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
    // items are static content
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={host}
      className="absolute inset-0 [mask-image:linear-gradient(to_bottom,transparent,black_16%,black_86%,transparent)]"
    />
  );
}
