const CACHE_NAME = "fee-app-v2.0.0";
const STATIC_CACHE = [
  "./",
  "./fee.html",
  "./manifest-fee.json"
];

const CDN_HOSTS = [
  "cdn.tailwindcss.com",
  "cdnjs.cloudflare.com",
  "fonts.googleapis.com",
  "fonts.gstatic.com",
  "www.gstatic.com",
  "firebasestorage.googleapis.com",
  "googleapis.com"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

function isCDNRequest(url) {
  return CDN_HOSTS.some(host => url.hostname.includes(host));
}

async function networkFirst(req) {
  try {
    const fresh = await fetch(req);
    const cache = await caches.open(CACHE_NAME);
    cache.put(req, fresh.clone()).catch(() => {});
    return fresh;
  } catch (err) {
    const cached = await caches.match(req);
    if (cached) return cached;
    return caches.match("./fee.html");
  }
}

async function cacheFirst(req) {
  const cached = await caches.match(req);
  if (cached) return cached;

  try {
    const fresh = await fetch(req);
    const cache = await caches.open(CACHE_NAME);
    cache.put(req, fresh.clone()).catch(() => {});
    return fresh;
  } catch (err) {
    return caches.match("./fee.html");
  }
}

async function staleWhileRevalidate(req) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(req);

  const networkFetch = fetch(req)
    .then(res => {
      cache.put(req, res.clone()).catch(() => {});
      return res;
    })
    .catch(() => null);

  return cached || networkFetch || caches.match("./fee.html");
}

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  if (req.mode === "navigate") {
    event.respondWith(networkFirst(req));
    return;
  }

  if (isCDNRequest(url)) {
    event.respondWith(staleWhileRevalidate(req));
    return;
  }

  event.respondWith(cacheFirst(req));
});