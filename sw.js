const CACHE_NAME = 'smartcart-v2-cache';
const assets = [
  './',
  './index.html',
  './style.css',
  './scripts.js',
  './manifest.json',
  'https://i.postimg.cc/6pbD2Q42/icons8-carrito-de-compras-emoji-48.png'
];

// Instalar el Service Worker y guardar archivos en caché
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(assets);
    })
  );
});

// Estrategia: Buscar en Internet, si falla, usar la Caché
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});
