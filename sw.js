// Donrí service worker: keeps the app shell available offline.
// Donrí's page opens from the saved copy at once and is refreshed in the background
// (a new version shows on the next open, or straight away with Check for updates). Only this site's own files
// are cached: Microsoft sign-in, OneDrive, Outlook and ntfy are never touched.
const CACHE = "donri-shell-v30";
const SHELL = ["./", "index.html", "app.webmanifest",
  "icons/d2-favicon-64.png", "icons/d2-apple-180.png", "icons/d2-icon-192.png",
  "icons/d2-icon-512.png", "icons/d2-maskable-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL.map(u => new Request(u, {cache:"reload"})))).then(() => self.skipWaiting()));
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
  // Púcas cards (cards/) is its own page: network first for its page and scripts, saved under its own address,
  // so it never replaces Donrí's saved page.
  const inCards = /\/cards\//.test(url.pathname);
  if (req.mode === "navigate" && inCards) {
    const key = url.origin + url.pathname;
    e.respondWith(fetch(new Request(req.url, {cache:"no-cache", credentials:"same-origin"})).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(key, copy)); }
      return res;
    }).catch(() => caches.match(key)));
    return;
  }
  if (req.mode === "navigate") {
    // v30: the saved page straight away, so Donrí comes back at once after Android has dropped it in the
    // background (a weak signal used to keep it waiting). The newest page is fetched at the same time and
    // saved for next time. "Check for updates" adds ?update and waits for the network. The query (sign-in code) stays intact.
    const fresh = fetch(new Request(req.url, {cache:"no-cache", credentials:"same-origin"})).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put("index.html", copy)); }
      return res;
    });
    if (url.searchParams.has("update")) { e.respondWith(fresh.catch(() => caches.match("index.html"))); return; }
    e.waitUntil(fresh.catch(() => {}));
    e.respondWith(caches.match("index.html").then(hit => hit || fresh.catch(() => caches.match("index.html"))));
    return;
  }
  if (/\.webmanifest$|\/icons\//.test(url.pathname) || (inCards && /\.js$/.test(url.pathname))) {
    e.respondWith(fetch(req, {cache:"no-cache"}).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req)));
    return;
  }
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  })));
});
