import { useState, useEffect } from 'react'
import { storage, db } from '../firebase'
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage'
import { collection, addDoc, deleteDoc, doc, query, where, onSnapshot, updateDoc } from 'firebase/firestore'

function GalerieView({ galerie, user, onBack }) {
  const [poze, setPoze] = useState([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [loading, setLoading] = useState(true)

  // Ascultă pozele din galerie
  useEffect(() => {
    const q = query(
      collection(db, 'poze'),
      where('galerieId', '==', galerie.id),
      where('userId', '==', user.uid)
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const pozeData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      pozeData.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
      setPoze(pozeData)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [galerie.id, user.uid])

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files)
    if (files.length === 0) return

    setUploading(true)
    setUploadProgress(0)

    let uploaded = 0

    for (const file of files) {
      // Verifică dacă e imagine
      if (!file.type.startsWith('image/')) {
        alert(`Fișierul "${file.name}" nu este o imagine și a fost ignorat.`)
        continue
      }

      // Verifică dimensiunea (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert(`Fișierul "${file.name}" depășește limita de 10MB și a fost ignorat.`)
        continue
      }

      try {
        const timestamp = Date.now()
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
        const storageRef = ref(storage, `galerii/${user.uid}/${galerie.id}/${timestamp}_${safeName}`)

        // Upload cu progress
        const uploadTask = uploadBytesResumable(storageRef, file)

        await new Promise((resolve, reject) => {
          uploadTask.on('state_changed',
            (snapshot) => {
              const fileProgress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100
              const totalProgress = ((uploaded + fileProgress / 100) / files.length) * 100
              setUploadProgress(Math.round(totalProgress))
            },
            (error) => {
              console.error('Upload error:', error)
              reject(error)
            },
            async () => {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref)

              // Salvează referința în Firestore
              await addDoc(collection(db, 'poze'), {
                galerieId: galerie.id,
                userId: user.uid,
                url: downloadURL,
                nume: file.name,
                storagePath: storageRef.fullPath,
                size: file.size,
                type: file.type,
                createdAt: new Date()
              })

              uploaded++
              resolve()
            }
          )
        })
      } catch (error) {
        console.error(`Eroare la upload "${file.name}":`, error)
        alert(`Eroare la încărcarea fișierului "${file.name}"`)
      }
    }

    // Actualizează contorul de poze din galerie
    try {
      const galerieRef = doc(db, 'galerii', galerie.id)
      await updateDoc(galerieRef, {
        poze: (galerie.poze || 0) + uploaded
      })
    } catch (error) {
      console.error('Eroare la actualizare contor:', error)
    }

    setUploading(false)
    setUploadProgress(0)

    // Reset input
    e.target.value = ''
  }

  const handleDeletePoza = async (poza) => {
    if (!window.confirm('Sigur vrei să ștergi această fotografie?')) return

    try {
      // Șterge din Storage
      const storageRef = ref(storage, poza.storagePath)
      await deleteObject(storageRef)

      // Șterge din Firestore
      await deleteDoc(doc(db, 'poze', poza.id))

      // Actualizează contorul
      const galerieRef = doc(db, 'galerii', galerie.id)
      await updateDoc(galerieRef, {
        poze: Math.max((galerie.poze || 0) - 1, 0)
      })
    } catch (error) {
      console.error('Eroare la ștergere:', error)
      alert('Eroare la ștergerea fotografiei!')
    }
  }

  return (
    <div style={{ padding: '40px 50px', backgroundColor: '#f5f5f5', minHeight: '80vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <button
            onClick={onBack}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              color: '#0066cc',
              cursor: 'pointer',
              fontSize: '14px',
              padding: 0,
              marginBottom: '10px',
              display: 'block'
            }}
          >
            &larr; Înapoi la galerii
          </button>
          <h2 style={{ margin: 0 }}>{galerie.nume}</h2>
          <p style={{ margin: '5px 0 0 0', color: '#666', fontSize: '14px' }}>
            {galerie.categoria} &middot; {poze.length} poze
          </p>
        </div>

        <label
          style={{
            backgroundColor: '#0066cc',
            color: 'white',
            padding: '12px 24px',
            borderRadius: '5px',
            cursor: uploading ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
            opacity: uploading ? 0.6 : 1
          }}
        >
          {uploading ? `Se încarcă... ${uploadProgress}%` : '+ Încarcă fotografii'}
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handleUpload}
            disabled={uploading}
            style={{ display: 'none' }}
          />
        </label>
      </div>

      {/* Progress bar */}
      {uploading && (
        <div style={{
          backgroundColor: '#e0e0e0',
          borderRadius: '10px',
          overflow: 'hidden',
          marginBottom: '20px',
          height: '8px'
        }}>
          <div style={{
            width: `${uploadProgress}%`,
            backgroundColor: '#0066cc',
            height: '100%',
            transition: 'width 0.3s ease',
            borderRadius: '10px'
          }} />
        </div>
      )}

      {/* Grid de poze */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#999' }}>
          <p>Se încarcă fotografiile...</p>
        </div>
      ) : poze.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '80px 20px',
          backgroundColor: 'white',
          borderRadius: '10px',
          border: '2px dashed #ddd'
        }}>
          <p style={{ fontSize: '48px', marginBottom: '10px' }}>📷</p>
          <p style={{ fontSize: '18px', color: '#666', marginBottom: '10px' }}>
            Nicio fotografie în această galerie
          </p>
          <p style={{ fontSize: '14px', color: '#999' }}>
            Apasă butonul "Încarcă fotografii" pentru a adăuga poze
          </p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
          gap: '15px'
        }}>
          {poze.map((poza) => (
            <div
              key={poza.id}
              style={{
                position: 'relative',
                borderRadius: '8px',
                overflow: 'hidden',
                backgroundColor: 'white',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}
            >
              <img
                src={poza.url}
                alt={poza.nume}
                style={{
                  width: '100%',
                  height: '200px',
                  objectFit: 'cover',
                  display: 'block'
                }}
              />
              <div style={{
                padding: '10px 12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{
                  fontSize: '12px',
                  color: '#666',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: '70%'
                }}>
                  {poza.nume}
                </span>
                <button
                  onClick={() => handleDeletePoza(poza)}
                  style={{
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '4px 10px',
                    cursor: 'pointer',
                    fontSize: '12px'
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
  )
}

export default GalerieView
