import { useState } from 'react'
import { Link } from 'react-router-dom'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../firebase'
import './AuthPage.css'

function Login({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    if (!email || !password) {
      setError('Completează toate câmpurile!')
      return
    }

    setLoading(true)

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid))

      if (userDoc.exists()) {
        onLogin({
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          name: userDoc.data().name,
          plan: userDoc.data().plan
        })
      } else {
        onLogin({
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          name: email.split('@')[0]
        })
      }
    } catch (authError) {
      if (authError.code === 'auth/invalid-credential' || authError.code === 'auth/wrong-password') {
        setError('Email sau parolă greșită!')
      } else if (authError.code === 'auth/user-not-found') {
        setError('Nu există cont cu acest email!')
      } else if (authError.code === 'auth/invalid-email') {
        setError('Email invalid!')
      } else {
        setError('Eroare la autentificare. Încearcă din nou.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="auth-page">
      <div className="auth-card">
        <aside className="auth-card-visual">
          <p className="auth-card-tag">Fotolio</p>
          <h1>Autentifică-te și gestionează-ți galeriile într-un workflow clar.</h1>
          <p>Linkuri private, selecții rapide de la clienți și control complet asupra livrării.</p>
        </aside>

        <div className="auth-card-form">
          <h2>Autentificare</h2>
          <p className="auth-card-subtitle">Intră în contul tău Fotolio</p>

          {error && <div className="auth-error">{error}</div>}

          <form className="auth-form" onSubmit={handleSubmit}>
            <label htmlFor="login-email">Email</label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value)
                setError('')
              }}
              placeholder="nume@exemplu.ro"
              disabled={loading}
            />

            <label htmlFor="login-password">Parolă</label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value)
                setError('')
              }}
              placeholder="Minimum 6 caractere"
              disabled={loading}
            />

            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? 'Se autentifică...' : 'Intră în cont'}
            </button>
          </form>

          <p className="auth-switch">
            Nu ai cont? <Link to="/register">Înregistrează-te</Link>
          </p>
        </div>
      </div>
    </section>
  )
}

export default Login
