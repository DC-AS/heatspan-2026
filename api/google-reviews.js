module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=3600');
  if (req.method !== 'GET') return res.status(405).json({ ok:false, message:'Method not allowed.' });
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) return res.status(503).json({ ok:false, configured:false, message:'Google Places connection is not configured.' });
  try {
    const search = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method:'POST',
      headers:{'Content-Type':'application/json','X-Goog-Api-Key':key,'X-Goog-FieldMask':'places.id,places.displayName,places.formattedAddress'},
      body:JSON.stringify({ textQuery:'Heatspan 1980 E 35th St Brooklyn NY 11234' })
    });
    if (!search.ok) throw new Error('Place lookup failed');
    const sj = await search.json();
    const place = sj.places && sj.places[0];
    if (!place || !place.id) throw new Error('Heatspan Google Business Profile could not be found');
    const details = await fetch('https://places.googleapis.com/v1/places/'+encodeURIComponent(place.id), {
      headers:{'X-Goog-Api-Key':key,'X-Goog-FieldMask':'displayName,rating,userRatingCount,reviews,googleMapsUri'}
    });
    if (!details.ok) throw new Error('Review lookup failed');
    const d = await details.json();
    const reviews = (d.reviews || []).filter(r => Number(r.rating) === 5).map(r => ({
      rating:r.rating,
      authorName:(r.authorAttribution && r.authorAttribution.displayName) || 'Google customer',
      authorUri:r.authorAttribution && r.authorAttribution.uri,
      text:(r.text && r.text.text) || (r.originalText && r.originalText.text) || '',
      relativeTime:r.relativePublishTimeDescription || '',
      publishTime:r.publishTime || ''
    }));
    return res.status(200).json({ok:true,placeId:place.id,name:d.displayName && d.displayName.text,rating:d.rating,userRatingCount:d.userRatingCount,googleMapsUri:d.googleMapsUri,reviews});
  } catch (e) {
    return res.status(502).json({ok:false,message:'Google reviews are temporarily unavailable.'});
  }
};
