// URL-ul către Cloudflare Worker care stă în fața R2.
const WORKER_URL = import.meta.env.VITE_R2_WORKER_URL

// Upload fișier în R2 prin Worker CU PROGRESS CALLBACK
export const uploadPoza = async (file, galerieId, userId, onProgress) => {
  const fileName = `${userId}/${galerieId}/${Date.now()}-${file.name}`
  const url = `${WORKER_URL}${encodeURIComponent(fileName)}`

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    // Track progress
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        const percentComplete = (e.loaded / e.total) * 100
        onProgress(percentComplete)
      }
    })

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(fileName)
      } else {
        reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`))
      }
    })

    xhr.addEventListener('error', () => {
      reject(new Error('Upload failed: Network error'))
    })

    xhr.open('PUT', url)
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream')
    xhr.send(file)
  })
}

// Listează pozele dintr-o galerie prin Worker
export const listPoze = async (galerieId, userId) => {
  const prefix = `${userId}/${galerieId}/`
  const url = `${WORKER_URL}?prefix=${encodeURIComponent(prefix)}`

  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`List failed: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()
  return data
}

// Obține URL pentru o poză (Worker returnează conținutul fișierului)
export const getPozaUrl = async (fileName) => {
  if (!fileName) {
    console.error('getPozaUrl apelat cu fileName invalid:', fileName)
    throw new Error('getPozaUrl: fileName este obligatoriu')
  }

  const url = `${WORKER_URL}${encodeURIComponent(fileName)}`
  const response = await fetch(url, { method: 'GET' })

  if (!response.ok) {
    throw new Error(`Get failed: ${response.status} ${response.statusText}`)
  }

  const blob = await response.blob()
  return URL.createObjectURL(blob)
}

// Șterge o poză prin Worker
export const deletePoza = async (fileName) => {
  const url = `${WORKER_URL}${encodeURIComponent(fileName)}`
  const response = await fetch(url, { method: 'DELETE' })

  if (!response.ok) {
    throw new Error(`Delete failed: ${response.status} ${response.statusText}`)
  }
}