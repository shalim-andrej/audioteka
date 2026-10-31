// public/sw.js
const CACHE_NAME = "audioteka-cache-v2"; // поменял версию для сброса старого кэша
const urlsToCache = [
  "/",
  "/manifest.json",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache).catch(() => {});
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // ⚠️ ПРОПУСКАЕМ ВНЕШНИЕ ЗАПРОСЫ (Метрика, CDN, обложки)
  if (url.origin !== self.location.origin) {
    return;
  }

  // ⚠️ ПРОПУСКАЕМ API-РОУТЫ (обложки, аудио, данные) — они кэшируются на сервере
  if (url.pathname.startsWith("/api/")) {
    return;
  }

  // Только для GET-запросов
  if (event.request.method !== "GET") {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});