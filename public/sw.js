// Service Worker для PWA «Аудиотека PRO»
const CACHE_NAME = 'audioteka-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Аудиостриминг и динамические API не перехватываем, отдаем напрямую сети
  const url = event.request.url;
  if (
    event.request.method !== 'GET' ||
    url.includes('/api/stream') ||
    url.includes('/api/audiobooks') ||
    url.includes('.mp3') ||
    url.includes('range=')
  ) {
    return;
  }

  // Network-first стратегия для остальных ресурсов
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
