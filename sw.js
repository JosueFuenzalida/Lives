const CACHE_NAME = 'ropaslive-cache-v2';
const ASSETS = [
  './index.html',
  './js/main.js',
  './js/ventas.js',
  './js/clientes.js',
  './js/informes.js',
  './js/ajustes.js',
  './manifest.json'
];

// Instalar el Service Worker y almacenar los archivos locales
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activar y limpiar cachés antiguas para evitar conflictos
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Interceptador de peticiones: Prioriza el funcionamiento Offline
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      return cachedResponse || fetch(e.request);
    })
  );
});const CACHE_NAME = 'ropaslive-cache-v2';
const ASSETS = [
  'index.html',
  'js/main.js',
  'js/ventas.js',
  'js/clientes.js',
  'js/informes.js',
  'js/ajustes.js',
  'manifest.json'
];

// Instalar el Service Worker y almacenar los archivos en el almacenamiento local seguro
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activar y limpiar cachés antiguas del teléfono
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Responder desde la caché si no hay internet
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      return cachedResponse || fetch(e.request);
    })
  );
});
