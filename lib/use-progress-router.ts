"use client";

import { useRouter as useNextRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useTransition } from "react";
import { done, start } from "./progress";

/**
 * Drop-in replacement for `next/navigation`'s `useRouter()` that lights the
 * global progress bar + interaction lock while `push` / `replace` / `refresh`
 * are in flight. Signature is fully compatible — call sites only swap imports.
 *
 * The methods are wrapped in `useTransition` whose `pending` flag stays true
 * until React commits the new render following the navigation. A ref balances
 * `start()` / `done()` exactly once per transition, including the case where
 * the host component unmounts mid-transition (e.g. a form that routes to a
 * different page on submit).
 *
 * Realtime components (`StaffLoansRealtime`, `StaffRequestsRealtime`, etc.)
 * keep the raw `next/navigation` `useRouter` so background refreshes from
 * other tabs don't trigger the bar.
 */
export function useProgressRouter() {
  const router = useNextRouter();
  const [pending, startTransition] = useTransition();
  const wasPending = useRef(false);

  useEffect(() => {
    if (pending && !wasPending.current) {
      start();
      wasPending.current = true;
    } else if (!pending && wasPending.current) {
      done();
      wasPending.current = false;
    }
  }, [pending]);

  useEffect(() => {
    return () => {
      if (wasPending.current) {
        done();
        wasPending.current = false;
      }
    };
  }, []);

  return useMemo(
    () => ({
      push: (...args: Parameters<typeof router.push>) =>
        startTransition(() => router.push(...args)),
      replace: (...args: Parameters<typeof router.replace>) =>
        startTransition(() => router.replace(...args)),
      refresh: () => startTransition(() => router.refresh()),
      back: () => router.back(),
      forward: () => router.forward(),
      prefetch: router.prefetch.bind(router),
    }),
    [router, startTransition],
  );
}

/**
 * Plug a pending flag into the global progress counter. Use for surfaces that
 * already manage their own transition state (e.g. `useActionState`'s pending,
 * or a local `useTransition` that can't use `useProgressRouter`).
 *
 * Pass `true` while the action is in flight, `false` otherwise. The hook
 * balances `start()` / `done()` exactly once per pending window — including
 * unmount-mid-pending.
 */
export function useProgressTracking(pending: boolean): void {
  const wasPending = useRef(false);

  useEffect(() => {
    if (pending && !wasPending.current) {
      start();
      wasPending.current = true;
    } else if (!pending && wasPending.current) {
      done();
      wasPending.current = false;
    }
  }, [pending]);

  useEffect(() => {
    return () => {
      if (wasPending.current) {
        done();
        wasPending.current = false;
      }
    };
  }, []);
}
