const CACHE_NAME = 'cerraloan-v5';
const ASSETS = [
    './',
    './index.html',
    './css/style.css',
    './js/offline-firebase.js',
    './js/app.js',
    './js/auth.js',
    './js/db.js',
    './js/calc.js',
    './js/ui.js',
    './js/reports.js',
    './js/views.js',
    './manifest.json',
    './icons/icon-192.png',
    './icons/icon-512.png',
    './cerraloan.png'
];

self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
    );
    self.skipWaiting();
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', (e) => {
    e.respondWith(
        caches.match(e.request)
            .then(cached => cached || fetch(e.request))
            .catch(() => {
                if (e.request.mode === 'navigate') {
                    return caches.match('./index.html');
                }
            })
    );
});
