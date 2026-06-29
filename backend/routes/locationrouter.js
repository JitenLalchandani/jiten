/**
 * SkyCast Weather App — Location Routes
 *
 * Base path: /api/v1/locations
 *
 * Geocoding providers:
 *   Primary  → Mapbox Search API
 *   Fallback → OpenStreetMap Nominatim
 *
 * Free-tier cap: 5 saved locations.
 * Pro: unlimited saved locations.
 */

const { Router } = require('express');
const { query, body, param } = require('express-validator');
const { authenticate }  = require('../middleware/auth.middleware');
const { requirePro }    = require('../middleware/pro.middleware');
const { validate }      = require('../middleware/validate.middleware');
const { cache }         = require('../middleware/cache.middleware');
const locationController = require('../controllers/location.controller');

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// GEOCODING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/locations/search
 *
 * Search for a location by city name, zip/postal code, or coordinate string.
 * Returns a ranked list of matching places for the user to select from.
 *
 * Query params:
 *   q      {String}  Search query (city, zip, "lat,lon"). Min 2 chars.
 *   limit  {Integer} Max results. Default: 5. Max: 10.
 *   lang   {String}  ISO 639-1 language for result names. Default: "en".
 *
 * Response 200:
 *   {
 *     results: [
 *       {
 *         place_id: String,        // Provider-specific stable ID
 *         name: String,            // e.g. "San Francisco"
 *         display_name: String,    // e.g. "San Francisco, CA, US"
 *         region: String,
 *         country: String,
 *         country_code: String,    // ISO 3166-1 alpha-2
 *         lat: Float,
 *         lon: Float,
 *         timezone: String,        // IANA timezone, e.g. "America/Los_Angeles"
 *         place_type: "city" | "town" | "village" | "suburb" | "postcode" | "coordinate"
 *       }
 *     ],
 *     source: "mapbox" | "nominatim",
 *     query: String
 *   }
 *
 * Cache TTL: 1 hour (geocoding results are stable)
 * Rate limit: 30 req/min per IP
 */
router.get(
  '/search',
  [
    query('q')
      .notEmpty()
      .isLength({ min: 2, max: 200 })
      .trim()
      .withMessage('q must be between 2 and 200 characters'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 10 })
      .toInt()
      .withMessage('limit must be an integer between 1 and 10'),
    query('lang')
      .optional()
      .isLength({ min: 2, max: 5 })
      .withMessage('lang must be a valid ISO 639-1 code'),
  ],
  validate,
  cache({ ttl: 3600, key: (req) => `location:search:${req.query.q}:${req.query.lang}` }),
  locationController.search,
);

// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/locations/detect
 *
 * Resolves a coordinate (GPS) or client IP address into a human-readable
 * location name and timezone. Used on first app launch before the user
 * has saved any locations.
 *
 * Query params:
 *   lat  {Float}  GPS latitude  (optional; if omitted, IP geolocation is used)
 *   lon  {Float}  GPS longitude (optional; must be paired with lat)
 *
 * Headers:
 *   X-Forwarded-For  {String}  Populated by load balancer for IP fallback.
 *
 * Response 200:
 *   {
 *     method: "gps" | "ip",
 *     location: {
 *       place_id: String,
 *       name: String,
 *       display_name: String,
 *       region: String,
 *       country: String,
 *       country_code: String,
 *       lat: Float,
 *       lon: Float,
 *       timezone: String,
 *       accuracy_km: Float   // Approximate accuracy radius
 *     }
 *   }
 *
 * Notes:
 *   - GPS coordinates are never stored server-side per privacy policy.
 *   - IP geolocation is city-level only (±50 km typical accuracy).
 */
router.get(
  '/detect',
  [
    query('lat')
      .optional()
      .isFloat({ min: -90, max: 90 })
      .withMessage('lat must be a float between -90 and 90'),
    query('lon')
      .optional()
      .isFloat({ min: -180, max: 180 })
      .withMessage('lon must be a float between -180 and 180'),
  ],
  validate,
  locationController.detect,
);

// ─────────────────────────────────────────────────────────────────────────────
// SAVED LOCATIONS  (require authentication)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/locations/saved
 *
 * Returns all saved locations for the authenticated user, ordered by
 * the user-defined display order.
 *
 * Response 200:
 *   {
 *     locations: [
 *       {
 *         id: ObjectId,
 *         place_id: String,
 *         name: String,
 *         display_name: String,
 *         country_code: String,
 *         lat: Float,
 *         lon: Float,
 *         timezone: String,
 *         order: Integer,       // 0-based display order
 *         is_default: Boolean,  // Primary "home" location
 *         created_at: ISO8601
 *       }
 *     ],
 *     count: Integer,
 *     limit: 5 | null   // null for Pro users (unlimited)
 *   }
 */
router.get(
  '/saved',
  authenticate({ required: false }),
  locationController.getSaved,
);

// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/locations/saved
 *
 * Adds a new saved location for the authenticated user.
 * Free-tier users are limited to 5 saved locations; Pro users are unlimited.
 *
 * Request body (application/json):
 *   {
 *     place_id:     String  (required) — from /locations/search result
 *     name:         String  (required) — display name
 *     display_name: String  (required) — full display name
 *     country_code: String  (required) — ISO 3166-1 alpha-2
 *     lat:          Float   (required)
 *     lon:          Float   (required)
 *     timezone:     String  (required) — IANA timezone
 *     is_default:   Boolean (optional, default: false)
 *   }
 *
 * Response 201:
 *   { location: { id, place_id, name, display_name, ... , created_at } }
 *
 * Response 409: Location already saved.
 * Response 403: Free-tier limit reached (5 locations). Prompts Pro upgrade.
 */
router.post(
  '/saved',
  authenticate({ required: false }),
  [
    body('place_id').notEmpty().withMessage('place_id is required'),
    body('name').notEmpty().isLength({ max: 100 }).trim().withMessage('name is required (max 100 chars)'),
    body('display_name').notEmpty().isLength({ max: 200 }).trim().withMessage('display_name is required'),
    body('country_code').isLength({ min: 2, max: 2 }).isAlpha().withMessage('country_code must be a 2-letter ISO code'),
    body('lat').isFloat({ min: -90, max: 90 }).withMessage('lat must be a float between -90 and 90'),
    body('lon').isFloat({ min: -180, max: 180 }).withMessage('lon must be a float between -180 and 180'),
    body('timezone').notEmpty().withMessage('timezone is required (IANA format)'),
    body('is_default').optional().isBoolean().withMessage('is_default must be a boolean'),
  ],
  validate,
  locationController.addSaved,
);

// ─────────────────────────────────────────────────────────────────────────────

/**
 * PATCH /api/v1/locations/saved/:id
 *
 * Updates metadata for a saved location (e.g. rename, set as default).
 *
 * Path params:
 *   id  {ObjectId}  Saved location ID
 *
 * Request body (application/json — all fields optional):
 *   {
 *     name:       String   Custom display name override
 *     is_default: Boolean  Set as the primary location
 *   }
 *
 * Response 200:
 *   { location: { id, name, is_default, updated_at } }
 *
 * Response 404: Location not found or not owned by user.
 */
router.patch(
  '/saved/:id',
  authenticate({ required: false }),
  [
    param('id').isInt().withMessage('id must be a valid integer'),
    body('name').optional().isLength({ min: 1, max: 100 }).trim(),
    body('is_default').optional().isBoolean(),
  ],
  validate,
  locationController.updateSaved,
);

// ─────────────────────────────────────────────────────────────────────────────

/**
 * DELETE /api/v1/locations/saved/:id
 *
 * Removes a saved location. If the deleted location was the default,
 * the next location in the list (order 0) becomes the new default.
 *
 * Path params:
 *   id  {ObjectId}  Saved location ID
 *
 * Response 204: No content.
 * Response 404: Location not found or not owned by user.
 */
router.delete(
  '/saved/:id',
  authenticate({ required: false }),
  [param('id').isInt().withMessage('id must be a valid integer')],
  validate,
  locationController.deleteSaved,
);

// ─────────────────────────────────────────────────────────────────────────────

/**
 * PUT /api/v1/locations/saved/reorder
 *
 * Updates the display order of all saved locations.
 * Client sends the complete ordered array of IDs.
 *
 * Request body (application/json):
 *   {
 *     ids: [ObjectId, ObjectId, ...]   // All saved location IDs in desired order
 *   }
 *
 * Response 200:
 *   { locations: [{ id, name, order }] }
 *
 * Response 400: ids array does not match the user's saved location set exactly.
 */
router.put(
  '/saved/reorder',
  authenticate({ required: false }),
  [
    body('ids')
      .isArray({ min: 1 })
      .withMessage('ids must be a non-empty array'),
    body('ids.*')
      .isInt()
      .withMessage('Each id must be a valid integer'),
  ],
  validate,
  locationController.reorderSaved,
);

module.exports = router;