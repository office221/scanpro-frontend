// Nimmt kurze Diagnose-Meldungen der App an und schreibt sie ins Vercel-Log
// (z. B. was beim Teilen angekommen ist). Keine Speicherung.
export async function POST(request) {
  const text = (await request.text()).slice(0, 2000)
  console.log('diag', text, '| ua:', request.headers.get('user-agent'))
  return new Response(null, { status: 204 })
}
