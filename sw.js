const C = 'clementina-v6';
const FILES = ['./', 'index.html', 'style.css', 'app.js', 'manifest.json', 'icons/logo.svg', 'icons/icon-192.png', 'icons/icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(C).then(c => Promise.all(FILES.map(f => c.add(f).catch(() => { }))))); self.skipWaiting(); });
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== C).map(x => caches.delete(x))))));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).hostname === 'api.github.com') return;
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(n => {
    if (n.ok) { const cp = n.clone(); caches.open(C).then(c => c.put(e.request, cp)); }
    return n;
  }).catch(() => caches.match('index.html'))));
});
