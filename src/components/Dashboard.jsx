import { useState, useEffect } from 'react'
import { auth, db } from '../firebase'
import { signOut } from 'firebase/auth'
import { collection, addDoc, deleteDoc, doc, query, where, onSnapshot } from 'firebase/firestore'
import {
  HardDrive,
  Eye,
  MessageSquare,
  BarChart3,
  Settings,
  LogOut,
  Plus,
  ImageIcon,
  Camera,
  Calendar,
  Pencil,
  Trash2,
  FolderOpen
} from 'lucide-react'
import './Dashboard.css'

function Dashboard({ user, onLogout }) {
  const [galerii, setGalerii] = useState([])
  const [showAddGalerie, setShowAddGalerie] = useState(false)
  const [numeGalerie, setNumeGalerie] = useState('')
  const [categorieGalerie, setCategorieGalerie] = useState('Nunți')
  const [loading, setLoading] = useState(true)
  const [activeNav, setActiveNav] = useState('drive')

  // Ascultă schimbări în galeriile user-ului
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

  const handleAddGalerie = async (e) => {
    e.preventDefault()
    if (!numeGalerie) {
      alert('Adaugă un nume pentru galerie!')
      return
    }

    try {
      await addDoc(collection(db, 'galerii'), {
        nume: numeGalerie,
        categoria: categorieGalerie,
        poze: 0,
        userId: user.uid,
        data: new Date().toISOString(),
        createdAt: new Date()
      })

      setNumeGalerie('')
      setShowAddGalerie(false)
      alert('Galerie adăugată! 🎉')
    } catch (error) {
      console.error('Error:', error)
      alert('Eroare la adăugare galerie!')
    }
  }

  const handleDeleteGalerie = async (id) => {
    if (window.confirm('Sigur vrei să ștergi această galerie?')) {
      try {
        await deleteDoc(doc(db, 'galerii', id))
      } catch (error) {
        console.error('Error:', error)
        alert('Eroare la ștergere!')
      }
    }
  }

  const handleLogout = async () => {
    if (window.confirm('Sigur vrei să te deconectezi?')) {
      try {
        await signOut(auth)
        onLogout()
      } catch (error) {
        console.error('Error:', error)
        alert('Eroare la deconectare!')
      }
    }
  }

  const navItems = [
    { id: 'drive', label: 'Drive', icon: HardDrive },
    { id: 'previews', label: 'Previews', icon: Eye },
    { id: 'reviews', label: 'Reviews', icon: MessageSquare },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ]

  const userInitial = user.name ? user.name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()

  const planLabel = user.plan === 'free' ? 'Free' : user.plan === 'pro' ? 'Pro' : 'Unlimited'

  return (
    <div className="dashboard-layout">
      {/* ---- SIDEBAR ---- */}
      <aside className="dashboard-sidebar">
        <div className="sidebar-logo">
          <h2>foto<span>lio</span></h2>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`sidebar-nav-item ${activeNav === item.id ? 'active' : ''}`}
              onClick={() => setActiveNav(item.id)}
            >
              <item.icon size={18} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar">{userInitial}</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user.name || user.email}</div>
              <div className="sidebar-user-plan">{planLabel} plan</div>
            </div>
          </div>
        </div>
      </aside>

      {/* ---- MAIN CONTENT ---- */}
      <main className="dashboard-main">
        {/* Header */}
        <header className="dashboard-header">
          <div className="header-greeting">
            <h1>Bun venit, {user.name || 'Fotograf'}!</h1>
            <p>{user.email}</p>
          </div>
          <button className="btn-logout" onClick={handleLogout}>
            <LogOut size={16} />
            Deconectare
          </button>
        </header>

        {/* Content */}
        <div className="dashboard-content">
          {/* Stats */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-card-label">Total Galerii</div>
              <div className="stat-card-value">{galerii.length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">Total Poze</div>
              <div className="stat-card-value">
                {galerii.reduce((sum, g) => sum + (g.poze || 0), 0)}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-card-label">Plan curent</div>
              <div className="stat-card-value accent">{planLabel}</div>
            </div>
          </div>

          {/* Section header */}
          <div className="section-header">
            <h2>Galeriile mele</h2>
            <button
              className="btn-add-gallery"
              onClick={() => setShowAddGalerie(!showAddGalerie)}
            >
              <Plus size={16} />
              {showAddGalerie ? 'Anulează' : 'Galerie nouă'}
            </button>
          </div>

          {/* Add gallery form */}
          {showAddGalerie && (
            <form onSubmit={handleAddGalerie} className="add-gallery-form">
              <div className="form-grid">
                <div className="form-group">
                  <label>Nume galerie</label>
                  <input
                    type="text"
                    value={numeGalerie}
                    onChange={(e) => setNumeGalerie(e.target.value)}
                    placeholder="Ex: Nuntă Ana & Mihai"
                  />
                </div>
                <div className="form-group">
                  <label>Categorie</label>
                  <select
                    value={categorieGalerie}
                    onChange={(e) => setCategorieGalerie(e.target.value)}
                  >
                    <option>Nunți</option>
                    <option>Botezuri</option>
                    <option>Corporate</option>
                    <option>Portret</option>
                    <option>Altele</option>
                  </select>
                </div>
                <button type="submit" className="btn-save">
                  Salvează
                </button>
              </div>
            </form>
          )}

          {/* Gallery grid */}
          <div className="gallery-grid">
            {loading ? (
              <div className="loading-state">
                <div className="loading-spinner" />
                <span>Se încarcă galeriile...</span>
              </div>
            ) : galerii.length === 0 ? (
              <div className="empty-state">
                <FolderOpen size={48} />
                <h3>Nicio galerie încă</h3>
                <p>Creează prima ta galerie pentru a începe să încarci fotografii.</p>
              </div>
            ) : (
              galerii.map((galerie) => (
                <div key={galerie.id} className="gallery-card">
                  {/* Thumbnail 16:9 */}
                  <div className="gallery-card-thumbnail">
                    {galerie.coverUrl ? (
                      <img src={galerie.coverUrl} alt={galerie.nume} />
                    ) : (
                      <div className="thumbnail-placeholder">
                        <ImageIcon size={36} />
                        <span>Fără cover</span>
                      </div>
                    )}
                    <div className="gallery-card-badge">{galerie.categoria}</div>
                  </div>

                  {/* Body */}
                  <div className="gallery-card-body">
                    <h3 className="gallery-card-name">{galerie.nume}</h3>
                    <div className="gallery-card-meta">
                      <span><Camera size={12} /> {galerie.poze || 0} poze</span>
                      <span>
                        <Calendar size={12} />{' '}
                        {galerie.data
                          ? new Date(galerie.data).toLocaleDateString('ro-RO')
                          : '—'}
                      </span>
                    </div>
                  </div>

                  {/* Footer actions */}
                  <div className="gallery-card-footer">
                    <button
                      className="btn-card-action"
                      onClick={() => alert('Funcție de editare - Coming soon!')}
                    >
                      <Pencil size={14} /> Editează
                    </button>
                    <button
                      className="btn-card-action delete"
                      onClick={() => handleDeleteGalerie(galerie.id)}
                    >
                      <Trash2 size={14} /> Șterge
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default Dashboard
