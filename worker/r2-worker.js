/**
 * Cloudflare Worker — proxy securizat pentru R2.
 *
 * Variabile de mediu necesare în Cloudflare Dashboard → Worker → Settings → Variables:
 *   R2_AUTH_TOKEN     — token pentru GET/LIST (client gallery, fără auth)
 *   R2_BUCKET        — binding-ul R2 (se configurează în wrangler.toml)
 *   FIREBASE_API_KEY — Web API Key din Firebase Console (pentru verificare PUT/DELETE)
 *
 * PUT și DELETE necesită Firebase ID Token (doar fotografi autentificați).
 * GET și LIST folosesc R2_AUTH_TOKEN (acces public pentru galerii partajate).
 */

async function verifyFirebaseToken(idToken, apiKey) {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    }
  )
  if (!res.ok) return null
  const data = await res.json()
  return data?.users?.[0]?.localId || null
}

function requireFirebaseAuth(request, env, corsHeaders) {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response('Unauthorized', { status: 401, headers: corsHeaders })
  }
  const token = authHeader.slice(7)
  if (!env.FIREBASE_API_KEY) {
    return new Response('Server misconfiguration', { status: 500, headers: corsHeaders })
  }
  return { token }
}

export default {
  async fetch(request, env) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders })
    }

    const url = new URL(request.url)
    const key = decodeURIComponent(url.pathname.slice(1))
    const prefixParam = url.searchParams.get('prefix')

    try {
      // --- GET și LIST: R2_AUTH_TOKEN (acces pentru client gallery) ---
      if (request.method === 'GET') {
        const authHeader = request.headers.get('Authorization')
        if (!authHeader || authHeader !== `Bearer ${env.R2_AUTH_TOKEN}`) {
          return new Response('Unauthorized', { status: 401, headers: corsHeaders })
        }

        if (prefixParam) {
          const listed = await env.R2_BUCKET.list({ prefix: prefixParam })
          const objects = listed.objects.map((obj) => ({
            key: obj.key,
            size: obj.size,
            lastModified: obj.uploaded,
          }))
          return new Response(JSON.stringify(objects), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        if (key) {
          const object = await env.R2_BUCKET.get(key)
          if (!object) {
            return new Response('Not Found', { status: 404, headers: corsHeaders })
          }
          return new Response(object.body, {
            headers: {
              ...corsHeaders,
              'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream',
            },
          })
        }
      }

      // --- PUT și DELETE: Firebase ID Token (doar fotografi) ---
      if (request.method === 'PUT' || request.method === 'DELETE') {
        const authCheck = requireFirebaseAuth(request, env, corsHeaders)
        if (authCheck instanceof Response) return authCheck

        const uid = await verifyFirebaseToken(authCheck.token, env.FIREBASE_API_KEY)
        if (!uid) {
          return new Response('Invalid or expired token', { status: 401, headers: corsHeaders })
        }

        if (request.method === 'PUT' && key) {
          const contentType = request.headers.get('Content-Type') || 'application/octet-stream'
          const allowedTypes = [
            'image/jpeg', 'image/png', 'image/webp',
            'image/gif', 'image/avif', 'image/tiff',
          ]
          if (!allowedTypes.includes(contentType)) {
            return new Response('Tip de fișier nepermis', { status: 415, headers: corsHeaders })
          }
          const contentLength = request.headers.get('Content-Length')
          if (contentLength && parseInt(contentLength) > 25 * 1024 * 1024) {
            return new Response('Fișier prea mare (max 25 MB)', { status: 413, headers: corsHeaders })
          }
          await env.R2_BUCKET.put(key, request.body, {
            httpMetadata: { contentType },
          })
          return new Response('OK', { status: 200, headers: corsHeaders })
        }

        if (request.method === 'DELETE') {
          // --- Bulk delete by prefix (galerii/{galleryId}/) ---
          if (prefixParam) {
            const prefix = prefixParam.startsWith('galerii/') ? prefixParam : `galerii/${prefixParam}/`
            const listed = await env.R2_BUCKET.list({ prefix })
            const keys = listed.objects.map((o) => o.key)
            await Promise.all(keys.map((k) => env.R2_BUCKET.delete(k)))
            return new Response(JSON.stringify({ deleted: keys.length }), {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
          }

          // --- Single key delete ---
          if (key) {
            await env.R2_BUCKET.delete(key)
            return new Response('Deleted', { status: 200, headers: corsHeaders })
          }
        }
      }

      return new Response('Method Not Allowed', { status: 405, headers: corsHeaders })
    } catch (err) {
      return new Response('Internal Error', { status: 500, headers: corsHeaders })
    }
  },
}
