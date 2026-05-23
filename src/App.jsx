import { useState, useEffect } from 'react'
import Player from './components/Player.jsx'
import {
  getAuthUrl, exchangeCodeForToken, refreshAccessToken,
  saveToken, loadToken, loadRefreshToken, clearToken
} from './spotify.js'

export default function App() {
  const [spotifyToken, setSpotifyToken] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      // Handle Spotify redirect with code
      const params = new URLSearchParams(window.location.search)
      const code = params.get('code')
      if (code) {
        try {
          const data = await exchangeCodeForToken(code)
          saveToken(data.access_token, data.refresh_token, data.expires_in)
          setSpotifyToken(data.access_token)
        } catch (e) {
          console.error('Token exchange failed', e)
        }
        window.history.replaceState({}, document.title, '/')
        setLoading(false)
        return
      }

      // Try existing token
      const saved = loadToken()
      if (saved) { setSpotifyToken(saved); setLoading(false); return }

      // Try refresh
      const refresh = loadRefreshToken()
      if (refresh) {
        try {
          const data = await refreshAccessToken(refresh)
          saveToken(data.access_token, data.refresh_token || refresh, data.expires_in)
          setSpotifyToken(data.access_token)
        } catch { clearToken() }
      }
      setLoading(false)
    }
    init()
  }, [])

  const handleConnectSpotify = async () => {
    const url = await getAuthUrl()
    window.location.href = url
  }

  const handleDisconnectSpotify = () => {
    clearToken()
    setSpotifyToken(null)
  }

  if (loading) return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', fontFamily: "'Press Start 2P', monospace",
      fontSize: '10px', color: '#ff80b5', letterSpacing: '2px'
    }}>
      LOADING...
    </div>
  )

  return (
    <Player
      spotifyToken={spotifyToken}
      onConnectSpotify={handleConnectSpotify}
      onDisconnectSpotify={handleDisconnectSpotify}
    />
  )
}
