"use client";

import { useEffect, useRef, useState } from "react";
import SplashCursor from "@/components/public/splash-cursor";

/** Texture de démo (dégradé + grille) pour bien voir la déformation. */
function makeTexture(): HTMLCanvasElement | null {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext("2d");
  if (!ctx) return null;
  const g = ctx.createLinearGradient(0, 0, 256, 256);
  g.addColorStop(0, "#c9a27a");
  g.addColorStop(0.5, "#6f8bb0");
  g.addColorStop(1, "#b07a9c");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = "rgba(255,255,255,0.45)";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 256; i += 16) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 256);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(256, i);
    ctx.stroke();
  }
  return c;
}

const VS = `
precision mediump float;
attribute vec2 aPos;   // -1..1 (maillage)
attribute vec2 aUv;
uniform float uTime;
uniform float uWave;
uniform float uHover;
uniform vec2 uMouse;
varying vec2 vUv;
void main() {
  float z = 0.0;
  // vague (démo du défilement)
  z += sin(aPos.y * 2.4 + uTime * 2.2) * uWave;
  // survol : bosse qui suit la souris + inclinaison + flottement des bords
  float dm = distance(aPos, uMouse);
  float bulge = exp(-dm * dm * 1.1) * (1.0 + sin(uTime) * 0.12);
  float tilt = aPos.x * uMouse.x + aPos.y * uMouse.y;
  float fl = sin(aPos.x * 2.4 + uTime) + sin(aPos.y * 2.1 + uTime * 1.2);
  float edge = max(abs(aPos.x), abs(aPos.y));
  z += (bulge * 0.16 + tilt * 0.06 + fl * (0.3 + 0.7 * edge) * 0.04) * uHover;
  // fausse perspective : z (vers l'avant) écarte le sommet du centre → bombé visible
  gl_Position = vec4(aPos / (1.0 - z * 0.7), 0.0, 1.0);
  vUv = aUv;
}`;

const FS = `
precision mediump float;
uniform sampler2D uTex;
varying vec2 vUv;
void main() { gl_FragColor = texture2D(uTex, vUv); }`;

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const sh = gl.createShader(type)!;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  return sh;
}

/** Aperçu d'un effet de déformation, en WebGL natif (robuste, autonome). */
function DeformPreview({
  mode,
  enabled,
  intensity,
}: {
  mode: "photoHover" | "scrollWave";
  enabled: boolean;
  intensity: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cfg = useRef({ enabled, intensity, hover: false, mx: 0, my: 0 });
  useEffect(() => {
    cfg.current.enabled = enabled;
    cfg.current.intensity = intensity;
  }, [enabled, intensity]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", {
      alpha: true,
      antialias: true,
      premultipliedAlpha: false,
    });
    if (!gl) return;

    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    gl.useProgram(prog);

    // Maillage NxN dans [-1,1]
    const N = 24;
    const pos: number[] = [];
    const uv: number[] = [];
    const idx: number[] = [];
    for (let y = 0; y <= N; y++) {
      for (let x = 0; x <= N; x++) {
        pos.push((x / N) * 2 - 1, (y / N) * 2 - 1);
        uv.push(x / N, y / N);
      }
    }
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const a = y * (N + 1) + x;
        const b = a + 1;
        const c = a + (N + 1);
        const d = c + 1;
        idx.push(a, b, c, b, d, c);
      }
    }
    const posBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(pos), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uvBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uv), gl.STATIC_DRAW);
    const aUv = gl.getAttribLocation(prog, "aUv");
    gl.enableVertexAttribArray(aUv);
    gl.vertexAttribPointer(aUv, 2, gl.FLOAT, false, 0, 0);

    const idxBuf = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuf);
    gl.bufferData(
      gl.ELEMENT_ARRAY_BUFFER,
      new Uint16Array(idx),
      gl.STATIC_DRAW,
    );

    // Texture
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    const texImg = makeTexture();
    if (texImg) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texImg);
    }

    const uTime = gl.getUniformLocation(prog, "uTime");
    const uWave = gl.getUniformLocation(prog, "uWave");
    const uHover = gl.getUniformLocation(prog, "uHover");
    const uMouse = gl.getUniformLocation(prog, "uMouse");
    gl.uniform1i(gl.getUniformLocation(prog, "uTex"), 0);

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
      const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
    };

    let t = 0;
    let hv = 0;
    let smx = 0;
    let smy = 0;
    let raf = 0;
    let running = false;
    const render = () => {
      if (!running) return;
      resize();
      t += 0.016;
      const c = cfg.current;
      const mul = c.enabled ? c.intensity / 100 : 0;
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(uTime, t);
      if (mode === "scrollWave") {
        gl.uniform1f(uWave, Math.sin(t) * 0.12 * mul);
        gl.uniform1f(uHover, 0);
        gl.uniform2f(uMouse, 0, 0);
      } else {
        hv += ((c.hover ? mul : 0) - hv) * 0.1;
        smx += (c.mx - smx) * 0.1;
        smy += (c.my - smy) * 0.1;
        gl.uniform1f(uHover, hv);
        gl.uniform2f(uMouse, smx, smy);
        gl.uniform1f(uWave, 0);
      }
      gl.drawElements(gl.TRIANGLES, idx.length, gl.UNSIGNED_SHORT, 0);
      raf = requestAnimationFrame(render);
    };
    const start = () => {
      if (running) return;
      running = true;
      raf = requestAnimationFrame(render);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };
    // PERF : n'anime QUE quand l'aperçu est À L'ÉCRAN. Sinon les boucles WebGL des
    // 3 aperçus tournent en continu dans le vide → page qui rame + scroll saccadé.
    const io = new IntersectionObserver(
      ([e]) => (e.isIntersecting ? start() : stop()),
      { threshold: 0 },
    );
    io.observe(canvas);

    // NB : on n'appelle PAS `WEBGL_lose_context.loseContext()` ici. En dev,
    // React (Strict Mode) monte l'effet 2× ; perdre le contexte au 1ᵉʳ démontage
    // le tue DÉFINITIVEMENT pour ce <canvas> → au 2ᵉ montage `getContext` rend le
    // même contexte mort → rien ne s'affiche. On se contente d'arrêter la boucle ;
    // le contexte (réutilisé tel quel au remount) reste vivant, et il est libéré
    // par le GC quand le <canvas> est retiré du DOM. (1 seul contexte par aperçu.)
    return () => {
      stop();
      io.disconnect();
    };
  }, [mode]);

  return (
    <div
      className="relative size-32 shrink-0 overflow-hidden rounded-md bg-neutral-200"
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        cfg.current.hover = true;
        cfg.current.mx = ((e.clientX - r.left) / r.width) * 2 - 1;
        cfg.current.my = -(((e.clientY - r.top) / r.height) * 2 - 1);
      }}
      onMouseLeave={() => {
        cfg.current.hover = false;
      }}
    >
      <canvas ref={canvasRef} className="block size-full" />
      <span className="pointer-events-none absolute bottom-1 right-1 rounded bg-black/45 px-1.5 py-px text-[10px] font-medium text-white">
        {mode === "scrollWave" ? "vague auto" : "survole ici"}
      </span>
    </div>
  );
}

export function AnimationPreview({
  kind,
  enabled,
  intensity,
}: {
  kind: "cursor" | "photoHover" | "photoDim" | "scrollWave";
  enabled: boolean;
  intensity: number;
}) {
  if (kind === "cursor")
    return <CursorPreview enabled={enabled} intensity={intensity} />;
  if (kind === "photoDim")
    return <HoverDimPreview enabled={enabled} intensity={intensity} />;
  return <DeformPreview mode={kind} enabled={enabled} intensity={intensity} />;
}

/** Aperçu du survol : mini-grille de vignettes — celle sous la souris reste
 *  nette, les autres s'estompent (mêmes valeurs que la galerie publique). */
function HoverDimPreview({
  enabled,
  intensity,
}: {
  enabled: boolean;
  intensity: number;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const dimAlpha = enabled ? Math.max(0.05, 1 - 0.55 * (intensity / 100)) : 1;
  const tiles = [
    "linear-gradient(135deg,#c9a27a,#8a6a4a)",
    "linear-gradient(135deg,#6f8bb0,#44597a)",
    "linear-gradient(135deg,#b07a9c,#7a4e6b)",
    "linear-gradient(135deg,#7aa88a,#4c7059)",
  ];
  return (
    <div className="relative size-32 shrink-0 overflow-hidden rounded-md bg-neutral-200">
      <div className="grid size-full grid-cols-2 gap-1 p-1">
        {tiles.map((bg, i) => (
          <div
            key={i}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered((h) => (h === i ? null : h))}
            className="rounded-sm transition-opacity duration-[400ms] ease-in-out"
            style={{
              background: bg,
              opacity: hovered !== null && hovered !== i ? dimAlpha : 1,
            }}
          />
        ))}
      </div>
      <span className="pointer-events-none absolute bottom-1 right-1 rounded bg-black/45 px-1.5 py-px text-[10px] font-medium text-white">
        survole ici
      </span>
    </div>
  );
}

/** Aperçu du curseur fluide. La simulation (lourde) n'est MONTÉE que quand la box
 *  est à l'écran (sinon elle tourne dans le vide → page qui rame). Résolution
 *  réduite vs le site (petite box). */
function CursorPreview({
  enabled,
  intensity,
}: {
  enabled: boolean;
  intensity: number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => setVisible(e.isIntersecting),
      { rootMargin: "150px" }, // marge → pas de montage/démontage en rafale au scroll
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className="relative size-32 shrink-0 overflow-hidden rounded-md"
      style={{ background: "linear-gradient(120deg,#2c2c2c,#5a5a5a 45%,#262626)" }}
    >
      {enabled && visible ? (
        <SplashCursor
          CONTAINED
          OPACITY={0.85 * (intensity / 100)}
          DENSITY_DISSIPATION={3}
          SPLAT_RADIUS={0.3}
          SIM_RESOLUTION={32}
          DYE_RESOLUTION={128}
        />
      ) : (
        !enabled && (
          <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white">
            Désactivé
          </span>
        )
      )}
      <span className="pointer-events-none absolute bottom-1 right-1 rounded bg-black/45 px-1.5 py-px text-[10px] font-medium text-white">
        bouge la souris ici
      </span>
    </div>
  );
}
