import { useEffect, useState } from 'react'
import { BrowserRouter, Link, Navigate, Route, Routes } from 'react-router-dom'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth } from './firebase'
import './App.css'
import Dashboard from './components/Dashboard.jsx'
import Login from './components/login.jsx'
import Register from './components/Register.jsx'
import ClientGallery from './components/ClientGallery.jsx'

function GalleryIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3.5" y="4.5" width="17" height="15" rx="3.5" stroke="currentColor" strokeWidth="1.7" />
      <path d="M7 15.5L10.2 11.8C10.6 11.33 11.34 11.32 11.76 11.78L13.9 14.15L15.55 12.28C15.96 11.82 16.68 11.8 17.1 12.24L20 15.25" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="9" cy="8.7" r="1.2" fill="currentColor" />
    </svg>
  )
}

function BoltIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M13.5 3L6.8 12.2C6.45 12.68 6.79 13.35 7.37 13.35H11.2L10.5 21L17.2 11.82C17.56 11.34 17.22 10.65 16.63 10.65H12.8L13.5 3Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  )
}

function CloudIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M8.8 18.5H17.1C19.53 18.5 21.5 16.54 21.5 14.1C21.5 11.89 19.86 10.06 17.74 9.76C17.19 6.99 14.76 4.9 11.83 4.9C8.49 4.9 5.78 7.6 5.78 10.95V11.07C3.98 11.57 2.66 13.22 2.66 15.18C2.66 17.54 4.58 18.5 6.94 18.5H8.8Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  )
}

function LandingPage({ user, onLogout }) {
  const featureItems = [
    {
      title: 'Galerii Premium',
      description: 'Interfață elegantă pentru livrarea proiectelor foto către clienți.',
      icon: <GalleryIcon />
    },
    {
      title: 'Selecție Instantă',
      description: 'Favoritele se aleg rapid, direct în galerie, fără pași suplimentari.',
      icon: <BoltIcon />
    },
    {
      title: 'Stocare Nelimitată',
      description: 'Upload și livrare la scară, fără grija spațiului disponibil.',
      icon: <CloudIcon />
    }
  ]

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#fff',
      color: '#0f1720',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    }}>
      <header style={{
        height: '76px',
        borderBottom: '1px solid #eceff3',
        padding: '0 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <h1 style={{ margin: 0, fontSize: '22px', letterSpacing: '0.02em' }}>Fotolio</h1>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {user ? (
            <>
              <Link
                to="/dashboard"
                style={{
                  textDecoration: 'none',
                  border: '1px solid #d5dbe3',
                  color: '#111827',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  fontSize: '14px',
                  fontWeight: 600
                }}
              >
                Dashboard
              </Link>
              <button
                onClick={onLogout}
                style={{
                  border: 'none',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  backgroundColor: '#111827',
                  color: '#fff'
                }}
              >
                Ieșire
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                style={{
                  textDecoration: 'none',
                  border: '1px solid #d5dbe3',
                  color: '#111827',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  fontSize: '14px',
                  fontWeight: 600
                }}
              >
                Autentificare
              </Link>
              <Link
                to="/register"
                style={{
                  textDecoration: 'none',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  fontSize: '14px',
                  fontWeight: 700,
                  backgroundColor: '#111827',
                  color: '#fff'
                }}
              >
                Cont Nou
              </Link>
            </>
          )}
        </div>
      </header>

      <main style={{ maxWidth: '1080px', margin: '0 auto', padding: '72px 24px 80px' }}>
        <section style={{ marginBottom: '54px' }}>
          <p style={{ margin: '0 0 10px', fontSize: '13px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#6b7280', opacity: 0.72 }}>
            Delivery pentru fotografi
          </p>
          <p style={{ margin: '0 0 14px', color: '#525f73', fontSize: '15px', fontStyle: 'italic', fontFamily: 'Georgia, \"Times New Roman\", serif', opacity: 0.72 }}>
            De la fotografi, pentru fotografi.
          </p>
          <h2 style={{ margin: 0, fontSize: 'clamp(2rem, 6vw, 4rem)', lineHeight: 1.02, fontWeight: 760 }}>
            Galerii private, curate și rapide.
          </h2>
          <p style={{ margin: '18px 0 0', maxWidth: '58ch', color: '#556070', lineHeight: 1.7, fontSize: '17px', fontWeight: 350 }}>
            Fotolio îți oferă fluxul complet de livrare: publicare galerii, feedback instant de la clienți și control total asupra brandului tău.
          </p>

          <div style={{
            marginTop: '34px',
            border: '1px solid #e8ecf1',
            borderRadius: '24px',
            overflow: 'hidden',
            boxShadow: '0 20px 45px rgba(15, 23, 32, 0.1)',
            background: '#f8fafc'
          }}>
            <div style={{
              height: '48px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 16px',
              borderBottom: '1px solid #e8ecf1',
              backgroundColor: '#fff'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f97316' }} />
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#facc15' }} />
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4ade80' }} />
              </div>
              <span style={{ fontSize: '12px', color: '#6b7280', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 500 }}>
                Preview galerie client
              </span>
            </div>

            <div style={{
              position: 'relative',
              height: '420px',
              backgroundImage: 'linear-gradient(rgba(17,24,39,0.2), rgba(17,24,39,0.1)), url(https://images.unsplash.com/photo-1504208434309-cb69f4fe52b0?auto=format&fit=crop&w=1800&q=80)',
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}>
              <div style={{
                position: 'absolute',
                left: '16px',
                right: '16px',
                bottom: '16px',
                display: 'grid',
                gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                gap: '10px'
              }}>
                {[1, 2, 3, 4].map((item) => (
                  <div
                    key={item}
                    style={{
                      height: '72px',
                      borderRadius: '10px',
                      border: '1px solid rgba(255,255,255,0.45)',
                      backgroundColor: 'rgba(255,255,255,0.25)',
                      backdropFilter: 'blur(2px)'
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        <section>
          <h3 style={{ margin: 0, fontSize: '30px', fontWeight: 760 }}>De ce Fotolio?</h3>
          <div style={{
            marginTop: '26px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '14px'
          }}>
            {featureItems.map((item) => (
              <article key={item.title} style={{ border: '1px solid #e8ecf1', borderRadius: '14px', padding: '22px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  border: '1px solid #dce3eb',
                  display: 'grid',
                  placeItems: 'center',
                  marginBottom: '12px',
                  color: '#111827'
                }}>
                  {item.icon}
                </div>
                <h4 style={{ margin: '0 0 10px', fontSize: '18px', fontWeight: 700 }}>{item.title}</h4>
                <p style={{ margin: 0, color: '#637082', lineHeight: 1.6, fontWeight: 350 }}>{item.description}</p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer style={{
        backgroundColor: '#111',
        color: '#d1d5db',
        padding: '28px 24px',
        textAlign: 'center',
        fontWeight: 500,
        letterSpacing: '0.01em',
        opacity: 0.72
      }}>
        Fotolio 2026 — Creat pentru fotografi · Creat în RO with ❤️
      </footer>
    </div>
  )
}

function App() {
  const [user, setUser] = useState(null)
  const [loadingAuth, setLoadingAuth] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          name: firebaseUser.displayName || firebaseUser.email.split('@')[0]
        })
      } else {
        setUser(null)
      }
      setLoadingAuth(false)
    })

    return () => unsubscribe()
  }, [])

  const handleLogout = async () => {
    if (!window.confirm('Sigur vrei să te deconectezi?')) return
    await signOut(auth)
    setUser(null)
  }

  if (loadingAuth) {
    return <div style={{ padding: '50px', textAlign: 'center' }}>Se încarcă Fotolio...</div>
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage user={user} onLogout={handleLogout} />} />
        <Route path="/g/:slug" element={<ClientGallery />} />
        <Route
          path="/dashboard"
          element={user ? <Dashboard user={user} onLogout={handleLogout} /> : <Navigate to="/login" />}
        />
        <Route path="/login" element={!user ? <Login onLogin={setUser} /> : <Navigate to="/dashboard" />} />
        <Route path="/register" element={!user ? <Register onRegister={setUser} /> : <Navigate to="/dashboard" />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
