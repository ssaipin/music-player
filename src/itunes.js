// iTunes Search API — no auth needed, 30-sec previews
export async function searchItunes(query) {
  const res = await fetch(
    `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&entity=song&limit=20`
  )
  if (!res.ok) throw new Error('iTunes search failed')
  const data = await res.json()
  return data.results
    .filter(t => t.previewUrl)
    .map(t => ({
      id: String(t.trackId),
      name: t.trackName,
      artist: t.artistName,
      album: t.collectionName,
      duration: t.trackTimeMillis,
      art: t.artworkUrl100?.replace('100x100', '200x200'),
      thumb: t.artworkUrl60,
      previewUrl: t.previewUrl,
      source: 'itunes',
    }))
}
