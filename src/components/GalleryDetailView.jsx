import { useState } from 'react'
import Masonry from 'react-masonry-css'
import AdminSelections from './AdminSelections'
import FolderManager from './FolderManager'
import FolderAssignModal from './FolderAssignModal'
import { db } from '../firebase'
import { doc, updateDoc } from 'firebase/firestore'

/**
 * Gallery detail view: header, AdminSelections, folder bar, photo grid.
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
  const masonryBreakpoints = {
    default: 4,
    1200: 3,
    800: 2,
    500: 1
  }

  const [activeFolder, setActiveFolder] = useState(null)
  const [selectedKeys, setSelectedKeys] = useState([])
  const [showAssignModal, setShowAssignModal] = useState(false)

  const folders = galerie.folders || []
  const photoFolders = galerie.photoFolders || {}

  // Filtered photos based on active folder
  const displayedPoze = activeFolder === null
    ? pozeGalerie
    : pozeGalerie.filter((p) => photoFolders[p.key] === activeFolder)

  const toggleSelect = (key) => {
    setSelectedKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    )
  }

  const handleAddFolder = async (name) => {
    const updatedFolders = [...folders, name]
    try {
      await updateDoc(doc(db, 'galerii', galerie.id), { folders: updatedFolders })
    } catch (err) {
      console.error('Error adding folder:', err)
    }
  }

  const handleAssignFolder = async (folderName) => {
    const updatedPhotoFolders = { ...photoFolders }
    selectedKeys.forEach((key) => {
      updatedPhotoFolders[key] = folderName
    })
    try {
      await updateDoc(doc(db, 'galerii', galerie.id), { photoFolders: updatedPhotoFolders })
    } catch (err) {
      console.error('Error assigning folder:', err)
    }
    setSelectedKeys([])
    setShowAssignModal(false)
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

      {/* Folder bar */}
      <FolderManager
        folders={folders}
        activeFolder={activeFolder}
        onFolderSelect={setActiveFolder}
        onAddFolder={handleAddFolder}
      />

      {/* Multi-select toolbar */}
      {selectedKeys.length > 0 && (
        <div style={toolbarStyle}>
          <span style={{ fontSize: '14px', color: '#3a3a3c' }}>
            {selectedKeys.length} {selectedKeys.length === 1 ? 'poză selectată' : 'poze selectate'}
          </span>
          <button
            style={assignBtnStyle}
            onClick={() => setShowAssignModal(true)}
          >
            Mută în folder
          </button>
          <button
            style={clearBtnStyle}
            onClick={() => setSelectedKeys([])}
          >
            Anulează selecția
          </button>
        </div>
      )}

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
            {displayedPoze.map((poza) => {
              const isSelected = selectedKeys.includes(poza.key)
              return (
                <div
                  key={poza.key}
                  className="dashboard-masonry-item"
                  style={{ position: 'relative', cursor: 'pointer' }}
                  onClick={() => toggleSelect(poza.key)}
                >
                  <img
                    src={poza.url}
                    alt="Poză galerie"
                    className="dashboard-masonry-img"
                    style={isSelected ? { opacity: 0.7, outline: '3px solid #1d1d1f' } : {}}
                  />
                  {isSelected && (
                    <div style={checkmarkStyle}>✓</div>
                  )}
                  {photoFolders[poza.key] && !isSelected && (
                    <div style={folderLabelStyle}>{photoFolders[poza.key]}</div>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); onDeletePoza(poza.key) }}
                    className="dashboard-delete-poza-btn"
                  >
                    ×
                  </button>
                </div>
              )
            })}
          </Masonry>
        )}
      </div>

      {showAssignModal && (
        <FolderAssignModal
          folders={folders}
          selectedCount={selectedKeys.length}
          onAssign={handleAssignFolder}
          onClose={() => setShowAssignModal(false)}
        />
      )}
    </div>
  )
}

const toolbarStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  padding: '10px 0',
  fontFamily: "'DM Sans', sans-serif",
}

const assignBtnStyle = {
  padding: '7px 18px',
  borderRadius: '100px',
  background: '#1d1d1f',
  color: '#fff',
  border: 'none',
  cursor: 'pointer',
  fontSize: '14px',
  fontFamily: "'DM Sans', sans-serif",
}

const clearBtnStyle = {
  padding: '7px 18px',
  borderRadius: '100px',
  background: '#f5f5f7',
  color: '#3a3a3c',
  border: 'none',
  cursor: 'pointer',
  fontSize: '14px',
  fontFamily: "'DM Sans', sans-serif",
}

const checkmarkStyle = {
  position: 'absolute',
  top: '8px',
  left: '8px',
  width: '24px',
  height: '24px',
  borderRadius: '50%',
  background: '#1d1d1f',
  color: '#fff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '13px',
  fontWeight: 700,
  pointerEvents: 'none',
}

const folderLabelStyle = {
  position: 'absolute',
  bottom: '8px',
  left: '8px',
  background: 'rgba(29,29,31,0.72)',
  color: '#fff',
  borderRadius: '100px',
  padding: '2px 10px',
  fontSize: '12px',
  fontFamily: "'DM Sans', sans-serif",
  pointerEvents: 'none',
}
