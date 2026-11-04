// Waterloo's service worker.
//
// It caches NOTHING on purpose. The brief rules out offline mode, and a
// cached governance screen could show an approval state that is no longer
// true. This exists so the app is installable and so web push (M2) has a
// home. The empty fetch handler is what makes browsers treat the app as
// installable; it passes every request straight to the network.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // Intentionally empty: no cache, no interception.
});
