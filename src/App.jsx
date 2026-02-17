import { useState, useEffect } from 'react'
import './App.css'
import Login from './components/login.jsx'
import Register from './components/Register.jsx'
import Dashboard from './components/Dashboard.jsx'
import ClientGallery from './components/ClientGallery.jsx'
import { auth } from './firebase'
import { onAuthStateChanged, signOut } from 'firebase/auth'

function App() {
  // 1. Detectăm dacă suntem pe un link de galerie (ex: ?galerie=mada-si-dani)
  const [galerieParam] = useState(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get('galerie');
    }
    return null;
  });

  const [paginaCurenta, setPaginaCurenta] = useState(() => {
    if (typeof window === 'undefined') return 'acasa'
    const saved = window.localStorage.getItem('paginaCurenta')
    return saved || 'acasa'
  })
  const [authView, setAuthView] = useState(null)
  const [user, setUser] = useState(null)
  const [loadingAuth, setLoadingAuth] = useState(true)

  // Ascultă starea de autentificare
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

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('paginaCurenta', paginaCurenta)
    }
  }, [paginaCurenta])

  const handleLogin = (userData) => {
    setUser(userData); setAuthView(null); setPaginaCurenta('dashboard');
  }

  const handleRegister = (userData) => {
    setUser(userData); setAuthView(null); setPaginaCurenta('dashboard');
  }

  const handleLogout = async () => {
    if (!window.confirm('Sigur vrei să te deconectezi?')) return
    try { await signOut(auth); } catch (e) { console.error(e); }
    setUser(null); setPaginaCurenta('acasa');
  }

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (loadingAuth) return <div style={{textAlign: 'center', padding: '100px'}}>Se încarcă...</div>

  // --- MACAZUL: Dacă e link de galerie, ignorăm tot restul site-ului ---
  if (galerieParam) {
    return <ClientGallery slug={galerieParam} />
  }

  // --- Login / Register Views ---
  if (authView === 'login') {
    return (
      <div style={{ fontFamily: 'Arial, sans-serif' }}>
        <header style={{ backgroundColor: '#1a1a1a', color: 'white', padding: '20px 50px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 className="logo" onClick={() => { setAuthView(null); setPaginaCurenta('acasa'); }}>Fotolio</h1>
          <button onClick={() => setAuthView(null)} style={{ backgroundColor: 'transparent', border: '2px solid white', color: 'white', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer' }}>Înapoi</button>
        </header>
        <Login onLogin={handleLogin} onSwitchToRegister={() => setAuthView('register')} />
      </div>
    )
  }

  if (authView === 'register') {
    return (
      <div style={{ fontFamily: 'Arial, sans-serif' }}>
        <header style={{ backgroundColor: '#1a1a1a', color: 'white', padding: '20px 50px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 className="logo" onClick={() => { setAuthView(null); setPaginaCurenta('acasa'); }}>Fotolio</h1>
          <button onClick={() => setAuthView(null)} style={{ backgroundColor: 'transparent', border: '2px solid white', color: 'white', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer' }}>Înapoi</button>
        </header>
        <Register onRegister={handleRegister} onSwitchToLogin={() => setAuthView('login')} />
      </div>
    )
  }

  // --- Dashboard View ---
  if (user && paginaCurenta === 'dashboard') {
    return (
      <div style={{ fontFamily: 'Arial, sans-serif' }}>
        <Dashboard user={user} onLogout={handleLogout} />
      </div>
    )
  }

  // --- Landing Page: One-Page Scroll ---
  return (
    <div style={{ fontFamily: 'Arial, sans-serif' }} className="landing-one-page">
      <header className="landing-header">
        <h1 className="logo" onClick={scrollToTop}>Fotolio</h1>
        <nav className="landing-nav">
          <a href="#despre-noi" className="nav-link">Despre Noi</a>
          <a href="#preturi" className="nav-link">Prețuri</a>
          <a href="#contact" className="nav-link">Contact</a>
        </nav>
        <div className="landing-auth-buttons">
          {user ? (
            <button onClick={() => setPaginaCurenta('dashboard')} className="btn-header">Dashboard</button>
          ) : (
            <>
              <button onClick={() => setAuthView('login')} className="btn-header">Autentificare</button>
              <button onClick={() => setAuthView('register')} className="btn-header btn-header-primary">Înregistrare</button>
            </>
          )}
        </div>
      </header>

      <main>
        {/* Hero */}
        <section id="hero" className="landing-section landing-hero">
          <h2 className="hero-title">Redă-ți timpul. Lasă fotografia să vorbească.</h2>
          <p className="hero-subtitle">Galerii pentru clienți, stocare sigură, branding personalizat. Tot ce ai nevoie ca fotograf, fără complicații tehnice.</p>
          <button onClick={() => setAuthView('register')} className="btn-primary btn-hero">Începe Gratuit</button>
        </section>

        {/* Despre Noi */}
        <section id="despre-noi" className="landing-section landing-despre">
          <div className="despre-container">
            <div className="despre-text">
              <h2 className="section-title">Despre Noi</h2>
              <p className="despre-lead">
                Fotolio este o platformă creată de un fotograf, pentru fotografi. Știm cât de mult timp se pierde cu soluții tehnice complicate — link-uri care nu merg, servere care se blochează, formatări care distrug munca ta.
              </p>
              <p className="despre-body">
                Credem în prezență. Fotograful trebuie să fie <em>prezent</em> la eveniment, alături de oaspeți. Și <em>prezent</em> acasă, în viața de familie — nu blocat în fața monitorului, gestionând stocări nesigure sau mesaje de la clienți care nu găsesc pozele lor.
              </p>
              <p className="despre-body">
                Am construit Fotolio pentru a fi rapid, intuitiv și invizibil. Folosim tehnologii moderne — React, Cloudflare — ca să te lăsăm să te concentrezi pe ceea ce contează: arta ta fotografică. Fără clișee, fără promisiuni goale. Doar un instrument care funcționează.
              </p>
            </div>
            <div className="despre-visual">
              <div className="despre-image-placeholder">
                <span className="placeholder-icon">📷</span>
                <span className="placeholder-text">Imagină lifestyle / echipament</span>
              </div>
            </div>
          </div>
        </section>

        {/* Prețuri */}
        <section id="preturi" className="landing-section landing-preturi">
          <h2 className="section-title">Planuri și Prețuri</h2>
          <div className="pricing-grid">
            <div className="pricing-card">
              <h3>Gratuit</h3>
              <div className="pricing-price">0 lei</div>
              <p className="pricing-storage">25 GB stocare</p>
              <button onClick={() => setAuthView('register')} className="btn-secondary" style={{ marginTop: '20px' }}>Începe acum</button>
            </div>
            <div className="pricing-card pricing-card-pro">
              <h3>Pro</h3>
              <div className="pricing-price">100 lei<span>/lună</span></div>
              <p className="pricing-storage">500 GB stocare</p>
              <button onClick={() => setAuthView('register')} className="btn-primary" style={{ marginTop: '20px', backgroundColor: 'white', color: '#0066cc' }}>Alege Pro</button>
            </div>
            <div className="pricing-card">
              <h3>Unlimited</h3>
              <div className="pricing-price">150 lei<span>/lună</span></div>
              <p className="pricing-storage">1 TB stocare</p>
              <button onClick={() => setAuthView('register')} className="btn-secondary" style={{ marginTop: '20px' }}>Alege Unlimited</button>
            </div>
          </div>
        </section>

        {/* Contact */}
        <section id="contact" className="landing-section landing-contact">
          <h2 className="section-title">Contact</h2>
          <p className="contact-intro">Ai întrebări? Scrie-ne și îți răspundem în cel mai scurt timp.</p>
          <form className="contact-form" onSubmit={(e) => e.preventDefault()}>
            <div className="form-row">
              <input type="text" placeholder="Nume" required />
              <input type="email" placeholder="Email" required />
            </div>
            <textarea placeholder="Mesajul tău" rows="5" required></textarea>
            <button type="submit" className="btn-primary">Trimite</button>
          </form>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="footer-content">
          <div><h3>Fotolio</h3><p>Made with ❤️ în România.</p></div>
          <div><h4>Produse</h4><p>Galerii</p><p>Portofoliu</p></div>
          <div><h4>Companie</h4><p>Despre noi</p></div>
          <div><h4>Legal</h4><p>GDPR</p></div>
        </div>
      </footer>
    </div>
  )
}

export default App
