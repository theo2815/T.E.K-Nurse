"use client";

import { useEffect, useState } from "react";

// Captures the browser's `beforeinstallprompt` event so we can present an
// install affordance at our own moment (inside AvatarMenu) instead of letting
// the browser pick. iOS Safari never fires this event — we detect it from the
// user agent and route to a guided modal instead.
//
// The event + listeners live at module scope, not in component state. Reason:
// `beforeinstallprompt` typically fires during initial page load — well before
// the AvatarMenu dropdown ever opens. If we registered the listener inside the
// component, it would re-register on every mount/unmount and we'd lose the
// captured event the moment the dropdown closes.

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type StoreSnapshot = {
  deferred: BeforeInstallPromptEvent | null;
  installed: boolean;
};

const store: StoreSnapshot = { deferred: null, installed: false };
const subscribers = new Set<() => void>();
let installed = false;

function notify() {
  for (const s of subscribers) s();
}

function ensureModuleListeners() {
  if (typeof window === "undefined" || installed) return;
  installed = true;

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    store.deferred = e as BeforeInstallPromptEvent;
    notify();
  });

  window.addEventListener("appinstalled", () => {
    store.deferred = null;
    store.installed = true;
    notify();
  });
}

ensureModuleListeners();

export type InstallMode = "none" | "prompt" | "ios";

function detectMode(): InstallMode {
  if (typeof window === "undefined") return "none";
  if (store.installed) return "none";

  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (standalone) return "none";

  if (store.deferred) return "prompt";

  const ua = navigator.userAgent;
  // iPadOS 13+ reports as MacIntel — disambiguate via touch support.
  const isIpadOs =
    navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  const isIosDevice = /iPhone|iPad|iPod/.test(ua) || isIpadOs;
  // Only Safari can install PWAs on iOS. Chrome/Firefox/Edge on iOS use
  // WebKit but can't add to home screen — showing the modal would mislead.
  const isSafari =
    isIosDevice && !/CriOS|FxiOS|EdgiOS|OPiOS|YaBrowser/.test(ua);

  return isSafari ? "ios" : "none";
}

export function useInstallability() {
  const [mode, setMode] = useState<InstallMode>("none");

  useEffect(() => {
    setMode(detectMode());
    const onChange = () => setMode(detectMode());
    subscribers.add(onChange);
    return () => {
      subscribers.delete(onChange);
    };
  }, []);

  async function install(): Promise<"accepted" | "dismissed" | "noop"> {
    const e = store.deferred;
    if (!e) return "noop";
    try {
      await e.prompt();
      const choice = await e.userChoice;
      store.deferred = null;
      notify();
      return choice.outcome;
    } catch {
      return "noop";
    }
  }

  return { mode, install };
}
