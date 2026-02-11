import { useState, useEffect, useRef } from 'react'
import { uploadPhoto, listPhotos, deletePhoto } from '../r2'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'

function GalerieView({ galerie, user, onBack }) {
  const [poze, setPoze] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState('')
  const [selectedPhoto, setSelectedPhoto] = useState(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    loadPhotos()
  }, [galerie.id])

  const loadPhotos = async () => {
    setLoading(true)
    try {
      const photos = await listPhotos(user.uid, galerie.id)
      setPoze(photos)
    } catch (error) {
      console.error('Error loading photos:', error)
    }
    setLoading(false)
  }

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files)
    if (files.length === 0) return

    setUploading(true)
    let uploaded = 0

    try {
      for (const file of files) {
        setUploadProgress(`Se incarca ${uploaded + 1} din ${files.length}...`)
        await uploadPhoto(file, user.uid, galerie.id)
        uploaded++
      }

      // Update photo count in Firestore
      await updateDoc(doc(db, 'galerii', galerie.id), {
        poze: (galerie.poze || 0) + uploaded
      })

      await loadPhotos()
      alert(`${uploaded} ${uploaded === 1 ? 'poza incarcata' : 'poze incarcate'}!`)
    } catch (error) {
      console.error('Upload error:', error)
      alert('Eroare la incarcare: ' + error.message)
    }

    setUploading(false)
    setUploadProgress('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleDelete = async (photo) => {
    if (!window.confirm('Sigur vrei sa stergi aceasta poza?')) return

    try {
      await deletePhoto(photo.key)

      // Update photo count in Firestore
      const newCount = Math.max(0, (galerie.poze || 0) - 1)
      await updateDoc(doc(db, 'galerii', galerie.id), { poze: newCount })

      setPoze(poze.filter(p => p.key !== photo.key))
      if (selectedPhoto?.key === photo.key) setSelectedPhoto(null)
    } catch (error) {
      console.error('Delete error:', error)
      alert('Eroare la stergere: ' + error.message)
    }
  }

  return (
    <div>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '30px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button
            onClick={onBack}
            style={{
              padding: '8px 16px',
              backgroundColor: '#f0f0f0',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            ← Inapoi
          </button>
          <div>
            <h2 style={{ margin: 0 }}>{galerie.nume}</h2>
            <span style={{ fontSize: '14px', color: '#666' }}>
              {galerie.categoria} &middot; {poze.length} poze
            </span>
          </div>
        </div>

        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleUpload}
            style={{ display: 'none' }}
            id="photo-upload"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="btn-primary"
            style={{ padding: '10px 20px', fontSize: '14px' }}
          >
            {uploading ? uploadProgress : '+ Incarca poze'}
          </button>
        </div>
      </div>

      {/* Photo grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#999' }}>
          <p>Se incarca pozele...</p>
        </div>
      ) : poze.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#999' }}>
          <p style={{ fontSize: '48px', marginBottom: '10px' }}>📷</p>
          <p>Nicio poza in aceasta galerie.</p>
          <p style={{ fontSize: '14px' }}>Apasa "Incarca poze" pentru a adauga fotografii.</p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '12px'
        }}>
          {poze.map((photo) => (
            <div
              key={photo.key}
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
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(photo) }}
                style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  width: '28px',
                  height: '28px',
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
                onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
                onMouseLeave={(e) => e.currentTarget.style.opacity = 0}
              >
                ✕
              </button>
              <style>{`
                div:hover > button { opacity: 1 !important; }
              `}</style>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {selectedPhoto && (
        <div
          onClick={() => setSelectedPhoto(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '40px'
          }}
        >
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
              cursor: 'pointer'
            }}
          >
            ✕
          </button>
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
        </div>
      )}
    </div>
  )
}

export default GalerieView
