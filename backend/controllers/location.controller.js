async function search(req, res) {
  const query = String(req.query.q || '').trim();
  const limit = Math.min(parseInt(req.query.limit, 10) || 5, 10);
  const lang = String(req.query.lang || 'en');

  const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
  url.searchParams.set('name', query);
  url.searchParams.set('count', String(limit));
  url.searchParams.set('language', lang);

  const response = await fetch(url.toString(), {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    return res.status(502).json({ error: `Geocoding service returned ${response.status}` });
  }

  const payload = await response.json();
  const results = (payload.results || []).map((item) => {
    const region = item.admin1 || item.admin2 || item.country || '';
    const displayName = item.name + (item.admin1 ? `, ${item.admin1}` : '') + (item.country ? `, ${item.country}` : '');

    return {
      place_id: String(item.id || `${item.latitude},${item.longitude}`),
      id: String(item.id || `${item.latitude},${item.longitude}`),
      name: item.name || query,
      display_name: displayName,
      region,
      country: item.country || '',
      country_code: (item.country_code || '').toUpperCase(),
      lat: Number(item.latitude),
      lon: Number(item.longitude),
      timezone: item.timezone || 'UTC',
      place_type: item.feature_code || 'place',
    };
  });

  res.json({ source: 'open-meteo', query, results });
}

function detect(req, res) {
  res.json({ method: 'ip', location: { place_id: 'mock', name: 'San Francisco', display_name: 'San Francisco, CA, US', region: 'CA', country: 'US', country_code: 'US', lat: 37.77, lon: -122.42, timezone: 'America/Los_Angeles', accuracy_km: 50 } });
}

const db = require('../db');

function mapDbLocation(loc) {
  return {
    id: String(loc.id),
    place_id: loc.place_id,
    name: loc.name,
    display_name: loc.display_name,
    region: loc.region,
    country: loc.country,
    country_code: loc.country_code,
    lat: loc.lat,
    lon: loc.lon,
    timezone: loc.timezone,
    order: loc.order_index,
    is_default: Boolean(loc.is_default),
    created_at: loc.created_at,
  };
}

function getSaved(req, res) {
  const userId = req.user.id;
  const rows = db.getSavedLocations.all(userId);
  const locations = rows.map(mapDbLocation);
  const count = locations.length;
  return res.json({ locations, count, limit: null });
}

function addSaved(req, res) {
  const userId = req.user.id;
  const existing = db.getLocationByPlaceId.get(req.body.place_id, userId);
  if (existing) {
    return res.status(409).json({ error: 'Location already saved' });
  }

  const now = new Date().toISOString();
  const orderIndex = db.getSavedCount.get(userId).count;
  const info = db.insertLocation.run(
    userId,
    req.body.place_id,
    req.body.name,
    req.body.display_name,
    req.body.region || '',
    req.body.country || '',
    req.body.country_code || '',
    req.body.lat,
    req.body.lon,
    req.body.timezone,
    req.body.is_default ? 1 : 0,
    orderIndex,
    now,
  );

  const location = db.getLocationById.get(info.lastInsertRowid, userId);
  return res.status(201).json({ location: mapDbLocation(location) });
}

function updateSaved(req, res) {
  const userId = req.user.id;
  db.updateLocation.run(
    req.body.name || '',
    req.body.display_name || '',
    req.body.region || '',
    req.body.country || '',
    req.body.country_code || '',
    req.body.timezone || 'UTC',
    req.body.is_default ? 1 : 0,
    req.params.id,
    userId,
  );
  const location = db.getLocationById.get(req.params.id, userId);
  if (!location) {
    return res.status(404).json({ error: 'Location not found' });
  }
  return res.json({ location: mapDbLocation(location) });
}

function deleteSaved(req, res) {
  const userId = req.user.id;
  const location = db.getLocationById.get(req.params.id, userId);
  if (!location) {
    return res.status(404).json({ error: 'Location not found' });
  }
  db.deleteLocation.run(req.params.id, userId);
  return res.status(204).send();
}

function reorderSaved(req, res) {
  const userId = req.user.id;
  db.reorderLocations(req.user.id, req.body.ids);
  const locations = db.getSavedLocations.all(userId).map(mapDbLocation);
  return res.json({ locations });
}

module.exports = { search, detect, getSaved, addSaved, updateSaved, deleteSaved, reorderSaved };
