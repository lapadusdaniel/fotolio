import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs, getDoc, updateDoc, doc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { listPoze, getPozaUrl } from '../r2';
import Masonry from 'react-masonry-css';

const normalizeUrl = (value = '') => {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  return `https://${trimmed}`;
};

const ClientGallery = ({ slug }) => {
  const [galerie, setGalerie] = useState(null);
  const [poze, setPoze] = useState([]);
  const [loading, setLoading] = useState(true);
  const [eroare, setEroare] = useState(null);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [numeSelectie, setNumeSelectie] = useState(localStorage.getItem('fotolio_nume_client') || '');
  const [doarFavorite, setDoarFavorite] = useState(false);
  const [setariFotograf, setSetariFotograf] = useState({
    numeBrand: '',
    website: '',
    instagram: ''
  });

  useEffect(() => {
    const fetchDate = async () => {
      try {
        const q = query(collection(db, 'galerii'), where('slug', '==', slug));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const docSnap = querySnapshot.docs[0];
          const dateGal = { id: docSnap.id, ...docSnap.data() };

          // Verificare Status Activ și Expirare
          const acum = new Date();
          const dataExp = dateGal.dataExpirare ? new Date(dateGal.dataExpirare) : null;

          if (!dateGal.statusActiv) {
            setEroare('Această galerie a fost dezactivată de fotograf.');
            setLoading(false);
            return;
          }

          if (dataExp && dataExp < acum) {
            setEroare('Termenul de vizualizare pentru această galerie a expirat.');
            setLoading(false);
            return;
          }

          setGalerie(dateGal);

          // Branding dinamic din setariFotografi/{userId}
          if (dateGal.userId) {
            try {
              const setariRef = doc(db, 'setariFotografi', dateGal.userId);
              const setariSnap = await getDoc(setariRef);

              if (setariSnap.exists()) {
                const dataSetari = setariSnap.data();
                setSetariFotograf({
                  numeBrand: (dataSetari.numeBrand || '').trim(),
                  website: (dataSetari.website || '').trim(),
                  instagram: (dataSetari.instagram || '').trim()
                });
              } else {
                setSetariFotograf({ numeBrand: '', website: '', instagram: '' });
              }
            } catch (setariErr) {
              console.error('Eroare la încărcarea setărilor fotografului:', setariErr);
              setSetariFotograf({ numeBrand: '', website: '', instagram: '' });
            }
          }

          const pozeRaw = await listPoze(dateGal.id, dateGal.userId);
          const pozeCuUrl = await Promise.all(
            pozeRaw.map(async (p) => {
              const key = p.key || p.name || p.Key;
              const url = await getPozaUrl(key);
              return { ...p, url };
            })
          );
          setPoze(pozeCuUrl);
        } else {
          setEroare('Galeria nu a fost găsită.');
        }
      } catch (err) {
        setEroare('Eroare la încărcarea datelor.');
      } finally {
        setLoading(false);
      }
    };
    if (slug) fetchDate();
  }, [slug]);

  useEffect(() => {
    if (!galerie) return;
    const numeBrand = setariFotograf.numeBrand || galerie.userName || 'Fotolio';
    document.title = galerie.nume ? `${numeBrand} | ${galerie.nume}` : numeBrand;
  }, [galerie, setariFotograf.numeBrand]);

  const handleShare = async () => {
    try {
      await navigator.share({ title: galerie?.nume, url: window.location.href });
    } catch (err) {
      navigator.clipboard.writeText(window.location.href);
      alert('Link copiat!');
    }
  };

  const handleDownloadToate = async () => {
    const pozeDeDescarcat = doarFavorite
      ? poze.filter(p => galerie.favorite?.includes(p.key))
      : poze;

    if (!window.confirm(`Descarci ${pozeDeDescarcat.length} fotografii?`)) return;

    setDownloadingAll(true);
    for (const poza of pozeDeDescarcat) {
      try {
        const res = await fetch(poza.url);
        const blob = await res.blob();
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = poza.key.split('/').pop();
        link.click();
        await new Promise(r => setTimeout(r, 400));
      } catch (e) { console.error(e); }
    }
    setDownloadingAll(false);
  };

  const handleToggleFavorite = async (pozaKey) => {
    let currentNume = numeSelectie;
    if (!currentNume) {
      const rasp = prompt('Numele tău pentru selecție:');
      if (!rasp) return;
      currentNume = rasp.trim();
      setNumeSelectie(currentNume);
      localStorage.setItem('fotolio_nume_client', currentNume);
    }

    const galerieRef = doc(db, 'galerii', galerie.id);
    const isFav = galerie.favorite?.includes(pozaKey);

    try {
      if (isFav) {
        await updateDoc(galerieRef, { favorite: arrayRemove(pozaKey) });
        setGalerie(prev => ({ ...prev, favorite: prev.favorite.filter(k => k !== pozaKey) }));
      } else {
        await updateDoc(galerieRef, { favorite: arrayUnion(pozaKey), numeSelectieClient: currentNume });
        setGalerie(prev => ({ ...prev, favorite: [...(prev.favorite || []), pozaKey], numeSelectieClient: currentNume }));
      }
    } catch (e) { alert('Eroare la salvare'); }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '100px' }}>Se încarcă povestea...</div>;

  if (eroare) return (
    <div style={{ textAlign: 'center', padding: '100px', fontFamily: 'sans-serif' }}>
      <h1>Oops!</h1>
      <p>{eroare}</p>
      <button onClick={() => window.location.href = '/'} style={{ padding: '10px 20px', cursor: 'pointer' }}>Înapoi acasă</button>
    </div>
  );

  const pozeAfisate = doarFavorite
    ? poze.filter(p => galerie.favorite?.includes(p.key))
    : poze;

  const coverUrl = galerie?.coverUrl || poze[0]?.url;
  const numeBrandAfisat = setariFotograf.numeBrand || galerie?.userName || 'Fotograf';
  const titluGalerieClient = galerie?.nume ? `${numeBrandAfisat} · ${galerie.nume}` : numeBrandAfisat;
  const websiteLink = normalizeUrl(setariFotograf.website);
  const instagramLink = normalizeUrl(setariFotograf.instagram);

  return (
    <div style={{ backgroundColor: '#fff', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      {/* HERO SECTION */}
      <div style={{
        height: '75vh',
        backgroundImage: `linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.3)), url(${coverUrl})`,
        backgroundSize: 'cover', backgroundPosition: 'center',
        display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: '#fff', textAlign: 'center'
      }}>
        <h1 style={{ fontSize: 'clamp(2rem, 8vw, 3.5rem)', textTransform: 'uppercase', letterSpacing: '4px', margin: 0 }}>{titluGalerieClient}</h1>
        <p style={{ letterSpacing: '2px', marginTop: '20px', textTransform: 'uppercase', fontSize: '0.9rem', opacity: 0.8 }}>
          Photographer {numeBrandAfisat}
        </p>
      </div>

      {/* TOOLBAR */}
      <div style={{
        maxWidth: '1400px', margin: '30px auto', padding: '0 20px',
        display: 'flex', justifyContent: 'flex-end', gap: '25px', fontSize: '12px', color: '#555', alignItems: 'center', textTransform: 'uppercase', flexWrap: 'wrap'
      }}>
        <div
          onClick={() => setDoarFavorite(!doarFavorite)}
          style={{ cursor: 'pointer', fontWeight: doarFavorite ? 'bold' : 'normal', color: doarFavorite ? '#e74c3c' : '#555' }}
        >
          {doarFavorite ? '← Vezi Toate' : `🤍 Favorite (${galerie?.favorite?.length || 0})`}
        </div>

        <div style={{ cursor: 'pointer' }} onClick={handleShare}>🔗 Share</div>

        {websiteLink && (
          <a href={websiteLink} target="_blank" rel="noreferrer" style={{ color: '#555', textDecoration: 'none', fontWeight: 'bold' }}>🌐 Website</a>
        )}

        {instagramLink && (
          <a href={instagramLink} target="_blank" rel="noreferrer" style={{ color: '#555', textDecoration: 'none', fontWeight: 'bold' }}>📸 Instagram</a>
        )}

        <button
          onClick={handleDownloadToate}
          style={{ border: '1px solid #000', background: 'none', padding: '10px 20px', cursor: 'pointer', fontWeight: 'bold', fontSize: '11px', textTransform: 'uppercase' }}
        >
          {downloadingAll ? 'Downloading...' : 'Download Files ⌵'}
        </button>
      </div>

      {/* GRID MASONRY */}
      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 10px 100px' }}>
        {doarFavorite && pozeAfisate.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px', color: '#888' }}>Nu ai selectat nicio fotografie încă.</div>
        ) : (
          <Masonry breakpointCols={{ default: 3, 1100: 2, 700: 1 }} className="my-masonry-grid" columnClassName="my-masonry-grid_column">
            {pozeAfisate.map((poza, index) => {
              const isFav = galerie?.favorite?.includes(poza.key);
              return (
                <div key={index} style={{ position: 'relative', marginBottom: '10px' }}>
                  <img src={poza.url} alt="Gallery" style={{ width: '100%', display: 'block' }} loading="lazy" />
                  <button
                    onClick={() => handleToggleFavorite(poza.key)}
                    style={{
                      position: 'absolute', bottom: '15px', right: '15px',
                      background: isFav ? '#e74c3c' : 'rgba(255,255,255,0.9)',
                      border: 'none', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
                    }}
                  >
                    {isFav ? '❤️' : '🤍'}
                  </button>
                </div>
              );
            })}
          </Masonry>
        )}
      </main>

      <style>{`
        .my-masonry-grid { display: flex; margin-left: -10px; width: auto; }
        .my-masonry-grid_column { padding-left: 10px; background-clip: padding-box; }
        .my-masonry-grid_column img { width: 100%; display: block; transition: opacity 0.3s ease; }
        .my-masonry-grid_column img:hover { opacity: 0.9; }
      `}</style>
    </div>
  );
};

export default ClientGallery;