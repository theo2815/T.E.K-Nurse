// T.E.K Nurse — minimal service worker.
//
// The app is online-only: every request must reach the network so inventory,
// borrows, and returns are always fresh. The SW exists only to satisfy PWA
// install criteria (a registered SW with a fetch handler) and to keep the
// install/activate lifecycle tidy.
//
// No precaching, no runtime caching, no offline fallback. If we ever add an
// offline mode, do it deliberately with versioned caches and an update prompt.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // Intentionally empty: the browser handles the request as if there were no
  // SW. The handler's existence is what matters for install criteria.
});
