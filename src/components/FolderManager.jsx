/**
 * FolderManager — horizontal pill/tab bar for gallery folders.
 * Props:
 *   folders: string[]         — list of folder names
 *   activeFolder: string|null — currently active folder (null = "Toate")
 *   onFolderSelect: (name|null) => void
 *   onAddFolder: (name) => void
 */
import { useState } from 'react'

export default function FolderManager({ folders = [], activeFolder, onFolderSelect, onAddFolder }) {
  const [adding, setAdding] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')

  const handleAdd = () => {
    const name = newFolderName.trim()
    if (!name) return
    onAddFolder(name)
    setNewFolderName('')
    setAdding(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleAdd()
    if (e.key === 'Escape') { setAdding(false); setNewFolderName('') }
  }

  return (
    <div style={styles.bar}>
      {/* Tab "Toate" */}
      <button
        style={activeFolder === null ? { ...styles.pill, ...styles.pillActive } : styles.pill}
        onClick={() => onFolderSelect(null)}
      >
        Toate
      </button>

      {/* Folder pills */}
      {folders.map((folder) => (
        <button
          key={folder}
          style={activeFolder === folder ? { ...styles.pill, ...styles.pillActive } : styles.pill}
          onClick={() => onFolderSelect(folder)}
        >
          {folder}
        </button>
      ))}

      {/* Add folder */}
      {adding ? (
        <div style={styles.addingWrap}>
          <input
            autoFocus
            style={styles.addInput}
            placeholder="Nume folder…"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button style={{ ...styles.pill, ...styles.pillActive }} onClick={handleAdd}>
            OK
          </button>
          <button style={styles.pill} onClick={() => { setAdding(false); setNewFolderName('') }}>
            ✕
          </button>
        </div>
      ) : (
        <button style={styles.addBtn} onClick={() => setAdding(true)} title="Folder nou">
          +
        </button>
      )}
    </div>
  )
}

const styles = {
  bar: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 0',
    fontFamily: "'DM Sans', sans-serif",
  },
  pill: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '6px 18px',
    borderRadius: '100px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    fontFamily: "'DM Sans', sans-serif",
    background: '#f5f5f7',
    color: '#3a3a3c',
    transition: 'background 0.15s, color 0.15s',
    whiteSpace: 'nowrap',
  },
  pillActive: {
    background: '#1d1d1f',
    color: '#fff',
  },
  addBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    borderRadius: '100px',
    border: '1.5px dashed #aaa',
    background: 'transparent',
    color: '#6e6e73',
    fontSize: '18px',
    cursor: 'pointer',
    lineHeight: 1,
    fontFamily: "'DM Sans', sans-serif",
  },
  addingWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  addInput: {
    padding: '6px 12px',
    borderRadius: '100px',
    border: '1.5px solid #1d1d1f',
    fontSize: '14px',
    fontFamily: "'DM Sans', sans-serif",
    outline: 'none',
    width: '160px',
  },
}
