// BelegFix Service Worker v1.1
const CACHE_NAME = 'belegfix-v1'
const SHARE_CACHE = 'belegfix-share-v1'

// ── Web Share Target: POST /share-target ─────────────────────────────────────
async function handleShare(request) {
  try {
    const formData = await request.formData()
    const file = formData.get('datei')
    if (file && file.size > 0) {
      const buf = await file.arrayBuffer()
      const response = new Response(new Blob([buf], { type: file.type }), {
        headers: {
          'Content-Type': file.type,
          'X-Filename': encodeURIComponent(file.name || 'shared-file')
        }
      })
      const cache = await caches.open(SHARE_CACHE)
      await cache.put('/shared-file', response)
    }
  } catch (err) {
    console.error('Share handling error:', err)
  }
  return Response.redirect('/?share=1', 303)
}
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo192.png',
  '/logo512.png',
  '/apple-touch-icon.png',
  'https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:wght@300;400;500&display=swap'
]

// Install: statische Assets cachen
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS.map(url => new Request(url, { mode: 'no-cors' })))
        .catch(() => {}) // Fonts können fehlschlagen – kein Problem
    }).then(() => self.skipWaiting())
  )
})

// Activate: alte Caches löschen
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

// Fetch: Network-First für API, Cache-First für Assets
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url)

  // Share Target: eingehende geteilte Dateien abfangen
  if (url.pathname === '/share-target' && event.request.method === 'POST') {
    event.respondWith(handleShare(event.request))
    return
  }

  // API-Aufrufe immer online (nie cachen)
  if (url.pathname.startsWith('/api') || url.hostname.includes('railway.app') || url.hostname.includes('supabase')) {
    return // Browser-Standard
  }

  // Alles andere: Network first, Fallback auf Cache
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response.ok && event.request.method === 'GET') {
          const clone = response.clone()
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone))
        }
        return response
      })
      .catch(() => caches.match(event.request).then(r => r || caches.match('/index.html')))
  )
})
