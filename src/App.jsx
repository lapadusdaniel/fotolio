import { useState, useEffect } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import './App.css'
import Login from './components/login.jsx'
import Register from './components/Register.jsx'
import Dashboard from './components/Dashboard.jsx'
import ClientGallery from './components/ClientGallery.jsx'
import LandingPage from './components/LandingPage.jsx'
import { auth } from './firebase'
import { onAuthStateChanged, signOut } from 'firebase/auth'

function AuthLayout({ children }) {
  const navigate = useNavigate()
  return (
    <div style={{ fontFamily: 'Arial, sans-serif' }}>
      <header style={{ backgroundColor: '#1a1a1a', color: 'white', padding: '20px 50px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>Fotolio</h1>
        <button onClick={() => navigate('/')} style={{ backgroundColor: 'transparent', border: '2px solid white', color: 'white', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer' }}>Înapoi</button>
      </header>
      {children}
    </div>
  )
}

function ProtectedDashboard({ user, onLogout, initialTab }) {
  if (!user) return <Navigate to="/login" replace />
  return (
    <div style={{ fontFamily: 'Arial, sans-serif' }}>
      <Dashboard user={user} onLogout={onLogout} initialTab={initialTab} />
    </div>
  )
}

function App() {
  const [user, setUser] = useState(null)
  const [loadingAuth, setLoadingAuth] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const displayName = firebaseUser.displayName || (firebaseUser.email ? firebaseUser.email.split('@')[0] : 'Utilizator')
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          name: displayName
        })
      } else {
        setUser(null)
      }
      setLoadingAuth(false)
    })
    return () => unsubscribe()
  }, [])

  const handleLogin = (userData) => {
    setUser(userData)
    navigate('/dashboard')
  }

  const handleRegister = (userData) => {
    setUser(userData)
    navigate('/dashboard')
  }

  const handleLogout = async () => {
    if (!window.confirm('Sigur vrei să te deconectezi?')) return
    try { await signOut(auth) } catch (e) { console.error(e) }
    setUser(null)
    navigate('/')
  }

  if (loadingAuth) return <div style={{ textAlign: 'center', padding: '100px' }}>Se încarcă...</div>

  return (
    <Routes>
      <Route path="/login" element={
        user ? <Navigate to="/dashboard" replace /> : (
          <AuthLayout>
            <Login onLogin={handleLogin} onSwitchToRegister={() => navigate('/register')} />
          </AuthLayout>
        )
      } />
      <Route path="/register" element={
        user ? <Navigate to="/dashboard" replace /> : (
          <AuthLayout>
            <Register onRegister={handleRegister} onSwitchToLogin={() => navigate('/login')} />
          </AuthLayout>
        )
      } />
      <Route path="/dashboard" element={<ProtectedDashboard user={user} onLogout={handleLogout} />} />
      <Route path="/settings" element={<ProtectedDashboard user={user} onLogout={handleLogout} initialTab="setari" />} />
      <Route path="/gallery/:id" element={<ClientGallery />} />
      <Route path="/:slug" element={<ClientGallery />} />
      <Route path="/" element={<LandingPage user={user} />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App