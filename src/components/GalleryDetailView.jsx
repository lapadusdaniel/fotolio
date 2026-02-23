import { useState } from 'react'
import Masonry from 'react-masonry-css'
import { doc, updateDoc, deleteField } from 'firebase/firestore'
import { db } from '../firebase'
import { toDateInputValue } from '../utils/galleryUtils'
import AdminSelections from './AdminSelections'

/**
 * Gallery detail view: header, AdminSelections, photo grid.
 */
export default function GalleryDetailView({
  galerie,
  pozeGalerie,
  loadingPoze,
  user,
  uploading,
  uploadProgress,
  fileInputRef,
  onBack,
  onUploadPoze,
  onDeletePoza
}) {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [dataExpirare, setDataExpirare] = useState(() => toDateInputValue(galerie?.dataExpirare))
  const [savingExpiry, setSavingExpiry] = useState(false)

  const masonryBreakpoints = {
    default: 4,
    1200: 3,
    800: 2,
    500: 1
  }

  return (
    <div className="dashboard-root">
      <div className="dashboard-gallery-header">
        <div className="dashboard-header-left">
          <button onClick={onBack} className="dashboard-back-btn">
            ← Înapoi
          </button>
          <div>
            <h2 className="dashboard-gallery-title">{galerie.nume}</h2>
            <p className="dashboard-gallery-subtitle">
              {galerie.categoria} • {pozeGalerie.length} poze
            </p>
          </div>
        </div>
        <div className="dashboard-header-actions">
          <button
            type="button"
            onClick={() => { setSettingsOpen(true); setDataExpirare(toDateInputValue(galerie?.dataExpirare)); }}
            className="dashboard-settings-btn"
          >
            Setări
          </button>
          <button
            onClick={() => window.open(galerie.slug ? `/${galerie.slug}` : `/gallery/${galerie.id}`, '_blank')}
            className="dashboard-preview-btn"
          >
            Preview Client
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={onUploadPoze}
            className="dashboard-file-input-hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="btn-primary dashboard-add-poze-btn"
          >
            {uploading ? `${uploadProgress}%` : '+ Adaugă poze'}
          </button>
        </div>
      </div>

      {uploading && (
        <div className="dashboard-progress-bar">
          <div className="dashboard-progress-fill" style={{ width: `${uploadProgress}%` }} />
        </div>
      )}

      <AdminSelections galerie={galerie} userId={user?.uid} />

      <div className="dashboard-gallery-content">
        {loadingPoze ? (
          <div className="dashboard-loading-state">
            <p>Se încarcă pozele...</p>
          </div>
        ) : pozeGalerie.length === 0 ? (
          <div className="dashboard-empty-state">
            <p className="dashboard-empty-icon">📸</p>
            <p className="dashboard-empty-text">Nicio poză încă</p>
            <button onClick={() => fileInputRef.current?.click()} className="btn-primary">
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
              <div key={poza.key} className="dashboard-masonry-item">
                <img src={poza.url} alt="Poză galerie" className="dashboard-masonry-img" />
                <button
                  onClick={() => onDeletePoza(poza.key)}
                  className="dashboard-delete-poza-btn"
                >
                  ×
                </button>
              </div>
            ))}
          </Masonry>
        )}
      </div>

      {settingsOpen && (
        <div className="dashboard-modal-overlay" onClick={() => setSettingsOpen(false)}>
          <div className="dashboard-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="dashboard-modal-title">Setări galerie</h3>
            <div className="dashboard-modal-field">
              <label>Data expirare</label>
              <input
                type="date"
                value={dataExpirare}
                onChange={(e) => setDataExpirare(e.target.value)}
                className="dashboard-modal-input"
              />
            </div>
            <div className="dashboard-modal-actions">
              <button type="button" className="btn-secondary" onClick={() => setSettingsOpen(false)}>
                Anulează
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={savingExpiry}
                onClick={async () => {
                  setSavingExpiry(true)
                  try {
                    await updateDoc(doc(db, 'galerii', galerie.id), {
                      dataExpirare: dataExpirare ? new Date(dataExpirare).toISOString() : deleteField()
                    })
                    setSettingsOpen(false)
                  } catch (e) {
                    console.error(e)
                    alert('Eroare la salvare.')
                  } finally {
                    setSavingExpiry(false)
                  }
                }}
              >
                {savingExpiry ? 'Se salvează...' : 'Salvează'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
