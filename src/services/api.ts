import axios from 'axios'

// Verbindung zum Backend
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'https://scanpro-backend-production.up.railway.app/api'
})

// Token automatisch mitsenden
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Auth Funktionen
export const authService = {

  // Registrieren
  registrieren: async (daten: {
    vorname: string
    nachname: string
    email: string
    passwort: string
    firma?: string
  }) => {
    const response = await api.post('/auth/registrieren', daten)
    return response.data
  },

  // Code bestätigen
  bestaetigen: async (email: string, code: string) => {
    const response = await api.post('/auth/bestaetigen', { email, code })
    if (response.data.token) {
      localStorage.setItem('token', response.data.token)
      localStorage.setItem('benutzer', JSON.stringify(response.data.benutzer))
    }
    return response.data
  },

  // Login
  login: async (email: string, passwort: string) => {
    const response = await api.post('/auth/login', { email, passwort })
    if (response.data.token) {
      localStorage.setItem('token', response.data.token)
      localStorage.setItem('benutzer', JSON.stringify(response.data.benutzer))
    }
    return response.data
  },

  // Logout
  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('benutzer')
    window.location.href = '/login'
  }
}

export default api