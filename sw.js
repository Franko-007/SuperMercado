const APP_CACHE = 'smartcart-v102-cache';
const IMG_CACHE = 'smartcart-images-v2';

// Assets de la app (HTML/CSS/JS) — se revisan primero contra la red
// para que las actualizaciones de código lleguen rápido.
const appAssets = [
  './',
  './index.html',
  './style.css?v=101',
  './scripts.js?v=102',
  './manifest.json',
];

// Imágenes de productos e íconos — cambian poco, así que se precachean
// para que funcionen offline desde la primera apertura y no dependan
// de que postimg.cc / icons8.com estén disponibles en ese momento.
const imageAssets = [
  './icon-192.png',
  './icon-512.png',
  './icon-512-maskable.png',
  'https://i.postimg.cc/6pbD2Q42/icons8-carrito-de-compras-emoji-48.png',
  'https://i.postimg.cc/NFdtj6bC/1085998.png',
  'https://i.postimg.cc/6qbsX95Z/Bebida.png',
  'https://i.postimg.cc/NFChcgfT/cerveza.jpg',
  'https://i.postimg.cc/9XLHTBtQ/Crema.jpg',
  'https://i.postimg.cc/MH3kSWKg/Detergente.jpg',
  'https://i.postimg.cc/zDxYWkSj/mostaccioli.jpg',
  'https://i.postimg.cc/0jXgs82L/pack-leche.jpg',
  'https://i.postimg.cc/7PKr7NMX/pasta-diente.jpg',
  'https://i.postimg.cc/wxwYJkcJ/receta-queso-gouda.jpg',
  'https://i.postimg.cc/fW8QXvjC/Salsa.jpg',
  'https://i.postimg.cc/VL5QFbDn/suavizante.jpg',
  'https://i.postimg.cc/g2d4ZCxX/Gel-Afeitar.jpg',
  'https://i.postimg.cc/RZ9GHkWM/Carne-Molida.jpg',
  'https://i.postimg.cc/yY0vW188/Aceite-miraflores.png',
  'https://i.postimg.cc/8zDw627r/Confort.jpg',
  'https://i.postimg.cc/SxqVMBnn/Mayonesa.jpg',
  'https://i.postimg.cc/L8Rv1cJg/Qualy.jpg',
  'https://i.postimg.cc/RZ9GHkWw/Sal.png',
  'https://i.postimg.cc/sfHRKJYC/909888-7791293043791.jpg',
  'https://img.icons8.com/emoji/96/razor.png',
];

function isImageRequest(request) {
  return request.destination === 'image' || /\.(png|jpe?g|webp|gif|svg)(\?.*)?$/i.test(request.url);
}

// Instalar el Service Worker y guardar archivos en caché
self.addEventListener('install', event => {
  self.skipWaiting(); // ✅ Obliga a actualizar al instante sin esperar
  event.waitUntil(
    Promise.all([
      caches.open(APP_CACHE).then(cache => cache.addAll(appAssets)),
      // Si una imagen falla (host caído, url vencida) no debe tumbar
      // la instalación completa del Service Worker.
      caches.open(IMG_CACHE).then(cache =>
        Promise.all(
          imageAssets.map(url =>
            cache.add(url).catch(err => console.warn('SW: no se pudo precachear', url, err))
          )
        )
      ),
    ])
  );
});

// Activar y limpiar cachés viejas
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== APP_CACHE && cache !== IMG_CACHE) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

self.addEventListener('fetch', event => {
  const { request } = event;

  if (isImageRequest(request)) {
    // Imágenes: caché primero (rápido y funciona offline), y de fondo
    // se intenta refrescar desde la red por si la imagen cambió.
    event.respondWith(
      caches.open(IMG_CACHE).then(async cache => {
        const cached = await cache.match(request);
        const networkUpdate = fetch(request)
          .then(response => {
            if (response && response.ok) cache.put(request, response.clone());
            return response;
          })
          .catch(() => null);
        return cached || (await networkUpdate) || Response.error();
      })
    );
    return;
  }

  // App shell (HTML/CSS/JS): red primero, caché si falla, para que el
  // código siempre se actualice cuando hay conexión.
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});
