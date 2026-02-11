const WORKER_URL = import.meta.env.VITE_CLOUDFLARE_WORKER_URL

export const uploadPoza = async (file, userId, galerieId) => {
  const key = `${userId}/${galerieId}/${Date.now()}-${file.name}`

  const formData = new FormData()
  formData.append('file', file)
  formData.append('key', key)

  const response = await fetch(`${WORKER_URL}/upload`, {
    method: 'POST',
    body: formData
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Upload failed: ${error}`)
  }

  return await response.json()
}

export const listPoze = async (userId, galerieId) => {
  const prefix = `${userId}/${galerieId}/`
  const response = await fetch(`${WORKER_URL}/list?prefix=${encodeURIComponent(prefix)}`)

  if (!response.ok) throw new Error('List failed')

  const data = await response.json()
  return data.objects || []
}

export const getPozaUrl = (key) => {
  return `${WORKER_URL}/download/${encodeURIComponent(key)}`
}

export const deletePoza = async (key) => {
  const response = await fetch(`${WORKER_URL}/delete/${encodeURIComponent(key)}`, {
    method: 'DELETE'
  })

  if (!response.ok) throw new Error('Delete failed')
  return await response.json()
}
