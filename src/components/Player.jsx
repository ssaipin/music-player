import { useState, useEffect, useRef } from 'react'
import { searchSpotify, playSpotifyTrack } from '../spotify.js'
import { searchItunes } from '../itunes.js'
import styles from './Player.module.css'

function formatMs(ms) {
  if (!ms) return '0:00'
  const s = Math.floor(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export default function Player({ spotifyToken, onConnectSpotify, onDisconnectSpotify }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [currentTrack, setCurrentTrack] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [position, setPosition] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolumeState] = useState(80)
  const [deviceId, setDeviceId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('READY — SEARCH A SONG')
  const [blink, setBlink] = useState(true)
  const audioRef = useRef(null)
  const playerRef = useRef(null)
  const progressRef = useRef(null)

  useEffect(() => {
    const t = setInterval(() => setBlink(b => !b), 500)
    return () => clearInterval(t)
  }, [])

  // Load Spotify SDK
  useEffect(() => {
    if (!spotifyToken) return
    window.onSpotifyWebPlaybackSDKReady = () => {
      const player = new window.Spotify.Player({
        name: 'Tape Player',
        getOAuthToken: cb => cb(spotifyToken),
        volume: volume / 100,
      })
      player.addListener('ready', ({ device_id }) => {
        setDeviceId(device_id)
        setStatus('✓ SPOTIFY CONNECTED')
      })
      player.addListener('not_ready', () => {})
      player.addListener('player_state_changed', state => {
        if (!state) return
        setIsPlaying(!state.paused)
        setPosition(state.position)
        setDuration(state.duration)
      })
      player.connect()
      playerRef.current = player
    }
    if (!window.Spotify) {
      const script = document.createElement('script')
      script.src = 'https://sdk.scdn.co/spotify-player.js'
      script.async = true
      document.body.appendChild(script)
    } else if (window.onSpotifyWebPlaybackSDKReady) {
      window.onSpotifyWebPlaybackSDKReady()
    }
    return () => { if (playerRef.current) playerRef.current.disconnect() }
  }, [spotifyToken])

  // Progress ticker for iTunes
  useEffect(() => {
    clearInterval(progressRef.current)
    if (isPlaying && currentTrack?.source === 'itunes') {
      progressRef.current = setInterval(() => {
        setPosition(p => {
          if (p >= duration) { setIsPlaying(false); return 0 }
          return p + 1000
        })
      }, 1000)
    }
    return () => clearInterval(progressRef.current)
  }, [isPlaying, currentTrack, duration])

  // iTunes audio events
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const onLoaded = () => setDuration(audio.duration * 1000)
    const onTime = () => setPosition(audio.currentTime * 1000)
    const onEnded = () => { setIsPlaying(false); setPosition(0) }
    audio.addEventListener('loadedmetadata', onLoaded)
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('ended', onEnded)
    return () => {
      audio.removeEventListener('loadedmetadata', onLoaded)
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('ended', onEnded)
    }
  }, [])

  const handleSearch = async () => {
    if (!query.trim()) return
    setLoading(true)
    setStatus('SEARCHING...')
    try {
      const tracks = spotifyToken
        ? await searchSpotify(query, spotifyToken)
        : await searchItunes(query)
      setResults(tracks)
      setStatus(`FOUND ${tracks.length} TRACKS ${spotifyToken ? '(SPOTIFY)' : '(ITUNES — 30s PREVIEW)'}`)
    } catch {
      setStatus('SEARCH ERROR — TRY AGAIN')
    }
    setLoading(false)
  }

  const handlePlayTrack = async (track) => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ''
    }
    if (track.source === 'spotify') {
      if (!deviceId) { setStatus('SPOTIFY PLAYER NOT READY...'); return }
      try {
        await playSpotifyTrack(track.uri, spotifyToken, deviceId)
        setCurrentTrack(track)
        setIsPlaying(true)
        setPosition(0)
        setDuration(track.duration)
        setStatus(`NOW PLAYING: ${track.name.toUpperCase()}`)
      } catch { setStatus('PLAYBACK ERROR') }
    } else {
      const audio = audioRef.current
      audio.src = track.previewUrl
      audio.volume = volume / 100
      audio.play()
      setCurrentTrack(track)
      setIsPlaying(true)
      setPosition(0)
      setDuration(30000)
      setStatus(`PREVIEW: ${track.name.toUpperCase()} (30s)`)
    }
  }

  const handleTogglePlay = async () => {
    if (!currentTrack) return
    if (currentTrack.source === 'spotify' && playerRef.current) {
      if (isPlaying) await playerRef.current.pause()
      else await playerRef.current.resume()
    } else {
      const audio = audioRef.current
      if (isPlaying) audio.pause()
      else audio.play()
    }
    setIsPlaying(p => !p)
  }

  const handleNext = () => {
    if (!results.length || !currentTrack) return
    const idx = results.findIndex(t => t.id === currentTrack.id)
    handlePlayTrack(results[(idx + 1) % results.length])
  }

  const handlePrev = () => {
    if (!results.length || !currentTrack) return
    const idx = results.findIndex(t => t.id === currentTrack.id)
    handlePlayTrack(results[(idx - 1 + results.length) % results.length])
  }

  const handleSeek = async (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const ms = Math.floor(pct * duration)
    setPosition(ms)
    if (currentTrack?.source === 'spotify' && playerRef.current) {
      await playerRef.current.seek(ms)
    } else if (audioRef.current) {
      audioRef.current.currentTime = ms / 1000
    }
  }

  const handleVolume = (e) => {
    const v = parseInt(e.target.value)
    setVolumeState(v)
    if (currentTrack?.source === 'itunes' && audioRef.current) {
      audioRef.current.volume = v / 100
    } else if (playerRef.current) {
      playerRef.current.setVolume(v / 100)
    }
  }

  const progressPct = duration ? Math.min(100, (position / duration) * 100) : 0

  return (
    <div className={styles.wrapper}>
      <audio ref={audioRef} />

      <div className={styles.window}>
        {/* Title bar */}
        <div className={styles.titleBar}>
          <div className={styles.titleDots}>
            <span className={styles.dot} style={{ background: '#ff5f57' }} />
            <span className={styles.dot} style={{ background: '#ffbd2e' }} />
            <span className={styles.dot} style={{ background: '#28c840' }} />
          </div>
          <span className={styles.titleText}>TAPE PLAYER v1.0</span>
          <div className={styles.closeBtn}>✕</div>
        </div>

        <div className={styles.body}>

          {/* Spotify connect banner */}
          {!spotifyToken ? (
            <button className={styles.connectBtn} onClick={onConnectSpotify}>
              ♫ CONNECT SPOTIFY FOR FULL SONGS
            </button>
          ) : (
            <div className={styles.connectedRow}>
              <span className={styles.connectedBadge}>✓ SPOTIFY CONNECTED</span>
              <button className={styles.disconnectBtn} onClick={onDisconnectSpotify}>DISCONNECT</button>
            </div>
          )}

          {/* Search */}
          <div className={styles.searchRow}>
            <input
              className={styles.searchInput}
              placeholder="ARTIST OR SONG NAME..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
            />
            <button className={styles.searchBtn} onClick={handleSearch}>SEARCH</button>
          </div>

          {/* ✨ Tape with overlaid song/artist label */}
          <div className={styles.tapeContainer}>
            <img
              src={isPlaying ? '/IMG_0001.GIF' : '/Tape_1.png'}
              alt="cassette tape"
              className={styles.tapeImg}
            />

            {/* Label overlay — sits inside the tape's label rectangle */}
            <div className={styles.tapeLabel}>
              <div className={styles.tapeSongName}>
                {currentTrack ? currentTrack.name : `TAPE PLAYER${blink ? ' ♪' : '  '}`}
              </div>
              <div className={styles.tapeArtistName}>
                {currentTrack ? currentTrack.artist : 'search a song to begin'}
              </div>
              {currentTrack?.source === 'itunes' && (
                <div className={styles.previewTag}>30s preview</div>
              )}
            </div>
          </div>

          {/* Controls row — no album art, cleaner layout */}
          <div className={styles.controls}>
            <div className={styles.progressBar} onClick={handleSeek}>
              <div className={styles.progressFill} style={{ width: `${progressPct}%` }} />
              <div className={styles.progressThumb} style={{ left: `${progressPct}%` }} />
            </div>
            <div className={styles.timeRow}>
              <span>{formatMs(position)}</span>
              <span>{formatMs(duration)}</span>
            </div>

            <div className={styles.btnRow}>
              <button className={styles.ctrlBtn} onClick={handlePrev}>◀◀</button>
              <button
                className={`${styles.ctrlBtn} ${styles.playBtn} ${isPlaying ? styles.playing : ''}`}
                onClick={handleTogglePlay}
              >
                {isPlaying ? '⏸' : '▶'}
              </button>
              <button className={styles.ctrlBtn} onClick={handleNext}>▶▶</button>

              <div className={styles.volumeRow}>
                <span className={styles.volLabel}>VOL</span>
                <input
                  type="range" min={0} max={100} value={volume}
                  onChange={handleVolume}
                  className={styles.volumeSlider}
                />
              </div>
            </div>
          </div>

          {/* Status bar */}
          <div className={styles.statusBar}>
            <span className={styles.statusDot} style={{
              background: spotifyToken ? '#1db954' : 'var(--pink-mid)'
            }} />
            {status}
          </div>
        </div>
      </div>

      {/* Results */}
      {(results.length > 0 || loading) && (
        <div className={styles.resultsWindow}>
          <div className={styles.titleBar}>
            <span className={styles.titleText}>
              {loading ? 'SEARCHING...' : `RESULTS (${results.length})`}
            </span>
          </div>
          <div className={styles.resultsList}>
            {loading ? (
              <div className={styles.loadingRow}>LOADING{blink ? '...' : '   '}</div>
            ) : results.map((track, i) => {
              const active = currentTrack?.id === track.id
              return (
                <div
                  key={track.id}
                  className={`${styles.trackRow} ${active ? styles.activeTrack : ''}`}
                  onClick={() => handlePlayTrack(track)}
                >
                  <span className={styles.trackNum}>{String(i + 1).padStart(2, '0')}</span>
                  {track.thumb && <img src={track.thumb} alt="" className={styles.trackThumb} />}
                  <div className={styles.trackDetails}>
                    <div className={styles.trackRowName}>
                      {active && isPlaying ? '▶ ' : ''}{track.name}
                    </div>
                    <div className={styles.trackRowArtist}>{track.artist} — {track.album}</div>
                  </div>
                  <span className={styles.trackDur}>{formatMs(track.duration)}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
