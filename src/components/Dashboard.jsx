import { useState, useEffect, useRef } from 'react'
import slugify from 'slugify'
import Masonry from 'react-masonry-css'
import { db } from '../firebase'
import { collection, addDoc, doc, query, where, onSnapshot, updateDoc, getDoc, setDoc } from 'firebase/firestore'
import { uploadPoza, listPoze, getPozaUrl, deletePoza } from '../r2'
import Lightbox from './Lightbox'
import './Dashboard.css'

function Dashboard({ user, onLogout }) {
  const [galerii, setGalerii] = useState([])
  const [showAddGalerie, setShowAddGalerie] = useState(false)
  const [numeGalerie, setNumeGalerie] = useState('')
  const [dataEveniment, setDataEveniment] = useState('')
  const [dataExpirare, setDataExpirare] = useState('')
  const [loading, setLoading] = useState(true)
  const [galerieActiva, setGalerieActiva] = useState(null)
  const [pozeGalerie, setPozeGalerie] = useState([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [filtruAdmin, setFiltruAdmin] = useState('toate')
  const fileInputRef = useRef(null)
  const [indexPozaSelectata, setIndexPozaSelectata] = useState(null)
  const [activeMenu, setActiveMenu] = useState('drive')
  const [setariForm, setSetariForm] = useState({
    numeBrand: '',
    website: '',
    instagram: ''
  })
  const [loadingSetari, setLoadingSetari] = useState(false)
  const [savingSetari, setSavingSetari] = useState(false)
  const [statusSetari, setStatusSetari] = useState('')
  const [headerBrandName, setHeaderBrandName] = useState('')
  const [copiedLinkId, setCopiedLinkId] = useState('')

  const masonryBreakpoints = { default: 4, 1200: 3, 800: 2, 500: 1 }
  const galeriiSortate = [...galerii].sort((a, b) => {
    const dateA = new Date(a.dataEveniment || 0).getTime()
    const dateB = new Date(b.dataEveniment || 0).getTime()
    return dateB - dateA
  })

  const getShortLink = (galerie) => {
    const slug = (galerie.slug || '').trim()
    return slug ? `/g/${slug}` : '/g/slug-lipsa'
  }

  const buildGallerySlug = (galerie) => {
    const brandName = (
      galerie.userName ||
      headerBrandName ||
      user?.name ||
      user?.displayName ||
      'fotograf'
    ).trim()
    const galleryName = (galerie.nume || 'galerie').trim()
    const brandSlug = slugify(brandName, { lower: true, strict: true }) || 'fotograf'
    const gallerySlug = slugify(galleryName, { lower: true, strict: true }) || 'galerie'
    const uniqueSuffix = (galerie.id || Date.now().toString()).slice(0, 8).toLowerCase()
    return `${brandSlug}-${gallerySlug}-${uniqueSuffix}`
  }

  const getPublicGalleryUrl = (galerie) => `${window.location.origin}${getShortLink(galerie)}`

  const handleOpenShortLink = (galerie) => {
    if (!galerie?.slug) return
    window.open(getPublicGalleryUrl(galerie), '_blank', 'noopener,noreferrer')
  }

  const handleCopyShortLink = async (galerie) => {
    if (!galerie?.slug) return

    const publicUrl = getPublicGalleryUrl(galerie)

    try {
      await navigator.clipboard.writeText(publicUrl)
      setCopiedLinkId(galerie.id)
      setTimeout(() => setCopiedLinkId(''), 1500)
    } catch (error) {
      console.error('Nu am putut copia link-ul:', error)
    }
  }

  // 1. Efect pentru preluarea galeriilor din Firebase
  useEffect(() => {
    if (!user?.uid) return
    const q = query(collection(db, 'galerii'), where('userId', '==', user.uid))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setGalerii(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })))
      setLoading(false)
    })
    return () => unsubscribe()
  }, [user?.uid])

  useEffect(() => {
    if (!user?.uid || galerii.length === 0) return

    const galeriiFaraSlug = galerii.filter((galerie) => !(galerie.slug || '').trim())
    if (galeriiFaraSlug.length === 0) return

    const repairMissingSlugs = async () => {
      try {
        await Promise.all(
          galeriiFaraSlug.map((galerie) =>
            updateDoc(doc(db, 'galerii', galerie.id), { slug: buildGallerySlug(galerie) })
          )
        )
      } catch (error) {
        console.error('Eroare la repararea slug-urilor lipsă:', error)
      }
    }

    repairMissingSlugs()
  }, [galerii, user?.uid, headerBrandName, user?.name, user?.displayName])

  useEffect(() => {
    if (!user?.uid) return

    let mounted = true

    const fetchHeaderBrand = async () => {
      try {
        const setariRef = doc(db, 'setariFotografi', user.uid)
        const setariSnap = await getDoc(setariRef)
        if (!mounted) return

        if (setariSnap.exists()) {
          const data = setariSnap.data()
          setHeaderBrandName((data.numeBrand || '').trim())
        } else {
          setHeaderBrandName('')
        }
      } catch (error) {
        console.error('Eroare la încărcarea brandului pentru header:', error)
      }
    }

    fetchHeaderBrand()

    return () => {
      mounted = false
    }
  }, [user?.uid])

  // 2. Efect pentru persistență la refresh (Aici e Pasul A)
  useEffect(() => {
    const savedGalId = localStorage.getItem('last_gal_id');
    if (savedGalId && galerii.length > 0 && !galerieActiva) {
      const gal = galerii.find(g => g.id === savedGalId);
      if (gal) handleDeschideGalerie(gal);
    }
  }, [galerii]);

  // 3. Efect pentru încărcarea setărilor fotografului
  useEffect(() => {
    if (activeMenu !== 'settings' || !user?.uid) return

    let mounted = true

    const fetchSetari = async () => {
      setLoadingSetari(true)
      setStatusSetari('')

      try {
        const setariRef = doc(db, 'setariFotografi', user.uid)
        const setariSnap = await getDoc(setariRef)

        if (!mounted) return

        if (setariSnap.exists()) {
          const data = setariSnap.data()
          const brandSalvat = data.numeBrand || ''
          setSetariForm({
            numeBrand: brandSalvat || data.numeFotograf || user.name || '',
            website: data.website || data.linkWebsite || '',
            instagram: data.instagram || data.linkInstagram || ''
          })
          setHeaderBrandName(brandSalvat.trim())
        } else {
          setSetariForm({
            numeBrand: user.name || '',
            website: '',
            instagram: ''
          })
          setHeaderBrandName('')
        }
      } catch (error) {
        console.error('Eroare la încărcarea setărilor:', error)
        if (mounted) setStatusSetari('Nu am putut încărca setările.')
      } finally {
        if (mounted) setLoadingSetari(false)
      }
    }

    fetchSetari()

    return () => {
      mounted = false
    }
  }, [activeMenu, user?.uid, user?.name])

  const handleAddGalerie = async (e) => {
    e.preventDefault()
    if (!numeGalerie) return
    try {
      const setariRef = doc(db, 'setariFotografi', user.uid)
      const setariSnap = await getDoc(setariRef)
      const numeBrandSetat = setariSnap.exists() ? (setariSnap.data().numeBrand || '').trim() : ''

      const numeBrandFinal = numeBrandSetat || user.name || user.displayName || 'fotograf'
      const brandSlug = slugify(numeBrandFinal, { lower: true, strict: true })
      const galerieSlug = slugify(numeGalerie, { lower: true, strict: true })
      const slug = `${brandSlug}-${galerieSlug}-${Date.now()}`

      await addDoc(collection(db, 'galerii'), {
        nume: numeGalerie,
        slug: slug,
        userId: user.uid,
        userName: numeBrandFinal,
        dataEveniment: dataEveniment || new Date().toISOString().split('T')[0],
        dataExpirare: dataExpirare || '',
        statusActiv: true,
        favorite: [],
        coverUrl: '',
        poze: 0
      })
      setShowAddGalerie(false)
      setNumeGalerie('')
      setDataEveniment('')
      setDataExpirare('')
    } catch (error) {
      alert('Eroare la creare!')
    }
  }

  const handleDeschideGalerie = async (galerie) => {
    setGalerieActiva(galerie)
    localStorage.setItem('last_gal_id', galerie.id) // Aici e Pasul B (salvăm ID-ul)
    
    try {
      const poze = await listPoze(galerie.id, user.uid)
      const pozeWithUrls = await Promise.all(poze.map(async (p) => ({
        key: p.key || p.Key,
        url: await getPozaUrl(p.key || p.Key)
      })))
      setPozeGalerie(pozeWithUrls.filter(p => p.key))
    } catch (e) {
      console.error(e)
    }
  }

  const handleSetCover = async (p) => {
    try {
      await updateDoc(doc(db, 'galerii', galerieActiva.id), { coverUrl: p.url })
      alert('Copertă setată!')
    } catch (e) {
      alert('Eroare!')
    }
  }

  const handleUploadPoze = async (e) => {
    const files = Array.from(e.target.files)
    if (!files.length || !galerieActiva) return
    setUploading(true)
    try {
      for (let i = 0; i < files.length; i++) {
        await uploadPoza(files[i], galerieActiva.id, user.uid, (p) => 
          setUploadProgress(Math.round(((i + p/100) / files.length) * 100))
        )
      }
      await updateDoc(doc(db, 'galerii', galerieActiva.id), { poze: (galerieActiva.poze || 0) + files.length })
      handleDeschideGalerie(galerieActiva)
    } catch (error) {
      console.error(error)
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  const handleStergePoza = async () => {
    if (indexPozaSelectata === null) return
    const pozaCurenta = pozeGalerie[indexPozaSelectata]
    if (window.confirm('Ștergi poza?')) {
      try {
        await deletePoza(pozaCurenta.key)
        const noiPoze = pozeGalerie.filter((_, i) => i !== indexPozaSelectata)
        setPozeGalerie(noiPoze)
        await updateDoc(doc(db, 'galerii', galerieActiva.id), { poze: noiPoze.length })
        if (noiPoze.length === 0) setIndexPozaSelectata(null)
        else if (indexPozaSelectata >= noiPoze.length) setIndexPozaSelectata(noiPoze.length - 1)
      } catch (e) {
        console.error(e)
      }
    }
  }

  const handleSetariChange = (event) => {
    const { name, value } = event.target
    setSetariForm((prev) => ({ ...prev, [name]: value }))
    if (statusSetari) setStatusSetari('')
  }

  const handleSaveSetari = async (event) => {
    event.preventDefault()
    if (!user?.uid) return

    setSavingSetari(true)
    setStatusSetari('')

    try {
      await setDoc(
        doc(db, 'setariFotografi', user.uid),
        {
          userId: user.uid,
          numeBrand: setariForm.numeBrand.trim(),
          website: setariForm.website.trim(),
          instagram: setariForm.instagram.trim(),
          updatedAt: new Date().toISOString()
        },
        { merge: true }
      )

      setStatusSetari('Salvat!')
      setHeaderBrandName(setariForm.numeBrand.trim())
    } catch (error) {
      console.error('Eroare la salvarea setărilor:', error)
      setStatusSetari('Eroare la salvare. Încearcă din nou.')
    } finally {
      setSavingSetari(false)
    }
  }

  // VIEW: Galerie deschisă
  if (galerieActiva) {
    const pozeDeAfisat = filtruAdmin === 'favorite' 
      ? pozeGalerie.filter(p => galerieActiva.favorite?.includes(p.key))
      : pozeGalerie

    return (
      <div className="gallery-view">
        <header className="gallery-header">
          <div className="gallery-header-left">
            {/* Aici e Pasul C (ștergem ID-ul când ne întoarcem la Dashboard) */}
            <button className="btn-back" onClick={() => {
              setGalerieActiva(null);
              localStorage.removeItem('last_gal_id');
            }}>
              ← Dashboard
            </button>
            <h2>{galerieActiva.nume}</h2>
          </div>
          <div className="gallery-header-right">
            <div className="filter-buttons">
              <button 
                className={`filter-btn ${filtruAdmin === 'toate' ? 'active-filter' : ''}`}
                onClick={() => setFiltruAdmin('toate')}
              >
                Toate
              </button>
              <button 
                className={`filter-btn favorites ${filtruAdmin === 'favorite' ? 'active-filter' : ''}`}
                onClick={() => setFiltruAdmin('favorite')}
              >
                Favorite ({galerieActiva.favorite?.length || 0})
              </button>
            </div>
            <button className="btn-upload" onClick={() => fileInputRef.current.click()}>
              {uploading ? `Upload ${uploadProgress}%` : '+ Adaugă Poze'}
            </button>
            <input ref={fileInputRef} type="file" multiple hidden onChange={handleUploadPoze} />
          </div>
        </header>

        <div className="gallery-photos">
          <Masonry 
            breakpointCols={masonryBreakpoints} 
            className="my-masonry-grid" 
            columnClassName="my-masonry-grid_column"
          >
            {pozeDeAfisat.map((p, index) => {
              const isFav = galerieActiva.favorite?.includes(p.key)
              return (
                <div 
                  key={p.key} 
                  className={`photo-card ${isFav ? 'favorite' : ''}`}
                  onClick={() => setIndexPozaSelectata(index)}
                >
                  <img src={p.url} alt="Gallery" />
                  <div className="photo-overlay">
                    <button 
                      className="btn-overlay"
                      onClick={(e) => { e.stopPropagation(); handleSetCover(p) }}
                    >
                      ⭐ Copertă
                    </button>
                  </div>
                </div>
              )
            })}
          </Masonry>
        </div>

        {indexPozaSelectata !== null && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 9999 }}>
            <Lightbox 
              photos={pozeDeAfisat}
              currentIndex={indexPozaSelectata}
              onClose={() => setIndexPozaSelectata(null)}
              onNext={() => setIndexPozaSelectata((prev) => (prev + 1) % pozeDeAfisat.length)}
              onPrev={() => setIndexPozaSelectata((prev) => (prev - 1 + pozeDeAfisat.length) % pozeDeAfisat.length)}
              onDelete={handleStergePoza}
            />
          </div>
        )}
      </div>
    )
  }

  // VIEW: Dashboard principal cu SIDEBAR
  return (
    <div className="dashboard-layout">
      {/* SIDEBAR */}
      <aside className="dashboard-sidebar">
        <h1>📸 FOTOLIO</h1>
        
        <button 
          className={`sidebar-button ${activeMenu === 'drive' ? 'active' : ''}`}
          onClick={() => setActiveMenu('drive')}
        >
          💾 Drive
        </button>
        
        <button 
          className={`sidebar-button ${activeMenu === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveMenu('settings')}
        >
          ⚙️ Settings
        </button>
        
        <button className="sidebar-button logout" onClick={onLogout}>
          Ieșire
        </button>
      </aside>

      {/* MAIN CONTENT */}
      <div className="dashboard-main">
        <header className="dashboard-header">
          <h1>
            {activeMenu === 'drive' && '💾 DRIVE'}
            {activeMenu === 'settings' && '⚙️ SETTINGS'}
          </h1>
          <span className="user-info">{headerBrandName || user.name || user.email}</span>
        </header>

        {/* VIEW DRIVE */}
        {activeMenu === 'drive' && (
          <div className="drive-content">
            <div className="drive-header">
              <h2>GALERIILE TALE</h2>
              <button className="btn-add-gallery" onClick={() => setShowAddGalerie(!showAddGalerie)}>
                {showAddGalerie ? 'ANULEAZĂ' : '+ GALERIE NOUĂ'}
              </button>
            </div>

            {showAddGalerie && (
              <form className="add-gallery-form" onSubmit={handleAddGalerie}>
                <div className="form-field">
                  <label>Nume Galerie</label>
                  <input type="text" value={numeGalerie} onChange={e => setNumeGalerie(e.target.value)} required />
                </div>
                <div className="form-field">
                  <label>Data Eveniment</label>
                  <input type="date" value={dataEveniment} onChange={e => setDataEveniment(e.target.value)} />
                </div>
                <div className="form-field">
                  <label>Data Expirare</label>
                  <input type="date" value={dataExpirare} onChange={e => setDataExpirare(e.target.value)} />
                </div>
                <button type="submit" className="btn-create">CREEAZĂ</button>
              </form>
            )}

            <div className="gallery-grid">
              {loading && <div className="gallery-empty-state">Se încarcă galeriile...</div>}

              {!loading && galeriiSortate.length === 0 && (
                <div className="gallery-empty-state">Nu ai galerii create încă.</div>
              )}

              {!loading && galeriiSortate.map((g) => (
                <div key={g.id} className={`gallery-card ${!g.statusActiv ? 'inactive' : ''}`}>
                  <div className="gallery-card-top">
                    <h3>{g.nume}</h3>
                    <span className={`gallery-status-badge ${g.statusActiv ? 'active' : 'inactive'}`}>
                      {g.statusActiv ? 'Activă' : 'Dezactivată'}
                    </span>
                  </div>

                  <div className="gallery-meta">
                    <span className="gallery-label">Data</span>
                    <span>{g.dataEveniment || 'Fără dată'}</span>
                  </div>

                  <div className="gallery-meta">
                    <span className="gallery-label">Link</span>
                    {g.slug ? (
                      <>
                        <a
                          href={getShortLink(g)}
                          className="gallery-short-link"
                          target="_blank"
                          rel="noreferrer"
                        >
                          {getShortLink(g)}
                        </a>
                        <div className="gallery-link-actions">
                          <button
                            type="button"
                            className="btn-link-action"
                            onClick={() => handleOpenShortLink(g)}
                          >
                            Deschide
                          </button>
                          <button
                            type="button"
                            className="btn-link-action secondary"
                            onClick={() => handleCopyShortLink(g)}
                          >
                            {copiedLinkId === g.id ? 'Copiat!' : 'Copiază'}
                          </button>
                        </div>
                      </>
                    ) : (
                      <span className="gallery-short-link missing">Generez link...</span>
                    )}
                  </div>

                  <div className="gallery-info">
                    <div className="gallery-stats">
                      <span>📸 <strong>{g.poze || 0}</strong> poze</span>
                      <span>❤️ <strong>{g.favorite?.length || 0}</strong> selecții</span>
                    </div>
                    <div className="gallery-actions">
                      <button className="btn-manage" onClick={() => handleDeschideGalerie(g)}>
                        GESTIONEAZĂ
                      </button>
                      <button
                        className="btn-toggle"
                        onClick={() => updateDoc(doc(db, 'galerii', g.id), { statusActiv: !g.statusActiv })}
                      >
                        {g.statusActiv ? 'DEZACTIVEAZĂ' : 'ACTIVEAZĂ'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeMenu === 'settings' && (
          <div className="settings-content">
            <div className="settings-panel">
              <div className="settings-panel-header">
                <h2>Setări Profil Fotograf</h2>
                <p>Personalizează informațiile afișate pentru brandul tău.</p>
              </div>

              {loadingSetari ? (
                <div className="settings-loading">Se încarcă setările...</div>
              ) : (
                <form className="settings-form" onSubmit={handleSaveSetari}>
                  <div className="settings-field">
                    <label htmlFor="numeBrand">Nume Brand / Nume Fotograf</label>
                    <input
                      id="numeBrand"
                      type="text"
                      name="numeBrand"
                      value={setariForm.numeBrand}
                      onChange={handleSetariChange}
                      placeholder="Ex: Daniel Lapadus Photography"
                    />
                  </div>

                  <div className="settings-field">
                    <label htmlFor="website">Link Website / Portofoliu</label>
                    <input
                      id="website"
                      type="text"
                      name="website"
                      value={setariForm.website}
                      onChange={handleSetariChange}
                      placeholder="https://siteul-tau.ro"
                    />
                  </div>

                  <div className="settings-field">
                    <label htmlFor="instagram">Link Instagram</label>
                    <input
                      id="instagram"
                      type="text"
                      name="instagram"
                      value={setariForm.instagram}
                      onChange={handleSetariChange}
                      placeholder="https://instagram.com/contul_tau"
                    />
                  </div>

                  <div className="settings-actions">
                    <button type="submit" className="btn-save-settings" disabled={savingSetari}>
                      {savingSetari ? 'Se salvează...' : 'Salvează Setările'}
                    </button>

                    {statusSetari && (
                      <span className={`settings-feedback ${statusSetari === 'Salvat!' ? 'success' : 'error'}`}>
                        {statusSetari}
                      </span>
                    )}
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Dashboard
