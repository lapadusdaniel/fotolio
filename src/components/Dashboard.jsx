import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import imageCompression from 'browser-image-compression'
import './Dashboard.css'
import { auth, db } from '../firebase'
import { signOut } from 'firebase/auth'
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc, query, where, onSnapshot, updateDoc, Timestamp } from 'firebase/firestore'
import { uploadPoza, listPoze, getPozaUrl, deletePoza, deleteGalleryFolder } from '../r2'
import { useUserSubscription } from '../hooks/useUserSubscription'
import { 
  Check,
  Contact, 
  Instagram, 
  Mail, 
  MessageCircle, 
  CreditCard, 
  Trash2, 
  Layout, 
  BarChart3, 
  FileText, 
  Settings as SettingsIcon 
} from 'lucide-react'
import AdminGalleryTable from './AdminGalleryTable'
import GalleryDetailView from './GalleryDetailView'
import Settings from '../pages/Settings'
import SubscriptionSection from './SubscriptionSection'
import SiteEditor from './SiteEditor'

const SIDEBAR_TABS = [
  { key: 'galerii', label: 'Galerii', icon: Layout },
  { key: 'card', label: 'Card', icon: Contact },
  { key: 'trash', label: 'Coș de gunoi', icon: Trash2 },
  { key: 'site', label: 'Site-ul meu (Beta)', icon: Layout },
  { key: 'statistici', label: 'Statistici', icon: BarChart3 },
  { key: 'contracte', label: 'Contracte', icon: FileText },
  { key: 'abonament', label: 'Abonament', icon: CreditCard },
  { key: 'setari', label: 'Setări', icon: SettingsIcon }
]

function Dashboard({ user, onLogout, initialTab }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = location.pathname === '/settings' ? 'setari' : (searchParams.get('tab') || initialTab || 'galerii')
  const [galerii, setGalerii] = useState([])
  const [loading, setLoading] = useState(true)
  const [galerieActiva, setGalerieActiva] = useState(null)
  const [pozeGalerie, setPozeGalerie] = useState([])
  const [loadingPoze, setLoadingPoze] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false)

  const { userPlan, storageLimit, checkAccess } = useUserSubscription(user?.uid)

  // Show success modal when returning from Stripe with ?payment=success
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (params.get('payment') === 'success') {
      setShowPaymentSuccess(true)
      navigate(location.pathname, { replace: true })
    }
  }, [location.search, location.pathname, navigate])

  // Profile / Branding State
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

  // Auto-cleanup: șterge galeriile din coș mai vechi de 7 zile (R2 + Firestore)
  useEffect(() => {
    if (!user?.uid) return
    const run = async () => {
      try {
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
        const cutoff = Timestamp.fromDate(sevenDaysAgo)
        const q = query(
          collection(db, 'galerii'),
          where('userId', '==', user.uid),
          where('status', '==', 'trash'),
          where('deletedAt', '<', cutoff)
        )
        const snap = await getDocs(q)
        if (snap.empty) return
        const idToken = await auth.currentUser?.getIdToken()
        for (const d of snap.docs) {
          try {
            await deleteGalleryFolder(d.id, idToken)
            await deleteDoc(doc(db, 'galerii', d.id))
          } catch (e) {
            console.warn('Trash cleanup failed for gallery', d.id, e)
          }
        }
      } catch (e) {
        console.warn('Trash cleanup query failed', e)
      }
    }
    run()
  }, [user?.uid])

  // Real-time listener pentru galerii
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

  // Update galerie activă dacă se schimbă datele în Firebase
  useEffect(() => {
    if (galerieActiva && galerii.length) {
      const updated = galerii.find((g) => g.id === galerieActiva.id)
      if (updated) setGalerieActiva(updated)
    }
  }, [galerii])

  // Logica încărcare poze în galerie
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

  // Logica Upload (Original + Medium + Thumb)
  const handleUploadPoze = async (e) => {
    const files = Array.from(e.target.files)
    if (!files.length || !galerieActiva) return
    setUploading(true)
    setUploadProgress(0)
    const totalSteps = files.length * 3
    const reportProgress = (stepIndex, percent) => {
      setUploadProgress(Math.round(((stepIndex + percent / 100) / totalSteps) * 100))
    }
    try {
      const idToken = await auth.currentUser?.getIdToken()
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const baseName = `${Date.now()}-${i}-${(file.name || 'image').replace(/[^a-zA-Z0-9.-]/g, '_')}`
        const baseNameNoExt = baseName.replace(/\.[^.]+$/, '')
        const origPath = `galerii/${galerieActiva.id}/originals/${baseName}`
        const mediumPath = `galerii/${galerieActiva.id}/medium/${baseNameNoExt}.webp`
        const thumbPath = `galerii/${galerieActiva.id}/thumbnails/${baseNameNoExt}.webp`

        const [mediumFile, thumbFile] = await Promise.all([
          imageCompression(file, { maxWidthOrHeight: 1920, fileType: 'image/webp', initialQuality: 0.9 }),
          imageCompression(file, { maxWidthOrHeight: 800, fileType: 'image/webp', initialQuality: 0.8 })
        ])

        await Promise.all([
          uploadPoza(file, galerieActiva.id, user.uid, (p) => reportProgress(i * 3, p), origPath, idToken),
          uploadPoza(mediumFile, galerieActiva.id, user.uid, (p) => reportProgress(i * 3 + 1, p), mediumPath, idToken),
          uploadPoza(thumbFile, galerieActiva.id, user.uid, (p) => reportProgress(i * 3 + 2, p), thumbPath, idToken)
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
      const idToken = await auth.currentUser?.getIdToken()
      await deletePoza(pozaKey, idToken)
      setPozeGalerie((prev) => prev.filter((p) => p.key !== pozaKey))
    } catch (error) {
      console.error('Error:', error)
      alert('Eroare la ștergere!')
    }
  }

  // Management Galerii (Trash / Delete / Restore)
  const handleMoveToTrash = async (id) => {
    try {
      await updateDoc(doc(db, 'galerii', id), { status: 'trash', deletedAt: new Date() })
      if (galerieActiva?.id === id) {
        setGalerieActiva(null)
        setPozeGalerie([])
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const handleDeletePermanently = async (id) => {
    if (!window.confirm('Această acțiune va șterge definitiv toate fotografiile din stocarea Cloudflare și nu poate fi anulată. Ștergi definitiv?')) return
    try {
      const idToken = await auth.currentUser?.getIdToken()
      await deleteGalleryFolder(id, idToken)
      await deleteDoc(doc(db, 'galerii', id))
    } catch (error) {
      console.error('Error:', error)
      alert('Eroare la ștergere definitivă. Încearcă din nou.')
    }
  }

  const handleRestoreGalerie = async (id) => {
    try {
      await updateDoc(doc(db, 'galerii', id), { status: 'active' })
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const handlePreview = (galerie) => {
    const url = galerie?.slug
      ? `${window.location.origin}/${galerie.slug}`
      : `${window.location.origin}/gallery/${galerie.id}`
    window.open(url, '_blank')
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

  // Branding Card Logic
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
      await setDoc(profileRef(), { ...profileData, updatedAt: new Date() }, { merge: true })
      alert('Modificările au fost salvate.')
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setProfileSaving(false)
    }
  }

  const userInitial = (user?.name || 'U').charAt(0).toUpperCase()

  const renderSidebar = () => (
    <div className="dashboard-sidebar">
      <div className="sidebar-logo-area">
        <h1 className="dashboard-logo" onClick={() => {
          setGalerieActiva(null)
          if (location.pathname === '/settings') navigate('/dashboard?tab=galerii')
          else setSearchParams({ tab: 'galerii' })
        }}>
          Fotolio
        </h1>
      </div>
      {SIDEBAR_TABS.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          type="button"
          className={`dashboard-sidebar-btn ${activeTab === key ? 'active' : ''}`}
          onClick={() => {
            if (key === 'setari') navigate('/settings')
            else if (location.pathname === '/settings') navigate(`/dashboard?tab=${key}`)
            else setSearchParams({ tab: key })
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
    // Vizualizare poze într-o galerie specifică
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
          onBack={() => { setGalerieActiva(null); setPozeGalerie([]) }}
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
              <div className="dashboard-profile-info">
                <span className="dashboard-profile-name">{user?.name || 'Fotograf'}</span>
                <span className="dashboard-profile-email">{user?.email}</span>
              </div>
            </div>
            <button onClick={handleLogout} className="dashboard-logout-link">Ieșire</button>
          </div>
        </header>

        {/* Tab-uri Galerii / Coș */}
        {(activeTab === 'galerii' || activeTab === 'trash') && (
          <AdminGalleryTable
            user={user}
            galerii={galerii}
            loading={loading}
            activeTab={activeTab}
            userPlan={userPlan}
            storageLimit={storageLimit}
            onDeschideGalerie={handleDeschideGalerie}
            onMoveToTrash={handleMoveToTrash}
            onDeletePermanently={handleDeletePermanently}
            onRestore={handleRestoreGalerie}
            onPreview={handlePreview}
          />
        )}

        {/* Tab Branding / Card */}
        {activeTab === 'card' && (
          <div className="brand-card-container">
            <div className="brand-card-editor">
              <h2 className="brand-card-title">Identitate de brand</h2>
              {profileLoading ? (
                <p>Se încarcă...</p>
              ) : (
                <form onSubmit={saveProfileSettings} className="brand-card-form">
                  <div className="brand-card-form-group">
                    <label>Nume Brand</label>
                    <input
                      type="text"
                      value={profileData.numeBrand}
                      onChange={(e) => setProfileData(p => ({ ...p, numeBrand: e.target.value }))}
                      placeholder="Ex: Studio Foto XYZ"
                    />
                  </div>
                  <div className="brand-card-form-group">
                    <label>Slogan</label>
                    <input
                      type="text"
                      value={profileData.slogan}
                      onChange={(e) => setProfileData(p => ({ ...p, slogan: e.target.value }))}
                      placeholder="Ex: Fotografii care spun povești"
                    />
                  </div>
                  <div className="brand-card-form-group">
                    <label>WhatsApp / Instagram / Email</label>
                    <input
                      type="tel"
                      value={profileData.whatsapp}
                      onChange={(e) => setProfileData(p => ({ ...p, whatsapp: e.target.value }))}
                      placeholder="WhatsApp"
                    />
                    <input
                      type="text"
                      value={profileData.instagram}
                      onChange={(e) => setProfileData(p => ({ ...p, instagram: e.target.value }))}
                      placeholder="Instagram"
                    />
                    <input
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData(p => ({ ...p, email: e.target.value }))}
                      placeholder="Email de contact"
                    />
                  </div>
                  <button type="submit" className="btn-primary" disabled={profileSaving}>
                    {profileSaving ? 'Se salvează...' : 'Salvează modificările'}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Tab Site ── ADĂUGAT */}
        {activeTab === 'site' && (
          <SiteEditor user={user} userGalleries={galerii} />
        )}

        {/* Tab Setări Generale */}
        {activeTab === 'setari' && <Settings user={user} />}

        {/* Tab Abonament */}
        {activeTab === 'abonament' && (
          <div className="dashboard-subscription-wrap" style={{ width: '100%', padding: '20px 40px' }}>
            <SubscriptionSection user={user} userPlan={userPlan} storageLimit={storageLimit} checkAccess={checkAccess} />
          </div>
        )}

        {/* Placeholder pentru tab-uri în lucru */}
        {['statistici', 'contracte'].includes(activeTab) && (
          <div className="dashboard-tab-placeholder">
            Secțiunea {activeTabLabel} urmează să fie implementată.
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

      {showPaymentSuccess && (
        <div className="dashboard-payment-success-overlay" onClick={() => setShowPaymentSuccess(false)}>
          <div className="dashboard-payment-success-modal" onClick={(e) => e.stopPropagation()}>
            <div className="dashboard-payment-success-icon">
              <Check size={28} strokeWidth={2.5} />
            </div>
            <h3>Plata a fost primită</h3>
            <p>Contul tău a fost actualizat. Bine ai revenit în Fotolio.</p>
            <button type="button" onClick={() => setShowPaymentSuccess(false)}>
              Înțeles
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard