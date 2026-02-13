/**
 * Cloudflare Worker — proxy securizat pentru R2.
 *
 * Variabile de mediu necesare în Cloudflare Dashboard → Worker → Settings → Variables:
 *   R2_AUTH_TOKEN  — același token setat în .env ca VITE_R2_AUTH_TOKEN
 *   R2_BUCKET      — binding-ul R2 (se configurează în wrangler.toml)
 *
 * Acest fișier este REFERINȚĂ. Deployează-l în Cloudflare Dashboard sau cu wrangler.
 */

export default {
  async fetch(request, env) {
    // --- 1. Verifică token-ul de autorizare ---
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || authHeader !== `Bearer ${env.R2_AUTH_TOKEN}`) {
      return new Response('Unauthorized', { status: 401 })
    }

    // --- 2. CORS headers ---
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*', // În producție, restricționează la domeniul tău
      'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }

    // Preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders })
    }

    const url = new URL(request.url)
    const key = decodeURIComponent(url.pathname.slice(1)) // elimină primul /

    try {
      // --- LIST ---
      if (request.method === 'GET' && url.searchParams.has('prefix')) {
        const prefix = url.searchParams.get('prefix')
        const listed = await env.R2_BUCKET.list({ prefix })
        const objects = listed.objects.map((obj) => ({
          key: obj.key,
          size: obj.size,
          lastModified: obj.uploaded,
        }))
        return new Response(JSON.stringify(objects), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // --- GET ---
      if (request.method === 'GET' && key) {
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

      // --- PUT (upload) ---
      if (request.method === 'PUT' && key) {
        const contentType = request.headers.get('Content-Type') || 'application/octet-stream'

        // Validare server-side: doar imagini
        const allowedTypes = [
          'image/jpeg', 'image/png', 'image/webp',
          'image/gif', 'image/avif', 'image/tiff',
        ]
        if (!allowedTypes.includes(contentType)) {
          return new Response('Tip de fișier nepermis', { status: 415, headers: corsHeaders })
        }

        // Limită 25 MB
        const contentLength = request.headers.get('Content-Length')
        if (contentLength && parseInt(contentLength) > 25 * 1024 * 1024) {
          return new Response('Fișier prea mare (max 25 MB)', { status: 413, headers: corsHeaders })
        }

        await env.R2_BUCKET.put(key, request.body, {
          httpMetadata: { contentType },
        })
        return new Response('OK', { status: 200, headers: corsHeaders })
      }

      // --- DELETE ---
      if (request.method === 'DELETE' && key) {
        await env.R2_BUCKET.delete(key)
        return new Response('Deleted', { status: 200, headers: corsHeaders })
      }

      return new Response('Method Not Allowed', { status: 405, headers: corsHeaders })
    } catch (err) {
      return new Response('Internal Error', { status: 500, headers: corsHeaders })
    }
  },
}
