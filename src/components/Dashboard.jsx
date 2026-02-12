import { useState, useEffect, useRef } from 'react'
import Masonry from 'react-masonry-css'
import { auth, db } from '../firebase'
import { signOut } from 'firebase/auth'
import { collection, addDoc, deleteDoc, doc, query, where, onSnapshot, updateDoc } from 'firebase/firestore'
import { uploadPoza, listPoze, getPozaUrl, deletePoza } from '../r2'

function Dashboard({ user, onLogout }) {
  const [galerii, setGalerii] = useState([])
  const [showAddGalerie, setShowAddGalerie] = useState(false)
  const [numeGalerie, setNumeGalerie] = useState('')
  const [categorieGalerie, setCategorieGalerie] = useState('Nunți')
  const [loading, setLoading] = useState(true)
  const [galerieActiva, setGalerieActiva] = useState(null)
  const [pozeGalerie, setPozeGalerie] = useState([])
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [loadingPoze, setLoadingPoze] = useState(false)
  const fileInputRef = useRef(null)
  const masonryBreakpoints = {
    default: 4,
    1200: 3,
    800: 2,
    500: 1
  }

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
    } catch (error) {
      console.error('Error:', error)
      alert('Eroare la adăugare galerie!')
    }
  }

  const handleDeleteGalerie = async (id) => {
    if (window.confirm('Sigur vrei să ștergi această galerie?')) {
      try {
        await deleteDoc(doc(db, 'galerii', id))
        if (galerieActiva?.id === id) {
          setGalerieActiva(null)
          setPozeGalerie([])
        }
      } catch (error) {
        console.error('Error:', error)
        alert('Eroare la ștergere!')
      }
    }
  }

  const handleDeschideGalerie = async (galerie) => {
    setGalerieActiva(galerie)
    setLoadingPoze(true)
    setPozeGalerie([])

    try {
      const poze = await listPoze(galerie.id, user.uid)

      const pozeWithUrlsRaw = await Promise.all(
        poze.map(async (poza) => {
          const key = poza.key || poza.name || poza.Key

          if (!key) {
            console.error('Poză fără key primit de la Worker/R2:', poza)
            return null
          }

          const url = await getPozaUrl(key)
          return {
            key,
            url,
            size: poza.size ?? poza.Size,
            lastModified: poza.lastModified ?? poza.uploaded ?? poza.LastModified
          }
        })
      )

      const pozeWithUrls = pozeWithUrlsRaw.filter(Boolean)
      setPozeGalerie(pozeWithUrls)
    } catch (error) {
      console.error('Error loading poze:', error)
      alert('Eroare la încărcarea pozelor!')
    } finally {
      setLoadingPoze(false)
    }
  }

  const handleUploadPoze = async (e) => {
    const files = Array.from(e.target.files)
    if (!files.length || !galerieActiva) return

    setUploading(true)
    setUploadProgress(0)

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        await uploadPoza(file, galerieActiva.id, user.uid, (filePercent) => {
          const overall = Math.round(((i + filePercent / 100) / files.length) * 100)
          setUploadProgress(overall)
        })
      }

      // Refresh poze
      await handleDeschideGalerie(galerieActiva)

      // Update count în Firestore
      const galerieRef = doc(db, 'galerii', galerieActiva.id)
      await updateDoc(galerieRef, {
        poze: pozeGalerie.length + files.length
      })

    } catch (error) {
      console.error('Error uploading:', error)
      alert('Eroare la upload!')
    } finally {
      setUploading(false)
      setUploadProgress(0)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDeletePoza = async (pozaKey) => {
    if (!window.confirm('Ștergi această poză?')) return

    try {
      await deletePoza(pozaKey)
      setPozeGalerie(prev => prev.filter(p => p.key !== pozaKey))
    } catch (error) {
      console.error('Error:', error)
      alert('Eroare la ștergere!')
    }
  }

  const handleLogout = async () => {
    if (window.confirm('Sigur vrei să te deconectezi?')) {
      try {
        await signOut(auth)
        onLogout()
      } catch (error) {
        console.error('Error:', error)
      }
    }
  }

  // VIEW: Galerie deschisă cu poze
  if (galerieActiva) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
        {/* Header galerie */}
        <div style={{
          backgroundColor: '#1a1a1a',
          color: 'white',
          padding: '20px 40px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <button
              onClick={() => { setGalerieActiva(null); setPozeGalerie([]) }}
              style={{
                backgroundColor: 'transparent',
                border: '1px solid white',
                color: 'white',
                padding: '8px 16px',
                borderRadius: '5px',
                cursor: 'pointer'
              }}
            >
              ← Înapoi
            </button>
            <div>
              <h2 style={{ margin: 0 }}>{galerieActiva.nume}</h2>
              <p style={{ margin: 0, color: '#999', fontSize: '14px' }}>
                {galerieActiva.categoria} • {pozeGalerie.length} poze
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {uploading && (
              <div style={{ color: '#999', fontSize: '14px' }}>
                Se uploadează... {uploadProgress}%
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleUploadPoze}
              style={{ display: 'none' }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="btn-primary"
              style={{ padding: '10px 20px', fontSize: '14px' }}
            >
              {uploading ? `${uploadProgress}%` : '+ Adaugă poze'}
            </button>
          </div>
        </div>

        {/* Progress bar */}
        {uploading && (
          <div style={{ backgroundColor: '#e0e0e0', height: '4px' }}>
            <div style={{
              backgroundColor: '#0066cc',
              height: '100%',
              width: `${uploadProgress}%`,
              transition: 'width 0.3s ease'
            }} />
          </div>
        )}

        {/* Grid poze */}
        <div style={{ padding: '30px 40px' }}>
          {loadingPoze ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#999' }}>
              <p>Se încarcă pozele...</p>
            </div>
          ) : pozeGalerie.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '60px',
              color: '#999',
              backgroundColor: 'white',
              borderRadius: '10px',
              border: '2px dashed #ddd'
            }}>
              <p style={{ fontSize: '48px', margin: '0 0 20px 0' }}>📸</p>
              <p style={{ fontSize: '18px', marginBottom: '10px' }}>Nicio poză încă</p>
              <p style={{ fontSize: '14px', marginBottom: '20px' }}>Click pe "Adaugă poze" pentru a încărca</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="btn-primary"
              >
                + Adaugă prima poză
              </button>
            </div>
          ) : (
            <Masonry
              breakpointCols={masonryBreakpoints}
              className="masonry-grid"
              columnClassName="masonry-grid_column"
            >
              {pozeGalerie.map((poza) => (
                <div
                  key={poza.key}
                  style={{
                    position: 'relative',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                    backgroundColor: '#e0e0e0'
                  }}
                  className="feature-card"
                >
                  <img
                    src={poza.url}
                    alt="Poză galerie"
                    style={{
                      width: '100%',
                      height: 'auto',
                      display: 'block'
                    }}
                  />
                  <button
                    onClick={() => handleDeletePoza(poza.key)}
                    style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      backgroundColor: 'rgba(220,53,69,0.9)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '50%',
                      width: '30px',
                      height: '30px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </Masonry>
          )}
        </div>
      </div>
    )
  }

  // VIEW: Dashboard principal
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

      <div style={{ padding: '40px 50px', backgroundColor: '#f5f5f5' }}>
        <div style={{
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
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#0066cc' }}>Free</div>
          </div>
        </div>

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
                  }}
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
                      onClick={() => handleDeschideGalerie(galerie)}
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
                      Deschide
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