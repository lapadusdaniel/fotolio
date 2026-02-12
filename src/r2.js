// URL-ul către Cloudflare Worker care stă în fața R2.
// Exemplu: https://nume-worker.subdomeniu.workers.dev/
const WORKER_URL = import.meta.env.VITE_R2_WORKER_URL

// Upload fișier în R2 prin Worker, cu progres folosind XMLHttpRequest
// onProgress primește procentul (0-100) pentru fișierul curent
export const uploadPoza = (file, galerieId, userId, onProgress) => {
  const fileName = `${userId}/${galerieId}/${Date.now()}-${file.name}`
  const url = `${WORKER_URL}${encodeURIComponent(fileName)}`

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', url)

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return
      if (typeof onProgress === 'function') {
        const percent = Math.round((event.loaded / event.total) * 100)
        onProgress(percent)
      }
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(fileName)
      } else {
        reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText || xhr.responseText}`))
      }
    }

    xhr.onerror = () => {
      reject(new Error('Upload failed: network error'))
    }

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
  // Worker-ul returnează direct lista de obiecte (array JSON)
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