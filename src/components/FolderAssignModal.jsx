/**
 * FolderAssignModal — modal for assigning selected photos to a folder.
 * Props:
 *   folders: string[]             — available folder names
 *   selectedCount: number         — how many photos are selected
 *   onAssign: (folderName) => void
 *   onClose: () => void
 */
export default function FolderAssignModal({ folders = [], selectedCount, onAssign, onClose }) {
  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h3 style={styles.title}>Mută în folder</h3>
        <p style={styles.subtitle}>
          {selectedCount} {selectedCount === 1 ? 'poză selectată' : 'poze selectate'}
        </p>

        {folders.length === 0 ? (
          <p style={styles.empty}>Nu există niciun folder. Creează unul mai întâi.</p>
        ) : (
          <ul style={styles.list}>
            {folders.map((folder) => (
              <li key={folder}>
                <button
                  style={styles.folderBtn}
                  onClick={() => onAssign(folder)}
                >
                  📁 {folder}
                </button>
              </li>
            ))}
          </ul>
        )}

        <button style={styles.cancelBtn} onClick={onClose}>
          Anulează
        </button>
      </div>
    </div>
  )
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    fontFamily: "'DM Sans', sans-serif",
  },
  modal: {
    background: '#fff',
    borderRadius: '16px',
    padding: '28px 32px',
    minWidth: '300px',
    maxWidth: '400px',
    width: '90%',
    boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
  },
  title: {
    margin: '0 0 6px',
    fontSize: '18px',
    fontWeight: 600,
    color: '#1d1d1f',
    fontFamily: "'DM Sans', sans-serif",
  },
  subtitle: {
    margin: '0 0 18px',
    fontSize: '14px',
    color: '#6e6e73',
    fontFamily: "'DM Sans', sans-serif",
  },
  empty: {
    fontSize: '14px',
    color: '#6e6e73',
    marginBottom: '18px',
    fontFamily: "'DM Sans', sans-serif",
  },
  list: {
    listStyle: 'none',
    padding: 0,
    margin: '0 0 18px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  folderBtn: {
    width: '100%',
    textAlign: 'left',
    background: '#f5f5f7',
    border: 'none',
    borderRadius: '10px',
    padding: '10px 16px',
    fontSize: '15px',
    cursor: 'pointer',
    color: '#1d1d1f',
    fontFamily: "'DM Sans', sans-serif",
    transition: 'background 0.15s',
  },
  cancelBtn: {
    width: '100%',
    padding: '10px',
    borderRadius: '10px',
    border: '1.5px solid #e0e0e0',
    background: 'transparent',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#3a3a3c',
    fontFamily: "'DM Sans', sans-serif",
  },
}
