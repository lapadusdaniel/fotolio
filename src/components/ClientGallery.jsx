import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Lightbox, { useLightboxState } from 'yet-another-react-lightbox';
import 'yet-another-react-lightbox/styles.css';
import { Zoom, Thumbnails } from 'yet-another-react-lightbox/plugins';
import 'yet-another-react-lightbox/plugins/thumbnails.css';
import { db } from '../firebase';
import { collection, query, where, getDocs, getDoc, updateDoc, doc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { listPoze, getPozaUrl, getBrandingUrl } from '../r2';
import Masonry from 'react-masonry-css';
import { ChevronDown, Share2, Download, Heart, Clock, Instagram, MessageCircle } from 'lucide-react';

const BATCH_SIZE = 24;
const INITIAL_VISIBLE = 24;

/** URL cache: avoids refetching the same image. Shared across components. */
const urlCache = new Map();

/** Fetches thumb URL on mount, uses cache. Renders placeholder until loaded. */
function LazyGalleryImage({ pozaKey, index, isFav, onFavoriteClick, onClick, accentColor }) {
  const [url, setUrl] = useState(() => urlCache.get(`thumb:${pozaKey}`) || null);

  useEffect(() => {
    if (url) return;
    let cancelled = false;
    getPozaUrl(pozaKey, 'thumb').then((u) => {
      if (!cancelled) {
        urlCache.set(`thumb:${pozaKey}`, u);
        setUrl(u);
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [pozaKey]);

  const handleDownload = useCallback(() => {
    const cached = urlCache.get(`original:${pozaKey}`);
    if (cached) {
      const link = document.createElement('a');
      link.href = cached;
      link.download = pozaKey.split('/').pop();
      link.click();
      return;
    }
    getPozaUrl(pozaKey, 'original').then((u) => {
      urlCache.set(`original:${pozaKey}`, u);
      const link = document.createElement('a');
      link.href = u;
      link.download = pozaKey.split('/').pop();
      link.click();
    });
  }, [pozaKey]);

  return (
    <div className="gallery-item" style={{ marginBottom: '20px', position: 'relative' }}>
      <div
        className="gallery-item-image-wrap"
        style={{
          aspectRatio: '1 / 1',
          minHeight: 200,
          background: '#e8e8e8',
          overflow: 'hidden',
          position: 'relative'
        }}
      >
        {url ? (
          <img
            src={url}
            alt=""
            style={{
              position: 'absolute', inset: 0,
              width: '100%', height: '100%',
              objectFit: 'cover',
              display: 'block',
              cursor: 'pointer',
              transition: 'opacity 0.2s ease'
            }}
            loading="lazy"
            onClick={onClick}
          />
        ) : (
          <div
            aria-hidden
            style={{ position: 'absolute', inset: 0, background: '#e8e8e8' }}
          />
        )}
      </div>
      <div className="gallery-item-overlay" style={{ pointerEvents: 'none' }}>
        <div className="gallery-item-actions" style={{ pointerEvents: 'auto' }}>
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onFavoriteClick(pozaKey); }}
            className="gallery-action-btn gallery-action-heart"
            aria-label="Favorite"
            style={{ color: isFav ? (accentColor || '#e74c3c') : '#444' }}
          >
            <Heart size={24} fill={isFav ? (accentColor || '#e74c3c') : 'none'} />
          </button>
          <button
            type="button"
            className="gallery-action-btn gallery-action-download"
            aria-label="Download"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDownload(); }}
            style={{ color: accentColor || '#333' }}
          >
            <Download size={24} />
          </button>
        </div>
      </div>
    </div>
  );
}

const normalizeUrl = (url) => {
  if (!url || typeof url !== 'string') return '#';
  const trimmed = url.trim();
  if (!trimmed) return '#';
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
};

/** Lightbox toolbar: Favorite button - uses currentIndex to identify active slide */
function LightboxFavoriteButton({ galerie, pozeAfisate, onFavoriteClick, accentColor }) {
  const { currentIndex } = useLightboxState();
  const poza = pozeAfisate[currentIndex];
  const isFav = poza && galerie?.favorite?.includes(poza.key);
  const heartColor = accentColor || '#e74c3c';
  if (!poza) return null;
  return (
    <button
      type="button"
      className="yarl__button"
      onClick={() => onFavoriteClick(poza.key)}
      aria-label="Favorite"
      style={{ color: isFav ? heartColor : 'rgba(255,255,255,0.9)', background: 'none', border: 'none', cursor: 'pointer', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <Heart size={22} fill={isFav ? heartColor : 'none'} strokeWidth={1.5} />
    </button>
  );
}

/** Lightbox toolbar: Selection counter - shows fav count, optionally with limit badge */
function LightboxSelectionCounter({ galerie, accentColor }) {
  const count = galerie?.favorite?.length ?? 0;
  const limit = galerie?.limitSelectie ?? galerie?.maxSelectie;
  const limitColor = accentColor || 'rgba(231,76,60,0.9)';
  return (
    <div
      key="lightbox-selection-counter"
      style={{
        display: 'flex', alignItems: 'center', padding: '8px 12px',
        color: 'rgba(255,255,255,0.95)', fontSize: '14px', fontWeight: 600,
        marginRight: 'auto'
      }}
    >
      {limit != null ? (
        <span style={{
          background: count >= limit ? limitColor : 'rgba(255,255,255,0.2)',
          padding: '4px 10px', borderRadius: '8px',
          border: '1px solid rgba(255,255,255,0.3)'
        }}>
          {count} / {limit}
        </span>
      ) : (
        <span>{galerie?.numeSelectieClient || 'Selecție'}: {count} poze</span>
      )}
    </div>
  );
}

/** Lightbox toolbar: Download button - downloads the current slide */
function LightboxDownloadButton({ pozeAfisate, originalUrls }) {
  const { currentIndex } = useLightboxState();
  const poza = pozeAfisate[currentIndex];
  if (!poza) return null;
  const getUrl = () => originalUrls?.[poza.key] || urlCache.get(`original:${poza.key}`);
  return (
    <button
      type="button"
      className="yarl__button"
      onClick={() => {
        let href = getUrl();
        if (href) {
          const link = document.createElement('a');
          link.href = href;
          link.download = poza.key?.split('/').pop() || 'image';
          link.click();
        } else {
          getPozaUrl(poza.key, 'original').then((u) => {
            urlCache.set(`original:${poza.key}`, u);
            const link = document.createElement('a');
            link.href = u;
            link.download = poza.key?.split('/').pop() || 'image';
            link.click();
          });
        }
      }}
      aria-label="Download"
      style={{ color: 'rgba(255,255,255,0.9)', background: 'none', border: 'none', cursor: 'pointer', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <Download size={22} strokeWidth={1.5} />
    </button>
  );
}

const ClientGallery = () => {
  const { slug, id: galleryId } = useParams();
  const navigate = useNavigate();

  // Redirect home if neither slug nor galleryId (invalid route state)
  useEffect(() => {
    if (!slug && !galleryId) {
      navigate('/', { replace: true });
    }
  }, [slug, galleryId, navigate]);

  // --- STATE ---
  const [galerie, setGalerie] = useState(null);
  const [poze, setPoze] = useState([]);
  const [coverThumbUrl, setCoverThumbUrl] = useState(null);
  const [coverOriginalUrl, setCoverOriginalUrl] = useState(null);
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);
  const [lightboxOriginalUrls, setLightboxOriginalUrls] = useState({});
  const [loading, setLoading] = useState(true);
  const [eroare, setEroare] = useState(null);
  const loadMoreRef = useRef(null);
  
  // UX State
  const [coverVisible, setCoverVisible] = useState(true);
  const [showNameModal, setShowNameModal] = useState(false);
  const [nameInputValue, setNameInputValue] = useState('');
  const [selectionTitleInputValue, setSelectionTitleInputValue] = useState('');
  const [pendingFavAction, setPendingFavAction] = useState(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [countPop, setCountPop] = useState(false);
  
  // Date Client & Filtre
  const [numeSelectie, setNumeSelectie] = useState(localStorage.getItem('fotolio_nume_client') || '');
  const [doarFavorite, setDoarFavorite] = useState(false);
  const [downloadingAll, setDownloadingAll] = useState(false);
  
  const [profile, setProfile] = useState({
    brandName: 'My Gallery',
    logoUrl: '',
    instagramUrl: '',
    whatsappNumber: '',
    websiteUrl: '',
    accentColor: '#000000',
    logoPreviewUrl: null
  });

  const contentRef = useRef(null);

  // Helper pentru formatarea datei de expirare (ca în wfolio)
  const formatDate = (isoString) => {
    if (!isoString) return null;
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  // --- 1. ÎNCĂRCARE DATE ---
  useEffect(() => {
    const fetchDate = async () => {
      try {
        let dateGal;
        if (galleryId) {
          const docSnap = await getDoc(doc(db, 'galerii', galleryId));
          if (!docSnap.exists()) {
            setEroare('Galeria nu a fost găsită.');
            setLoading(false);
            return;
          }
          dateGal = { id: docSnap.id, ...docSnap.data() };
        } else {
          const q = query(collection(db, 'galerii'), where('slug', '==', slug));
          const querySnapshot = await getDocs(q);
          if (querySnapshot.empty) {
            setEroare('Galeria nu a fost găsită.');
            setLoading(false);
            return;
          }
          const docSnap = querySnapshot.docs[0];
          dateGal = { id: docSnap.id, ...docSnap.data() };
        }

        // Verificări
        const acum = new Date();
        if (dateGal.status === 'trash') throw new Error('Această galerie a fost ștearsă.');
        if (!dateGal.statusActiv) throw new Error('Această galerie este inactivă.');
        if (dateGal.dataExpirare && new Date(dateGal.dataExpirare) < acum) throw new Error('Termenul galeriei a expirat.');

        setGalerie(dateGal);

        if (dateGal.userId) {
          try {
            const snap = await getDoc(doc(db, 'profiles', dateGal.userId));
            if (snap.exists()) {
              const d = snap.data();
              const logoPath = d.logoUrl;
              let logoPreviewUrl = null;
              if (logoPath) {
                try {
                  logoPreviewUrl = await getBrandingUrl(logoPath);
                } catch { /* ignore */ }
              }
              setProfile({
                brandName: d.brandName || 'My Gallery',
                logoUrl: d.logoUrl || '',
                instagramUrl: d.instagramUrl || '',
                whatsappNumber: d.whatsappNumber || '',
                websiteUrl: d.websiteUrl || '',
                accentColor: d.accentColor || '#000000',
                logoPreviewUrl
              });
            } else {
              const legacySnap = await getDoc(doc(db, 'setariFotografi', dateGal.userId));
              if (legacySnap.exists()) {
                const d = legacySnap.data();
                setProfile((p) => ({
                  ...p,
                  brandName: d.numeBrand || p.brandName,
                  instagramUrl: d.instagram || '',
                  websiteUrl: d.website || ''
                }));
              }
            }
          } catch(e) { console.error(e); }
        }

        const pozeRaw = await listPoze(dateGal.id, dateGal.userId);
        const pozeKeys = pozeRaw
          .map((p) => ({ key: p.key || p.Key, size: p.size }))
          .filter((p) => p.key);
        setPoze(pozeKeys);

        if (pozeKeys[0]) {
          const coverKey = pozeKeys[0].key;
          getPozaUrl(coverKey, 'thumb')
            .then((url) => {
              setCoverThumbUrl(url);
              urlCache.set(`thumb:${coverKey}`, url);
            })
            .catch(() => {});
        }
        
      } catch (err) {
        setEroare(err.message || 'Eroare la încărcare.');
      } finally {
        setLoading(false);
      }
    };
    if (slug || galleryId) fetchDate();
  }, [slug, galleryId]);

  const pozeAfisate = galerie ? (doarFavorite ? poze.filter((p) => galerie.favorite?.includes(p.key)) : poze) : [];

  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE);
  }, [doarFavorite]);

  useEffect(() => {
    const coverKey = poze[0]?.key;
    if (!coverKey || urlCache.get(`original:${coverKey}`)) return;
    getPozaUrl(coverKey, 'original').then((url) => {
      urlCache.set(`original:${coverKey}`, url);
      setCoverOriginalUrl(url);
    }).catch(() => {});
  }, [poze]);

  useEffect(() => {
    if (galerie) {
        const brand = profile.brandName || 'My Gallery';
        document.title = `${galerie.nume} | ${brand}`;
    }
  }, [galerie, profile.brandName]);

  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el || pozeAfisate.length === 0) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + BATCH_SIZE, pozeAfisate.length));
        }
      },
      { rootMargin: '200px', threshold: 0 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [pozeAfisate.length]);

  useEffect(() => {
    if (!lightboxOpen || !pozeAfisate.length) return;
    const indices = [lightboxIndex, lightboxIndex - 1, lightboxIndex + 1].filter((i) => i >= 0 && i < pozeAfisate.length);
    indices.forEach((i) => {
      const key = pozeAfisate[i].key;
      if (!urlCache.get(`original:${key}`)) {
        getPozaUrl(key, 'original').then((url) => {
          urlCache.set(`original:${key}`, url);
          setLightboxOriginalUrls((prev) => ({ ...prev, [key]: url }));
        }).catch(() => {});
      }
      if (!urlCache.get(`thumb:${key}`)) {
        getPozaUrl(key, 'thumb').then((url) => urlCache.set(`thumb:${key}`, url)).catch(() => {});
      }
    });
  }, [lightboxOpen, lightboxIndex, pozeAfisate]);

  // --- 2. ACȚIUNI UX ---

  const handleEnterGallery = () => {
    setCoverVisible(false);
    setTimeout(() => {
        contentRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: galerie?.nume, url: window.location.href });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        alert('Link copiat!');
      }
    } catch (err) { console.log('Share canceled'); }
  };

  // --- 3. FAVORITE LOGIC ---

  const handleFavoriteClick = (pozaKey) => {
    if (!numeSelectie) {
      setPendingFavAction(pozaKey);
      setShowNameModal(true);
    } else {
      executeFavoriteToggle(pozaKey, numeSelectie);
    }
  };

  const handleSaveName = async () => {
    if (!nameInputValue.trim()) return;
    const cleanName = nameInputValue.trim();
    localStorage.setItem('fotolio_nume_client', cleanName);
    setNumeSelectie(cleanName);
    setShowNameModal(false);

    const titleToSave = selectionTitleInputValue.trim() || 'Selecție';
    if (!galerie?.numeSelectieClient && titleToSave) {
      try {
        await updateDoc(doc(db, 'galerii', galerie.id), { numeSelectieClient: titleToSave });
        setGalerie(prev => ({ ...prev, numeSelectieClient: titleToSave }));
      } catch (e) { console.error(e); }
    }
    setSelectionTitleInputValue('');

    if (pendingFavAction) {
      executeFavoriteToggle(pendingFavAction, cleanName);
      setPendingFavAction(null);
    }
  };

  const executeFavoriteToggle = async (pozaKey, numeClient) => {
    const galerieRef = doc(db, 'galerii', galerie.id);
    const isFav = galerie.favorite?.includes(pozaKey);
    try {
      if (isFav) {
        await updateDoc(galerieRef, { favorite: arrayRemove(pozaKey) });
        setGalerie(prev => ({ ...prev, favorite: prev.favorite.filter(k => k !== pozaKey) }));
      } else {
        await updateDoc(galerieRef, { 
            favorite: arrayUnion(pozaKey),
            [`selectii.${numeClient}`]: arrayUnion(pozaKey) 
        });
        setGalerie(prev => ({ ...prev, favorite: [...(prev.favorite || []), pozaKey] }));
        setCountPop(true);
        setTimeout(() => setCountPop(false), 450);
      }
    } catch (e) { console.error(e); }
  };

  // --- 4. DOWNLOAD LOGIC ---

  const handleDownload = async () => {
    const targets = doarFavorite ? poze.filter(p => galerie.favorite?.includes(p.key)) : poze;
    if (!window.confirm(`Descarci ${targets.length} fotografii?`)) return;
    setDownloadingAll(true);
    for (const p of targets) {
      try {
        let href = urlCache.get(`original:${p.key}`);
        if (!href) href = await getPozaUrl(p.key, 'original');
        if (href) urlCache.set(`original:${p.key}`, href);
        const link = document.createElement('a');
        link.href = href;
        link.download = p.key.split('/').pop();
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        await new Promise(r => setTimeout(r, 600));
      } catch (e) { console.error(e); }
    }
    setDownloadingAll(false);
  };

  // --- RENDER ---
  // Safety: only show loader until loading is false AND galerie exists
  if (!slug && !galleryId) return null; // Redirecting home
  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', color: '#666' }}>
        Loading...
      </div>
    );
  }
  if (eroare) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <h3>{eroare}</h3>
        <button onClick={() => navigate('/')}>Acasă</button>
      </div>
    );
  }
  if (!galerie) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', color: '#666' }}>
        Loading...
      </div>
    );
  }

  const coverImageUrl = galerie.coverUrl || coverOriginalUrl || coverThumbUrl;
  const coverIsBlurred = !galerie.coverUrl && coverThumbUrl && !coverOriginalUrl;
  const pozeVizibile = pozeAfisate.slice(0, visibleCount);
  const dataExpirareText = formatDate(galerie.dataExpirare);
  
  return (
    <div style={{ fontFamily: '"Inter", sans-serif', background: '#fff', minHeight: '100vh', overflowX: 'hidden', color: '#333' }}>
      
      {/* --- COVER SECTION (blur-up: thumb → original) --- */}
      <div style={{
        position: 'fixed', top: 0, left: 0, width: '100%', height: '100vh', zIndex: 50,
        overflow: 'hidden',
        transition: 'transform 0.8s cubic-bezier(0.7, 0, 0.3, 1), opacity 0.8s ease',
        transform: coverVisible ? 'translateY(0)' : 'translateY(-100%)',
        opacity: coverVisible ? 1 : 0,
        pointerEvents: coverVisible ? 'auto' : 'none'
      }}>
        {coverImageUrl ? (
          <img
            src={coverImageUrl}
            alt=""
            fetchPriority="high"
            style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%',
              objectFit: 'cover', objectPosition: 'center',
              filter: coverIsBlurred ? 'blur(10px)' : 'none',
              transition: 'filter 0.5s ease-in-out'
            }}
          />
        ) : (
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' }} />
        )}
        <div style={{
            position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.7))',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end',
            paddingBottom: '10vh', color: 'white', textAlign: 'center'
        }}>
            {profile.logoPreviewUrl ? (
              <img src={profile.logoPreviewUrl} alt="" style={{ height: 48, maxWidth: 180, objectFit: 'contain', marginBottom: 12 }} />
            ) : (
              <p style={{ textTransform: 'uppercase', letterSpacing: '3px', fontSize: '0.9rem', opacity: 0.9, marginBottom: '10px' }}>
                {profile.brandName || 'My Gallery'}
              </p>
            )}
            <h1 style={{ fontSize: 'clamp(2.5rem, 6vw, 5rem)', margin: '0 0 30px 0', fontFamily: '"Playfair Display", serif', fontWeight: 400 }}>
                {galerie.nume}
            </h1>
            <button onClick={handleEnterGallery} style={{
                background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(5px)',
                border: '1px solid rgba(255,255,255,0.4)', color: '#fff',
                padding: '12px 30px', borderRadius: '30px',
                fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px',
                transition: 'all 0.3s'
            }}>
                Deschide Galeria <ChevronDown size={18} />
            </button>
        </div>
      </div>

      {/* --- MAIN CONTENT --- */}
      <div ref={contentRef} style={{ opacity: coverVisible ? 0 : 1, transition: 'opacity 1s ease 0.5s', paddingTop: '0px' }}>
        
        {/* === STICKY TOOLBAR (Wfolio Style) === */}
        <div style={{
            position: 'sticky', top: 0, zIndex: 40,
            background: 'rgba(255,255,255,0.98)', 
            borderBottom: '1px solid #f0f0f0', padding: '12px 30px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            fontSize: '14px', flexWrap: 'wrap', gap: '15px'
        }}>
            {/* Stânga: Selection counter (prominent) */}
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                <button 
                    onClick={() => setDoarFavorite(!doarFavorite)}
                    style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: doarFavorite ? (profile.accentColor || '#e74c3c') : '#444', 
                        display: 'flex', alignItems: 'center', gap: '10px',
                        fontSize: '15px', fontWeight: 600
                    }}
                >
                    <Heart size={20} fill={doarFavorite ? (profile.accentColor || '#e74c3c') : 'none'} />
                    <span className={countPop ? 'selection-counter-pop' : ''} style={{ display: 'inline-flex', alignItems: 'center' }}>
                        {galerie.limitSelectie != null || galerie.maxSelectie != null ? (
                            <span style={{
                                background: (galerie.favorite?.length ?? 0) >= (galerie.limitSelectie ?? galerie.maxSelectie) ? (profile.accentColor || '#e74c3c') : '#f0f0f0',
                                color: (galerie.favorite?.length ?? 0) >= (galerie.limitSelectie ?? galerie.maxSelectie) ? '#fff' : '#333',
                                padding: '4px 12px', borderRadius: '10px',
                                fontSize: '14px', fontWeight: 700
                            }}>
                                {galerie.favorite?.length ?? 0} / {galerie.limitSelectie ?? galerie.maxSelectie}
                            </span>
                        ) : (
                            <>{galerie.numeSelectieClient || 'Selecție'}: {galerie.favorite?.length ?? 0} poze</>
                        )}
                    </span>
                </button>
            </div>
            
            {/* Dreapta: Actions */}
            <div style={{display: 'flex', alignItems: 'center', gap: '25px', marginLeft: 'auto'}}>

                {/* Share */}
                <button 
                  onClick={handleShare}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: '#444', display: 'flex', alignItems: 'center', gap: '8px',
                    fontSize: '14px', fontWeight: 500
                  }}
                >
                  <Share2 size={18} />
                  <span>Share</span>
                </button>

                {/* Expires - Info only */}
                {dataExpirareText && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#888' }}>
                         <Clock size={16} />
                         <span>Expires on {dataExpirareText}</span>
                    </div>
                )}
                
                {/* Download - Primary Button */}
                <button 
                    onClick={handleDownload}
                    disabled={downloadingAll}
                    style={{
                        background: profile.accentColor || '#fff', color: profile.accentColor ? '#fff' : '#111', 
                        border: `1px solid ${profile.accentColor || '#ddd'}`, borderRadius: '6px',
                        padding: '8px 16px', cursor: 'pointer', 
                        fontSize: '14px', fontWeight: 600,
                        display: 'flex', alignItems: 'center', gap: '8px',
                        transition: 'all 0.2s',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                    }}
                >
                   {downloadingAll ? 'Downloading...' : <><span>Download files</span> <ChevronDown size={16} /></>}
                </button>
            </div>
        </div>

        {/* Gallery Grid */}
        <div style={{ padding: '40px 30px' }}>
             {pozeAfisate.length === 0 ? (
                <div style={{textAlign:'center', padding:'100px', color:'#999'}}>
                    {doarFavorite ? 'Nu ai selectat nicio fotografie.' : 'Galeria este goală.'}
                </div>
             ) : (
                <>
                <Masonry
                    breakpointCols={{ default: 3, 1100: 2, 700: 1, 600: 1 }}
                    className="my-masonry-grid"
                    columnClassName="my-masonry-grid_column"
                >
                    {pozeVizibile.map((poza, index) => (
                        <LazyGalleryImage
                            key={poza.key}
                            pozaKey={poza.key}
                            index={index}
                            isFav={galerie.favorite?.includes(poza.key)}
                            onFavoriteClick={handleFavoriteClick}
                            accentColor={profile.accentColor}
                            onClick={() => {
                                setLightboxIndex(pozeAfisate.findIndex((p) => p.key === poza.key));
                                setLightboxOpen(true);
                            }}
                        />
                    ))}
                </Masonry>
                {visibleCount < pozeAfisate.length && (
                    <div ref={loadMoreRef} style={{ height: 1, marginTop: 20 }} aria-hidden="true" />
                )}
                <Lightbox
                    open={lightboxOpen}
                    close={() => setLightboxOpen(false)}
                    index={lightboxIndex}
                    slides={pozeAfisate.map((p) => ({
                      src: lightboxOriginalUrls[p.key] || urlCache.get(`original:${p.key}`) || urlCache.get(`thumb:${p.key}`) || ''
                    }))}
                    plugins={[Zoom, Thumbnails]}
                    toolbar={{
                      buttons: [
                        <LightboxSelectionCounter key="lightbox-counter" galerie={galerie} accentColor={profile.accentColor} />,
                        <LightboxFavoriteButton
                          key="lightbox-favorite"
                          galerie={galerie}
                          pozeAfisate={pozeAfisate}
                          onFavoriteClick={handleFavoriteClick}
                          accentColor={profile.accentColor}
                        />,
                        <LightboxDownloadButton
                          key="lightbox-download"
                          pozeAfisate={pozeAfisate}
                          originalUrls={lightboxOriginalUrls}
                        />,
                        "close",
                      ],
                    }}
                />
                </>
             )}
        </div>
        
        {/* Footer Brand + Contact FABs */}
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#999', fontSize: '0.9rem', borderTop: '1px solid #f5f5f5', marginTop: '40px', position: 'relative' }}>
            {profile.logoPreviewUrl && (
              <img src={profile.logoPreviewUrl} alt="" style={{ height: 36, maxWidth: 140, objectFit: 'contain', marginBottom: 8 }} />
            )}
            <p style={{fontWeight: 600, color: '#555'}}>{profile.brandName || 'My Gallery'}</p>
            {profile.websiteUrl && <a href={normalizeUrl(profile.websiteUrl)} style={{color: '#999', textDecoration: 'none', marginTop: '5px', display: 'inline-block'}} target="_blank" rel="noreferrer">Visit Website</a>}
            {(profile.whatsappNumber || profile.instagramUrl) && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 16 }}>
                {profile.whatsappNumber && (
                  <a
                    href={`https://wa.me/${profile.whatsappNumber.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: 48, height: 48, borderRadius: '50%',
                      background: profile.accentColor || '#25D366', color: '#fff',
                      transition: 'transform 0.2s'
                    }}
                    title="WhatsApp"
                  >
                    <MessageCircle size={24} />
                  </a>
                )}
                {profile.instagramUrl && (
                  <a
                    href={profile.instagramUrl.startsWith('http') ? profile.instagramUrl : `https://instagram.com/${profile.instagramUrl.replace(/^@/, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: 48, height: 48, borderRadius: '50%',
                      background: profile.accentColor || '#E1306C', color: '#fff',
                      transition: 'transform 0.2s'
                    }}
                    title="Instagram"
                  >
                    <Instagram size={24} />
                  </a>
                )}
              </div>
            )}
        </div>

      </div>

      {/* --- MODAL NUME (Leads) --- */}
      {showNameModal && (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9999999,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
            <div style={{
                background: '#fff', padding: '30px', borderRadius: '16px', width: '100%', maxWidth: '400px',
                textAlign: 'center', boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
            }}>
                <h3 style={{margin: '0 0 10px 0', fontSize: '1.2rem'}}>Salvează favoritele</h3>
                <p style={{color: '#666', marginBottom: '25px', fontSize: '0.95rem', lineHeight: '1.4'}}>
                  Introdu datele pentru a crea o listă de selecție vizibilă fotografului.
                </p>
                <input 
                    autoFocus
                    type="text" 
                    placeholder="Numele tău"
                    value={nameInputValue}
                    onChange={(e) => setNameInputValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                    style={{
                        width: '100%', padding: '14px', borderRadius: '10px', border: '1px solid #ddd',
                        marginBottom: galerie?.numeSelectieClient ? '20px' : '16px', fontSize: '1rem', boxSizing: 'border-box', outline: 'none',
                        background: '#f9f9f9'
                    }}
                />
                {!galerie?.numeSelectieClient && (
                  <input 
                    type="text" 
                    placeholder="Numele selecției (ex: Poze Album, Favorite)"
                    value={selectionTitleInputValue}
                    onChange={(e) => setSelectionTitleInputValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                    style={{
                      width: '100%', padding: '14px', borderRadius: '10px', border: '1px solid #ddd',
                      marginBottom: '20px', fontSize: '1rem', boxSizing: 'border-box', outline: 'none',
                      background: '#f9f9f9'
                    }}
                  />
                )}
                <div style={{display: 'flex', gap: '10px'}}>
                    <button onClick={() => { setShowNameModal(false); setPendingFavAction(null); setSelectionTitleInputValue(''); }} style={{flex: 1, padding: '14px', border: 'none', background: '#f0f0f0', borderRadius: '10px', cursor: 'pointer', color: '#555', fontWeight: 600}}>Anulează</button>
                    <button onClick={handleSaveName} style={{flex: 1, padding: '14px', background: '#000', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 600}}>Salvează</button>
                </div>
            </div>
        </div>
      )}

      {/* Stiluri CSS: overlay bottom-right, pointer-events for long-press save, mobile tap targets, selection counter pop */}
      <style>{`
        @keyframes selectionCounterPop {
          0% { transform: scale(1); }
          50% { transform: scale(1.15); }
          100% { transform: scale(1); }
        }
        .selection-counter-pop {
          animation: selectionCounterPop 0.4s ease-out;
        }
        .my-masonry-grid { display: flex; margin-left: -20px; width: auto; }
        .my-masonry-grid_column { padding-left: 20px; background-clip: padding-box; }
        @media (max-width: 700px) {
            .my-masonry-grid { margin-left: -10px; }
            .my-masonry-grid_column { padding-left: 10px; }
        }
        @media (max-width: 600px) {
            .my-masonry-grid { margin-left: -10px; }
            .my-masonry-grid_column { padding-left: 10px; }
        }
        
        .gallery-item { cursor: pointer; overflow: hidden; position: relative; }
        
        .gallery-item-overlay {
            position: absolute; bottom: 0; right: 0; left: 0;
            padding: 12px 16px;
            background: linear-gradient(to top, rgba(0,0,0,0.5), transparent);
            display: flex; align-items: center; justify-content: flex-end;
            opacity: 0; transition: opacity 0.25s ease;
        }
        .gallery-item:hover .gallery-item-overlay { opacity: 1; }
        
        .gallery-item-actions { display: flex; gap: 10px; align-items: center; }
        
        .gallery-action-btn {
            background: rgba(255,255,255,0.9);
            border: none;
            border-radius: 50%;
            width: 44px;
            height: 44px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            color: #333;
            transition: transform 0.15s, background 0.15s;
            -webkit-tap-highlight-color: transparent;
        }
        .gallery-action-btn:hover { background: #fff; transform: scale(1.05); }
        .gallery-action-heart { color: #444; }
        .gallery-action-heart.filled, .gallery-action-heart[data-filled="true"] { color: #e74c3c; }
        
        @media (max-width: 600px) {
            .gallery-item-overlay {
                opacity: 0.85;
                background: linear-gradient(to top, rgba(0,0,0,0.4), transparent);
                padding: 10px 12px;
            }
            .gallery-item:hover .gallery-item-overlay { opacity: 0.9; }
            .gallery-action-btn {
                width: 44px;
                height: 44px;
                background: rgba(255,255,255,0.75);
                min-width: 44px;
                min-height: 44px;
            }
        }
      `}</style>
    </div>
  );
};

export default ClientGallery;