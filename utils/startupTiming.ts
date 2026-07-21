/**
 * Dev-facing startup timing — marks phases and logs a summary once splash hides.
 * Search Metro logs for `[ZoeStartup]`.
 */

const t0 =
  typeof globalThis.performance?.now === 'function'
    ? globalThis.performance.now()
    : Date.now();

const marks = new Map<string, number>();

function now() {
  return typeof globalThis.performance?.now === 'function'
    ? globalThis.performance.now()
    : Date.now();
}

export function startupMark(label: string) {
  const at = now() - t0;
  marks.set(label, at);
  if (__DEV__) {
    console.log(`[ZoeStartup] +${at.toFixed(0)}ms  ${label}`);
  }
}

export function startupSummary(extra?: Record<string, number>) {
  if (!__DEV__) return;

  const rows = [...marks.entries()].sort((a, b) => a[1] - b[1]);
  const lines = rows.map(([label, ms], i) => {
    const prev = i === 0 ? 0 : rows[i - 1][1];
    const delta = ms - prev;
    return `  ${ms.toFixed(0).padStart(5)}ms (+${delta.toFixed(0)}ms)  ${label}`;
  });

  const extras = extra
    ? Object.entries(extra).map(
        ([k, v]) => `  ${' '.repeat(5)}     (task) ${k}: ${v.toFixed(0)}ms`,
      )
    : [];

  console.log(
    `[ZoeStartup] ── summary ──\n${[...lines, ...extras].join('\n')}\n[ZoeStartup] ────────────`,
  );
}

/** Time an async task; returns result + duration ms. */
export async function timedAsync<T>(
  label: string,
  fn: () => Promise<T>,
): Promise<{ value: T; ms: number }> {
  const start = now();
  const value = await fn();
  const ms = now() - start;
  if (__DEV__) {
    console.log(`[ZoeStartup] task ${label}: ${ms.toFixed(0)}ms`);
  }
  return { value, ms };
}
