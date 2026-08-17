'use client';

import { memo, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useAnimationControls } from 'motion/react';
import { DebrisCanvas, type DebrisCanvasHandle } from './DebrisCanvas';

// Jagged crack lines radiating from the rock's center, revealed one at a
// time as hits land. Each is a multi-segment path so it reads as a real
// fracture, not a straight scratch.
const CRACK_PATHS = [
  'M100,100 L92,78 L98,58 L84,40',
  'M100,100 L124,84 L146,88 L166,68',
  'M100,100 L128,116 L150,110 L172,128',
  'M100,100 L110,132 L96,152 L106,176',
  'M100,100 L74,114 L48,106 L28,122',
  'M100,100 L78,90 L54,96 L34,80',
];

const MAX_STAGE = CRACK_PATHS.length;

// Photoreal rock textures (kie.ai z-image) — bare-stone base and a fully
// gold-veined variant, crossfaded by goldProgress instead of the old
// procedural SVG fill + flecks.
// Downscaled to 640px and WebP-encoded on purpose: the originals were a 1536²
// (2.8MB) and a 1024² (1.3MB) PNG being displayed at ~250 CSS px, inside a
// container that animates `scale` on every tap. Chrome re-rasterizes an image
// layer when its scale changes, and re-rasterizing a 1536² bitmap is what
// caused the intermittent half-second freezes. 640px still covers the largest
// display size (256px × scale-1.35 × DPR 2 ≈ 700px) with room to spare.
const ROCK_BASE_IMG = '/textures/rock-base.webp';
const ROCK_GOLD_IMG = '/textures/rock-gold.webp';

// Crack color tracks the same goldProgress as the photo crossfade — a stone
// grey-brown when the rock is mostly bare, warming into the same gold as the
// veins by the time it's about to crumble, instead of a flat black line.
const CRACK_ROCK_RGB: [number, number, number] = [90, 74, 58]; // matches rock-base shadow tone
const CRACK_GOLD_RGB: [number, number, number] = [214, 158, 46]; // matches rock-gold vein tone

function lerpCrackColor(t: number): string {
  const [r1, g1, b1] = CRACK_ROCK_RGB;
  const [r2, g2, b2] = CRACK_GOLD_RGB;
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

// Close-in chips are still DOM nodes (few, small, no filters), so they keep a
// ceiling. Screen-wide debris moved to a single canvas layer — see DebrisCanvas —
// and therefore needs no cap at all.
const MAX_LIVE_CHIPS = 22;

interface Chip {
  id: number;
  angle: number;
  distance: number;
  size: number;
  gold: boolean;
  duration: number;
}

let chipIdCounter = 0;

/** One close-in chip flying off the rock surface. Memoized — see DebrisParticle. */
const ChipParticle = memo(function ChipParticle({ chip }: { chip: Chip }) {
  const size = chip.gold ? chip.size * 1.3 : chip.size;
  return (
    <motion.div
      className={`absolute top-1/2 left-1/2 border-2 border-ink ${chip.gold ? 'rounded-full' : 'rounded-sm'}`}
      style={{
        width: size,
        height: size,
        backgroundColor: chip.gold ? 'var(--color-primary)' : '#8A7359',
        boxShadow: chip.gold ? '0 0 0 1.5px var(--color-primary-soft)' : undefined,
        // Deliberately NO will-change here: promoting every short-lived chip to
        // its own compositor layer is what starved the renderer of frame budget.
      }}
      initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 0.4 }}
      animate={{
        x: Math.cos(chip.angle) * chip.distance,
        y: Math.sin(chip.angle) * chip.distance - 18,
        opacity: 0,
        scale: 1,
        rotate: chip.angle > Math.PI ? -220 : 220,
      }}
      transition={{ duration: chip.duration, ease: 'easeOut' }}
    />
  );
});

interface RockTargetProps {
  /** Increments on every successful tap — drives the strike animation. */
  hitSignal: number;
  /** True on rare/escalated outcomes — bigger crumble burst. */
  big: boolean;
  /** 0-100, monotonic progress toward the next mine unlock — drives how
   *  gold-covered the rock looks. Only resets on a real level transition,
   *  never on the per-strike crack/crumble cycle. */
  goldPercent: number;
}

/**
 * The tappable target: a big rock that visibly cracks and chips with every
 * hit, struck by a pickaxe swinging in from the side. Purely visual — the
 * click handler, scoring, and reward logic live in the parent DigButton.
 */
export function RockTarget({ hitSignal, big, goldPercent }: RockTargetProps) {
  const [crackStage, setCrackStage] = useState(0);
  const [crumble, setCrumble] = useState(false);
  const [chips, setChips] = useState<Chip[]>([]);
  const debrisCanvasRef = useRef<DebrisCanvasHandle | null>(null);
  const stageRef = useRef(0);
  const rootRef = useRef<HTMLDivElement | null>(null);
  // Replaying the strike via animation controls instead of remounting on a
  // changing `key` — a keyed remount tore down and rebuilt the rock's two
  // full-bleed <img> textures and the crack SVG on every single tap, which is
  // where a lot of the intermittent stutter came from.
  const rockControls = useAnimationControls();
  const pickControls = useAnimationControls();
  // Tap cadence, smoothed. 0 = slow/deliberate tapping, 1 = mashing. Drives how
  // fast and far the debris flies, so the burst feels like it inherits the
  // player's own energy instead of running at one fixed speed.
  const lastHitAtRef = useRef(0);
  const heatRef = useRef(0);
  // The debris canvas is portaled straight to document.body (see below) — only
  // safe once mounted client-side, since document doesn't exist during SSR.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // How "covered in gold" the rock reads right now — driven by real mine
  // progress (always increases, resets only when a new mine actually
  // unlocks), not by the local crack-stage cycle. Crossfades the bare-stone
  // photo into the gold-veined photo.
  const goldProgress = Math.min(1, goldPercent / 100);

  useEffect(() => {
    // hitSignal starts at 0 and only ever increments on a real tap. Gating on
    // the value (rather than a "first render" ref) is what makes this safe under
    // StrictMode's double-invoked mount effect — a ref flag would let the second
    // invocation spawn a phantom burst before the player has tapped anything.
    if (hitSignal === 0) return;

    // --- Tap cadence -> "heat" ---------------------------------------------
    // Interval between this tap and the last, mapped so ~110ms apart (mashing)
    // is full heat and ~600ms apart (slow) is none. Smoothed with an EMA so a
    // single stray fast/slow tap doesn't make the burst speed jump around.
    const now = performance.now();
    const interval = lastHitAtRef.current ? now - lastHitAtRef.current : 9999;
    lastHitAtRef.current = now;
    const instant = Math.max(0, Math.min(1, (600 - interval) / (600 - 110)));
    heatRef.current = heatRef.current * 0.55 + instant * 0.45;
    const heat = heatRef.current;

    // The rock and pickaxe are the primary feedback — they get the shortest,
    // punchiest timings in the whole component, and shrink further as tapping
    // speeds up so the hit always lands under the finger, never behind it.
    const strikeDur = 0.15 * (1 - 0.4 * heat);
    pickControls.set({ rotate: 70, x: 44, y: -44, scale: 0.9, opacity: 0.9 });
    pickControls.start(
      { rotate: [70, -42, -14], x: [44, -10, 0], y: [-44, 4, 0], scale: [0.9, 1.15, 1], opacity: 1 },
      { duration: strikeDur, times: [0, 0.55, 1], ease: 'easeIn' }
    );

    // Stage is tracked in a ref and the spawns run here in the effect body, NOT
    // inside a setState updater. Updaters must be pure: StrictMode invokes them
    // twice in dev, which was spawning double the particles on every tap (a real
    // cause of the stutter, not just a correctness nit).
    const nextStage = stageRef.current + 1;
    const willCrumble = nextStage > MAX_STAGE;
    stageRef.current = willCrumble ? 0 : nextStage;
    setCrackStage(stageRef.current);

    if (willCrumble) {
      // The rock has taken enough damage — it crumbles and a fresh, uncracked
      // rock takes its place. Infinite tap loop, but every cycle reads as
      // "you broke that one."
      setCrumble(true);
      setTimeout(() => setCrumble(false), 260);
      rockControls.start(
        { scale: [1, 1.18, 0.94, 1], rotate: [0, -5, 4, 0], x: 0, y: 0 },
        // Front-loaded: the pop happens almost immediately, the settle takes the
        // rest. Even spacing made the impact feel like it arrived late.
        { duration: 0.22, times: [0, 0.2, 0.55, 1], ease: 'easeOut' }
      );
      spawnChips(big ? 14 : 9, heat);
      // Counts are generous now that debris is canvas-drawn: a particle costs a
      // few arithmetic ops and one fill, not a compositor layer.
      spawnDebris(big ? 55 : 38, heat);
    } else {
      rockControls.start(
        { scale: [1, 0.86, 1.07, 1], x: [0, -8, 5, 0], y: [0, 4, -2, 0], rotate: 0 },
        // Squash on the first 20% of the timeline, then overshoot and settle —
        // the standard squash/stretch shape, which reads far faster than the
        // same duration spread evenly across the keyframes.
        { duration: strikeDur, times: [0, 0.2, 0.55, 1], ease: 'easeOut' }
      );
      spawnChips(big ? 16 : 7, heat);
      spawnDebris(big ? 34 : 24, heat);
    }

    function spawnDebris(count: number, tapHeat: number) {
      // All the trajectory maths now lives in the canvas layer; this only has to
      // say where the burst came from and how hard it was.
      const rect = rootRef.current?.getBoundingClientRect();
      debrisCanvasRef.current?.spawn({
        originX: rect ? rect.left + rect.width / 2 : window.innerWidth / 2,
        originY: rect ? rect.top + rect.height / 2 : window.innerHeight / 2,
        count,
        big,
        heat: tapHeat,
      });
    }

    function spawnChips(count: number, tapHeat: number) {
      const speedScale = 1 - 0.4 * tapHeat;
      const newChips: Chip[] = Array.from({ length: count }, () => ({
        id: chipIdCounter++,
        angle: Math.random() * Math.PI * 2,
        distance: (55 + Math.random() * (big ? 90 : 55)) * (1 + 0.35 * tapHeat),
        size: 5 + Math.random() * (big ? 9 : 6),
        gold: Math.random() < (big ? 0.65 : 0.4),
        duration: 0.65 * speedScale,
      }));
      setChips((prev) => {
        const merged = [...prev, ...newChips];
        return merged.length > MAX_LIVE_CHIPS ? merged.slice(merged.length - MAX_LIVE_CHIPS) : merged;
      });
      const ids = new Set(newChips.map((c) => c.id));
      setTimeout(() => {
        setChips((prev) => prev.filter((c) => !ids.has(c.id)));
      }, 700 * speedScale);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hitSignal]);

  return (
    <div
      ref={rootRef}
      className="relative w-56 h-56 sm:w-64 sm:h-64 flex items-center justify-center pointer-events-none select-none"
    >
      {/* Pickaxe — swings in from the upper-right and strikes on every hit.
          Replayed through pickControls rather than a changing key, so the emoji
          glyph isn't re-rasterized on every tap. */}
      <motion.div
        className="absolute z-20"
        style={{ top: '2%', right: '4%', willChange: 'transform' }}
        initial={{ rotate: -14, x: 0, y: 0, scale: 1, opacity: 1 }}
        animate={pickControls}
      >
        <span className="text-5xl sm:text-6xl drop-shadow-[2px_2px_0px_var(--color-ink)]" style={{ display: 'block' }}>
          ⛏️
        </span>
      </motion.div>

      {/* The rock itself — photoreal base/gold textures crossfaded by mine
          progress, clipped to a circular medallion frame, with the same
          squash/shake impact motion as before. Cracks are drawn as an SVG
          overlay on top since dark lines read the same over a photo. */}
      <motion.div
        className="absolute inset-0 z-10 rounded-full overflow-hidden brutal-border"
        style={{ willChange: 'transform' }}
        initial={false}
        animate={rockControls}
      >
        {/* Source photos have a wide plain-background margin around the
            rock — scale up so the rock itself fills the circular frame
            instead of reading as a small object floating in a beige void. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={ROCK_BASE_IMG}
          alt=""
          className="absolute inset-0 w-full h-full object-cover scale-[1.35]"
          draggable={false}
        />
        <motion.img
          src={ROCK_GOLD_IMG}
          alt=""
          className="absolute inset-0 w-full h-full object-cover scale-[1.35]"
          draggable={false}
          animate={{ opacity: goldProgress }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        />

        <svg viewBox="0 0 200 200" className="absolute inset-0 w-full h-full">
          {CRACK_PATHS.slice(0, crackStage).map((d, i) => (
            // Keyed by index, not by strike — only a newly revealed crack
            // animates itself in. Re-keying per tap made all six redraw their
            // pathLength on every hit, for no visual gain.
            <g key={`crack-${i}`}>
              {/* Recessed-shadow line underneath, offset slightly, gives the
                  crack real depth against the photo instead of reading flat */}
              <motion.path
                d={d}
                fill="none"
                stroke="rgba(0,0,0,0.55)"
                strokeWidth={5}
                strokeLinecap="round"
                transform="translate(0.8, 1.2)"
                initial={{ opacity: 0, pathLength: 0 }}
                animate={{ opacity: 1, pathLength: 1 }}
                transition={{ duration: 0.18 }}
              />
              <motion.path
                d={d}
                fill="none"
                stroke={lerpCrackColor(goldProgress)}
                strokeWidth={2.5}
                strokeLinecap="round"
                initial={{ opacity: 0, pathLength: 0 }}
                animate={{
                  opacity: 1,
                  pathLength: 1,
                  filter: goldProgress > 0.5 ? `drop-shadow(0 0 3px ${lerpCrackColor(goldProgress)})` : 'none',
                }}
                transition={{ duration: 0.18 }}
              />
            </g>
          ))}
        </svg>
      </motion.div>

      {/* Impact flash on crumble — extra escalation beyond the parent's screen flash */}
      <AnimatePresence>
        {crumble && (
          <motion.div
            className="absolute inset-0 rounded-full bg-primary-soft z-30"
            initial={{ opacity: 0.7, scale: 0.6 }}
            animate={{ opacity: 0, scale: 1.3 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.26 }}
          />
        )}
      </AnimatePresence>

      {/* Close-in rock chips bursting off the surface — the original punchy
          burst, kept intact alongside the new screen-wide debris. Memoized for
          the same reason as DebrisParticle. */}
      <div className="absolute inset-0 z-20">
        {chips.map((chip) => (
          <ChipParticle key={chip.id} chip={chip} />
        ))}
      </div>

      {/* Screen-wide debris: ONE canvas covering the viewport, portaled to
          document.body so no transformed/overflow-hidden ancestor can clip or
          contain it. Replaces ~30 fixed divs — see DebrisCanvas for the
          measurements that motivated the change. */}
      {mounted && createPortal(<DebrisCanvas ref={debrisCanvasRef} />, document.body)}
    </div>
  );
}
