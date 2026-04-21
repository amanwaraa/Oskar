const CACHE_NAME = "fee-app-v2.0.0";
const APP_SHELL = [
  "./",
  "./fee.html",
  "./manifest-fee.json",
  "./sw-fee.js"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      for (const file of APP_SHELL) {
        try {
          await cache.add(file);
        } catch (e) {
          console.warn("Cache add failed:", file, e);
        }
      }
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      )
    )
  );
  self.clients.claim();
});

function shouldCacheRequest(url) {
  return (
    url.origin.includes("gstatic.com") ||
    url.origin.includes("googleapis.com") ||
    url.origin.includes("cdn.tailwindcss.com") ||
    url.origin.includes("cdnjs.cloudflare.com") ||
    url.origin.includes("fonts.googleapis.com") ||
    url.origin.includes("fonts.gstatic.com")
  );
}

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(async () => {
          return (await caches.match(req)) || (await caches.match("./fee.html"));
        })
    );
    return;
  }

  if (shouldCacheRequest(url)) {
    event.respondWith(
      caches.match(req).then(cached => {
        if (cached) return cached;

        return fetch(req)
          .then(res => {
            const copy = res.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(req, copy)).catch(() => {});
            return res;
          })
          .catch(() => caches.match("./fee.html"));
      })
    );
    return;
  }

  event.respondWith(
    fetch(req)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(async () => {
        return (await caches.match(req)) || (await caches.match("./fee.html"));
      })
  );
});