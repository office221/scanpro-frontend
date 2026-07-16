import React, { useState, useEffect } from 'react'
import api from '../services/api'
import { StatusChip, btnPrimary, btnSecondary } from '../ui/theme'

interface Kunde {
  id: number
  kundennummer: string
  typ: 'Privat' | 'Geschäftlich'
  vorname: string
  nachname: string
  firma?: string
  firmennummer?: string
  uid?: string
  nameAufRechnung?: boolean
  email?: string
  telefon?: string
  strasse?: string
  plz?: string
  ort?: string
  notiz?: string
}

const leerForm = {
  typ: 'Privat', vorname: '', nachname: '',
  firma: '', firmennummer: '', uid: '', nameAufRechnung: true,
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
      nameAufRechnung: k.nameAufRechnung !== false,
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
          style={{flex:1, padding:'9px 14px', borderRadius:8, border:'1px solid var(--bf-input-border)', background:'var(--bf-input-bg)', color:'var(--bf-text)', fontFamily:'DM Sans, sans-serif', fontSize:13, outline:'none'}}
          placeholder="Kunden suchen..."
          value={suche}
          onChange={e => setSuche(e.target.value)}
        />
        <button
          style={{...btnPrimary}}
          onClick={() => { setFormDaten(leerForm); setBearbeitenId(null); setFormOffen(true) }}>
          + Neuer Kunde
        </button>
      </div>

      {/* Tabelle */}
      <div style={{background:'var(--bf-card)', borderRadius:10, border:'1px solid var(--bf-border)', overflow:'hidden', flex:1, display:'flex', flexDirection:'column'}}>
        {isMobile ? (
          <div>
            {laden ? (
              <div style={{padding:40, textAlign:'center', color:'var(--bf-text-muted)'}}>Lädt...</div>
            ) : gefilterteKunden.length === 0 ? (
              <div style={{padding:40, textAlign:'center', color:'var(--bf-text-muted)'}}>
                {kunden.length === 0 ? 'Noch keine Kunden — erstelle deinen ersten!' : 'Keine Ergebnisse'}
              </div>
            ) : (
              gefilterteKunden.map(k => (
                <div key={k.id}
                  style={{padding:'12px 16px', borderBottom:'1px solid var(--bf-divider)', cursor:'pointer', background: ausgewaehlt?.id === k.id ? 'rgba(200,169,110,0.12)' : k.id%2===0 ? 'var(--bf-soft)' : 'var(--bf-card)'}}
                  onClick={() => setAusgewaehlt(ausgewaehlt?.id === k.id ? null : k)}>
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:4}}>
                    <div style={{fontWeight:500, fontSize:13, color:'var(--bf-text)'}}>{k.vorname} {k.nachname}</div>
                    <StatusChip status={k.typ} />
                  </div>
                  {k.firma && <div style={{fontSize:11, color:'var(--bf-text-muted)', marginBottom:2}}>{k.firma}</div>}
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                    <div style={{fontSize:11, color:'var(--bf-text-muted)'}}>{k.kundennummer}{k.ort ? ` · ${k.ort}` : ''}</div>
                    <div style={{fontSize:11, color:'var(--bf-text-muted)'}}>{k.email || '—'}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
        <div style={{overflowX:'auto'}}>
        <table style={{width:'100%', borderCollapse:'collapse'}}>
          <thead>
            <tr style={{background:'var(--bf-thead)'}}>
              {['Kd.-Nr.', 'Name / Firma', 'UID / FN', 'Ort', 'Typ', 'Email'].map(h => (
                <th key={h} style={{padding:'9px 14px', textAlign:'left', fontSize:9, textTransform:'uppercase', letterSpacing:0.8, color:'var(--bf-text-muted)', fontWeight:700, borderBottom:'1px solid var(--bf-border)'}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {laden ? (
              <tr><td colSpan={6} style={{padding:40, textAlign:'center', color:'var(--bf-text-muted)'}}>Lädt...</td></tr>
            ) : gefilterteKunden.length === 0 ? (
              <tr><td colSpan={6} style={{padding:40, textAlign:'center', color:'var(--bf-text-muted)'}}>
                {kunden.length === 0 ? 'Noch keine Kunden — erstelle deinen ersten!' : 'Keine Ergebnisse'}
              </td></tr>
            ) : (
              gefilterteKunden.map(k => (
                <tr key={k.id}
                  style={{borderBottom:'1px solid var(--bf-divider)', cursor:'pointer', background: ausgewaehlt?.id === k.id ? 'rgba(200,169,110,0.12)' : 'transparent'}}
                  onClick={() => setAusgewaehlt(ausgewaehlt?.id === k.id ? null : k)}
                  onMouseEnter={e => { if (ausgewaehlt?.id !== k.id) e.currentTarget.style.background = 'var(--bf-hover)' }}
                  onMouseLeave={e => { if (ausgewaehlt?.id !== k.id) e.currentTarget.style.background = 'transparent' }}>
                  <td style={{padding:'10px 14px', fontFamily:'Syne, sans-serif', fontSize:10, color:'var(--bf-text-muted)', fontWeight:700}}>{k.kundennummer}</td>
                  <td style={{padding:'10px 14px'}}>
                    <div style={{fontWeight:500, fontSize:13, color:'var(--bf-text)'}}>{k.vorname} {k.nachname}</div>
                    {k.firma && <div style={{fontSize:11, color:'var(--bf-text-muted)'}}>{k.firma}</div>}
                  </td>
                  <td style={{padding:'10px 14px'}}>
                    {k.uid && <div style={{fontSize:11, color:'var(--bf-text-soft)'}}>UID: {k.uid}</div>}
                    {k.firmennummer && <div style={{fontSize:11, color:'var(--bf-text-soft)'}}>FN: {k.firmennummer}</div>}
                    {!k.uid && !k.firmennummer && <span style={{color:'var(--bf-text-muted)'}}>—</span>}
                  </td>
                  <td style={{padding:'10px 14px', fontSize:12, color:'var(--bf-text-muted)'}}>{k.ort || '—'}</td>
                  <td style={{padding:'10px 14px'}}>
                    <StatusChip status={k.typ} />
                  </td>
                  <td style={{padding:'10px 14px', fontSize:12, color:'var(--bf-text-muted)'}}>{k.email || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
        )}

        {/* Aktionsleiste */}
        {ausgewaehlt && (
          <div style={{padding:'10px 16px', borderTop:'2px solid #c8a96e', background:'var(--bf-card)', display:'flex', alignItems:'center', gap:8}}>
            <span style={{fontSize:13, fontWeight:600, color:'var(--bf-text)'}}>{ausgewaehlt.vorname} {ausgewaehlt.nachname}</span>
            {ausgewaehlt.firma && <span style={{fontSize:11, color:'var(--bf-text-muted)'}}>{ausgewaehlt.firma}</span>}
            <span style={{fontSize:10, color:'var(--bf-text-muted)', background:'var(--bf-soft)', padding:'2px 8px', borderRadius:4, marginRight:8}}>{ausgewaehlt.kundennummer}</span>
            <button style={{...btnPrimary, padding:'6px 12px', fontSize:11}}
              onClick={() => kundenBearbeiten(ausgewaehlt)}>
              Bearbeiten
            </button>
            <div style={{flex:1}}></div>
            <button style={{...btnSecondary, padding:'6px 12px', fontSize:11, color:'#ef4444', borderColor:'rgba(239,68,68,0.35)'}}
              onClick={() => kundenLoeschen(ausgewaehlt.id)}>
              Löschen
            </button>
          </div>
        )}
      </div>

      {/* MODAL */}
      {formOffen && (
        <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100}}>
          <div style={{background:'var(--bf-card)', borderRadius:14, padding:28, width:540, maxHeight:'90vh', overflowY:'auto', boxShadow:'var(--bf-shadow)'}}>
            <div style={{fontFamily:'Syne, sans-serif', fontSize:18, fontWeight:800, marginBottom:20, color:'var(--bf-text)'}}>
              {bearbeitenId ? 'Kunde bearbeiten' : 'Neuer Kunde'}
            </div>

            {/* Typ Toggle */}
            <div style={{display:'flex', background:'var(--bf-soft)', borderRadius:8, padding:3, marginBottom:16}}>
              {['Privat', 'Geschäftlich'].map(t => (
                <button key={t}
                  style={{flex:1, padding:'7px', borderRadius:6, border:'none', background: fd.typ === t ? 'var(--bf-card)' : 'transparent', fontFamily:'DM Sans, sans-serif', fontSize:13, fontWeight:500, cursor:'pointer', color: fd.typ === t ? 'var(--bf-text)' : 'var(--bf-text-muted)'}}
                  onClick={() => setFormDaten({...fd, typ: t, ...(t === 'Privat' ? { nameAufRechnung: true } : {})})}>
                  {t}
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
              <div style={{background:'var(--bf-soft)', borderRadius:10, padding:14, marginBottom:12}}>
                <div style={{fontSize:11, fontWeight:700, color:'var(--bf-text-muted)', textTransform:'uppercase', letterSpacing:0.8, marginBottom:10}}>Firmendaten</div>
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
                  <label style={{display:'flex', alignItems:'center', gap:8, cursor:'pointer', fontSize:13, color:'var(--bf-text-soft)', marginTop:2}}>
                    <input type="checkbox" checked={fd.nameAufRechnung}
                      onChange={e => setFormDaten({...fd, nameAufRechnung: e.target.checked})}
                      style={{width:16, height:16, accentColor:'#c8a96e', cursor:'pointer'}} />
                    Ansprechpartner ({fd.vorname || 'Vorname'} {fd.nachname || 'Nachname'}) auf Rechnung anzeigen
                  </label>
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
                style={{...btnPrimary, flex:1, padding:12, fontSize:14}}
                onClick={kundenSpeichern}>
                {bearbeitenId ? 'Änderungen speichern' : 'Kunde speichern'}
              </button>
              <button
                style={{...btnSecondary, padding:12}}
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
  letterSpacing:0.8, color:'var(--bf-text-muted)', fontWeight:600, marginBottom:5
}

const inputStyle: React.CSSProperties = {
  width:'100%', padding:'9px 12px', border:'1px solid var(--bf-input-border)',
  background:'var(--bf-input-bg)', color:'var(--bf-text)',
  borderRadius:7, fontFamily:'DM Sans, sans-serif', fontSize:13, outline:'none',
  boxSizing:'border-box'
}
