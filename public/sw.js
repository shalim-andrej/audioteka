// Service Worker для PWA «Аудиотека PRO»
const CACHE_NAME = 'audioteka-pro-v3';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = event.request.url;
  // Не кэшируем динамические API и тяжелые аудио-потоки
  if (
    event.request.method !== 'GET' ||
    url.includes('/api/') ||
    url.includes('.mp3') ||
    event.request.headers.get('range')
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
