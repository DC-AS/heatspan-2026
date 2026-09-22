const ENDPOINT = 'https://api.geoapify.com/v1/geocode/autocomplete';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, message: 'Method not allowed.' });
  }
  const key = process.env.GEOAPIFY_API_KEY;
  if (!key) return res.status(503).json({ ok: false, message: 'Address suggestions are temporarily unavailable.' });

  const text = String(req.query?.q || '').trim().slice(0, 160);
  if (text.length < 3) return res.status(200).json({ ok: true, suggestions: [] });

  const params = new URLSearchParams({
    text,
    apiKey: key,
    format: 'json',
    limit: '6',
    lang: 'en',
    filter: 'countrycode:us',
    bias: 'proximity:-73.9442,40.6782'
  });

  try {
    const response = await fetch(`${ENDPOINT}?${params.toString()}`, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`Geoapify ${response.status}`);
    const data = await response.json();
    const suggestions = (data.results || [])
      .map((r) => ({
        label: r.formatted || [r.address_line1, r.address_line2].filter(Boolean).join(', '),
        borough: r.city || r.suburb || r.district || '',
        postcode: r.postcode || ''
      }))
      .filter((r) => r.label)
      .slice(0, 6);
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300');
    return res.status(200).json({ ok: true, suggestions });
  } catch (error) {
    console.error('Address autocomplete error:', error);
    return res.status(502).json({ ok: false, message: 'Address suggestions are temporarily unavailable.' });
  }
}
