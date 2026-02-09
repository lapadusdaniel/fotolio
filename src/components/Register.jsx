import { useState } from 'react'

function Register({ onRegister, onSwitchToLogin }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  })

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    // Validări
    if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword) {
      alert('Completează toate câmpurile!')
      return
    }

    if (formData.password.length < 6) {
      alert('Parola trebuie să aibă minim 6 caractere!')
      return
    }

    if (formData.password !== formData.confirmPassword) {
      alert('Parolele nu coincid!')
      return
    }

    // Simulăm înregistrare
    onRegister({
      name: formData.name,
      email: formData.email
    })
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
        <h2 style={{ marginBottom: '10px', textAlign: 'center' }}>Creează cont</h2>
        <p style={{ textAlign: 'center', color: '#666', marginBottom: '30px' }}>
          Începe perioada gratuită de 14 zile
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
              Nume complet
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Ion Popescu"
              style={{ marginBottom: 0 }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="nume@exemplu.ro"
              style={{ marginBottom: 0 }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
              Parolă
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Minimum 6 caractere"
              style={{ marginBottom: 0 }}
            />
          </div>

          <div style={{ marginBottom: '25px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
              Confirmă parola
            </label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Rescrie parola"
              style={{ marginBottom: 0 }}
            />
          </div>

          <button type="submit" className="btn-primary" style={{ width: '100%' }}>
            Creează cont gratuit
          </button>
        </form>

        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <p style={{ color: '#666', fontSize: '14px' }}>
            Ai deja cont?{' '}
            <span
              onClick={onSwitchToLogin}
              style={{ color: '#0066cc', cursor: 'pointer', fontWeight: 'bold' }}
            >
              Autentifică-te
            </span>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Register