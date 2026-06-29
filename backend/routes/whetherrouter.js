/**
 * SkyCast Weather App — Weather Routes
 *
 * Base path: /api/v1/weather
 *
 * Data providers:
 *   Primary  → Tomorrow.io (hyperlocal precision)
 *   Fallback → Open-Meteo (open-source, ECMWF model)
 *   Alerts   → NOAA/NWS (US), Meteoalarm (EU)
 *   AQI      → OpenAQ (Pro, post-launch)
 */

const { Router } = require('express');
const { query, param } = require('express-validator');
const { authenticate } = require('../middleware/auth.middleware');
const { requirePro }   = require('../middleware/pro.middleware');
const { validate }     = require('../middleware/validate.middleware');
const { cache }        = require('../middleware/cache.middleware');
const weatherController = require('../controllers/weather.controller');

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// Shared query-param validators
// ─────────────────────────────────────────────────────────────────────────────
const locationParams = [
  query('lat')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('lat must be a float between -90 and 90'),
  query('lon')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('lon must be a float between -180 and 180'),
  query('location_id')
    .optional()
    .isMongoId()
    .withMessage('location_id must be a valid ObjectId'),
  query('units')
    .optional()
    .isIn(['metric', 'imperial'])
    .withMessage('units must be "metric" or "imperial"'),
];

// ─────────────────────────────────────────────────────────────────────────────
// FREE TIER ROUTES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/weather/current
 *
 * Returns real-time conditions for a given coordinate or saved location.
 *
 * Query params:
 *   lat          {Float}   Decimal latitude  (required if no location_id)
 *   lon          {Float}   Decimal longitude (required if no location_id)
 *   location_id  {ObjectId} Saved location ID (alternative to lat/lon)
 *   units        {String}  "metric" | "imperial"  (default: user preference)
 *
 * Response 200:
 *   {
 *     location: { name, region, country, lat, lon, timezone },
 *     current: {
 *       temp_c, temp_f, feels_like_c, feels_like_f,
 *       humidity_pct, wind_kph, wind_mph, wind_direction_deg, wind_direction_compass,
 *       uv_index, visibility_km, visibility_mi,
 *       condition: { code, text, icon_url },
 *       is_day: Boolean,
 *       pressure_mb, dew_point_c,
 *       observed_at: ISO8601
 *     },
 *     source: "tomorrow_io" | "open_meteo",
 *     fetched_at: ISO8601
 *   }
 *
 * Cache TTL: 10 minutes
 * Rate limit: 60 req/min (free), 300 req/min (pro)
 */
router.get(
  '/current',
  authenticate({ required: false }),
  locationParams,
  validate,
  cache({ ttl: 600, key: (req) => `weather:current:${req.query.lat}:${req.query.lon}:${req.query.units}` }),
  weatherController.getCurrent,
);

// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/weather/hourly
 *
 * Returns the next 24-hour breakdown in 1-hour increments.
 *
 * Query params:
 *   lat, lon, location_id, units  (same as /current)
 *   hours  {Integer}  Number of hours to return. Default: 24. Max: 48.
 *
 * Response 200:
 *   {
 *     location: { name, lat, lon, timezone },
 *     hourly: [
 *       {
 *         time: ISO8601,
 *         temp_c, temp_f, feels_like_c, feels_like_f,
 *         humidity_pct, wind_kph, wind_mph, wind_direction_deg,
 *         precip_mm, precip_in, precip_prob_pct,
 *         uv_index, cloud_cover_pct,
 *         condition: { code, text, icon_url },
 *         is_day: Boolean
 *       }
 *     ],
 *     source, fetched_at
 *   }
 *
 * Cache TTL: 30 minutes
 */
router.get(
  '/hourly',
  authenticate({ required: false }),
  [
    ...locationParams,
    query('hours')
      .optional()
      .isInt({ min: 1, max: 48 })
      .toInt()
      .withMessage('hours must be an integer between 1 and 48'),
  ],
  validate,
  cache({ ttl: 1800 }),
  weatherController.getHourly,
);

// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/weather/daily
 *
 * Returns a 7-day daily forecast (free) or 10-day extended forecast (Pro).
 *
 * Query params:
 *   lat, lon, location_id, units  (same as /current)
 *   days  {Integer}  1-7 (free) | 1-10 (Pro). Default: 7.
 *
 * Response 200:
 *   {
 *     location: { name, lat, lon, timezone },
 *     daily: [
 *       {
 *         date: "YYYY-MM-DD",
 *         temp_max_c, temp_max_f, temp_min_c, temp_min_f,
 *         feels_like_max_c, feels_like_min_c,
 *         humidity_avg_pct,
 *         wind_max_kph, wind_max_mph,
 *         precip_total_mm, precip_total_in, precip_prob_pct,
 *         uv_index_max, sunrise: ISO8601, sunset: ISO8601,
 *         condition: { code, text, icon_url },
 *         // Pro only:
 *         confidence_pct: Number | null
 *       }
 *     ],
 *     source, fetched_at
 *   }
 *
 * Cache TTL: 1 hour
 */
router.get(
  '/daily',
  authenticate({ required: false }),
  [
    ...locationParams,
    query('days')
      .optional()
      .isInt({ min: 1, max: 10 })
      .toInt()
      .withMessage('days must be an integer between 1 and 10'),
  ],
  validate,
  cache({ ttl: 3600 }),
  weatherController.getDaily,
);

// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/weather/alerts
 *
 * Returns active severe weather alerts for a location.
 * Sources: NOAA/NWS (US coordinates), Meteoalarm (EU coordinates).
 *
 * Query params:
 *   lat, lon, location_id  (same as /current)
 *   lang  {String}  ISO 639-1 language code for alert text. Default: "en".
 *
 * Response 200:
 *   {
 *     location: { name, lat, lon },
 *     alerts: [
 *       {
 *         id: String,
 *         source: "nws" | "meteoalarm",
 *         headline: String,
 *         description: String,
 *         severity: "extreme" | "severe" | "moderate" | "minor" | "unknown",
 *         certainty: "observed" | "likely" | "possible" | "unlikely",
 *         event_type: String,
 *         area: String,
 *         effective: ISO8601,
 *         expires: ISO8601,
 *         url: String
 *       }
 *     ],
 *     fetched_at
 *   }
 *
 * Cache TTL: 5 minutes (alerts change quickly)
 */
router.get(
  '/alerts',
  authenticate({ required: false }),
  [
    ...locationParams,
    query('lang')
      .optional()
      .isLength({ min: 2, max: 5 })
      .withMessage('lang must be a valid ISO 639-1 code'),
  ],
  validate,
  cache({ ttl: 300 }),
  weatherController.getAlerts,
);

// ─────────────────────────────────────────────────────────────────────────────
// PRO ROUTES  (require valid Pro subscription)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/weather/minute
 * [PRO]
 *
 * Returns next-hour precipitation forecast in 1-minute increments.
 *
 * Query params:
 *   lat, lon, location_id, units  (same as /current)
 *
 * Response 200:
 *   {
 *     location: { name, lat, lon, timezone },
 *     summary: String,   // e.g. "Rain starting in 12 minutes"
 *     minutely: [
 *       {
 *         time: ISO8601,
 *         precip_intensity_mm_hr,  // mm/hr precipitation rate
 *         precip_prob_pct,
 *         precip_type: "none" | "rain" | "drizzle" | "snow" | "sleet" | "ice_pellets"
 *       }
 *     ],  // 60 items
 *     source, fetched_at
 *   }
 *
 * Cache TTL: 5 minutes
 */
router.get(
  '/minute',
  authenticate({ required: true }),
  requirePro,
  locationParams,
  validate,
  cache({ ttl: 300 }),
  weatherController.getMinute,
);

// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/weather/radar
 * [PRO]
 *
 * Returns animated precipitation radar tile URLs for a given region.
 * Tiles follow the standard {z}/{x}/{y}.png Slippy Map convention.
 *
 * Query params:
 *   lat, lon, location_id  (same as /current)
 *   frames  {Integer}  Number of past frames to include. Default: 10. Max: 30.
 *
 * Response 200:
 *   {
 *     location: { lat, lon },
 *     radar: {
 *       tile_url_template: String,  // e.g. "https://tiles.skycast.app/radar/{z}/{x}/{y}.png?t={timestamp}"
 *       frames: [
 *         { timestamp: ISO8601, tile_url: String }
 *       ],
 *       refresh_interval_sec: 300
 *     },
 *     fetched_at
 *   }
 *
 * Cache TTL: 5 minutes
 */
router.get(
  '/radar',
  authenticate({ required: true }),
  requirePro,
  [
    ...locationParams,
    query('frames')
      .optional()
      .isInt({ min: 1, max: 30 })
      .toInt()
      .withMessage('frames must be between 1 and 30'),
  ],
  validate,
  cache({ ttl: 300 }),
  weatherController.getRadar,
);

// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/weather/aqi
 * [PRO]
 *
 * Returns real-time Air Quality Index and pollutant breakdown.
 * Source: OpenAQ
 *
 * Query params:
 *   lat, lon, location_id  (same as /current)
 *
 * Response 200:
 *   {
 *     location: { name, lat, lon },
 *     aqi: {
 *       index: Integer,            // 0-500 US AQI
 *       category: "Good" | "Moderate" | "Unhealthy for Sensitive Groups" | "Unhealthy" | "Very Unhealthy" | "Hazardous",
 *       dominant_pollutant: String,
 *       health_recommendation: String,
 *       pollutants: {
 *         pm25:  { value: Float, unit: "µg/m³" },
 *         pm10:  { value: Float, unit: "µg/m³" },
 *         o3:    { value: Float, unit: "ppb" },
 *         no2:   { value: Float, unit: "ppb" },
 *         so2:   { value: Float, unit: "ppb" },
 *         co:    { value: Float, unit: "ppm" }
 *       },
 *       observed_at: ISO8601,
 *       source_station: String
 *     },
 *     fetched_at
 *   }
 *
 * Cache TTL: 15 minutes
 */
router.get(
  '/aqi',
  authenticate({ required: true }),
  requirePro,
  locationParams,
  validate,
  cache({ ttl: 900 }),
  weatherController.getAqi,
);

// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/weather/pollen
 * [PRO]
 *
 * Returns daily pollen count levels for tree, grass, and weed.
 *
 * Query params:
 *   lat, lon, location_id  (same as /current)
 *   days  {Integer}  1-5. Default: 3.
 *
 * Response 200:
 *   {
 *     location: { name, lat, lon },
 *     pollen: [
 *       {
 *         date: "YYYY-MM-DD",
 *         tree:  { index: Integer, category: "None"|"Low"|"Moderate"|"High"|"Very High", types: [String] },
 *         grass: { index: Integer, category: String },
 *         weed:  { index: Integer, category: String }
 *       }
 *     ],
 *     fetched_at
 *   }
 *
 * Cache TTL: 6 hours
 */
router.get(
  '/pollen',
  authenticate({ required: true }),
  requirePro,
  [
    ...locationParams,
    query('days')
      .optional()
      .isInt({ min: 1, max: 5 })
      .toInt()
      .withMessage('days must be between 1 and 5'),
  ],
  validate,
  cache({ ttl: 21600 }),
  weatherController.getPollen,
);

// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/weather/history
 * [PRO]
 *
 * Returns historical weather data for a specific date or date range.
 * Max range: 30 days per request.
 *
 * Query params:
 *   lat, lon, location_id, units  (same as /current)
 *   date       {String}  "YYYY-MM-DD"  — single day (mutually exclusive with start/end)
 *   start_date {String}  "YYYY-MM-DD"  — range start
 *   end_date   {String}  "YYYY-MM-DD"  — range end (max 30 days after start)
 *
 * Response 200:
 *   {
 *     location: { name, lat, lon, timezone },
 *     history: [
 *       {
 *         date: "YYYY-MM-DD",
 *         temp_max_c, temp_max_f, temp_min_c, temp_min_f, temp_avg_c,
 *         humidity_avg_pct,
 *         wind_max_kph, wind_max_mph,
 *         precip_total_mm, precip_total_in,
 *         uv_index_max, sunshine_hours,
 *         condition: { code, text }
 *       }
 *     ],
 *     source, fetched_at
 *   }
 *
 * Cache TTL: 24 hours (historical data does not change)
 */
router.get(
  '/history',
  authenticate({ required: true }),
  requirePro,
  [
    ...locationParams,
    query('date')
      .optional()
      .isISO8601()
      .withMessage('date must be in YYYY-MM-DD format'),
    query('start_date')
      .optional()
      .isISO8601()
      .withMessage('start_date must be in YYYY-MM-DD format'),
    query('end_date')
      .optional()
      .isISO8601()
      .withMessage('end_date must be in YYYY-MM-DD format'),
  ],
  validate,
  cache({ ttl: 86400 }),
  weatherController.getHistory,
);

module.exports = router;