/**
 * Scheduling helpers — avoid deprecated InteractionManager.
 */

/** Run after the next two frames (layout + paint committed). */
export function afterFirstPaint(cb: () => void): { cancel: () => void } {
  let cancelled = false;
  let raf2 = 0;
  const raf1 = requestAnimationFrame(() => {
    raf2 = requestAnimationFrame(() => {
      if (!cancelled) cb();
    });
  });
  return {
    cancel: () => {
      cancelled = true;
      cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
    },
  };
}

/** Run when the JS thread is idle (fallback: short timeout). */
export function whenIdle(cb: () => void): { cancel: () => void } {
  const ric = (
    globalThis as typeof globalThis & {
      requestIdleCallback?: (cb: () => void) => number;
      cancelIdleCallback?: (id: number) => void;
    }
  ).requestIdleCallback;

  if (typeof ric === 'function') {
    const id = ric(() => cb());
    return {
      cancel: () => {
        (
          globalThis as typeof globalThis & {
            cancelIdleCallback?: (id: number) => void;
          }
        ).cancelIdleCallback?.(id);
      },
    };
  }

  const t = setTimeout(cb, 1);
  return { cancel: () => clearTimeout(t) };
}
