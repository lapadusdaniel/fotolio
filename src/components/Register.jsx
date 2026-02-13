import { useState } from 'react'
import { auth, db } from '../firebase'
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { doc, setDoc } from 'firebase/firestore'

function Register({ onRegister, onSwitchToLogin }) {
  const [formData, setFormData] = useState({
    name: '',
    brandName: '',
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

    if (!formData.name || !formData.brandName || !formData.email || !formData.password || !formData.confirmPassword) {
      setError('Completează toate câmpurile.')
      return
    }

    if (formData.password.length < 8) {
      setError('Parola trebuie să aibă minim 8 caractere.')
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Parolele nu coincid.')
      return
    }

    setLoading(true)

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      )

      const uid = userCredential.user.uid

      await updateProfile(userCredential.user, {
        displayName: formData.name
      })

      await setDoc(doc(db, 'users', uid), {
        name: formData.name,
        brandName: formData.brandName,
        email: formData.email,
        createdAt: new Date().toISOString(),
        plan: 'free'
      })

      await setDoc(doc(db, 'setariFotografi', uid), {
        brandName: formData.brandName,
        logo: '',
        website: '',
        telefon: '',
        descriere: '',
        categorii: ['Nunți', 'Botezuri', 'Corporate', 'Portret'],
        createdAt: new Date().toISOString()
      })

      onRegister({
        uid,
        name: formData.name,
        email: formData.email,
        brandName: formData.brandName
      })

    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        setError('Acest email este deja asociat unui cont.')
      } else if (err.code === 'auth/invalid-email') {
        setError('Adresă de email invalidă.')
      } else {
        setError('Eroare la înregistrare. Încearcă din nou.')
      }
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    width: '100%',
    padding: '12px 16px',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    fontSize: '15px',
    backgroundColor: '#fafafa',
    color: '#000000',
    marginBottom: 0,
    outline: 'none',
    boxSizing: 'border-box'
  }

  const labelStyle = {
    display: 'block',
    marginBottom: '6px',
    fontSize: '13px',
    fontWeight: '500',
    color: '#333333',
    letterSpacing: '0.3px'
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#ffffff',
      padding: '40px 20px'
    }}>
      <div style={{ maxWidth: '420px', width: '100%' }}>
        <div style={{ marginBottom: '48px', textAlign: 'center' }}>
          <h1 style={{
            fontSize: '28px',
            fontWeight: '600',
            color: '#000000',
            marginBottom: '8px',
            letterSpacing: '-0.5px'
          }}>
            Creează cont
          </h1>
          <p style={{ fontSize: '15px', color: '#888888', margin: 0 }}>
            14 zile gratuit. Fără card.
          </p>
        </div>

        {error && (
          <div style={{
            backgroundColor: '#fff0f0',
            color: '#cc0000',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '24px',
            fontSize: '14px',
            textAlign: 'center',
            border: '1px solid #ffdddd'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>Nume complet</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Ion Popescu"
              disabled={loading}
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>Nume brand / studio</label>
            <input
              type="text"
              name="brandName"
              value={formData.brandName}
              onChange={handleChange}
              placeholder="Studio Foto Exemplu"
              disabled={loading}
              style={inputStyle}
            />
            <p style={{ fontSize: '12px', color: '#aaaaaa', margin: '6px 0 0 0' }}>
              Numele afișat clienților tăi.
            </p>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="email@exemplu.ro"
              disabled={loading}
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>Parolă</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Minim 8 caractere"
              disabled={loading}
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: '32px' }}>
            <label style={labelStyle}>Confirmă parola</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Rescrie parola"
              disabled={loading}
              style={inputStyle}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              backgroundColor: '#000000',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              letterSpacing: '0.3px'
            }}
          >
            {loading ? 'Se creează contul...' : 'Creează cont'}
          </button>
        </form>

        <div style={{ marginTop: '32px', textAlign: 'center' }}>
          <p style={{ color: '#888888', fontSize: '14px', margin: 0 }}>
            Ai deja cont?{' '}
            <span
              onClick={loading ? undefined : onSwitchToLogin}
              style={{
                color: '#000000',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: '600',
                opacity: loading ? 0.4 : 1
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
