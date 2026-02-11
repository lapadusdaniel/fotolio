import { useState, useEffect } from 'react'
import { auth, db } from '../firebase'
import { signOut } from 'firebase/auth'
import { collection, addDoc, deleteDoc, doc, query, where, onSnapshot } from 'firebase/firestore'
import GalerieView from './GalerieView'

function Dashboard({ user, onLogout }) {
  const [galerii, setGalerii] = useState([])
  const [showAddGalerie, setShowAddGalerie] = useState(false)
  const [numeGalerie, setNumeGalerie] = useState('')
  const [categorieGalerie, setCategorieGalerie] = useState('Nunți')
  const [loading, setLoading] = useState(true)
  const [galerieSelectata, setGalerieSelectata] = useState(null)

  // Ascultă schimbări în galeriile user-ului
  useEffect(() => {
    if (!user?.uid) return

    const q = query(
      collection(db, 'galerii'),
      where('userId', '==', user.uid)
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const galeriiData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setGalerii(galeriiData)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [user?.uid])

  const handleAddGalerie = async (e) => {
    e.preventDefault()
    if (!numeGalerie) {
      alert('Adaugă un nume pentru galerie!')
      return
    }

    try {
      await addDoc(collection(db, 'galerii'), {
        nume: numeGalerie,
        categoria: categorieGalerie,
        poze: 0,
        userId: user.uid,
        data: new Date().toISOString(),
        createdAt: new Date()
      })

      setNumeGalerie('')
      setShowAddGalerie(false)
      alert('Galerie adăugată! 🎉')
    } catch (error) {
      console.error('Error:', error)
      alert('Eroare la adăugare galerie!')
    }
  }

  const handleDeleteGalerie = async (id) => {
    if (window.confirm('Sigur vrei să ștergi această galerie?')) {
      try {
        await deleteDoc(doc(db, 'galerii', id))
      } catch (error) {
        console.error('Error:', error)
        alert('Eroare la ștergere!')
      }
    }
  }

  const handleLogout = async () => {
    if (window.confirm('Sigur vrei să te deconectezi?')) {
      try {
        await signOut(auth)
        onLogout()
      } catch (error) {
        console.error('Error:', error)
        alert('Eroare la deconectare!')
      }
    }
  }

  if (galerieSelectata) {
    return (
      <div className="page-content">
        <div style={{
          backgroundColor: '#1a1a1a',
          color: 'white',
          padding: '30px 50px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h1 style={{ margin: 0, fontSize: '28px' }}>{galerieSelectata.nume}</h1>
          <button
            onClick={handleLogout}
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
            Deconectare
          </button>
        </div>
        <div style={{ padding: '40px 50px', backgroundColor: '#f5f5f5', minHeight: '70vh' }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '10px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
          }}>
            <GalerieView
              galerie={galerieSelectata}
              user={user}
              onBack={() => setGalerieSelectata(null)}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-content">
      {/* Dashboard Header */}
      <div style={{
        backgroundColor: '#1a1a1a',
        color: 'white',
        padding: '30px 50px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '28px' }}>👋 Bun venit, {user.name}!</h1>
          <p style={{ margin: '10px 0 0 0', color: '#999' }}>{user.email}</p>
        </div>
        <button
          onClick={handleLogout}
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
          Deconectare
        </button>
      </div>

      {/* Stats Cards */}
      <div style={{ padding: '40px 50px', backgroundColor: '#f5f5f5' }}>
        <div className="grid-3" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '20px',
          marginBottom: '40px'
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '25px',
            borderRadius: '10px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
          }}>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>Total Galerii</div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#0066cc' }}>{galerii.length}</div>
          </div>

          <div style={{
            backgroundColor: 'white',
            padding: '25px',
            borderRadius: '10px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
          }}>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>Total Poze</div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#0066cc' }}>
              {galerii.reduce((sum, g) => sum + (g.poze || 0), 0)}
            </div>
          </div>

          <div style={{
            backgroundColor: 'white',
            padding: '25px',
            borderRadius: '10px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
          }}>
            <div style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>Plan curent</div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#0066cc' }}>
              {user.plan === 'free' ? 'Free' : user.plan === 'pro' ? 'Pro' : 'Unlimited'}
            </div>
          </div>
        </div>

        {/* Galerii Section */}
        <div style={{
          backgroundColor: 'white',
          padding: '30px',
          borderRadius: '10px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
            <h2 style={{ margin: 0 }}>Galeriile mele</h2>
            <button
              onClick={() => setShowAddGalerie(!showAddGalerie)}
              className="btn-primary"
              style={{ padding: '10px 20px', fontSize: '14px' }}
            >
              {showAddGalerie ? 'Anulează' : '+ Adaugă galerie'}
            </button>
          </div>

          {/* Form adaugare galerie */}
          {showAddGalerie && (
            <form onSubmit={handleAddGalerie} style={{
              backgroundColor: '#f8f9fa',
              padding: '20px',
              borderRadius: '8px',
              marginBottom: '20px'
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: '15px', alignItems: 'end' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                    Nume galerie
                  </label>
                  <input
                    type="text"
                    value={numeGalerie}
                    onChange={(e) => setNumeGalerie(e.target.value)}
                    placeholder="Ex: Nuntă Ana & Mihai"
                    style={{ marginBottom: 0 }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                    Categorie
                  </label>
                  <select
                    value={categorieGalerie}
                    onChange={(e) => setCategorieGalerie(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '15px',
                      border: '1px solid #ddd',
                      borderRadius: '5px',
                      fontSize: '16px',
                      marginBottom: 0
                    }}
                  >
                    <option>Nunți</option>
                    <option>Botezuri</option>
                    <option>Corporate</option>
                    <option>Portret</option>
                    <option>Altele</option>
                  </select>
                </div>

                <button type="submit" className="btn-primary" style={{ padding: '15px 30px', fontSize: '14px' }}>
                  Salvează
                </button>
              </div>
            </form>
          )}

          {/* Lista de galerii */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
              <p>Se încarcă galeriile...</p>
            </div>
          ) : galerii.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
              <p>Nu ai nicio galerie încă. Adaugă prima ta galerie! 📸</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '15px' }}>
              {galerii.map((galerie) => (
                <div
                  key={galerie.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '20px',
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    transition: 'all 0.3s ease'
                  }}
                  className="feature-card"
                >
                  <div>
                    <h3 style={{ margin: '0 0 5px 0', fontSize: '18px' }}>{galerie.nume}</h3>
                    <div style={{ display: 'flex', gap: '20px', fontSize: '14px', color: '#666' }}>
                      <span>📁 {galerie.categoria}</span>
                      <span>📸 {galerie.poze || 0} poze</span>
                      <span>📅 {new Date(galerie.data).toLocaleDateString('ro-RO')}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={() => setGalerieSelectata(galerie)}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#0066cc',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        fontSize: '14px'
                      }}
                    >
                      Vizualizează
                    </button>
                    <button
                      onClick={() => handleDeleteGalerie(galerie.id)}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        fontSize: '14px'
                      }}
                    >
                      Șterge
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Dashboard