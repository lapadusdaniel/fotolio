import { useState } from 'react'
import { auth, db } from '../firebase'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { doc, setDoc } from 'firebase/firestore'

function Register({ onRegister, onSwitchToLogin }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword) {
      setError('Completează toate câmpurile!')
      return
    }

    if (formData.password.length < 6) {
      setError('Parola trebuie să aibă minim 6 caractere!')
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Parolele nu coincid!')
      return
    }

    setLoading(true)

    try {
      // Creează user în Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      )

      // Salvează info suplimentară în Firestore
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        name: formData.name,
        email: formData.email,
        createdAt: new Date().toISOString(),
        plan: 'free'
      })

      onRegister({
        uid: userCredential.user.uid,
        name: formData.name,
        email: formData.email
      })

    } catch (error) {
      console.error('Error:', error)
      if (error.code === 'auth/email-already-in-use') {
        setError('Email-ul este deja folosit!')
      } else if (error.code === 'auth/invalid-email') {
        setError('Email invalid!')
      } else {
        setError('Eroare la înregistrare. Încearcă din nou.')
      }
    } finally {
      setLoading(false)
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
        <h2 style={{ marginBottom: '10px', textAlign: 'center' }}>Creează cont</h2>
        <p style={{ textAlign: 'center', color: '#666', marginBottom: '30px' }}>
          Începe perioada gratuită de 14 zile
        </p>

        {error && (
          <div style={{
            backgroundColor: '#fee',
            color: '#c33',
            padding: '12px',
            borderRadius: '5px',
            marginBottom: '20px',
            fontSize: '14px',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}

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
              disabled={loading}
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
              disabled={loading}
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
              disabled={loading}
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
              disabled={loading}
              style={{ marginBottom: 0 }}
            />
          </div>

          <button 
            type="submit" 
            className="btn-primary" 
            style={{ width: '100%' }}
            disabled={loading}
          >
            {loading ? 'Se creează contul...' : 'Creează cont gratuit'}
          </button>
        </form>

        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <p style={{ color: '#666', fontSize: '14px' }}>
            Ai deja cont?{' '}
            <span
              onClick={onSwitchToLogin}
              style={{ 
                color: '#0066cc', 
                cursor: loading ? 'not-allowed' : 'pointer', 
                fontWeight: 'bold',
                opacity: loading ? 0.5 : 1
              }}
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