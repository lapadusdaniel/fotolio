import { useState, useEffect, useRef } from 'react'
import imageCompression from 'browser-image-compression'
import { db } from '../firebase'
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore'
import { uploadPoza } from '../r2'
import { addMonths, toDateInputValue } from '../utils/galleryUtils'
import { CATEGORII } from '../utils/galleryUtils'

/**
 * Form for creating a new gallery. New galleries get status: 'active'.
 */
export default function AdminGalleryForm({ user, onSuccess, onCancel, disabled, initialFiles = [] }) {
  const [numeGalerie, setNumeGalerie] = useState('')
  const [categorieGalerie, setCategorieGalerie] = useState('Nunți')
  const [dataEveniment, setDataEveniment] = useState('')
  const [dataExpirare, setDataExpirare] = useState('')
  const [formFiles, setFormFiles] = useState(initialFiles)
  const [formFileUrls, setFormFileUrls] = useState([])
  const [formUploadProgress, setFormUploadProgress] = useState(0)
  const [formUploading, setFormUploading] = useState(false)
  const formFileInputRef = useRef(null)

  // Folder management state
  const [folders, setFolders] = useState([])
  const [newFolderInput, setNewFolderInput] = useState('')

  const handleAddFolder = () => {
    const name = newFolderInput.trim()
    if (!name || folders.includes(name)) return
    setFolders(prev => [...prev, name])
    setNewFolderInput('')
  }

  const handleRemoveFolder = (name) => {
    setFolders(prev => prev.filter(f => f !== name))
  }

  const handleFolderKeyDown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); handleAddFolder() }
  }

  useEffect(() => {
    if (!formFiles.length) {
      setFormFileUrls([])
      return
    }
    const urls = formFiles.map(f => URL.createObjectURL(f))
    setFormFileUrls(urls)
    return () => urls.forEach(u => URL.revokeObjectURL(u))
  }, [formFiles])


  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!numeGalerie || !user?.uid) {
      alert('Adaugă un nume pentru galerie!')
      return
    }

    const generatedSlug = numeGalerie.toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '')

    try {
      const docData = {
        nume: numeGalerie,
        slug: generatedSlug,
        categoria: categorieGalerie,
        poze: 0,
        userId: user.uid,
        userName: user.name || 'Fotograf',
        data: new Date().toISOString(),
        createdAt: new Date(),
        status: 'active',
        statusActiv: true,
        folders: folders,
        photoFolders: {}
      }
      if (dataEveniment) docData.dataEveniment = new Date(dataEveniment).toISOString()
      if (dataExpirare) docData.dataExpirare = new Date(dataExpirare).toISOString()

      const docRef = await addDoc(collection(db, 'galerii'), docData)
      const newGalerieId = docRef.id

      if (formFiles.length > 0) {
        setFormUploading(true)
        setFormUploadProgress(0)
        const totalSteps = formFiles.length * 2
        let completedSteps = 0

        const reportProgress = (stepIndex, percent) => {
          const overall = Math.round(((stepIndex + percent / 100) / totalSteps) * 100)
          setFormUploadProgress(Math.min(100, overall))
        }

        try {
          for (let i = 0; i < formFiles.length; i++) {
            const file = formFiles[i]
            const baseName = `${Date.now()}-${i}-${(file.name || 'image').replace(/[^a-zA-Z0-9.-]/g, '_')}`
            const origPath = `galerii/${newGalerieId}/originals/${baseName}`
            const thumbBase = baseName.replace(/\.[^.]+$/, '') + '.webp'
            const thumbPath = `galerii/${newGalerieId}/thumbnails/${thumbBase}`

            const thumbFile = await imageCompression(file, {
              maxSizeMB: 0.3,
              maxWidthOrHeight: 1200,
              initialQuality: 0.85,
              useWebWorker: true,
              fileType: 'image/webp'
            })

            const [origResult] = await Promise.all([
              uploadPoza(file, newGalerieId, user.uid, (p) => reportProgress(i * 2, p), origPath),
              uploadPoza(thumbFile, newGalerieId, user.uid, (p) => reportProgress(i * 2 + 1, p), thumbPath)
            ])
            completedSteps += 2
            setFormUploadProgress(Math.round((completedSteps / totalSteps) * 100))
          }
          await updateDoc(doc(db, 'galerii', newGalerieId), {
            poze: formFiles.length
          })
        } catch (uploadErr) {
          console.error('Error uploading:', uploadErr)
          alert('Galerie creată, dar a apărut o eroare la încărcarea fotografiilor.')
        } finally {
          setFormUploading(false)
          setFormUploadProgress(0)
        }
      }

      setNumeGalerie('')
      setDataEveniment('')
      setDataExpirare('')
      setFormFiles([])
      setFolders([])
      if (formFileInputRef.current) formFileInputRef.current.value = ''
      onSuccess?.()
    } catch (error) {
      console.error('Error:', error)
      alert('Eroare la adăugare galerie!')
    }
  }

  const handleFormFilesChange = (e) => {
    setFormFiles(Array.from(e.target.files || []))
  }

  const handleFormDrop = (e) => {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files || []).filter(f => f.type.startsWith('image/'))
    setFormFiles(prev => [...prev, ...files])
  }

  const handleFormDragOver = (e) => e.preventDefault()

  const removeFormFile = (index) => {
    setFormFiles(prev => prev.filter((_, i) => i !== index))
  }

  const folderPillStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 12px',
    borderRadius: '100px',
    background: '#f5f5f7',
    color: '#3a3a3c',
    fontSize: '13px',
    fontFamily: "'DM Sans', sans-serif",
  }

  const folderPillRemoveStyle = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '15px',
    lineHeight: 1,
    color: '#6e6e73',
    padding: '0 2px',
  }

  return (
    <form onSubmit={handleSubmit} className="gallery-add-form">
      <div className="gallery-add-grid">
        <div>
          <label>Nume galerie</label>
          <input
            type="text"
            value={numeGalerie}
            onChange={(e) => setNumeGalerie(e.target.value)}
            placeholder="Ex: Nuntă Ana & Mihai"
            className="gallery-add-input"
          />
        </div>
        <div>
          <label>Categorie</label>
          <select
            value={categorieGalerie}
            onChange={(e) => setCategorieGalerie(e.target.value)}
            className="gallery-add-input gallery-add-select"
          >
            {CATEGORII.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="gallery-add-row">
        <div>
          <label>Data Evenimentului</label>
          <input
            type="date"
            value={dataEveniment}
            onChange={(e) => setDataEveniment(e.target.value)}
            className="gallery-add-input"
          />
        </div>
      </div>
      <div className="gallery-add-expiry">
        <label>Expirare</label>
        <div className="gallery-expiry-presets">
          <button type="button" onClick={() => setDataExpirare(toDateInputValue(addMonths(new Date(), 1)))}>1 Lună</button>
          <button type="button" onClick={() => setDataExpirare(toDateInputValue(addMonths(new Date(), 3)))}>3 Luni</button>
          <button type="button" onClick={() => setDataExpirare(toDateInputValue(addMonths(new Date(), 6)))}>6 Luni</button>
          <button type="button" onClick={() => setDataExpirare(toDateInputValue(addMonths(new Date(), 12)))}>1 An</button>
        </div>
        <div className="gallery-expiry-custom">
          <label>Expiră la</label>
          <input
            type="date"
            value={dataExpirare}
            onChange={(e) => setDataExpirare(e.target.value)}
            className="gallery-add-input"
          />
        </div>
      </div>
      {/* Folder management section */}
      <div style={{ marginBottom: '16px' }}>
        <label>Foldere galerie</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px', marginBottom: '8px' }}>
          {folders.map((folder) => (
            <span key={folder} style={folderPillStyle}>
              {folder}
              <button
                type="button"
                onClick={() => handleRemoveFolder(folder)}
                style={folderPillRemoveStyle}
                aria-label={`Elimină ${folder}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            value={newFolderInput}
            onChange={(e) => setNewFolderInput(e.target.value)}
            onKeyDown={handleFolderKeyDown}
            placeholder="Ex: Pregătiri"
            className="gallery-add-input"
            style={{ flex: 1 }}
          />
          <button type="button" onClick={handleAddFolder} className="btn-secondary" style={{ whiteSpace: 'nowrap' }}>
            + Adaugă folder
          </button>
        </div>
      </div>

      <div className="gallery-add-upload">
        <label>Fotografii</label>
        <input
          ref={formFileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handleFormFilesChange}
          className="dashboard-file-input-hidden"
        />
        <div
          className="gallery-add-dropzone"
          onDrop={handleFormDrop}
          onDragOver={handleFormDragOver}
          onClick={() => formFileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); formFileInputRef.current?.click(); } }}
        >
          <span className="gallery-add-dropzone-icon">+</span>
          <span className="gallery-add-dropzone-text">Adaugă Fotografii</span>
          <span className="gallery-add-dropzone-hint">sau trage fișierele aici</span>
        </div>
        {formFiles.length > 0 && (
          <div className="gallery-add-preview">
            <p className="gallery-add-preview-count">{formFiles.length} fotografii selectate</p>
            <div className="gallery-add-thumbnails">
              {formFiles.slice(0, 8).map((file, i) => formFileUrls[i] && (
                <div key={i} className="gallery-add-thumb">
                  <img src={formFileUrls[i]} alt="" />
                  <button type="button" onClick={(e) => { e.stopPropagation(); removeFormFile(i); }} className="gallery-add-thumb-remove" aria-label="Elimină">×</button>
                </div>
              ))}
              {formFiles.length > 8 && (
                <span className="gallery-add-thumb-more">+{formFiles.length - 8}</span>
              )}
            </div>
          </div>
        )}
      </div>
      {formUploading && (
        <div className="gallery-add-progress-wrap">
          <div className="dashboard-progress-bar">
            <div className="dashboard-progress-fill" style={{ width: `${formUploadProgress}%` }} />
          </div>
          <p className="gallery-add-progress-text">Se încarcă… {formUploadProgress}%</p>
        </div>
      )}
      <div className="gallery-add-actions">
        <button type="submit" className="btn-primary dashboard-save-btn gallery-add-submit-btn" disabled={formUploading || disabled}>
          {formUploading ? 'Se încarcă…' : formFiles.length > 0 ? 'Salvează și Încarcă' : 'Salvează'}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary">
          Anulează
        </button>
      </div>
    </form>
  )
}
