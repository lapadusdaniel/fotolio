import { useState } from 'react'
import { auth, db } from '../firebase'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'

function Login({ onLogin, onSwitchToRegister }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    
    if (!email || !password) {
      setError('Completează toate câmpurile!')
      return
    }

    setLoading(true)

    try {
      // Login în Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      
      // Preia datele din Firestore
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

    } catch (error) {
      console.error('Error:', error)
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
        setError('Email sau parolă greșită!')
      } else if (error.code === 'auth/user-not-found') {
        setError('Nu există cont cu acest email!')
      } else if (error.code === 'auth/invalid-email') {
        setError('Email invalid!')
      } else {
        setError('Eroare la autentificare. Încearcă din nou.')
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
        <h2 style={{ marginBottom: '10px', textAlign: 'center' }}>Autentificare</h2>
        <p style={{ textAlign: 'center', color: '#666', marginBottom: '30px' }}>
          Intră în contul tău Fotolio
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
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
              placeholder="nume@exemplu.ro"
              disabled={loading}
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
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              placeholder="Minimum 6 caractere"
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
            {loading ? 'Se autentifică...' : 'Intră în cont'}
          </button>
        </form>

        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <p style={{ color: '#666', fontSize: '14px' }}>
            Nu ai cont?{' '}
            <span
              onClick={onSwitchToRegister}
              style={{ 
                color: '#0066cc', 
                cursor: loading ? 'not-allowed' : 'pointer', 
                fontWeight: 'bold',
                opacity: loading ? 0.5 : 1
              }}
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