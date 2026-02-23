const WORKER_URL = import.meta.env.VITE_R2_WORKER_URL
const AUTH_TOKEN = import.meta.env.VITE_R2_AUTH_TOKEN

/** Upload file to R2. If targetPath is provided, use it; otherwise use legacy userId/galerieId path. */
export const uploadPoza = async (file, galerieId, userId, onProgress, targetPath) => {
  const path = targetPath ?? `${userId}/${galerieId}/${Date.now()}-${file.name}`
  const url = `${WORKER_URL}${encodeURIComponent(path)}`

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        const percentComplete = (e.loaded / e.total) * 100
        onProgress(percentComplete)
      }
    })

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(path)
      } else {
        reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`))
      }
    })

    xhr.addEventListener('error', () => {
      reject(new Error('Upload failed: Network error'))
    })

    xhr.open('PUT', url)
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream')
    xhr.setRequestHeader('Authorization', `Bearer ${AUTH_TOKEN}`)
    xhr.send(file)
  })
}

export const listPoze = async (galerieId, userId) => {
  const legacyPrefix = `${userId}/${galerieId}/`
  const newPrefix = `galerii/${galerieId}/originals/`

  const fetchList = async (prefix) => {
    const url = `${WORKER_URL}?prefix=${encodeURIComponent(prefix)}`
    const response = await fetch(url, { headers: { Authorization: `Bearer ${AUTH_TOKEN}` } })
    if (!response.ok) throw new Error(`List failed: ${response.status}`)
    return response.json()
  }

  const [legacyRaw, newRaw] = await Promise.all([
    fetchList(legacyPrefix).catch(() => null),
    fetchList(newPrefix).catch(() => null)
  ])

  const toItems = (raw) => {
    if (!raw) return []
    const arr = Array.isArray(raw) ? raw : (raw?.Contents ?? raw?.objects ?? raw?.items ?? [])
    return arr.map((o) => ({
      key: o?.Key ?? o?.key ?? o?.name,
      Key: o?.Key,
      size: o?.Size ?? o?.size
    }))
  }

  const legacyItems = toItems(legacyRaw)
  const newItems = toItems(newRaw).map((o) => ({ ...o, key: o.key || o.Key }))

  const seen = new Set()
  const merged = []
  for (const item of [...newItems, ...legacyItems]) {
    const k = item.key ?? item.Key
    if (k && !seen.has(k)) {
      seen.add(k)
      merged.push(typeof item === 'object' && (item.key || item.Key) ? item : { key: k, Key: k })
    }
  }
  return merged
}

/**
 * Resolve the storage path for a given key and type.
 * type 'thumb' -> galerii/{id}/thumbnails/{fileName}.webp
 * type 'medium' -> galerii/{id}/medium/{fileName}.webp
 * type 'original' or omit -> return key as is
 */
function resolvePath(key, type) {
  if (!key) return null
  const str = String(key).trim()
  const match = str.match(/^galerii\/([^/]+)\/originals\/(.+)$/)
  if (match) {
    const [, galerieId, fileName] = match
    const base = fileName.replace(/\.[^.]+$/, '')
    if (type === 'thumb') return `galerii/${galerieId}/thumbnails/${base}.webp`
    if (type === 'medium') return `galerii/${galerieId}/medium/${base}.webp`
  }
  return str
}

export const getPozaUrl = async (fileName, type = 'original') => {
  if (!fileName) throw new Error('getPozaUrl: fileName este obligatoriu')

  const path = resolvePath(fileName, type)

  const url = `${WORKER_URL}${encodeURIComponent(path)}`
  const response = await fetch(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${AUTH_TOKEN}` }
  })

  if (!response.ok) throw new Error(`Get failed: ${response.status}`)
  const blob = await response.blob()
  return URL.createObjectURL(blob)
}

/** Returns the raw Blob for a poza (for Web Share API, etc.). */
export const getPozaBlob = async (fileName, type = 'original') => {
  if (!fileName) throw new Error('getPozaBlob: fileName este obligatoriu')
  const path = resolvePath(fileName, type)
  const url = `${WORKER_URL}${encodeURIComponent(path)}`
  const response = await fetch(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${AUTH_TOKEN}` }
  })
  if (!response.ok) throw new Error(`Get failed: ${response.status}`)
  return response.blob()
}

/** Returns URL for full-resolution/original image. Use for high-res downloads. */
export const getPozaUrlOriginal = async (fileName) => {
  if (!fileName) throw new Error('getPozaUrlOriginal: fileName este obligatoriu')
  const path = resolvePath(fileName, 'original')
  const url = `${WORKER_URL}${encodeURIComponent(path)}?original=1`
  const response = await fetch(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${AUTH_TOKEN}` }
  })
  if (!response.ok) throw new Error(`Get original failed: ${response.status}`)
  const blob = await response.blob()
  return URL.createObjectURL(blob)
}

/** Upload a file to a custom path. For branding assets (e.g. logo). */
export const uploadToPath = async (file, path, onProgress) => {
  const url = `${WORKER_URL}${encodeURIComponent(path)}`
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) onProgress((e.loaded / e.total) * 100)
    })
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve(path)
      else reject(new Error(`Upload failed: ${xhr.status}`))
    })
    xhr.addEventListener('error', () => reject(new Error('Upload failed: Network error')))
    xhr.open('PUT', url)
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream')
    xhr.setRequestHeader('Authorization', `Bearer ${AUTH_TOKEN}`)
    xhr.send(file)
  })
}

/** Get object URL for a storage path (e.g. branding/xxx/logo.png). */
export const getBrandingUrl = async (path) => {
  if (!path) throw new Error('Path is required')
  const url = `${WORKER_URL}${encodeURIComponent(path)}`
  const response = await fetch(url, { headers: { Authorization: `Bearer ${AUTH_TOKEN}` } })
  if (!response.ok) throw new Error(`Get failed: ${response.status}`)
  const blob = await response.blob()
  return URL.createObjectURL(blob)
}

export const deletePoza = async (fileName) => {
  const deleteOne = async (path) => {
    const url = `${WORKER_URL}${encodeURIComponent(path)}`
    const response = await fetch(url, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${AUTH_TOKEN}` }
    })
    if (!response.ok) throw new Error(`Delete failed: ${response.status}`)
  }

  await deleteOne(fileName)

  const thumbPath = resolvePath(fileName, 'thumb')
  if (thumbPath && thumbPath !== fileName) await deleteOne(thumbPath).catch(() => {})
  const mediumPath = resolvePath(fileName, 'medium')
  if (mediumPath && mediumPath !== fileName) await deleteOne(mediumPath).catch(() => {})
}