import { useEffect } from 'react'

function Lightbox({ photos, currentIndex, onClose, onNext, onPrev, onDelete }) {
  const total = photos?.length || 0
  const index = currentIndex ?? 0
  const currentPhoto = total > 0 ? photos[index] : null

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose?.()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        onNext?.()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        onPrev?.()
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        onDelete?.()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, onNext, onPrev, onDelete])

  if (!currentPhoto) return null

  const handleOverlayClick = (e) => {
    // Închide doar dacă se face click pe overlay, nu pe conținut
    if (e.target === e.currentTarget) {
      onClose?.()
    }
  }

  const handleDownload = () => {
    if (!currentPhoto?.url) return
    const link = document.createElement('a')
    link.href = currentPhoto.url
    const fallbackName = currentPhoto.key?.split('/').pop() || 'fotolio-photo.jpg'
    link.download = fallbackName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="lightbox-overlay" onClick={handleOverlayClick}>
      <div className="lightbox-content">
        {/* Close button */}
        <button
          className="lightbox-close"
          onClick={onClose}
          aria-label="Închide"
        >
          ×
        </button>

        {/* Arrows */}
        {total > 1 && (
          <>
            <button
              className="lightbox-nav lightbox-nav-left"
              onClick={onPrev}
              aria-label="Imaginea anterioară"
            >
              ‹
            </button>
            <button
              className="lightbox-nav lightbox-nav-right"
              onClick={onNext}
              aria-label="Imaginea următoare"
            >
              ›
            </button>
          </>
        )}

        {/* Main image */}
        <div className="lightbox-image-wrapper">
          <img
            src={currentPhoto.url}
            alt="Fotolio galerie"
            className="lightbox-image"
          />
        </div>

        {/* Bottom controls */}
        <div className="lightbox-bottom">
          <div className="lightbox-bottom-left">
            <button className="btn-secondary" onClick={handleDownload}>
              Download
            </button>
            <button
              className="btn-primary"
              style={{ backgroundColor: '#dc3545', borderColor: '#dc3545' }}
              onClick={onDelete}
            >
              Șterge
            </button>
          </div>
          <div className="lightbox-counter">
            {index + 1} / {total}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Lightbox

