import { useState, useEffect, useRef } from 'react'
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

  // Galerie activa
  const [galerieActiva, setGalerieActiva] = useState(null)
  const [pozeGalerie, setPozeGalerie] = useState([])
  const [loadingPoze, setLoadingPoze] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [selectedPhoto, setSelectedPhoto] = useState(null)
  const fileInputRef = useRef(null)

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

  // Deschide galeria și încarcă pozele din R2
  const handleDeschideGalerie = async (galerie) => {
    setGalerieActiva(galerie)
    setLoadingPoze(true)

    try {
      const poze = await listPoze(user.uid, galerie.id)
      const pozeWithUrls = poze.map(poza => ({
        key: poza.key,
        url: getPozaUrl(poza.key),
        size: poza.size
      }))
      setPozeGalerie(pozeWithUrls)
    } catch (error) {
      console.error('Error loading poze:', error)
      alert('Eroare la încărcarea pozelor!')
    } finally {
      setLoadingPoze(false)
    }
  }

  // Upload poze în R2
  const handleUploadPoze = async (e) => {
    const files = Array.from(e.target.files)
    if (!files.length || !galerieActiva) return

    setUploading(true)
    setUploadProgress(0)

    try {
      const uploadedPoze = []

      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const result = await uploadPoza(file, user.uid, galerieActiva.id)
        uploadedPoze.push({
          key: result.key,
          url: getPozaUrl(result.key)
        })
        setUploadProgress(Math.round(((i + 1) / files.length) * 100))
      }

      setPozeGalerie(prev => [...prev, ...uploadedPoze])

      // Update count în Firestore
      const galerieRef = doc(db, 'galerii', galerieActiva.id)
      await updateDoc(galerieRef, {
        poze: (galerieActiva.poze || 0) + files.length
      })

      // Actualizează și obiectul local
      setGalerieActiva(prev => ({ ...prev, poze: (prev.poze || 0) + files.length }))

      alert(`${files.length} poze uploadate cu succes!`)
    } catch (error) {
      console.error('Error uploading:', error)
      alert(`Eroare la upload: ${error.message}`)
    } finally {
      setUploading(false)
      setUploadProgress(0)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // Șterge poză din R2
  const handleDeletePoza = async (photo) => {
    if (!window.confirm('Sigur vrei să ștergi această poză?')) return

    try {
      await deletePoza(photo.key)
      setPozeGalerie(prev => prev.filter(p => p.key !== photo.key))

      // Update count în Firestore
      const newCount = Math.max(0, (galerieActiva.poze || 0) - 1)
      const galerieRef = doc(db, 'galerii', galerieActiva.id)
      await updateDoc(galerieRef, { poze: newCount })
      setGalerieActiva(prev => ({ ...prev, poze: newCount }))

      if (selectedPhoto?.key === photo.key) setSelectedPhoto(null)
    } catch (error) {
      console.error('Delete error:', error)
      alert('Eroare la ștergere: ' + error.message)
    }
  }

  // Navigare lightbox
  const handleLightboxNav = (direction) => {
    if (!selectedPhoto) return
    const currentIndex = pozeGalerie.findIndex(p => p.key === selectedPhoto.key)
    let newIndex = currentIndex + direction
    if (newIndex < 0) newIndex = pozeGalerie.length - 1
    if (newIndex >= pozeGalerie.length) newIndex = 0
    setSelectedPhoto(pozeGalerie[newIndex])
  }

  // ========================
  // VIZUALIZARE GALERIE
  // ========================
  if (galerieActiva) {
    return (
      <div className="page-content">
        {/* Header galerie */}
        <div style={{
          backgroundColor: '#1a1a1a',
          color: 'white',
          padding: '30px 50px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <button
              onClick={() => { setGalerieActiva(null); setPozeGalerie([]); setSelectedPhoto(null) }}
              style={{
                padding: '8px 16px',
                backgroundColor: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.3)',
                color: 'white',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              ← Înapoi
            </button>
            <div>
              <h1 style={{ margin: 0, fontSize: '28px' }}>{galerieActiva.nume}</h1>
              <p style={{ margin: '5px 0 0 0', color: '#999', fontSize: '14px' }}>
                {galerieActiva.categoria} &middot; {pozeGalerie.length} poze
              </p>
            </div>
          </div>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleUploadPoze}
              style={{ display: 'none' }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="btn-primary"
              style={{ padding: '10px 20px', fontSize: '14px' }}
            >
              {uploading ? `Se încarcă... ${uploadProgress}%` : '+ Adaugă poze'}
            </button>
          </div>
        </div>

        {/* Content galerie */}
        <div style={{ padding: '40px 50px', backgroundColor: '#f5f5f5', minHeight: '70vh' }}>

          {/* Progress bar */}
          {uploading && (
            <div style={{
              backgroundColor: '#e0e0e0',
              borderRadius: '10px',
              height: '8px',
              marginBottom: '30px',
              overflow: 'hidden'
            }}>
              <div style={{
                backgroundColor: '#0066cc',
                height: '100%',
                width: `${uploadProgress}%`,
                borderRadius: '10px',
                transition: 'width 0.3s ease'
              }} />
            </div>
          )}

          {/* Grid poze */}
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '10px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
          }}>
            {loadingPoze ? (
              <div style={{ textAlign: 'center', padding: '60px', color: '#999' }}>
                <p>Se încarcă pozele...</p>
              </div>
            ) : pozeGalerie.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px', color: '#999' }}>
                <p style={{ fontSize: '48px', marginBottom: '10px' }}>📷</p>
                <p style={{ fontSize: '18px', marginBottom: '5px' }}>Nicio poză în această galerie.</p>
                <p style={{ fontSize: '14px' }}>Apasă "+ Adaugă poze" pentru a adăuga fotografii.</p>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '12px'
              }}>
                <style>{`
                  @media (max-width: 1024px) {
                    .poze-grid { grid-template-columns: repeat(2, 1fr) !important; }
                  }
                  @media (max-width: 600px) {
                    .poze-grid { grid-template-columns: 1fr !important; }
                  }
                  .poza-item:hover .poza-delete { opacity: 1 !important; }
                  .poza-item:hover .poza-overlay { opacity: 1 !important; }
                `}</style>
                {pozeGalerie.map((photo) => (
                  <div
                    key={photo.key}
                    className="poza-item"
                    style={{
                      position: 'relative',
                      aspectRatio: '1',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      backgroundColor: '#f0f0f0'
                    }}
                    onClick={() => setSelectedPhoto(photo)}
                  >
                    <img
                      src={photo.url}
                      alt=""
                      loading="lazy"
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block'
                      }}
                    />
                    <div
                      className="poza-overlay"
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 40%)',
                        opacity: 0,
                        transition: 'opacity 0.2s'
                      }}
                    />
                    <button
                      className="poza-delete"
                      onClick={(e) => { e.stopPropagation(); handleDeletePoza(photo) }}
                      style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        width: '30px',
                        height: '30px',
                        backgroundColor: 'rgba(220, 53, 69, 0.9)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '50%',
                        cursor: 'pointer',
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: 0,
                        transition: 'opacity 0.2s'
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Lightbox fullscreen */}
        {selectedPhoto && (
          <div
            onClick={() => setSelectedPhoto(null)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.95)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000
            }}
          >
            {/* Close */}
            <button
              onClick={() => setSelectedPhoto(null)}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                backgroundColor: 'transparent',
                border: 'none',
                color: 'white',
                fontSize: '32px',
                cursor: 'pointer',
                zIndex: 1001
              }}
            >
              ✕
            </button>

            {/* Nav stânga */}
            {pozeGalerie.length > 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); handleLightboxNav(-1) }}
                style={{
                  position: 'absolute',
                  left: '20px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  border: 'none',
                  color: 'white',
                  fontSize: '28px',
                  cursor: 'pointer',
                  width: '50px',
                  height: '50px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 1001
                }}
              >
                ‹
              </button>
            )}

            {/* Poza */}
            <img
              src={selectedPhoto.url}
              alt=""
              onClick={(e) => e.stopPropagation()}
              style={{
                maxWidth: '90%',
                maxHeight: '90vh',
                objectFit: 'contain',
                borderRadius: '4px'
              }}
            />

            {/* Nav dreapta */}
            {pozeGalerie.length > 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); handleLightboxNav(1) }}
                style={{
                  position: 'absolute',
                  right: '20px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  border: 'none',
                  color: 'white',
                  fontSize: '28px',
                  cursor: 'pointer',
                  width: '50px',
                  height: '50px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 1001
                }}
              >
                ›
              </button>
            )}

            {/* Counter */}
            <div style={{
              position: 'absolute',
              bottom: '20px',
              left: '50%',
              transform: 'translateX(-50%)',
              color: 'rgba(255,255,255,0.6)',
              fontSize: '14px'
            }}>
              {pozeGalerie.findIndex(p => p.key === selectedPhoto.key) + 1} / {pozeGalerie.length}
            </div>
          </div>
        )}
      </div>
    )
  }

  // ========================
  // DASHBOARD PRINCIPAL
  // ========================
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
