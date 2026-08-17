'use client';

import { useEffect } from 'react';

/**
 * Temporary diagnostic probe for the intermittent ~500ms freezes.
 *
 * Only mounted when the page is opened with `?perf=1`, so it costs nothing in
 * normal play. Reports every main-thread long task (>50ms) with enough context
 * to tell WHICH subsystem stalled — the whole point is to stop guessing at the
 * cause and read it off a real measurement instead.
 *
 * Delete this file (and its mount in app/page.tsx) once the freeze is fixed.
 */
export function PerfProbe() {
  useEffect(() => {
    // Records also go to localStorage: the page being profiled has to be the
    // FOREGROUND tab (a background tab has rAF suspended, so nothing animates and
    // nothing stalls). That means whoever is profiling can't simultaneously be
    // reading the console from another tab — so the log is persisted to the same
    // origin's localStorage and can be read back afterwards from anywhere.
    const LOG_KEY = '__perf_log';
    // Fresh log per session, so a read-back is unambiguously this run.
    try {
      localStorage.removeItem(LOG_KEY);
    } catch {
      /* ignore */
    }
    const persist = (line: string) => {
      try {
        const prev = JSON.parse(localStorage.getItem(LOG_KEY) || '[]') as string[];
        prev.push(`${new Date().toISOString().slice(11, 23)} ${line}`);
        // Bounded so the probe itself can never become the thing that stalls.
        localStorage.setItem(LOG_KEY, JSON.stringify(prev.slice(-300)));
      } catch {
        /* quota or parse failure — profiling must never break the game */
      }
    };

    const log = (...args: unknown[]) => {
      const line = args.map(String).join(' ');
      console.log('[PERF]', line);
      persist(line);
    };

    const liveParticles = () =>
      [...document.body.children].filter(
        (el) => el instanceof HTMLElement && getComputedStyle(el).position === 'fixed'
      ).length;

    // Marker timeline — lets a long task be attributed to a tap vs. a timer tick.
    let lastTapAt = 0;
    const onPointerDown = () => {
      lastTapAt = performance.now();
    };
    window.addEventListener('pointerdown', onPointerDown, true);

    const observers: PerformanceObserver[] = [];

    try {
      const longTaskObs = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const sinceTap = lastTapAt ? Math.round(entry.startTime - lastTapAt) : -1;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const attribution = (entry as any).attribution?.[0];
          log(
            `longtask ${Math.round(entry.duration)}ms`,
            `| ${sinceTap >= 0 && sinceTap < 400 ? `${sinceTap}ms after a tap` : 'NOT tap-driven'}`,
            `| particles=${liveParticles()}`,
            attribution ? `| ${attribution.name}/${attribution.containerType}` : ''
          );
        }
      });
      longTaskObs.observe({ entryTypes: ['longtask'] });
      observers.push(longTaskObs);
    } catch {
      log('longtask entry type unsupported in this browser');
    }

    try {
      const eventObs = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const e = entry as any;
          log(
            `slow event "${entry.name}" total=${Math.round(entry.duration)}ms`,
            `processing=${Math.round(e.processingEnd - e.processingStart)}ms`,
            `delay=${Math.round(e.processingStart - e.startTime)}ms`
          );
        }
      });
      // durationThreshold isn't in the published typings for observe() options.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      eventObs.observe({ type: 'event', durationThreshold: 104, buffered: true } as any);
      observers.push(eventObs);
    } catch {
      log('event timing unsupported in this browser');
    }

    // Heap growth is how a GC-pause explanation would show itself: a sawtooth
    // that collapses right when a freeze lands.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mem = () => (performance as any).memory;
    const memTimer = mem()
      ? setInterval(() => {
          const m = mem();
          log(
            `heap ${Math.round(m.usedJSHeapSize / 1048576)}MB / ${Math.round(m.totalJSHeapSize / 1048576)}MB`,
            `| particles=${liveParticles()}`
          );
        }, 3000)
      : undefined;

    log(`probe armed (viewport ${innerWidth}x${innerHeight}, dpr ${devicePixelRatio}) — tap until a freeze happens`);

    return () => {
      window.removeEventListener('pointerdown', onPointerDown, true);
      observers.forEach((o) => o.disconnect());
      if (memTimer) clearInterval(memTimer);
    };
  }, []);

  return null;
}
