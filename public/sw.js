// BelegFix Service Worker v1.4
const CACHE_NAME = 'belegfix-v1'
const SHARE_CACHE = 'belegfix-share-v1'

// ── Web Share Target: POST /share-target ─────────────────────────────────────
async function handleShare(request) {
  try {
    const formData = await request.formData()
    const file = formData.get('datei')
    const cache = await caches.open(SHARE_CACHE)
    // Was ist angekommen? Hilft, wenn statt einer Datei nur ein Link geteilt wurde
    const felder = []
    for (const [k, v] of formData.entries()) {
      felder.push(typeof v === 'string' ? `${k}: ${v.slice(0, 200)}` : `${k}: Datei "${v.name}" (${v.type || 'ohne Typ'}, ${v.size} Bytes)`)
    }
    fetch('/api/diag', { method: 'POST', body: 'sw-share ' + JSON.stringify(felder) }).catch(() => {})
    await cache.put('/shared-info', new Response(JSON.stringify({ felder, am: Date.now(), datei: !!(file && file.size > 0) }),
      { headers: { 'Content-Type': 'application/json' } }))
    if (file && file.size > 0) {
      const buf = await file.arrayBuffer()
      const response = new Response(new Blob([buf], { type: file.type }), {
        headers: {
          'Content-Type': file.type,
          'X-Filename': encodeURIComponent(file.name || 'shared-file'),
          'X-Shared-At': String(Date.now())
        }
      })
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
      // Share-Cache stehen lassen – darin kann eine geteilte Datei auf den Login warten
      Promise.all(keys.filter(k => k !== CACHE_NAME && k !== SHARE_CACHE).map(k => caches.delete(k)))
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
