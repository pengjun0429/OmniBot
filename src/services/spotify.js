const axios = require('axios');

let token = null;
let tokenExpiry = 0;

async function getToken() {
  if (token && Date.now() < tokenExpiry) return token;
  const id = process.env.SPOTIFY_CLIENT_ID;
  const secret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!id || !secret) return null;

  try {
    const res = await axios.post('https://accounts.spotify.com/api/token',
      new URLSearchParams({ grant_type: 'client_credentials' }),
      {
        headers: {
          'Authorization': 'Basic ' + Buffer.from(id + ':' + secret).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 10000,
      }
    );
    token = res.data.access_token;
    tokenExpiry = Date.now() + (res.data.expires_in - 60) * 1000;
    return token;
  } catch { return null; }
}

async function search(query, limit = 1) {
  const t = await getToken();
  if (!t) return [];
  try {
    const res = await axios.get('https://api.spotify.com/v1/search', {
      params: { q: query, type: 'track', limit },
      headers: { 'Authorization': `Bearer ${t}` },
      timeout: 10000,
    });
    return (res.data?.tracks?.items || []).map(item => ({
      title: item.name,
      artist: item.artists.map(a => a.name).join(', '),
      album: item.album.name,
      cover: item.album.images?.[0]?.url || '',
      url: item.external_urls.spotify,
      duration: Math.floor(item.duration_ms / 1000),
    }));
  } catch { return []; }
}

module.exports = { search };
