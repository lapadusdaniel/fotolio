import { useState } from 'react'
import { Link } from 'react-router-dom'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { doc, setDoc } from 'firebase/firestore'
import { auth, db } from '../firebase'
import './AuthPage.css'

function Register({ onRegister }) {
  const [formData, setFormData] = useState({
    numeBrand: '',
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (event) => {
    setFormData((prev) => ({
      ...prev,
      [event.target.name]: event.target.value
    }))
    setError('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    if (!formData.numeBrand || !formData.name || !formData.email || !formData.password || !formData.confirmPassword) {
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
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password)
      const dataCreare = new Date().toISOString()

      await setDoc(doc(db, 'users', userCredential.user.uid), {
        name: formData.name,
        email: formData.email,
        numeBrand: formData.numeBrand.trim(),
        createdAt: dataCreare,
        plan: 'free'
      })

      await setDoc(doc(db, 'setariFotografi', userCredential.user.uid), {
        userId: userCredential.user.uid,
        numeBrand: formData.numeBrand.trim(),
        dataCreare
      }, { merge: true })

      onRegister({
        uid: userCredential.user.uid,
        name: formData.numeBrand.trim(),
        email: formData.email
      })
    } catch (registerError) {
      if (registerError.code === 'auth/email-already-in-use') {
        setError('Email-ul este deja folosit!')
      } else if (registerError.code === 'auth/invalid-email') {
        setError('Email invalid!')
      } else {
        setError('Eroare la înregistrare. Încearcă din nou.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="auth-page register-minimal-page">
      <div className="register-minimal-card">
        <div className="register-minimal-heading">
          <p>Începe perioada gratuită</p>
          <h2>Creează cont Fotolio</h2>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form className="register-minimal-form" onSubmit={handleSubmit}>
          <label htmlFor="register-brand">Nume Brand / Studio</label>
          <input
            id="register-brand"
            type="text"
            name="numeBrand"
            value={formData.numeBrand}
            onChange={handleChange}
            placeholder="Ex: Andrei Studio"
            disabled={loading}
            required
          />

          <label htmlFor="register-name">Nume complet</label>
          <input
            id="register-name"
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Ion Popescu"
            disabled={loading}
            required
          />

          <label htmlFor="register-email">Email</label>
          <input
            id="register-email"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="nume@exemplu.ro"
            disabled={loading}
            required
          />

          <label htmlFor="register-password">Parolă</label>
          <input
            id="register-password"
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Minimum 6 caractere"
            disabled={loading}
            required
          />

          <label htmlFor="register-confirm-password">Confirmă parola</label>
          <input
            id="register-confirm-password"
            type="password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            placeholder="Rescrie parola"
            disabled={loading}
            required
          />

          <button type="submit" className="register-minimal-submit" disabled={loading}>
            {loading ? 'Se creează contul...' : 'Creează cont'}
          </button>
        </form>

        <p className="register-minimal-switch">
          Ai deja cont? <Link to="/login">Autentifică-te</Link>
        </p>
      </div>
    </section>
  )
}

export default Register
