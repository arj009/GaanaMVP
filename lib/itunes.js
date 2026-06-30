/**
 * iTunes Lookup Service
 * Used ONLY as an audio delivery layer — fetches 30-second preview URLs
 * and album artwork for songs recommended by the LLM.
 */

export async function lookupSong(songName, artistName) {
  const query = encodeURIComponent(`${songName} ${artistName}`);
  const country = process.env.ITUNES_COUNTRY || "IN";
  const url = `https://itunes.apple.com/search?term=${query}&entity=song&limit=5&country=${country}`;

  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();

    if (!data.results || data.results.length === 0) return null;

    // Find the best match by checking if artist name partially matches
    const match = data.results.find(track =>
      track.artistName.toLowerCase().includes(artistName.toLowerCase().split(' ')[0]) &&
      track.previewUrl
    ) || data.results.find(track => track.previewUrl) || data.results[0];

    if (!match?.previewUrl) return null;

    return {
      preview_url: match.previewUrl,
      artwork_url: match.artworkUrl100,
      itunes_id: match.trackId
    };
  } catch (err) {
    console.error(`iTunes lookup failed for "${songName}" by ${artistName}:`, err.message);
    return null;
  }
}

/**
 * Batch lookup: Takes an array of LLM-recommended songs and enriches them
 * with iTunes preview URLs and artwork. Filters out songs without previews.
 */
export async function enrichWithiTunes(songs) {
  const enriched = await Promise.all(
    songs.map(async (song) => {
      const itunesData = await lookupSong(song.song, song.artist);
      if (!itunesData) return null; // Skip songs not found on iTunes

      return {
        ...song,
        preview_url: itunesData.preview_url,
        artwork_url: itunesData.artwork_url,
        itunes_id: itunesData.itunes_id
      };
    })
  );

  // Filter out nulls (songs without iTunes data) and return top 6
  return enriched.filter(Boolean).slice(0, 6);
}
