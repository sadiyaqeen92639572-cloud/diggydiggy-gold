'use client';

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';

/**
 * Screen-wide debris rendered on ONE canvas.
 *
 * Why not DOM elements: the previous version animated ~30 fixed-position divs,
 * each with `will-change: transform` (so each became its own compositor layer)
 * and blur filters on the dust. Measurement showed the main thread was fine —
 * long tasks never exceeded 90ms — while pointer events reported 104-136ms
 * totals with only 1ms of handler processing. That gap is presentation delay:
 * the renderer couldn't produce frames fast enough, because it was rasterizing
 * dozens of layers and large blurred surfaces every frame.
 *
 * One canvas is one layer. Particles become arithmetic plus a few fill calls, so
 * hundreds are cheaper than a dozen divs were, and nothing has to be culled
 * mid-flight to keep up.
 */

export interface DebrisSpawnOptions {
  /** Viewport coordinates the burst originates from. */
  originX: number;
  originY: number;
  /** How many pieces. */
  count: number;
  /** Rare/escalated hit — bigger, goldier burst. */
  big: boolean;
  /** 0-1 tap cadence. Faster tapping throws debris harder and further. */
  heat: number;
}

export interface DebrisCanvasHandle {
  spawn: (opts: DebrisSpawnOptions) => void;
}

const GOLD = '#D97706';
const GOLD_SOFT = '#FBBF24';
const STONE = '#8A7359';
const STONE_DARK = '#6E5A45';
const INK = '#0F172A';
const DUST = '190, 174, 150';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rot: number;
  rotSpeed: number;
  age: number;
  life: number;
  gold: boolean;
  dust: boolean;
  /** Flying at the camera: grows hard and ignores gravity. */
  toPlayer: boolean;
  growth: number;
}

export const DebrisCanvas = forwardRef<DebrisCanvasHandle>(function DebrisCanvas(_props, ref) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number | null>(null);
  const lastFrameRef = useRef(0);
  const dprRef = useRef(1);

  // Keep the backing store matched to the viewport, accounting for DPR so the
  // shapes aren't soft on a retina/scaled display.
  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    dprRef.current = dpr;
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
  }, []);

  const draw = useCallback((ctx: CanvasRenderingContext2D, p: Particle) => {
    const t = p.age / p.life;
    const fade = t > 0.75 ? 1 - (t - 0.75) / 0.25 : 1;
    const size = p.size * (1 + p.growth * t);

    if (p.dust) {
      // Soft puff via a radial gradient — the canvas equivalent of the old CSS
      // blur, but rasterized once per frame inside a single layer.
      const r = size * 1.6;
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
      grad.addColorStop(0, `rgba(${DUST}, ${0.5 * fade})`);
      grad.addColorStop(1, `rgba(${DUST}, 0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.globalAlpha = fade;

    if (p.gold) {
      ctx.fillStyle = GOLD;
      ctx.strokeStyle = INK;
      ctx.lineWidth = Math.max(1, size * 0.18);
      ctx.beginPath();
      ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Inner highlight so gold reads as gold at small sizes.
      ctx.fillStyle = GOLD_SOFT;
      ctx.beginPath();
      ctx.arc(-size * 0.12, -size * 0.12, size * 0.16, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = p.toPlayer ? STONE_DARK : STONE;
      ctx.strokeStyle = INK;
      ctx.lineWidth = Math.max(1, size * 0.16);
      const h = size / 2;
      ctx.beginPath();
      ctx.rect(-h, -h, size, size);
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();
  }, []);

  const tick = useCallback(
    (now: number) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) {
        rafRef.current = null;
        return;
      }

      const dt = Math.min(48, now - (lastFrameRef.current || now)) / 1000;
      lastFrameRef.current = now;

      const dpr = dprRef.current;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      const alive: Particle[] = [];
      const particles = particlesRef.current;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.age += dt;
        if (p.age >= p.life) continue;

        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (!p.toPlayer) p.vy += 900 * dt; // gravity, so arcs read as thrown
        p.rot += p.rotSpeed * dt;

        // Cull anything that has left the viewport for good.
        const margin = 140;
        if (
          p.x < -margin ||
          p.x > window.innerWidth + margin ||
          p.y > window.innerHeight + margin
        ) {
          continue;
        }

        draw(ctx, p);
        alive.push(p);
      }

      particlesRef.current = alive;

      // Idle when there's nothing to animate — no wasted frame loop, and the
      // compositor gets a fully static layer between bursts.
      if (alive.length > 0) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        rafRef.current = null;
      }
    },
    [draw]
  );

  const spawn = useCallback(
    ({ originX, originY, count, big, heat }: DebrisSpawnOptions) => {
      const reduced =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduced) return;

      const particles = particlesRef.current;
      const speedBoost = 1 + 1.1 * heat;

      for (let i = 0; i < count; i++) {
        const toPlayer = Math.random() < 0.3;
        const dust = Math.random() < 0.35;
        const angle = Math.random() * Math.PI * 2;

        if (toPlayer) {
          // Downward cone at the viewer, fast, growing hard.
          const spread = (Math.random() - 0.5) * 1.5;
          const speed = (700 + Math.random() * 700) * speedBoost;
          particles.push({
            x: originX,
            y: originY,
            vx: Math.sin(spread) * speed * 0.7,
            vy: Math.abs(Math.cos(spread)) * speed,
            size: (dust ? 12 : 6 + Math.random() * (big ? 8 : 5)),
            rot: Math.random() * Math.PI,
            rotSpeed: (Math.random() - 0.5) * 22,
            age: 0,
            life: 0.5 + Math.random() * 0.3,
            gold: !dust && Math.random() < (big ? 0.6 : 0.35),
            dust,
            toPlayer: true,
            growth: dust ? 3.2 : 4.5,
          });
        } else {
          const speed = (320 + Math.random() * 620) * speedBoost;
          particles.push({
            x: originX,
            y: originY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 260, // initial lift, gravity pulls it back
            size: dust ? 10 + Math.random() * 8 : 4 + Math.random() * (big ? 8 : 5),
            rot: Math.random() * Math.PI,
            rotSpeed: (Math.random() - 0.5) * 18 * (1 + heat),
            age: 0,
            life: 0.9 + Math.random() * 0.6,
            gold: !dust && Math.random() < (big ? 0.55 : 0.3),
            dust,
            toPlayer: false,
            growth: dust ? 1.8 : 0,
          });
        }
      }

      if (rafRef.current === null) {
        lastFrameRef.current = performance.now();
        rafRef.current = requestAnimationFrame(tick);
      }
    },
    [tick]
  );

  useImperativeHandle(ref, () => ({ spawn }), [spawn]);

  useEffect(() => {
    resize();
    window.addEventListener('resize', resize);
    return () => {
      window.removeEventListener('resize', resize);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [resize]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 z-40 pointer-events-none"
    />
  );
});
