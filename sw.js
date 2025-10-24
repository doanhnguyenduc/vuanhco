/**
 * Service Worker for Vu Anh Website PWA
 * Provides offline functionality and caching
 * Version: 1.0.0
 */

const CACHE_NAME = 'vuanh-v1.0.0';
const RUNTIME_CACHE = 'vuanh-runtime';

// Assets to cache on install
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/style.css',
  '/enhancements.css',
  '/script.js',
  '/i18n.js',
  '/analytics.js',
  '/form-handler.js',
  '/pwa-prompt.js',
  '/security-utils.js',
  '/manifest.json',
  '/logos/vuanh-logo.png',
  '/logos/vuanh-logo1.png',
  '/i18n/en.json',
  '/i18n/vi.json',
  '/i18n/cn.json',
  'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;700&display=swap'
];

// Install event - cache assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Precaching assets');
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => {
        console.log('[SW] Skip waiting');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Precaching failed:', error);
      })
  );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Claiming clients');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    // But handle Google Fonts specially
    if (url.origin === 'https://fonts.googleapis.com' || 
        url.origin === 'https://fonts.gstatic.com') {
      event.respondWith(handleFontRequest(request));
    }
    return;
  }

  // Skip Chrome extensions
  if (url.protocol === 'chrome-extension:') {
    return;
  }

  // Handle API requests (Formspree) - always network
  if (url.hostname === 'formspree.io') {
    event.respondWith(fetch(request));
    return;
  }

  // Handle navigation requests
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(request));
    return;
  }

  // Handle other requests (CSS, JS, images)
  event.respondWith(handleResourceRequest(request));
});

/**
 * Handle navigation requests (HTML pages)
 * Strategy: Network first, fallback to cache, then offline page
 */
async function handleNavigationRequest(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    // Cache successful response
    if (networkResponse.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);
    
    // Try cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Fallback to index.html for SPA routing
    const indexResponse = await caches.match('/index.html');
    if (indexResponse) {
      return indexResponse;
    }
    
    // Last resort: offline page
    return new Response(
      createOfflinePage(),
      {
        headers: { 'Content-Type': 'text/html' }
      }
    );
  }
}

/**
 * Handle resource requests (CSS, JS, images)
 * Strategy: Cache first, fallback to network
 */
async function handleResourceRequest(request) {
  // Try cache first
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    // Try network
    const networkResponse = await fetch(request);
    
    // Cache successful response
    if (networkResponse.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[SW] Resource fetch failed:', request.url, error);
    
    // Return a fallback response based on request type
    if (request.destination === 'image') {
      // Return placeholder image (1x1 transparent GIF)
      return new Response(
        atob('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'),
        { headers: { 'Content-Type': 'image/gif' } }
      );
    }
    
    return new Response('Resource not available offline', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

/**
 * Handle Google Fonts requests
 * Strategy: Cache with long expiration
 */
async function handleFontRequest(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    return new Response('Font not available', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

/**
 * Create offline fallback page
 */
function createOfflinePage() {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Offline - Vu Anh Industrial Equipment</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #414042 0%, #2c2c2e 100%);
      color: #ffffff;
      text-align: center;
      padding: 2rem;
    }
    .offline-container {
      max-width: 500px;
    }
    .offline-icon {
      font-size: 5rem;
      margin-bottom: 1rem;
      opacity: 0.8;
    }
    h1 {
      font-size: 2rem;
      margin-bottom: 1rem;
      color: #f1bc31;
    }
    p {
      font-size: 1.1rem;
      line-height: 1.6;
      margin-bottom: 2rem;
      opacity: 0.9;
    }
    .retry-btn {
      background: #f1bc31;
      color: #414042;
      padding: 1rem 2rem;
      border: none;
      border-radius: 50px;
      font-size: 1rem;
      font-weight: 700;
      cursor: pointer;
      text-decoration: none;
      display: inline-block;
      transition: transform 0.3s;
    }
    .retry-btn:hover {
      transform: translateY(-3px);
    }
  </style>
</head>
<body>
  <div class="offline-container">
    <div class="offline-icon">📡</div>
    <h1>You're Offline</h1>
    <p>It looks like you've lost your internet connection. Please check your network and try again.</p>
    <button class="retry-btn" onclick="window.location.reload()">Retry</button>
  </div>
</body>
</html>
  `;
}

// Handle messages from clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      })
    );
  }
});

// Background sync for offline form submissions (if supported)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-form-submissions') {
    event.waitUntil(syncFormSubmissions());
  }
});

/**
 * Sync offline form submissions when back online
 */
async function syncFormSubmissions() {
  console.log('[SW] Syncing form submissions...');
  
  // This would integrate with form-handler.js
  // For now, just log
  const clients = await self.clients.matchAll();
  clients.forEach((client) => {
    client.postMessage({
      type: 'SYNC_FORMS',
      message: 'Attempting to sync offline submissions'
    });
  });
}

console.log('[SW] Service Worker loaded successfully');
