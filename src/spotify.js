const CLIENT_ID = '13694ce387c94cc090fe093f61a41ac3'
const REDIRECT_URI = 'https://tape-player.netlify.app/'
const SCOPES = [
  'streaming',
  'user-read-email',
  'user-read-private',
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
].join(' ')

// --- PKCE helpers ---
function generateRandomString(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  array.forEach(x => result += chars[x % chars.length])
  return result
}

async function generateCodeChallenge(verifier) {
  const data = new TextEncoder().encode(verifier)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

export async function getAuthUrl() {
  const verifier = generateRandomString(64)
  const challenge = await generateCodeChallenge(verifier)
  sessionStorage.setItem('pkce_verifier', verifier)
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    scope: SCOPES,
    code_challenge_method: 'S256',
    code_challenge: challenge,
    show_dialog: 'true',
  })
  return `https://accounts.spotify.com/authorize?${params}`
}

export async function exchangeCodeForToken(code) {
  const verifier = sessionStorage.getItem('pkce_verifier')
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      code_verifier: verifier,
    }),
  })
  if (!res.ok) throw new Error('Token exchange failed')
  return res.json()
}

export async function refreshAccessToken(refreshToken) {
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  })
  if (!res.ok) throw new Error('Refresh failed')
  return res.json()
}

export function saveToken(accessToken, refreshToken, expiresIn) {
  const expires = Date.now() + expiresIn * 1000
  localStorage.setItem('spotify_token', accessToken)
  localStorage.setItem('spotify_refresh_token', refreshToken)
  localStorage.setItem('spotify_token_expires', expires)
}

export function loadToken() {
  const token = localStorage.getItem('spotify_token')
  const expires = parseInt(localStorage.getItem('spotify_token_expires') || '0')
  if (token && Date.now() < expires - 60000) return token
  return null
}

export function loadRefreshToken() {
  return localStorage.getItem('spotify_refresh_token')
}

export function clearToken() {
  localStorage.removeItem('spotify_token')
  localStorage.removeItem('spotify_refresh_token')
  localStorage.removeItem('spotify_token_expires')
  sessionStorage.removeItem('pkce_verifier')
}

// --- Spotify API ---
export async function searchSpotify(query, token) {
  const res = await fetch(
    `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=10&market=US`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  if (res.status === 401) {
    // Token expired — clear it so user can reconnect
    clearToken()
    window.location.reload()
    return []
  }
  
  if (!res.ok) {
    const err = await res.json()
    console.error('Spotify search error:', err)
    throw new Error('Spotify search failed')
  }
  
  const data = await res.json()
  return data.tracks.items.map(t => ({
    id: t.id,
    name: t.name,
    artist: t.artists.map(a => a.name).join(', '),
    album: t.album.name,
    duration: t.duration_ms,
    art: t.album.images[1]?.url || t.album.images[0]?.url,
    thumb: t.album.images[2]?.url || t.album.images[0]?.url,
    uri: t.uri,
    source: 'spotify',
  }))
}

export async function playSpotifyTrack(uri, token, deviceId) {
  await fetch(
    `https://api.spotify.com/v1/me/player/play${deviceId ? `?device_id=${deviceId}` : ''}`,
    {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ uris: [uri] }),
    }
  )
}
