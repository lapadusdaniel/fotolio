import { useState } from 'react'

function Login({ onLogin, onSwitchToRegister }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    
    // Validare simplă
    if (!email || !password) {
      alert('Completează toate câmpurile!')
      return
    }
    
    // Simulăm login (în realitate aici ai face API call)
    if (email && password.length >= 6) {
      onLogin({ email, name: email.split('@')[0] })
    } else {
      alert('Email sau parolă invalide!')
    }
  }

  return (
    <div style={{
      minHeight: '80vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f5f5f5',
      padding: '40px 20px'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '40px',
        borderRadius: '10px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        maxWidth: '400px',
        width: '100%'
      }}>
        <h2 style={{ marginBottom: '10px', textAlign: 'center' }}>Autentificare</h2>
        <p style={{ textAlign: 'center', color: '#666', marginBottom: '30px' }}>
          Intră în contul tău Fotolio
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nume@exemplu.ro"
              style={{ marginBottom: 0 }}
            />
          </div>

          <div style={{ marginBottom: '25px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
              Parolă
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 6 caractere"
              style={{ marginBottom: 0 }}
            />
          </div>

          <button type="submit" className="btn-primary" style={{ width: '100%' }}>
            Intră în cont
          </button>
        </form>

        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <p style={{ color: '#666', fontSize: '14px' }}>
            Nu ai cont?{' '}
            <span
              onClick={onSwitchToRegister}
              style={{ color: '#0066cc', cursor: 'pointer', fontWeight: 'bold' }}
            >
              Înregistrează-te
            </span>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login