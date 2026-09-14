const CACHE_NAME = 'electronics-exam-v1.4.0';
const ASSETS = [
  './',
  './index.html',
  './app.css',
  './app.js',
  './exam_data.js',
  './version.json',
  './katex/katex.min.css',
  './katex/katex.min.js',
  './katex/auto-render.min.js',
  './icon-192.png',
  './icon-512.png',
  './icon.png',
  './apple-touch-icon.png',
  './manifest.json'
];

// Установка: кэшируем ключевые ресурсы и сразу активируем
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Активация: удаляем старые версии кэша и захватываем клиенты
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Удаление старого кэша:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Слушаем сообщения от клиента (например, принудительный skipWaiting)
self.addEventListener('message', (event) => {
  if (event.data && event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});

// Стратегия выборки:
// 1. version.json и HTML - Network First (всегда свежие при наличии сети, с оффлайн-фолбэком)
// 2. Статические ассеты (JS, CSS, картинки) - Stale While Revalidate (мгновенная загрузка + фоновое обновление)
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // Для version.json всегда идем в сеть, чтобы мгновенно видеть новую версию
  if (url.pathname.endsWith('version.json') || event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const resClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
        }
        return networkResponse;
      }).catch(() => {
        return caches.match(event.request).then((cached) => {
          return cached || caches.match('./index.html');
        });
      })
    );
    return;
  }

  // Для остальных файлов - Stale-While-Revalidate
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const resClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
        }
        return networkResponse;
      }).catch(() => null);

      return cachedResponse || fetchPromise;
    })
  );
});
