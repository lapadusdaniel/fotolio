const WORKER_URL = import.meta.env.VITE_R2_WORKER_URL
const AUTH_TOKEN = import.meta.env.VITE_R2_AUTH_TOKEN

export const uploadPoza = async (file, galerieId, userId, onProgress) => {
  const fileName = `${userId}/${galerieId}/${Date.now()}-${file.name}`
  const url = `${WORKER_URL}${encodeURIComponent(fileName)}`

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
    // AICI E SECRETUL LIPSĂ:
    xhr.setRequestHeader('Authorization', `Bearer ${AUTH_TOKEN}`)
    xhr.send(file)
  })
}

export const listPoze = async (galerieId, userId) => {
  const prefix = `${userId}/${galerieId}/`
  const url = `${WORKER_URL}?prefix=${encodeURIComponent(prefix)}`

  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` }
  })

  if (!response.ok) throw new Error(`List failed: ${response.status}`)
  return await response.json()
}

export const getPozaUrl = async (fileName) => {
  if (!fileName) throw new Error('getPozaUrl: fileName este obligatoriu')

  const url = `${WORKER_URL}${encodeURIComponent(fileName)}`
  const response = await fetch(url, { 
    method: 'GET',
    headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` }
  })

  if (!response.ok) throw new Error(`Get failed: ${response.status}`)
  const blob = await response.blob()
  return URL.createObjectURL(blob)
}

export const deletePoza = async (fileName) => {
  const url = `${WORKER_URL}${encodeURIComponent(fileName)}`
  const response = await fetch(url, { 
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` }
  })

  if (!response.ok) throw new Error(`Delete failed: ${response.status}`)
}