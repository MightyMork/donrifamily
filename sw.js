// Donrí service worker: keeps the app shell available offline.
// Pages are fetched fresh when online (so updates arrive straight away),
// falling back to the saved copy when offline. Only this site's own files
// are cached: Microsoft sign-in, OneDrive, Outlook and ntfy are never touched.
const CACHE = "donri-shell-v12";
const SHELL = ["./", "index.html", "manifest.webmanifest",
  "icons/favicon-64.png", "icons/apple-180.png", "icons/icon-192.png",
  "icons/icon-512.png", "icons/maskable-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (req.mode === "navigate") {
    // Network first for the page itself; keep the query (sign-in code) intact.
    e.respondWith(fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put("index.html", copy));
      return res;
    }).catch(() => caches.match("index.html")));
    return;
  }
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  })));
});
