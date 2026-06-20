const CACHE_NAME = 'smartcart-v100-cache'; 
const assets = [
  './',
  './index.html',
  './style.css?v=100',
  './scripts.js?v=100',
  './manifest.json',
  'https://i.postimg.cc/6pbD2Q42/icons8-carrito-de-compras-emoji-48.png'
];

// Instalar el Service Worker y guardar archivos en caché
self.addEventListener('install', event => {
  self.skipWaiting(); // ✅ Obliga a actualizar al instante sin esperar
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(assets);
    })
  );
});

// Activar y limpiar cachés viejas
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Estrategia: Buscar en Internet, si falla, usar la Caché
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});
