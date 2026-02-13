// URL-ul către Cloudflare Worker care stă în fața R2.
const WORKER_URL = import.meta.env.VITE_R2_WORKER_URL

// Token-ul secret partajat cu Worker-ul pentru autorizare.
// Worker-ul trebuie configurat să verifice acest token în header-ul Authorization.
const AUTH_TOKEN = import.meta.env.VITE_R2_AUTH_TOKEN

// Verificare la pornire — dacă lipsește token-ul, afișăm avertisment în consolă.
if (!AUTH_TOKEN || AUTH_TOKEN === 'CHANGE_ME_GENERATE_A_RANDOM_TOKEN') {
  console.warn(
    '[Fotolio] VITE_R2_AUTH_TOKEN nu este configurat. Request-urile către R2 vor fi respinse de Worker.'
  )
}

// Dimensiune maximă per fișier: 25 MB
const MAX_FILE_SIZE = 25 * 1024 * 1024

// Tipuri de fișiere permise (MIME types)
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
  'image/tiff'
]

// Validează un fișier înainte de upload.
const validateFile = (file) => {
  if (!file) {
    throw new Error('Fișierul este obligatoriu.')
  }

  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1)
    throw new Error(
      `Fișierul "${file.name}" are ${sizeMB} MB. Dimensiunea maximă permisă este 25 MB.`
    )
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error(
      `Tipul "${file.type || 'necunoscut'}" nu este permis. Acceptate: JPEG, PNG, WebP, GIF, AVIF, TIFF.`
    )
  }
}

// Curăță numele fișierului — previne path traversal și caractere speciale.
const sanitizeFileName = (name) => {
  return name
    .replace(/\.\./g, '')
    .replace(/[/\\]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
}

// Upload fișier în R2 prin Worker, cu progres folosind XMLHttpRequest
// onProgress primește procentul (0-100) pentru fișierul curent
export const uploadPoza = (file, galerieId, userId, onProgress) => {
  validateFile(file)

  const safeName = sanitizeFileName(file.name)
  const fileName = `${userId}/${galerieId}/${Date.now()}-${safeName}`
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
      } else if (xhr.status === 401 || xhr.status === 403) {
        reject(new Error('Acces interzis. Verifică token-ul de autorizare R2.'))
      } else {
        reject(new Error(`Upload eșuat: ${xhr.status}`))
      }
    }

    xhr.onerror = () => {
      reject(new Error('Upload eșuat: eroare de rețea'))
    }

    xhr.setRequestHeader('Authorization', `Bearer ${AUTH_TOKEN}`)
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream')
    xhr.send(file)
  })
}

// Listează pozele dintr-o galerie prin Worker
export const listPoze = async (galerieId, userId) => {
  const prefix = `${userId}/${galerieId}/`
  const url = `${WORKER_URL}?prefix=${encodeURIComponent(prefix)}`

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${AUTH_TOKEN}`
    }
  })

  if (response.status === 401 || response.status === 403) {
    throw new Error('Acces interzis. Verifică token-ul de autorizare R2.')
  }

  if (!response.ok) {
    throw new Error(`Listare eșuată: ${response.status}`)
  }

  const data = await response.json()
  return data
}

// Obține URL pentru o poză (Worker returnează conținutul fișierului)
export const getPozaUrl = async (fileName) => {
  if (!fileName) {
    throw new Error('getPozaUrl: fileName este obligatoriu')
  }

  const url = `${WORKER_URL}${encodeURIComponent(fileName)}`
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${AUTH_TOKEN}`
    }
  })

  if (response.status === 401 || response.status === 403) {
    throw new Error('Acces interzis. Verifică token-ul de autorizare R2.')
  }

  if (!response.ok) {
    throw new Error(`Descărcare eșuată: ${response.status}`)
  }

  const blob = await response.blob()
  return URL.createObjectURL(blob)
}

// Revocă un blob URL creat de getPozaUrl (previne memory leak)
export const revokePozaUrl = (blobUrl) => {
  if (blobUrl && blobUrl.startsWith('blob:')) {
    URL.revokeObjectURL(blobUrl)
  }
}

// Șterge o poză prin Worker
export const deletePoza = async (fileName) => {
  const url = `${WORKER_URL}${encodeURIComponent(fileName)}`
  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${AUTH_TOKEN}`
    }
  })

  if (response.status === 401 || response.status === 403) {
    throw new Error('Acces interzis. Verifică token-ul de autorizare R2.')
  }

  if (!response.ok) {
    throw new Error(`Ștergere eșuată: ${response.status}`)
  }
}
