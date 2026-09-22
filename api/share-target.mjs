// Fallback für das Teilen an BelegFix, wenn der Service Worker die Anfrage nicht
// abfängt (z. B. frisch installierte App, SW noch nicht aktiv). Die Datei kommt
// hier an, wird als Seite zurückgegeben und im Browser in denselben Cache gelegt,
// den das Dashboard beim Start ausliest.

const eingebettet = (wert) => JSON.stringify(wert).replace(/</g, '\\u003c')

const seite = (daten) => `<!doctype html><html lang="de"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>BelegFix</title></head>
<body style="font-family:sans-serif;padding:24px">Beleg wird übernommen …
<script>
(async () => {
  const d = ${eingebettet(daten)}
  try {
    const cache = await caches.open('belegfix-share-v1')
    await cache.put('/shared-info', new Response(JSON.stringify({ felder: d.felder, am: Date.now(), datei: !!d.b64 }),
      { headers: { 'Content-Type': 'application/json' } }))
    if (d.b64) {
      const bytes = Uint8Array.from(atob(d.b64), c => c.charCodeAt(0))
      await cache.put('/shared-file', new Response(new Blob([bytes], { type: d.typ }), { headers: {
        'Content-Type': d.typ, 'X-Filename': encodeURIComponent(d.name), 'X-Shared-At': String(Date.now()) } }))
    }
  } catch (e) { console.error(e) }
  location.replace('/?share=1')
})()
</script></body></html>`

const antwort = (html) => new Response(html, {
  headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
})

export async function POST(request) {
  const felder = []
  let datei = null
  try {
    const formData = await request.formData()
    for (const [k, v] of formData.entries()) {
      if (typeof v === 'string') felder.push(`${k}: ${v.slice(0, 200)}`)
      else {
        felder.push(`${k}: Datei "${v.name}" (${v.type || 'ohne Typ'}, ${v.size} Bytes)`)
        if (k === 'datei' && v.size > 0 && !datei) datei = v
      }
    }
  } catch (e) {
    felder.push('Fehler beim Lesen: ' + e.message)
  }
  console.log('share-target (Server)', JSON.stringify({ ua: request.headers.get('user-agent'), felder }))
  if (!datei) return antwort(seite({ felder }))
  const b64 = Buffer.from(await datei.arrayBuffer()).toString('base64')
  return antwort(seite({ felder, b64, name: datei.name || 'geteilt.pdf', typ: datei.type || 'application/pdf' }))
}

export async function GET(request) {
  const url = new URL(request.url)
  const felder = [...url.searchParams.entries()].map(([k, v]) => `${k}: ${v.slice(0, 200)}`)
  console.log('share-target GET (Server)', JSON.stringify({ ua: request.headers.get('user-agent'), felder }))
  return antwort(seite({ felder }))
}
