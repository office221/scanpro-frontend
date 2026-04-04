import React, { useState, useEffect } from 'react'
import api from '../services/api'

interface Kunde {
  id: number
  kundennummer: string
  typ: 'Privat' | 'Geschäftlich'
  vorname: string
  nachname: string
  firma?: string
  firmennummer?: string
  uid?: string
  email?: string
  telefon?: string
  strasse?: string
  plz?: string
  ort?: string
  notiz?: string
}

const leerForm = {
  typ: 'Privat', vorname: '', nachname: '',
  firma: '', firmennummer: '', uid: '',
  email: '', telefon: '',
  strasse: '', plz: '', ort: '', notiz: ''
}

export default function Kunden() {
  const [kunden, setKunden] = useState<Kunde[]>([])
  const [ausgewaehlt, setAusgewaehlt] = useState<Kunde | null>(null)
  const [formOffen, setFormOffen] = useState(false)
  const [bearbeitenId, setBearbeitenId] = useState<number | null>(null)
  const [laden, setLaden] = useState(true)
  const [suche, setSuche] = useState('')
  const [formDaten, setFormDaten] = useState(leerForm)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])

  useEffect(() => { kundenLaden() }, [])

  const kundenLaden = async () => {
    try {
      const response = await api.get('/kunden')
      setKunden(response.data)
    } catch (fehler) {
      console.error('Fehler:', fehler)
    }
    setLaden(false)
  }

  const kundenSpeichern = async () => {
    if (!formDaten.vorname || !formDaten.nachname) {
      alert('Bitte Vor- und Nachname eingeben!')
      return
    }
    try {
      if (bearbeitenId) {
        await api.put(`/kunden/${bearbeitenId}`, formDaten)
      } else {
        await api.post('/kunden', formDaten)
      }
      setFormOffen(false)
      setBearbeitenId(null)
      setFormDaten(leerForm)
      kundenLaden()
    } catch (fehler) {
      alert('Fehler beim Speichern!')
    }
  }

  const kundenBearbeiten = (k: Kunde) => {
    setFormDaten({
      typ: k.typ,
      vorname: k.vorname,
      nachname: k.nachname,
      firma: k.firma || '',
      firmennummer: k.firmennummer || '',
      uid: k.uid || '',
      email: k.email || '',
      telefon: k.telefon || '',
      strasse: k.strasse || '',
      plz: k.plz || '',
      ort: k.ort || '',
      notiz: k.notiz || ''
    })
    setBearbeitenId(k.id)
    setFormOffen(true)
  }

  const kundenLoeschen = async (id: number) => {
    if (!window.confirm('Kunde wirklich löschen?')) return
    try {
      await api.delete(`/kunden/${id}`)
      setAusgewaehlt(null)
      kundenLaden()
    } catch (fehler) {
      alert('Fehler beim Löschen!')
    }
  }

  const gefilterteKunden = kunden.filter(k =>
    `${k.vorname} ${k.nachname} ${k.firma} ${k.kundennummer}`
      .toLowerCase().includes(suche.toLowerCase())
  )

  const fd = formDaten

  return (
    <div style={{display:'flex', flexDirection:'column', height:'100%', fontFamily:'DM Sans, sans-serif'}}>

      {/* Header */}
      <div style={{display:'flex', alignItems:'center', gap:12, marginBottom:16}}>
        <input
          style={{flex:1, padding:'9px 14px', borderRadius:8, border:'1px solid #e5e0d8', background:'white', fontFamily:'DM Sans, sans-serif', fontSize:13, outline:'none'}}
          placeholder="🔍 Kunden suchen..."
          value={suche}
          onChange={e => setSuche(e.target.value)}
        />
        <button
          style={{background:'#1a1a1a', color:'white', border:'none', borderRadius:8, padding:'9px 18px', fontFamily:'Syne, sans-serif', fontSize:13, fontWeight:700, cursor:'pointer'}}
          onClick={() => { setFormDaten(leerForm); setBearbeitenId(null); setFormOffen(true) }}>
          + Neuer Kunde
        </button>
      </div>

      {/* Tabelle */}
      <div style={{background:'white', borderRadius:10, border:'1px solid #e5e0d8', overflow:'hidden', flex:1, display:'flex', flexDirection:'column'}}>
        {isMobile ? (
          <div>
            {laden ? (
              <div style={{padding:40, textAlign:'center', color:'#888'}}>⏳ Lädt...</div>
            ) : gefilterteKunden.length === 0 ? (
              <div style={{padding:40, textAlign:'center', color:'#888'}}>
                {kunden.length === 0 ? '👥 Noch keine Kunden — erstelle deinen ersten!' : '🔍 Keine Ergebnisse'}
              </div>
            ) : (
              gefilterteKunden.map(k => (
                <div key={k.id}
                  style={{padding:'12px 16px', borderBottom:'1px solid #f0ede8', cursor:'pointer', background: ausgewaehlt?.id === k.id ? '#fdf8f0' : k.id%2===0 ? '#fafaf9' : 'white'}}
                  onClick={() => setAusgewaehlt(ausgewaehlt?.id === k.id ? null : k)}>
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:4}}>
                    <div style={{fontWeight:500, fontSize:13, color:'#1a1a1a'}}>{k.vorname} {k.nachname}</div>
                    <span style={{fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:4, background: k.typ === 'Privat' ? '#dbeafe' : '#f0f0ff', color: k.typ === 'Privat' ? '#1e40af' : '#4040cc'}}>
                      {k.typ === 'Privat' ? '👤' : '🏢'} {k.typ}
                    </span>
                  </div>
                  {k.firma && <div style={{fontSize:11, color:'#888', marginBottom:2}}>{k.firma}</div>}
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                    <div style={{fontSize:11, color:'#888'}}>{k.kundennummer}{k.ort ? ` · ${k.ort}` : ''}</div>
                    <div style={{fontSize:11, color:'#888'}}>{k.email || '—'}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
        <div style={{overflowX:'auto'}}>
        <table style={{width:'100%', borderCollapse:'collapse'}}>
          <thead>
            <tr style={{background:'#faf8f5'}}>
              {['Kd.-Nr.', 'Name / Firma', 'UID / FN', 'Ort', 'Typ', 'Email'].map(h => (
                <th key={h} style={{padding:'9px 14px', textAlign:'left', fontSize:9, textTransform:'uppercase', letterSpacing:0.8, color:'#888', fontWeight:700, borderBottom:'1px solid #e5e0d8'}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {laden ? (
              <tr><td colSpan={6} style={{padding:40, textAlign:'center', color:'#888'}}>⏳ Lädt...</td></tr>
            ) : gefilterteKunden.length === 0 ? (
              <tr><td colSpan={6} style={{padding:40, textAlign:'center', color:'#888'}}>
                {kunden.length === 0 ? '👥 Noch keine Kunden — erstelle deinen ersten!' : '🔍 Keine Ergebnisse'}
              </td></tr>
            ) : (
              gefilterteKunden.map(k => (
                <tr key={k.id}
                  style={{borderBottom:'1px solid #f0ede8', cursor:'pointer', background: ausgewaehlt?.id === k.id ? '#fdf8f0' : 'transparent'}}
                  onClick={() => setAusgewaehlt(ausgewaehlt?.id === k.id ? null : k)}
                  onMouseEnter={e => { if (ausgewaehlt?.id !== k.id) e.currentTarget.style.background = '#faf8f5' }}
                  onMouseLeave={e => { if (ausgewaehlt?.id !== k.id) e.currentTarget.style.background = 'transparent' }}>
                  <td style={{padding:'10px 14px', fontFamily:'Syne, sans-serif', fontSize:10, color:'#888', fontWeight:700}}>{k.kundennummer}</td>
                  <td style={{padding:'10px 14px'}}>
                    <div style={{fontWeight:500, fontSize:13, color:'#1a1a1a'}}>{k.vorname} {k.nachname}</div>
                    {k.firma && <div style={{fontSize:11, color:'#888'}}>{k.firma}</div>}
                  </td>
                  <td style={{padding:'10px 14px'}}>
                    {k.uid && <div style={{fontSize:11, color:'#555'}}>UID: {k.uid}</div>}
                    {k.firmennummer && <div style={{fontSize:11, color:'#555'}}>FN: {k.firmennummer}</div>}
                    {!k.uid && !k.firmennummer && <span style={{color:'#ccc'}}>—</span>}
                  </td>
                  <td style={{padding:'10px 14px', fontSize:12, color:'#888'}}>{k.ort || '—'}</td>
                  <td style={{padding:'10px 14px'}}>
                    <span style={{fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:4, background: k.typ === 'Privat' ? '#dbeafe' : '#f0f0ff', color: k.typ === 'Privat' ? '#1e40af' : '#4040cc'}}>
                      {k.typ === 'Privat' ? '👤' : '🏢'} {k.typ}
                    </span>
                  </td>
                  <td style={{padding:'10px 14px', fontSize:12, color:'#888'}}>{k.email || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
        )}

        {/* Aktionsleiste */}
        {ausgewaehlt && (
          <div style={{padding:'10px 16px', borderTop:'2px solid #c8a96e', background:'white', display:'flex', alignItems:'center', gap:8}}>
            <span style={{fontSize:13, fontWeight:600, color:'#1a1a1a'}}>{ausgewaehlt.vorname} {ausgewaehlt.nachname}</span>
            {ausgewaehlt.firma && <span style={{fontSize:11, color:'#888'}}>{ausgewaehlt.firma}</span>}
            <span style={{fontSize:10, color:'#888', background:'#f0ede8', padding:'2px 8px', borderRadius:4, marginRight:8}}>{ausgewaehlt.kundennummer}</span>
            <button style={{padding:'6px 12px', borderRadius:6, border:'none', background:'#1a1a1a', color:'white', fontFamily:'DM Sans, sans-serif', fontSize:11, fontWeight:500, cursor:'pointer'}}
              onClick={() => kundenBearbeiten(ausgewaehlt)}>
              ✏️ Bearbeiten
            </button>
            <div style={{flex:1}}></div>
            <button style={{padding:'6px 12px', borderRadius:6, border:'1px solid #fde8e6', background:'white', color:'#c0392b', fontFamily:'DM Sans, sans-serif', fontSize:11, cursor:'pointer'}}
              onClick={() => kundenLoeschen(ausgewaehlt.id)}>
              🗑️ Löschen
            </button>
          </div>
        )}
      </div>

      {/* MODAL */}
      {formOffen && (
        <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100}}>
          <div style={{background:'white', borderRadius:14, padding:28, width:540, maxHeight:'90vh', overflowY:'auto', boxShadow:'0 24px 60px rgba(0,0,0,0.2)'}}>
            <div style={{fontFamily:'Syne, sans-serif', fontSize:18, fontWeight:800, marginBottom:20, color:'#1a1a1a'}}>
              {bearbeitenId ? '✏️ Kunde bearbeiten' : '👥 Neuer Kunde'}
            </div>

            {/* Typ Toggle */}
            <div style={{display:'flex', background:'#f0ede8', borderRadius:8, padding:3, marginBottom:16}}>
              {['Privat', 'Geschäftlich'].map(t => (
                <button key={t}
                  style={{flex:1, padding:'7px', borderRadius:6, border:'none', background: fd.typ === t ? 'white' : 'transparent', fontFamily:'DM Sans, sans-serif', fontSize:13, fontWeight:500, cursor:'pointer', color: fd.typ === t ? '#1a1a1a' : '#888'}}
                  onClick={() => setFormDaten({...fd, typ: t})}>
                  {t === 'Privat' ? '👤' : '🏢'} {t}
                </button>
              ))}
            </div>

            {/* Name */}
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12}}>
              <div>
                <label style={labelStyle}>Vorname *</label>
                <input style={inputStyle} placeholder="Max"
                  value={fd.vorname} onChange={e => setFormDaten({...fd, vorname: e.target.value})} />
              </div>
              <div>
                <label style={labelStyle}>Nachname *</label>
                <input style={inputStyle} placeholder="Mustermann"
                  value={fd.nachname} onChange={e => setFormDaten({...fd, nachname: e.target.value})} />
              </div>
            </div>

            {/* Geschäftlich Felder */}
            {fd.typ === 'Geschäftlich' && (
              <div style={{background:'#f5f3ef', borderRadius:10, padding:14, marginBottom:12}}>
                <div style={{fontSize:11, fontWeight:700, color:'#888', textTransform:'uppercase', letterSpacing:0.8, marginBottom:10}}>🏢 Firmendaten</div>
                <div style={{display:'grid', gridTemplateColumns:'1fr', gap:10}}>
                  <div>
                    <label style={labelStyle}>Firmenname</label>
                    <input style={inputStyle} placeholder="Mustermann GmbH"
                      value={fd.firma} onChange={e => setFormDaten({...fd, firma: e.target.value})} />
                  </div>
                  <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10}}>
                    <div>
                      <label style={labelStyle}>UID-Nummer</label>
                      <input style={inputStyle} placeholder="ATU12345678"
                        value={fd.uid} onChange={e => setFormDaten({...fd, uid: e.target.value})} />
                    </div>
                    <div>
                      <label style={labelStyle}>Firmenbuchnummer</label>
                      <input style={inputStyle} placeholder="FN 123456a"
                        value={fd.firmennummer} onChange={e => setFormDaten({...fd, firmennummer: e.target.value})} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Kontakt */}
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12}}>
              <div>
                <label style={labelStyle}>Email</label>
                <input style={inputStyle} placeholder="max@mustermann.at"
                  value={fd.email} onChange={e => setFormDaten({...fd, email: e.target.value})} />
              </div>
              <div>
                <label style={labelStyle}>Telefon</label>
                <input style={inputStyle} placeholder="+43 ..."
                  value={fd.telefon} onChange={e => setFormDaten({...fd, telefon: e.target.value})} />
              </div>
            </div>

            {/* Adresse */}
            <div style={{marginBottom:12}}>
              <label style={labelStyle}>Straße & Hausnummer</label>
              <input style={inputStyle} placeholder="Hauptstraße 1"
                value={fd.strasse} onChange={e => setFormDaten({...fd, strasse: e.target.value})} />
            </div>
            <div style={{display:'grid', gridTemplateColumns:'120px 1fr', gap:12, marginBottom:12}}>
              <div>
                <label style={labelStyle}>PLZ</label>
                <input style={inputStyle} placeholder="1010"
                  value={fd.plz} onChange={e => setFormDaten({...fd, plz: e.target.value})} />
              </div>
              <div>
                <label style={labelStyle}>Ort</label>
                <input style={inputStyle} placeholder="Wien"
                  value={fd.ort} onChange={e => setFormDaten({...fd, ort: e.target.value})} />
              </div>
            </div>

            {/* Notiz */}
            <div style={{marginBottom:20}}>
              <label style={labelStyle}>Interne Notiz (erscheint nie auf PDF!)</label>
              <textarea style={{...inputStyle, resize:'vertical', minHeight:70} as any}
                placeholder="z.B. Zahlt immer pünktlich..."
                value={fd.notiz}
                onChange={e => setFormDaten({...fd, notiz: e.target.value})} />
            </div>

            {/* Buttons */}
            <div style={{display:'flex', gap:10}}>
              <button
                style={{flex:1, padding:12, background:'#1a1a1a', color:'white', border:'none', borderRadius:9, fontFamily:'Syne, sans-serif', fontSize:14, fontWeight:700, cursor:'pointer'}}
                onClick={kundenSpeichern}>
                ✅ {bearbeitenId ? 'Änderungen speichern' : 'Kunde speichern'}
              </button>
              <button
                style={{padding:12, background:'#f0ede8', color:'#888', border:'none', borderRadius:9, cursor:'pointer'}}
                onClick={() => { setFormOffen(false); setBearbeitenId(null) }}>
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display:'block', fontSize:11, textTransform:'uppercase',
  letterSpacing:0.8, color:'#888', fontWeight:600, marginBottom:5
}

const inputStyle: React.CSSProperties = {
  width:'100%', padding:'9px 12px', border:'1px solid #e5e0d8',
  borderRadius:7, fontFamily:'DM Sans, sans-serif', fontSize:13, outline:'none',
  boxSizing:'border-box'
}