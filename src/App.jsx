import { useState } from 'react'
import './App.css'
import Login from './components/Login.jsx'
import Register from './components/Register.jsx'
import Dashboard from './components/Dashboard.jsx'

function App() {
  const [paginaCurenta, setPaginaCurenta] = useState('acasa')
  const [authView, setAuthView] = useState(null) // null, 'login', 'register'
  const [user, setUser] = useState(null) // null = nu e logat, object = logat

  // Handler pentru login
  const handleLogin = (userData) => {
    setUser(userData)
    setAuthView(null)
    setPaginaCurenta('dashboard')
    alert(`Bun venit, ${userData.name}! 🎉`)
  }

  // Handler pentru register
  const handleRegister = (userData) => {
    setUser(userData)
    setAuthView(null)
    setPaginaCurenta('dashboard')
    alert(`Cont creat cu succes! Bun venit, ${userData.name}! 🎉`)
  }

  // Handler pentru logout
  const handleLogout = () => {
    if (window.confirm('Sigur vrei să te deconectezi?')) {
      setUser(null)
      setPaginaCurenta('acasa')
      alert('Te-ai deconectat cu succes!')
    }
  }

  // Afișează Login/Register dacă sunt active
  if (authView === 'login') {
    return (
      <div style={{ fontFamily: 'Arial, sans-serif' }}>
        <header style={{
          backgroundColor: '#1a1a1a',
          color: 'white',
          padding: '20px 50px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h1 
            className="logo"
            onClick={() => { setAuthView(null); setPaginaCurenta('acasa'); }}
          >
            Fotolio
          </h1>
          <button
            onClick={() => setAuthView(null)}
            style={{
              backgroundColor: 'transparent',
              border: '2px solid white',
              color: 'white',
              padding: '10px 20px',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            Înapoi
          </button>
        </header>
        <Login 
          onLogin={handleLogin} 
          onSwitchToRegister={() => setAuthView('register')}
        />
      </div>
    )
  }

  if (authView === 'register') {
    return (
      <div style={{ fontFamily: 'Arial, sans-serif' }}>
        <header style={{
          backgroundColor: '#1a1a1a',
          color: 'white',
          padding: '20px 50px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h1 
            className="logo"
            onClick={() => { setAuthView(null); setPaginaCurenta('acasa'); }}
          >
            Fotolio
          </h1>
          <button
            onClick={() => setAuthView(null)}
            style={{
              backgroundColor: 'transparent',
              border: '2px solid white',
              color: 'white',
              padding: '10px 20px',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            Înapoi
          </button>
        </header>
        <Register 
          onRegister={handleRegister}
          onSwitchToLogin={() => setAuthView('login')}
        />
      </div>
    )
  }

  // Afișează Dashboard dacă e logat și pagina e dashboard
  if (user && paginaCurenta === 'dashboard') {
    return (
      <div style={{ fontFamily: 'Arial, sans-serif' }}>
        <Dashboard user={user} onLogout={handleLogout} />
      </div>
    )
  }

  // Landing page normal
  return (
    <div style={{ fontFamily: 'Arial, sans-serif' }}>
      {/* Header */}
      <header style={{
        backgroundColor: '#1a1a1a',
        color: 'white',
        padding: '20px 50px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h1 
          className="logo"
          onClick={() => setPaginaCurenta('acasa')}
        >
          Fotolio
        </h1>
        
        <nav style={{ display: 'flex', gap: '30px' }}>
          <a 
            href="#" 
            onClick={(e) => { e.preventDefault(); setPaginaCurenta('acasa'); }}
            className={paginaCurenta === 'acasa' ? 'nav-link nav-link-active' : 'nav-link'}
          >
            Acasă
          </a>
          <a 
            href="#" 
            onClick={(e) => { e.preventDefault(); setPaginaCurenta('portofoliu'); }}
            className={paginaCurenta === 'portofoliu' ? 'nav-link nav-link-active' : 'nav-link'}
          >
            Portofoliu
          </a>
          <a 
            href="#" 
            onClick={(e) => { e.preventDefault(); setPaginaCurenta('preturi'); }}
            className={paginaCurenta === 'preturi' ? 'nav-link nav-link-active' : 'nav-link'}
          >
            Prețuri
          </a>
          <a 
            href="#" 
            onClick={(e) => { e.preventDefault(); setPaginaCurenta('contact'); }}
            className={paginaCurenta === 'contact' ? 'nav-link nav-link-active' : 'nav-link'}
          >
            Contact
          </a>
        </nav>
        
        <div style={{ display: 'flex', gap: '15px' }}>
          {user ? (
            <>
              <button
                onClick={() => setPaginaCurenta('dashboard')}
                style={{
                  backgroundColor: 'transparent',
                  border: '2px solid white',
                  color: 'white',
                  padding: '10px 20px',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Dashboard
              </button>
              <button
                onClick={handleLogout}
                style={{
                  backgroundColor: '#dc3545',
                  border: 'none',
                  color: 'white',
                  padding: '10px 20px',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Deconectare
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setAuthView('login')}
                style={{
                  backgroundColor: 'transparent',
                  border: '2px solid white',
                  color: 'white',
                  padding: '10px 20px',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Autentificare
              </button>
              <button 
                onClick={() => setAuthView('register')}
                className="btn-primary"
                style={{ padding: '10px 20px', fontSize: '14px' }}
              >
                Înregistrare
              </button>
            </>
          )}
        </div>
      </header>

      {/* Pagina ACASĂ */}
      {paginaCurenta === 'acasa' && (
        <div className="page-content">
          {/* Hero Section */}
          <section style={{
            textAlign: 'center',
            padding: '100px 20px',
            backgroundColor: '#f5f5f5'
          }}>
            <h2 style={{ fontSize: '48px', marginBottom: '20px' }}>
              Platforma completă pentru fotografi
            </h2>
            <p style={{ fontSize: '20px', color: '#666', marginBottom: '40px' }}>
              Portofoliu online, stocare nelimitată și management clienți - totul într-un singur loc
            </p>
            <button 
              onClick={() => setAuthView('register')}
              className="btn-primary"
            >
              Începe gratuit
            </button>
          </section>

          {/* Features Section */}
          <section style={{ padding: '80px 50px', backgroundColor: 'white' }}>
            <h2 style={{ textAlign: 'center', fontSize: '36px', marginBottom: '60px' }}>
              De ce Fotolio?
            </h2>
            
            <div className="grid-3" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '40px',
              maxWidth: '1200px',
              margin: '0 auto'
            }}>
              <div className="feature-card stagger-item">
                <div className="feature-icon">📸</div>
                <h3 style={{ marginBottom: '15px' }}>Portofoliu Profesional</h3>
                <p style={{ color: '#666', lineHeight: '1.6' }}>
                  Galerii organizate pe categorii - nunți, botezuri, corporate. Design modern și responsive.
                </p>
              </div>

              <div className="feature-card stagger-item">
                <div className="feature-icon">☁️</div>
                <h3 style={{ marginBottom: '15px' }}>Stocare Nelimitată</h3>
                <p style={{ color: '#666', lineHeight: '1.6' }}>
                  Încarcă și livrează fotografii către clienți fără limite de spațiu.
                </p>
              </div>

              <div className="feature-card stagger-item">
                <div className="feature-icon">📅</div>
                <h3 style={{ marginBottom: '15px' }}>Calendar Programări</h3>
                <p style={{ color: '#666', lineHeight: '1.6' }}>
                  Ține evidența evenimente și programări într-un singur loc.
                </p>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* Pagina PORTOFOLIU */}
      {paginaCurenta === 'portofoliu' && (
        <div className="page-content">
          <section style={{ padding: '80px 50px', minHeight: '60vh' }}>
            <h2 style={{ textAlign: 'center', fontSize: '36px', marginBottom: '40px' }}>
              Portofoliu
            </h2>
            <p style={{ textAlign: 'center', fontSize: '18px', color: '#666' }}>
              Aici vor fi galeriile tale organizate pe categorii (Nunți, Botezuri, Corporate, etc.)
            </p>
            <p style={{ textAlign: 'center', fontSize: '14px', color: '#999', marginTop: '20px' }}>
              📷 Coming soon - în următoarele lecții vom construi galeria!
            </p>
          </section>
        </div>
      )}

      {/* Pagina PREȚURI */}
      {paginaCurenta === 'preturi' && (
        <div className="page-content">
          <section style={{ padding: '80px 50px', backgroundColor: '#f5f5f5' }}>
            <h2 style={{ textAlign: 'center', fontSize: '36px', marginBottom: '20px' }}>
              Planuri și Prețuri
            </h2>
            <p style={{ textAlign: 'center', color: '#666', fontSize: '18px', marginBottom: '60px' }}>
              Alege planul perfect pentru nevoile tale
            </p>
            
            <div className="grid-3" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '30px',
              maxWidth: '1200px',
              margin: '0 auto'
            }}>
              {/* Plan FREE */}
              <div className="pricing-card">
                <h3 style={{ fontSize: '24px', marginBottom: '10px' }}>Gratuit</h3>
                <div style={{ fontSize: '48px', fontWeight: 'bold', margin: '20px 0' }}>
                  0 <span style={{ fontSize: '20px', color: '#666' }}>lei</span>
                </div>
                <p style={{ color: '#666', marginBottom: '30px' }}>Perfect pentru început</p>
                <ul style={{ textAlign: 'left', listStyle: 'none', marginBottom: '30px' }}>
                  <li style={{ padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}>✓ 5GB stocare</li>
                  <li style={{ padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}>✓ 1 galerie</li>
                  <li style={{ padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}>✓ Portofoliu basic</li>
                  <li style={{ padding: '10px 0' }}>✓ Branding Fotolio</li>
                </ul>
                <button 
                  onClick={() => setAuthView('register')}
                  className="btn-secondary"
                  style={{ width: '100%' }}
                >
                  Începe Gratuit
                </button>
              </div>

              {/* Plan PRO */}
              <div className="pricing-card-pro">
                <div style={{
                  backgroundColor: '#ffcc00',
                  color: '#0066cc',
                  padding: '5px 15px',
                  borderRadius: '20px',
                  display: 'inline-block',
                  marginBottom: '10px',
                  fontWeight: 'bold',
                  fontSize: '14px'
                }}>POPULAR</div>
                <h3 style={{ fontSize: '24px', marginBottom: '10px' }}>Pro</h3>
                <div style={{ fontSize: '48px', fontWeight: 'bold', margin: '20px 0' }}>
                  49 <span style={{ fontSize: '20px', opacity: 0.8 }}>lei/lună</span>
                </div>
                <p style={{ opacity: 0.9, marginBottom: '30px' }}>Pentru profesioniști</p>
                <ul style={{ textAlign: 'left', listStyle: 'none', marginBottom: '30px' }}>
                  <li style={{ padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.2)' }}>✓ 100GB stocare</li>
                  <li style={{ padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.2)' }}>✓ Galerii nelimitate</li>
                  <li style={{ padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.2)' }}>✓ Domeniu personalizat</li>
                  <li style={{ padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.2)' }}>✓ Fără branding</li>
                  <li style={{ padding: '10px 0' }}>✓ Calendar programări</li>
                </ul>
                <button 
                  onClick={() => setAuthView('register')}
                  style={{
                    width: '100%',
                    padding: '15px',
                    backgroundColor: 'white',
                    border: 'none',
                    color: '#0066cc',
                    borderRadius: '5px',
                    fontSize: '16px',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  Începe Perioada Gratuită
                </button>
              </div>

              {/* Plan UNLIMITED */}
              <div className="pricing-card">
                <h3 style={{ fontSize: '24px', marginBottom: '10px' }}>Unlimited</h3>
                <div style={{ fontSize: '48px', fontWeight: 'bold', margin: '20px 0' }}>
                  99 <span style={{ fontSize: '20px', color: '#666' }}>lei/lună</span>
                </div>
                <p style={{ color: '#666', marginBottom: '30px' }}>Pentru agenții</p>
                <ul style={{ textAlign: 'left', listStyle: 'none', marginBottom: '30px' }}>
                  <li style={{ padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}>✓ Stocare NELIMITATĂ</li>
                  <li style={{ padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}>✓ Tot din Pro +</li>
                  <li style={{ padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}>✓ Conturi multiple</li>
                  <li style={{ padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}>✓ API access</li>
                  <li style={{ padding: '10px 0' }}>✓ Support prioritar</li>
                </ul>
                <button 
                  onClick={() => setPaginaCurenta('contact')}
                  style={{
                    width: '100%',
                    padding: '15px',
                    backgroundColor: '#1a1a1a',
                    border: 'none',
                    color: 'white',
                    borderRadius: '5px',
                    fontSize: '16px',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  Contactează-ne
                </button>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* Pagina CONTACT */}
      {paginaCurenta === 'contact' && (
        <div className="page-content">
          <section style={{ padding: '80px 50px', minHeight: '60vh', backgroundColor: 'white' }}>
            <h2 style={{ textAlign: 'center', fontSize: '36px', marginBottom: '40px' }}>
              Contactează-ne
            </h2>
            <div style={{ maxWidth: '600px', margin: '0 auto' }}>
              <p style={{ textAlign: 'center', fontSize: '18px', color: '#666', marginBottom: '40px' }}>
                Ai întrebări? Scrie-ne și îți răspundem în maxim 24h!
              </p>
              <form onSubmit={(e) => { e.preventDefault(); alert('Mesaj trimis! 📧'); }}>
                <input 
                  type="text" 
                  placeholder="Numele tău"
                  required
                />
                <input 
                  type="email" 
                  placeholder="Email"
                  required
                />
                <textarea 
                  placeholder="Mesajul tău"
                  rows="5"
                  required
                  style={{ fontFamily: 'Arial, sans-serif' }}
                />
                <button 
                  type="submit"
                  className="btn-primary"
                  style={{ width: '100%' }}
                >
                  Trimite mesaj
                </button>
              </form>
            </div>
          </section>
        </div>
      )}

      {/* Footer */}
      <footer style={{
        backgroundColor: '#1a1a1a',
        color: 'white',
        padding: '60px 50px 30px',
      }}>
        <div className="grid-4" style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '40px',
          marginBottom: '40px'
        }}>
          <div>
            <h3 style={{ marginBottom: '20px', fontSize: '20px' }}>Fotolio</h3>
            <p style={{ color: '#999', lineHeight: '1.6', fontSize: '14px' }}>
              Platforma românească pentru fotografi profesioniști. 
              Construită de fotografi, pentru fotografi.
            </p>
          </div>

          <div>
            <h4 style={{ marginBottom: '20px', fontSize: '16px' }}>Produse</h4>
            <ul style={{ listStyle: 'none' }}>
              <li style={{ marginBottom: '10px' }}>
                <a href="#" onClick={(e) => { e.preventDefault(); setPaginaCurenta('portofoliu'); }} style={{ color: '#999', textDecoration: 'none', fontSize: '14px' }}>Portofoliu</a>
              </li>
              <li style={{ marginBottom: '10px' }}>
                <a href="#" style={{ color: '#999', textDecoration: 'none', fontSize: '14px' }}>Galerii</a>
              </li>
              <li style={{ marginBottom: '10px' }}>
                <a href="#" style={{ color: '#999', textDecoration: 'none', fontSize: '14px' }}>Calendar</a>
              </li>
              <li style={{ marginBottom: '10px' }}>
                <a href="#" onClick={(e) => { e.preventDefault(); setPaginaCurenta('preturi'); }} style={{ color: '#999', textDecoration: 'none', fontSize: '14px' }}>Prețuri</a>
              </li>
            </ul>
          </div>

          <div>
            <h4 style={{ marginBottom: '20px', fontSize: '16px' }}>Companie</h4>
            <ul style={{ listStyle: 'none' }}>
              <li style={{ marginBottom: '10px' }}>
                <a href="#" style={{ color: '#999', textDecoration: 'none', fontSize: '14px' }}>Despre noi</a>
              </li>
              <li style={{ marginBottom: '10px' }}>
                <a href="#" style={{ color: '#999', textDecoration: 'none', fontSize: '14px' }}>Blog</a>
              </li>
              <li style={{ marginBottom: '10px' }}>
                <a href="#" style={{ color: '#999', textDecoration: 'none', fontSize: '14px' }}>Cariere</a>
              </li>
              <li style={{ marginBottom: '10px' }}>
                <a href="#" onClick={(e) => { e.preventDefault(); setPaginaCurenta('contact'); }} style={{ color: '#999', textDecoration: 'none', fontSize: '14px' }}>Contact</a>
              </li>
            </ul>
          </div>

          <div>
            <h4 style={{ marginBottom: '20px', fontSize: '16px' }}>Legal</h4>
            <ul style={{ listStyle: 'none' }}>
              <li style={{ marginBottom: '10px' }}>
                <a href="#" style={{ color: '#999', textDecoration: 'none', fontSize: '14px' }}>Termeni și condiții</a>
              </li>
              <li style={{ marginBottom: '10px' }}>
                <a href="#" style={{ color: '#999', textDecoration: 'none', fontSize: '14px' }}>Politica de confidențialitate</a>
              </li>
              <li style={{ marginBottom: '10px' }}>
                <a href="#" style={{ color: '#999', textDecoration: 'none', fontSize: '14px' }}>GDPR</a>
              </li>
            </ul>
          </div>
        </div>

        <div style={{
          borderTop: '1px solid #333',
          paddingTop: '30px',
          textAlign: 'center',
          color: '#666',
          fontSize: '14px'
        }}>
          © 2026 Fotolio. Toate drepturile rezervate. Made with ❤️ în România.
        </div>
      </footer>
    </div>
  )
}

export default App