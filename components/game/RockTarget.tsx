'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

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
const ROCK_BASE_IMG = '/textures/rock-base.png';
const ROCK_GOLD_IMG = '/textures/rock-gold.png';

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

interface Chip {
  id: number;
  angle: number;
  distance: number;
  size: number;
  gold: boolean;
}

let chipIdCounter = 0;

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
  const [strikeKey, setStrikeKey] = useState(0);
  const [crumble, setCrumble] = useState(false);
  const [chips, setChips] = useState<Chip[]>([]);
  const isFirstRender = useRef(true);

  // How "covered in gold" the rock reads right now — driven by real mine
  // progress (always increases, resets only when a new mine actually
  // unlocks), not by the local crack-stage cycle. Crossfades the bare-stone
  // photo into the gold-veined photo.
  const goldProgress = Math.min(1, goldPercent / 100);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    setStrikeKey((k) => k + 1);

    setCrackStage((stage) => {
      const nextStage = stage + 1;
      if (nextStage > MAX_STAGE) {
        // The rock has taken enough damage — it crumbles and a fresh,
        // uncracked rock takes its place. Infinite tap loop, but every
        // cycle reads as "you broke that one."
        setCrumble(true);
        setTimeout(() => setCrumble(false), 260);
        spawnChips(big ? 14 : 9);
        return 0;
      }
      spawnChips(big ? 16 : 7);
      return nextStage;
    });

    function spawnChips(count: number) {
      const newChips: Chip[] = Array.from({ length: count }, () => ({
        id: chipIdCounter++,
        angle: Math.random() * Math.PI * 2,
        distance: 55 + Math.random() * (big ? 90 : 55),
        size: 5 + Math.random() * (big ? 9 : 6),
        gold: Math.random() < (big ? 0.65 : 0.4),
      }));
      setChips((prev) => [...prev, ...newChips]);
      const ids = newChips.map((c) => c.id);
      setTimeout(() => {
        setChips((prev) => prev.filter((c) => !ids.includes(c.id)));
      }, 650);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hitSignal]);

  return (
    <div className="relative w-56 h-56 sm:w-64 sm:h-64 flex items-center justify-center pointer-events-none select-none">
      {/* Pickaxe — swings in from the upper-right and strikes on every hit */}
      <AnimatePresence>
        <motion.div
          key={strikeKey}
          className="absolute z-20"
          style={{ top: '2%', right: '4%' }}
          initial={{ rotate: 70, x: 44, y: -44, scale: 0.9, opacity: 0.9 }}
          animate={{ rotate: [70, -42, -14], x: [44, -10, 0], y: [-44, 4, 0], scale: [0.9, 1.15, 1], opacity: 1 }}
          transition={{ duration: 0.22, times: [0, 0.55, 1], ease: 'easeIn' }}
        >
          <span className="text-5xl sm:text-6xl drop-shadow-[2px_2px_0px_var(--color-ink)]" style={{ display: 'block' }}>
            ⛏️
          </span>
        </motion.div>
      </AnimatePresence>

      {/* The rock itself — photoreal base/gold textures crossfaded by mine
          progress, clipped to a circular medallion frame, with the same
          squash/shake impact motion as before. Cracks are drawn as an SVG
          overlay on top since dark lines read the same over a photo. */}
      <motion.div
        key={`rock-${strikeKey}`}
        className="absolute inset-0 z-10 rounded-full overflow-hidden brutal-border"
        initial={false}
        animate={
          crumble
            ? { scale: [1, 1.18, 0.94, 1], rotate: [0, -5, 4, 0] }
            : { scale: [1, 0.88, 1.06, 1], x: [0, -7, 5, 0], y: [0, 3, -2, 0] }
        }
        transition={{ duration: crumble ? 0.3 : 0.22, ease: 'easeOut' }}
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
            <g key={`${strikeKey}-crack-${i}`}>
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

      {/* Rock-chip debris bursting off the surface */}
      <div className="absolute inset-0 z-20">
        <AnimatePresence>
          {chips.map((chip) => (
            <motion.div
              key={chip.id}
              className={`absolute top-1/2 left-1/2 border-2 border-ink ${chip.gold ? 'rounded-full' : 'rounded-sm'}`}
              style={{
                width: chip.gold ? chip.size * 1.3 : chip.size,
                height: chip.gold ? chip.size * 1.3 : chip.size,
                backgroundColor: chip.gold ? 'var(--color-primary)' : '#8A7359',
                boxShadow: chip.gold ? '0 0 0 1.5px var(--color-primary-soft)' : undefined,
              }}
              initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 0.4 }}
              animate={{
                x: Math.cos(chip.angle) * chip.distance,
                y: Math.sin(chip.angle) * chip.distance - 18,
                opacity: 0,
                scale: 1,
                rotate: chip.angle > Math.PI ? -220 : 220,
              }}
              transition={{ duration: 0.65, ease: 'easeOut' }}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
