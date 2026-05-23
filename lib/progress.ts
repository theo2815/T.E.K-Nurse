/**
 * Global loading-state pub-sub. Module-level counter; subscribers fire with
 * `active = count > 0`. `useProgressRouter` calls `start()` / `done()` around
 * its tracked transitions; `RouteProgress` and `InteractionLock` subscribe.
 *
 * Lives outside React so it can be referenced from any client component
 * without prop drilling or context.
 */

type Listener = (active: boolean) => void;

const listeners = new Set<Listener>();
let count = 0;

function notify(): void {
  const active = count > 0;
  for (const l of listeners) l(active);
}

export function start(): void {
  const wasZero = count === 0;
  count++;
  if (wasZero) notify();
}

export function done(): void {
  if (count === 0) return;
  count--;
  if (count === 0) notify();
}

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
