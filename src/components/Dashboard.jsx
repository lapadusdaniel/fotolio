import { useState, useEffect, useRef, useMemo } from 'react'
import './Dashboard.css'
import Masonry from 'react-masonry-css'
import { auth, db } from '../firebase'
import { signOut } from 'firebase/auth'
import { collection, addDoc, deleteDoc, doc, query, where, onSnapshot, updateDoc } from 'firebase/firestore'
import { uploadPoza, listPoze, getPozaUrl, deletePoza } from '../r2'

/* --- Icoane SVG inline (minimaliste) --- */
const IconViews = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)
const IconDownloads = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
)
const IconLink = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
  </svg>
)
const IconSearch = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8" />
    <path d="M21 21l-4.35-4.35" />
  </svg>
)

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '—'
  const units = ['B', 'KB', 'MB', 'GB']
  let i = 0
  let n = bytes
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024
    i++
  }
  return `${n.toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

function formatDateShort(isoOrDate) {
  if (!isoOrDate) return '—'
  const d = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatDateRO(isoOrDate) {
  if (!isoOrDate) return null
  const d = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate)
  if (isNaN(d.getTime())) return null
  return d.toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: 'numeric' })
}

function addMonths(date, months) {
  const d = new Date(date)
  d.setMonth(d.getMonth() + months)
  return d
}

function toDateInputValue(date) {
  if (!date) return ''
  const d = date instanceof Date ? date : new Date(date)
  if (isNaN(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
}

/** Rând galerie - Listă Premium (Apple-inspired) */
function GalleryRow({ galerie, user, onCopyLink, onDeschide, onDelete }) {
  const [coverUrl, setCoverUrl] = useState(null)
  const [totalSize, setTotalSize] = useState(0)
  const [coverLoading, setCoverLoading] = useState(true)
  const urlRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const raw = await listPoze(galerie.id, user.uid)
        const items = Array.isArray(raw) ? raw : (raw?.Contents ?? raw?.objects ?? raw?.items ?? [])
        if (!items?.length) {
          if (!cancelled) setCoverLoading(false)
          return
        }
        const first = items[0]
        const key = first?.Key ?? first?.key ?? first?.name
        if (key) {
          const url = await getPozaUrl(key)
          if (cancelled) {
            URL.revokeObjectURL(url)
          } else {
            urlRef.current = url
            setCoverUrl(url)
          }
        }
        const total = items.reduce((sum, p) => sum + (p.size ?? p.Size ?? 0), 0)
        if (!cancelled) setTotalSize(total)
      } catch (_) {
        /* silent fallback la placeholder */
      } finally {
        if (!cancelled) setCoverLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current)
        urlRef.current = null
      }
    }
  }, [galerie.id, user.uid])

  const fileCount = galerie?.poze ?? 0
  const metaText = `${fileCount} fișiere • ${formatBytes(totalSize)}`

  const dataEvenimentFormatted = galerie?.dataEveniment ? formatDateRO(galerie.dataEveniment) : null
  const dataExpirareRaw = galerie?.dataExpirare ?? galerie?.expiresAt ?? galerie?.dataExpirarii
  const dataExpirareFormatted = dataExpirareRaw ? formatDateRO(dataExpirareRaw) : null
  const isExpired = dataExpirareRaw ? new Date(dataExpirareRaw) < new Date() : false

  return (
    <div className="gallery-row">
      <div
        className="gallery-row-col gallery-row-col-branding"
        onClick={() => onDeschide(galerie)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onDeschide(galerie); } }}
      >
        <div className="gallery-row-cover">
          {coverLoading ? (
            <div className="gallery-row-cover-placeholder" />
          ) : coverUrl ? (
            <img src={coverUrl} alt="" className="gallery-row-cover-img" />
          ) : (
            <div className="gallery-row-cover-placeholder" />
          )}
        </div>
        <div className="gallery-row-main">
          <h3 className="gallery-row-name">{galerie?.nume}</h3>
          <p className="gallery-row-meta">{metaText}</p>
        </div>
      </div>
      <div className="gallery-row-col gallery-row-col-stat" data-label="Vizualizări">
        <div className="gallery-stat">
          <IconViews />
          <span>{galerie?.vizualizari ?? 0}</span>
        </div>
      </div>
      <div className="gallery-row-col gallery-row-col-stat" data-label="Descărcări">
        <div className="gallery-stat">
          <IconDownloads />
          <span>{galerie?.descarcari ?? 0}</span>
        </div>
      </div>
      <div className="gallery-row-col gallery-row-col-stat gallery-row-col-date" data-label="Data Eveniment">
        <span className="gallery-stat-label">{dataEvenimentFormatted ? `📅 ${dataEvenimentFormatted}` : '—'}</span>
      </div>
      <div className="gallery-row-col gallery-row-col-stat gallery-row-col-date" data-label="Data Expirare">
        <span className={`gallery-stat-label ${isExpired ? 'gallery-stat-expired' : ''}`}>
          {dataExpirareFormatted ? `⌛ Expiră: ${dataExpirareFormatted}` : '—'}
        </span>
      </div>
      <div className="gallery-row-col gallery-row-col-actions">
        <button
          onClick={(e) => { e.stopPropagation(); onCopyLink(galerie?.slug); }}
          className="gallery-row-btn gallery-row-btn-ghost"
          title="Copy Link"
        >
          <IconLink />
          <span>Copy Link</span>
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(galerie?.id); }}
          className="gallery-row-btn gallery-row-btn-danger"
          title="Șterge galerie"
        >
          Șterge
        </button>
      </div>
    </div>
  )
}

const PLAN_LIMITS_GB = { Free: 25, Pro: 500, Unlimited: 1000 }

function Dashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('galerii')
  const [searchTerm, setSearchTerm] = useState('')
  const [galerii, setGalerii] = useState([])
  const [showAddGalerie, setShowAddGalerie] = useState(false)
  const [numeGalerie, setNumeGalerie] = useState('')
  const [categorieGalerie, setCategorieGalerie] = useState('Nunți')
  const [dataEveniment, setDataEveniment] = useState('')
  const [dataExpirare, setDataExpirare] = useState('')
  const [formFiles, setFormFiles] = useState([])
  const [formFileUrls, setFormFileUrls] = useState([])
  const [formUploadProgress, setFormUploadProgress] = useState(0)
  const [formUploading, setFormUploading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [galerieActiva, setGalerieActiva] = useState(null)
  const [pozeGalerie, setPozeGalerie] = useState([])
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [loadingPoze, setLoadingPoze] = useState(false)
  const fileInputRef = useRef(null)
  const formFileInputRef = useRef(null)
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

  const filteredGalerii = useMemo(() => {
    if (!searchTerm.trim()) return galerii
    const term = searchTerm.toLowerCase().trim()
    return galerii.filter(g => (g?.nume || '').toLowerCase().includes(term))
  }, [galerii, searchTerm])

  const totalPoze = galerii.reduce((sum, g) => sum + (g?.poze || 0), 0)
  const planName = user?.plan || 'Free'
  const planLimitGB = PLAN_LIMITS_GB[planName] ?? 25
  const storageUsedGB = 0.1
  const storagePercent = Math.min(100, (storageUsedGB / planLimitGB) * 100)

  const userInitial = (user?.name || 'U').charAt(0).toUpperCase()

  useEffect(() => {
    if (!formFiles.length) {
      setFormFileUrls([])
      return
    }
    const urls = formFiles.map(f => URL.createObjectURL(f))
    setFormFileUrls(urls)
    return () => urls.forEach(u => URL.revokeObjectURL(u))
  }, [formFiles])

  const handleAddGalerie = async (e) => {
    e.preventDefault()
    if (!numeGalerie) {
      alert('Adaugă un nume pentru galerie!')
      return
    }

    const generatedSlug = numeGalerie.toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');

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
        statusActiv: true
      }
      if (dataEveniment) docData.dataEveniment = new Date(dataEveniment).toISOString()
      if (dataExpirare) docData.dataExpirare = new Date(dataExpirare).toISOString()

      const docRef = await addDoc(collection(db, 'galerii'), docData)
      const newGalerieId = docRef.id

      if (formFiles.length > 0) {
        setFormUploading(true)
        setFormUploadProgress(0)
        try {
          for (let i = 0; i < formFiles.length; i++) {
            const file = formFiles[i]
            await uploadPoza(file, newGalerieId, user.uid, (filePercent) => {
              const overall = Math.round(((i + filePercent / 100) / formFiles.length) * 100)
              setFormUploadProgress(overall)
            })
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
      setShowAddGalerie(false)
      if (formFileInputRef.current) formFileInputRef.current.value = ''
    } catch (error) {
      console.error('Error:', error)
      alert('Eroare la adăugare galerie!')
    }
  }

  const handleFormFilesChange = (e) => {
    const files = Array.from(e.target.files || [])
    setFormFiles(files)
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

  // --- MODIFICARE 2: Funcția de Copy Link ---
  const handleCopyLink = (slug) => {
    const link = `${window.location.origin}/?galerie=${slug}`;
    navigator.clipboard.writeText(link);
    alert('Link copiat pentru client! ✅');
  };

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
          if (!key) return null
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

      await handleDeschideGalerie(galerieActiva)

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

  if (galerieActiva) {
    return (
      <div className="dashboard-root">
        <div className="dashboard-gallery-header">
          <div className="dashboard-header-left">
            <button
              onClick={() => { setGalerieActiva(null); setPozeGalerie([]) }}
              className="dashboard-back-btn"
            >
              ← Înapoi
            </button>
            <div>
              <h2 className="dashboard-gallery-title">{galerieActiva.nume}</h2>
              <p className="dashboard-gallery-subtitle">
                {galerieActiva.categoria} • {pozeGalerie.length} poze
              </p>
            </div>
          </div>

          <div className="dashboard-header-actions">
            <button
              onClick={() => window.open(`/?galerie=${galerieActiva.slug}`, '_blank')}
              className="dashboard-preview-btn"
            >
              Preview Client
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleUploadPoze}
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
                    onClick={() => handleDeletePoza(poza.key)}
                    className="dashboard-delete-poza-btn"
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

  return (
    <div className="page-content dashboard-app">
      <header className="dashboard-topbar">
        <h1 className="dashboard-logo" onClick={() => { setGalerieActiva(null); setActiveTab('galerii'); }}>Fotolio</h1>
        <div className="dashboard-topbar-right">
          <div className="dashboard-profile">
            <div className="dashboard-avatar-wrap" title={user?.email}>
              <div className="dashboard-avatar">{userInitial}</div>
            </div>
            <span className="dashboard-profile-name">{user?.name || 'Fotograf'}</span>
            <span className="dashboard-profile-email">{user?.email}</span>
          </div>
          <button onClick={handleLogout} className="dashboard-logout-link">Ieșire</button>
        </div>
      </header>

      <div className="dashboard-controlbar">
        <div className="dashboard-search-wrap">
          <IconSearch />
          <input
            type="search"
            placeholder="Caută galerii..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="dashboard-search-input"
          />
        </div>
        <div className="dashboard-storage-wrap">
          <span className="dashboard-storage-text">{storageUsedGB} GB folosiți din {planLimitGB} GB</span>
          <div className="dashboard-storage-bar">
            <div className="dashboard-storage-fill" style={{ width: `${storagePercent}%` }} />
          </div>
        </div>
        <div className="dashboard-mini-stats">
          {galerii.length} Galerii • {totalPoze} Poze • Plan: {planName}
        </div>
      </div>

      <div className="dashboard-content">
        <div className="dashboard-section">
          <div className="dashboard-section-header">
            <h2 className="dashboard-section-title">Galeriile mele</h2>
            <button
              onClick={() => {
                if (showAddGalerie) {
                  setShowAddGalerie(false)
                  setNumeGalerie('')
                  setDataEveniment('')
                  setDataExpirare('')
                  setFormFiles([])
                  if (formFileInputRef.current) formFileInputRef.current.value = ''
                } else {
                  setShowAddGalerie(true)
                }
              }}
              className="btn-primary dashboard-add-galerie-btn"
              disabled={formUploading}
            >
              {showAddGalerie ? 'Anulează' : '+ Adaugă galerie'}
            </button>
          </div>

          {showAddGalerie && (
            <form onSubmit={handleAddGalerie} className="gallery-add-form">
              <div className="gallery-add-grid">
                <div>
                  <label>Nume galerie</label>
                  <input type="text" value={numeGalerie} onChange={(e) => setNumeGalerie(e.target.value)} placeholder="Ex: Nuntă Ana & Mihai" className="gallery-add-input" />
                </div>
                <div>
                  <label>Categorie</label>
                  <select value={categorieGalerie} onChange={(e) => setCategorieGalerie(e.target.value)} className="gallery-add-input gallery-add-select">
                    <option>Nunți</option><option>Botezuri</option><option>Corporate</option><option>Portret</option><option>Altele</option>
                  </select>
                </div>
              </div>
              <div className="gallery-add-row">
                <div>
                  <label>Data Evenimentului</label>
                  <input type="date" value={dataEveniment} onChange={(e) => setDataEveniment(e.target.value)} className="gallery-add-input" />
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
                  <input type="date" value={dataExpirare} onChange={(e) => setDataExpirare(e.target.value)} className="gallery-add-input" />
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
                <button type="submit" className="btn-primary dashboard-save-btn gallery-add-submit-btn" disabled={formUploading}>
                  {formUploading ? 'Se încarcă…' : formFiles.length > 0 ? 'Salvează și Încarcă' : 'Salvează'}
                </button>
              </div>
            </form>
          )}

          {loading ? (
            <div className="gallery-list-loading"><p>Se încarcă galeriile...</p></div>
          ) : galerii.length === 0 ? (
            <div className="gallery-list-empty"><p>Nu ai nicio galerie încă. Adaugă prima ta galerie! 📸</p></div>
          ) : filteredGalerii.length === 0 ? (
            <div className="gallery-list-empty"><p>Nicio galerie găsită pentru „{searchTerm}"</p></div>
          ) : (
            <div className="gallery-list-premium">
              {filteredGalerii.map((galerie) => (
                <GalleryRow
                  key={galerie.id}
                  galerie={galerie}
                  user={user}
                  onCopyLink={handleCopyLink}
                  onDeschide={handleDeschideGalerie}
                  onDelete={handleDeleteGalerie}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Dashboard