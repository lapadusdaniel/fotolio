import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import imageCompression from 'browser-image-compression'
import './Dashboard.css'
import { auth, db } from '../firebase'
import { signOut } from 'firebase/auth'
import { collection, deleteDoc, doc, getDoc, setDoc, query, where, onSnapshot, updateDoc } from 'firebase/firestore'
import { uploadPoza, listPoze, getPozaUrl, deletePoza } from '../r2'
import { Contact, Instagram, Mail, MessageCircle } from 'lucide-react'
import AdminGalleryTable from './AdminGalleryTable'
import GalleryDetailView from './GalleryDetailView'
import Settings from '../pages/Settings'

const SIDEBAR_TABS = [
  { key: 'galerii', label: 'Galerii' },
  { key: 'card', label: 'Card', icon: Contact },
  { key: 'trash', label: 'Coș de gunoi' },
  { key: 'site', label: 'Site-ul meu (Beta)' },
  { key: 'statistici', label: 'Statistici' },
  { key: 'contracte', label: 'Contracte' },
  { key: 'abonament', label: 'Abonament' },
  { key: 'setari', label: 'Setări' }
]

function Dashboard({ user, onLogout, initialTab }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [activeTab, setActiveTab] = useState(initialTab || (location.pathname === '/settings' ? 'setari' : 'galerii'))
  const [galerii, setGalerii] = useState([])
  const [loading, setLoading] = useState(true)
  const [galerieActiva, setGalerieActiva] = useState(null)
  const [pozeGalerie, setPozeGalerie] = useState([])
  const [loadingPoze, setLoadingPoze] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [profileData, setProfileData] = useState({
    numeBrand: '',
    slogan: '',
    whatsapp: '',
    instagram: '',
    email: '',
    website: ''
  })
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileSaving, setProfileSaving] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (!user?.uid) return
    const q = query(collection(db, 'galerii'), where('userId', '==', user.uid))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
      data.sort((a, b) => {
        const da = a.createdAt?.toDate?.() || (a.data ? new Date(a.data) : null) || new Date(0)
        const dbVal = b.createdAt?.toDate?.() || (b.data ? new Date(b.data) : null) || new Date(0)
        return dbVal.getTime() - da.getTime()
      })
      setGalerii(data)
      setLoading(false)
    })
    return () => unsubscribe()
  }, [user?.uid])

  useEffect(() => {
    if (location.pathname === '/settings') setActiveTab('setari')
  }, [location.pathname])

  useEffect(() => {
    if (galerieActiva && galerii.length) {
      const updated = galerii.find((g) => g.id === galerieActiva.id)
      if (updated) setGalerieActiva(updated)
    }
  }, [galerii])

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
          const url = await getPozaUrl(key, 'thumb')
          return {
            key,
            url,
            size: poza.size ?? poza.Size,
            lastModified: poza.lastModified ?? poza.uploaded ?? poza.LastModified
          }
        })
      )
      setPozeGalerie(pozeWithUrlsRaw.filter(Boolean))
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
    const totalSteps = files.length * 2
    const reportProgress = (stepIndex, percent) => {
      setUploadProgress(Math.round(((stepIndex + percent / 100) / totalSteps) * 100))
    }
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const baseName = `${Date.now()}-${i}-${(file.name || 'image').replace(/[^a-zA-Z0-9.-]/g, '_')}`
        const origPath = `galerii/${galerieActiva.id}/originals/${baseName}`
        const thumbPath = `galerii/${galerieActiva.id}/thumbnails/${baseName.replace(/\.[^.]+$/, '')}.webp`
        const thumbFile = await imageCompression(file, { maxSizeMB: 0.1, maxWidthOrHeight: 800, useWebWorker: true, fileType: 'image/webp' })
        await Promise.all([
          uploadPoza(file, galerieActiva.id, user.uid, (p) => reportProgress(i * 2, p), origPath),
          uploadPoza(thumbFile, galerieActiva.id, user.uid, (p) => reportProgress(i * 2 + 1, p), thumbPath)
        ])
      }
      await handleDeschideGalerie(galerieActiva)
      await updateDoc(doc(db, 'galerii', galerieActiva.id), { poze: pozeGalerie.length + files.length })
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
      setPozeGalerie((prev) => prev.filter((p) => p.key !== pozaKey))
    } catch (error) {
      console.error('Error:', error)
      alert('Eroare la ștergere!')
    }
  }

  const handleMoveToTrash = async (id) => {
    try {
      await updateDoc(doc(db, 'galerii', id), { status: 'trash', deletedAt: new Date() })
      if (galerieActiva?.id === id) {
        setGalerieActiva(null)
        setPozeGalerie([])
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Eroare la ștergere!')
    }
  }

  const handleDeletePermanently = async (id) => {
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

  const handleRestoreGalerie = async (id) => {
    try {
      await updateDoc(doc(db, 'galerii', id), { status: 'active' })
    } catch (error) {
      console.error('Error:', error)
      alert('Eroare la restaurare!')
    }
  }

  const handlePreview = (galerie) => {
    const url = galerie?.slug
      ? `${window.location.origin}/${galerie.slug}`
      : galerie?.id
        ? `${window.location.origin}/gallery/${galerie.id}`
        : ''
    if (url) window.open(url, '_blank')
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

  const profileRef = () => doc(db, 'users', user.uid, 'settings', 'profile')

  useEffect(() => {
    if (!user?.uid || activeTab !== 'card') return
    setProfileLoading(true)
    getDoc(profileRef())
      .then((snap) => {
        if (snap.exists()) {
          const d = snap.data()
          setProfileData({
            numeBrand: d.numeBrand ?? '',
            slogan: d.slogan ?? '',
            whatsapp: d.whatsapp ?? d.telefon ?? '',
            instagram: d.instagram ?? '',
            email: d.email ?? '',
            website: d.website ?? ''
          })
        }
        setProfileLoading(false)
      })
      .catch(() => setProfileLoading(false))
  }, [user?.uid, activeTab])

  const saveProfileSettings = async (e) => {
    e?.preventDefault?.()
    setProfileSaving(true)
    try {
      await setDoc(
        profileRef(),
        {
          numeBrand: profileData.numeBrand.trim(),
          slogan: profileData.slogan.trim(),
          whatsapp: profileData.whatsapp.trim(),
          instagram: profileData.instagram.trim(),
          email: profileData.email.trim(),
          website: profileData.website.trim(),
          updatedAt: new Date()
        },
        { merge: true }
      )
      alert('Modificările au fost salvate.')
    } catch (err) {
      console.error('Error:', err)
      alert('Eroare la salvare.')
    } finally {
      setProfileSaving(false)
    }
  }

  const cardLinkSlug = profileData.numeBrand
    ? profileData.numeBrand.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '') || 'brand'
    : 'brand-ul-tau'
  const cardLinkUrl = `https://fotolio.app/${cardLinkSlug}`

  const handleCopyCardLink = () => {
    navigator.clipboard?.writeText(cardLinkUrl).then(() => alert('Link copiat!'))
  }

  const userInitial = (user?.name || 'U').charAt(0).toUpperCase()

  const renderSidebar = () => (
    <div className="dashboard-sidebar">
      <div className="sidebar-logo-area">
        <h1
          className="dashboard-logo"
          onClick={() => {
            setGalerieActiva(null)
            setActiveTab('galerii')
          }}
        >
          Fotolio
        </h1>
      </div>
      {SIDEBAR_TABS.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          type="button"
          className={`dashboard-sidebar-btn ${activeTab === key ? 'active' : ''}`}
          onClick={() => {
            setActiveTab(key)
            if (key === 'setari') navigate('/settings')
            else if (location.pathname === '/settings') navigate('/dashboard')
          }}
        >
          <span className="dashboard-sidebar-btn-indicator" />
          {Icon && <Icon size={18} className="dashboard-sidebar-btn-icon" />}
          {label}
        </button>
      ))}
    </div>
  )

  const renderMainContent = () => {
    if (galerieActiva) {
      return (
        <GalleryDetailView
          galerie={galerieActiva}
          pozeGalerie={pozeGalerie}
          loadingPoze={loadingPoze}
          user={user}
          uploading={uploading}
          uploadProgress={uploadProgress}
          fileInputRef={fileInputRef}
          onBack={() => {
            setGalerieActiva(null)
            setPozeGalerie([])
          }}
          onUploadPoze={handleUploadPoze}
          onDeletePoza={handleDeletePoza}
        />
      )
    }

    const activeTabLabel = SIDEBAR_TABS.find((t) => t.key === activeTab)?.label ?? activeTab

    return (
      <>
        <header className="dashboard-topbar">
          <div className="dashboard-topbar-right">
            <div className="dashboard-profile">
              <div className="dashboard-avatar-wrap" title={user?.email}>
                <div className="dashboard-avatar">{userInitial}</div>
              </div>
              <span className="dashboard-profile-name">{user?.name || 'Fotograf'}</span>
              <span className="dashboard-profile-email">{user?.email}</span>
            </div>
            <button onClick={handleLogout} className="dashboard-logout-link">
              Ieșire
            </button>
          </div>
        </header>

        {(activeTab === 'galerii' || activeTab === 'trash') && (
          <AdminGalleryTable
            user={user}
            galerii={galerii}
            loading={loading}
            activeTab={activeTab}
            onDeschideGalerie={handleDeschideGalerie}
            onMoveToTrash={handleMoveToTrash}
            onDeletePermanently={handleDeletePermanently}
            onRestore={handleRestoreGalerie}
            onPreview={handlePreview}
          />
        )}

        {activeTab === 'card' && (
          <div className="brand-card-container">
            <div className="brand-card-editor">
              <h2 className="brand-card-title">Identitate de brand</h2>
              {profileLoading ? (
                <p className="brand-card-loading">Se încarcă...</p>
              ) : (
                <form onSubmit={saveProfileSettings} className="brand-card-form">
                  <div className="brand-card-form-group">
                    <label>Nume</label>
                    <input
                      type="text"
                      value={profileData.numeBrand}
                      onChange={(e) => setProfileData((p) => ({ ...p, numeBrand: e.target.value }))}
                      placeholder="Ex: Studio Foto XYZ"
                      className="brand-card-input"
                    />
                  </div>
                  <div className="brand-card-form-group">
                    <label>Slogan</label>
                    <input
                      type="text"
                      value={profileData.slogan}
                      onChange={(e) => setProfileData((p) => ({ ...p, slogan: e.target.value }))}
                      placeholder="Ex: Fotografii care spun povesti"
                      className="brand-card-input"
                    />
                  </div>
                  <div className="brand-card-form-group">
                    <label>Contact</label>
                    <input
                      type="tel"
                      value={profileData.whatsapp}
                      onChange={(e) => setProfileData((p) => ({ ...p, whatsapp: e.target.value }))}
                      placeholder="WhatsApp: +40 712 345 678"
                      className="brand-card-input"
                    />
                    <input
                      type="text"
                      value={profileData.instagram}
                      onChange={(e) => setProfileData((p) => ({ ...p, instagram: e.target.value }))}
                      placeholder="Instagram: @fotograful_meu"
                      className="brand-card-input"
                    />
                    <input
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData((p) => ({ ...p, email: e.target.value }))}
                      placeholder="Email: contact@studiu.ro"
                      className="brand-card-input"
                    />
                    <input
                      type="url"
                      value={profileData.website}
                      onChange={(e) => setProfileData((p) => ({ ...p, website: e.target.value }))}
                      placeholder="Website: www.exemplu.ro"
                      className="brand-card-input"
                    />
                  </div>
                  <button type="submit" className="btn-primary brand-card-save" disabled={profileSaving}>
                    {profileSaving ? 'Se salvează...' : 'Salvează în Cloud'}
                  </button>
                </form>
              )}
            </div>
            <div className="brand-card-preview-wrap">
              <div className="brand-card-preview">
                <div className="brand-card-avatar" />
                <h3 className="brand-card-preview-name">{profileData.numeBrand || 'Nume Brand'}</h3>
                {profileData.slogan && <p className="brand-card-preview-slogan">{profileData.slogan}</p>}
                <div className="brand-card-preview-social">
                  {profileData.whatsapp && (
                    <a
                      href={`https://wa.me/${profileData.whatsapp.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="brand-card-social-btn"
                      title="WhatsApp"
                    >
                      <MessageCircle size={18} />
                    </a>
                  )}
                  {profileData.instagram && (
                    <a
                      href={`https://instagram.com/${profileData.instagram.replace(/^@/, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="brand-card-social-btn"
                      title="Instagram"
                    >
                      <Instagram size={18} />
                    </a>
                  )}
                  {profileData.email && (
                    <a href={`mailto:${profileData.email}`} className="brand-card-social-btn" title="Email">
                      <Mail size={18} />
                    </a>
                  )}
                  {!profileData.whatsapp && !profileData.instagram && !profileData.email && (
                    <span className="brand-card-social-empty">Adaugă contacte</span>
                  )}
                </div>
              </div>
              <button type="button" onClick={handleCopyCardLink} className="brand-card-copy-link">
                Copiază link-ul cărții de vizită
              </button>
            </div>
          </div>
        )}

        {activeTab === 'setari' && (
          <Settings user={user} />
        )}

        {activeTab !== 'galerii' && activeTab !== 'trash' && activeTab !== 'card' && activeTab !== 'setari' && (
          <div className="dashboard-tab-placeholder">
            Secțiunea {activeTabLabel} urmează să fie implementată
          </div>
        )}
      </>
    )
  }

  return (
    <div className="dashboard-layout">
      {renderSidebar()}
      <div className={`dashboard-main-content ${!galerieActiva ? 'page-content dashboard-app' : ''}`}>
        {renderMainContent()}
      </div>
    </div>
  )
}

export default Dashboard
