const CACHE_NAME = 'drivelegal-cache-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/src/main.tsx',
  '/src/App.tsx',
  '/src/index.css',
  '/src/App.css',
  '/src/context/LanguageContext.tsx',
  '/src/components/LanguagePicker.tsx',
  '/src/components/OfflineIndicator.tsx',
  '/src/components/ChatWindow.tsx',
  '/src/components/StateSelector.tsx',
  '/src/pages/StatesPage.tsx',
  '/src/pages/ChallanPage.tsx',
  '/src/pages/TravelPage.tsx',
  '/src/pages/ExplainPage.tsx',
  '/src/db/indexedDB.ts'
];

// Install Event
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('SW: Pre-caching static assets');
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('SW: Removing old cache', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event (Network First, then Cache Fallback)
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // For local API requests, try network first, fallback to cache
  if (url.origin === location.origin || url.port === '8000') {
    e.respondWith(
      fetch(e.request)
        .then((response) => {
          // Clone response and cache it
          const resClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, resClone);
          });
          return response;
        })
        .catch(() => {
          // Fallback to cache if network fails
          return caches.match(e.request).then((cachedResponse) => {
            if (cachedResponse) return cachedResponse;
            
            // Return a offline JSON response for APIs
            if (e.request.headers.get('accept')?.includes('application/json') || url.pathname.includes('/api/')) {
              return new Response(
                JSON.stringify({
                  error: 'Offline mode active. Data unavailable.',
                  offline: true,
                  rules: [],
                  items: []
                }),
                {
                  status: 503,
                  headers: { 'Content-Type': 'application/json' }
                }
              );
            }
          });
        })
    );
  } else {
    // Standard asset loading: Cache First, then Network
    e.respondWith(
      caches.match(e.request).then((cachedResponse) => {
        return cachedResponse || fetch(e.request);
      })
    );
  }
});
