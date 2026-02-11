const WORKER_URL = 'https://delicate-forest-6b3f.lapadusdaniel.workers.dev'

/**
 * Upload a photo to R2 via the Cloudflare Worker.
 * Key format: {userId}/{galerieId}/{timestamp}-{fileName}
 */
export async function uploadPhoto(file, userId, galerieId) {
  const key = `${userId}/${galerieId}/${Date.now()}-${file.name}`

  const res = await fetch(`${WORKER_URL}/${key}`, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file
  })

  if (!res.ok) {
    throw new Error(`Upload failed: ${res.status} ${res.statusText}`)
  }

  return { key, url: `${WORKER_URL}/${key}` }
}

/**
 * List all photos in a gallery.
 * Returns an array of { key, url } objects.
 */
export async function listPhotos(userId, galerieId) {
  const prefix = `${userId}/${galerieId}/`
  const res = await fetch(`${WORKER_URL}?prefix=${encodeURIComponent(prefix)}`)

  if (!res.ok) {
    throw new Error(`List failed: ${res.status} ${res.statusText}`)
  }

  const data = await res.json()

  return (data.objects || []).map((obj) => ({
    key: obj.key,
    url: `${WORKER_URL}/${obj.key}`
  }))
}

/**
 * Get the public URL for a photo key.
 */
export function getPhotoUrl(key) {
  return `${WORKER_URL}/${key}`
}

/**
 * Delete a photo from R2.
 */
export async function deletePhoto(key) {
  const res = await fetch(`${WORKER_URL}/${key}`, {
    method: 'DELETE'
  })

  if (!res.ok) {
    throw new Error(`Delete failed: ${res.status} ${res.statusText}`)
  }
}
