import React, { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './seiten/Login'
import Dashboard from './seiten/Dashboard'

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'))

  return (
    <BrowserRouter>
      <Routes>
     <Route path="/login" element={<Login onLogin={() => console.log("Login-Funktion aufgerufen")} />} />
<Route path="/dashboard" element={
  token ? <Dashboard onLogout={() => console.log("Logout-Funktion aufgerufen")} /> : <Navigate to="/login" />
} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App