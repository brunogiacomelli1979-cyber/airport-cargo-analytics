// A interface pode ser cacheada, mas páginas protegidas, API e dados não ficam disponíveis offline.
const CACHE = 'paletes-assets-v3';
const ASSETS = ['/static/style.css','/static/app.js','/static/reports.js','/static/common.js','/static/login.js','/static/icons/icon-192.png','/static/icons/icon-512.png'];
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener('fetch', event => {
  const request=event.request, url=new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || !url.pathname.startsWith('/static/')) return;
  event.respondWith(caches.match(request).then(cached => cached || fetch(request)));
});
