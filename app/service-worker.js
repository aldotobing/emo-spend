// This file is used to register the service worker for the PWA
// It will be automatically used by next-pwa

// Listen for install event
self.addEventListener('install', (event) => {
  console.log('Service Worker installing.');
  // Activate immediately
  self.skipWaiting();
});

// Listen for activate event
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating.');
  // Take control of all pages under this service worker's scope
  event.waitUntil(clients.claim());
});

// Listen for fetch events
self.addEventListener('fetch', (event) => {
  // You can add custom fetch handling here if needed
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
