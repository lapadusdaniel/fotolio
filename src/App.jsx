import { useState, useEffect } from 'react'
import { Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom'
import './App.css'
import Login from './components/login.jsx'
import Register from './components/Register.jsx'
import Dashboard from './components/Dashboard.jsx'
import ClientGallery from './components/ClientGallery.jsx'
import PhotographerSite from './components/PhotographerSite.jsx'
import LandingPage from './components/LandingPage.jsx'
import AdminPanel from './components/AdminPanel.jsx' // ← IMPORTUL ADAUGAT PENTRU ADMIN
import { auth, db } from './firebase'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { collection, query, where, getDocs } from 'firebase/firestore'

// ── SlugRouter ────────────────────────────────
// Verifică în Firestore dacă slug-ul aparține unui site de fotograf
// sau unei galerii client. Loading state cu logo pulsând.
function SlugRouter() {
  const { slug } = useParams()
  const [target, setTarget] = useState(null) // 'site' | 'gallery' | 'notfound'

  useEffect(() => {
    if (!slug) { setTarget('notfound'); return }
    let cancelled = false

    const check = async () => {
      try {
        // Verifică mai întâi photographerSites
        const siteQ = query(
          collection(db, 'photographerSites'),
          where('slug', '==', slug)
        )
        const siteSnap = await getDocs(siteQ)
        if (!cancelled && !siteSnap.empty) {
          setTarget('site')
          return
        }

        // Verifică galeriile
        const galleryQ = query(
          collection(db, 'galerii'),
          where('slug', '==', slug)
        )
        const gallerySnap = await getDocs(galleryQ)
        if (!cancelled) {
          setTarget(gallerySnap.empty ? 'notfound' : 'gallery')
        }
      } catch (err) {
        console.error('SlugRouter error:', err)
        if (!cancelled) setTarget('gallery')
      }
    }

    check()
    return () => { cancelled = true }
  }, [slug])

  if (target === null) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#fff',
        fontFamily: "'DM Serif Display', Georgia, serif",
      }}>
        <style>{`
          @keyframes fotolioLogoPulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.25; }
          }
        `}</style>
        <p style={{
          fontStyle: 'italic',
          fontSize: '1.5rem',
          color: '#1d1d1f',
          margin: 0,
          animation: 'fotolioLogoPulse 1.8s ease-in-out infinite',
        }}>
          Fotolio
        </p>
      </div>
    )
  }

  if (target === 'site') return <PhotographerSite />
  if (target === 'gallery') return <ClientGallery />
  return <Navigate to="/" replace />
}

function AuthLayout({ children }) {
  return <div style={{ fontFamily: 'Arial, sans-serif' }}>{children}</div>
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
        const displayName =
          firebaseUser.displayName ||
          (firebaseUser.email ? firebaseUser.email.split('@')[0] : 'Utilizator')
        setUser({ uid: firebaseUser.uid, email: firebaseUser.email, name: displayName })
      } else {
        setUser(null)
      }
      setLoadingAuth(false)
    })
    return () => unsubscribe()
  }, [])

  const handleLogin = (userData) => { setUser(userData); navigate('/dashboard') }
  const handleRegister = (userData) => { setUser(userData); navigate('/dashboard') }
  const handleLogout = async () => {
    if (!window.confirm('Sigur vrei să te deconectezi?')) return
    try { await signOut(auth) } catch (e) { console.error(e) }
    setUser(null)
    navigate('/')
  }

  if (loadingAuth) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'DM Serif Display', Georgia, serif",
        fontStyle: 'italic',
        fontSize: '1.5rem',
        color: '#1d1d1f',
      }}>
        Fotolio
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <AuthLayout><Login onLogin={handleLogin} onSwitchToRegister={() => navigate('/register')} /></AuthLayout>} />
      <Route path="/register" element={user ? <Navigate to="/dashboard" replace /> : <AuthLayout><Register onRegister={handleRegister} onSwitchToLogin={() => navigate('/login')} /></AuthLayout>} />
      <Route path="/dashboard" element={<ProtectedDashboard user={user} onLogout={handleLogout} />} />
      <Route path="/settings" element={<ProtectedDashboard user={user} onLogout={handleLogout} initialTab="setari" />} />
      <Route path="/admin" element={<AdminPanel user={user} />} /> {/* ← RUTA ADAUGATA PENTRU ADMIN */}
      <Route path="/gallery/:id" element={<ClientGallery />} />
      <Route path="/" element={<LandingPage user={user} />} />
      <Route path="/:slug" element={<SlugRouter />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App