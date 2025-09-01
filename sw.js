const CACHE_NAME = 'heartolisten-v1';
const urlsToCache = [
  '/',
  '/index.html',
  'https://raw.githubusercontent.com/ChurchandLee/ubiquitous-guacamole/main/earheart.png',
  'https://raw.githubusercontent.com/ChurchandLee/ubiquitous-guacamole/main/Eden.png',
  'https://raw.githubusercontent.com/ChurchandLee/ubiquitous-guacamole/main/fern background.png'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        return response || fetch(event.request);
      })
  );
});
