/**
 * SkyCast Weather App — User Preference Routes
 *
 * Base path: /api/v1/user/preferences
 *
 * Preferences are stored per user account (authenticated) or
 * per anonymous device using a client-generated device_id stored locally.
 * Authenticated preferences override device-level preferences.
 */

const { Router } = require('express');
const { body }   = require('express-validator');
const { authenticate } = require('../middleware/auth.middleware');
const { validate }     = require('../middleware/validate.middleware');
const userController   = require('../controllers/user.controller');

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/user/preferences
 *
 * Returns the current user's app preferences.
 * For anonymous users, falls back to system defaults.
 *
 * Response 200:
 *   {
 *     units: {
 *       temperature:  "celsius" | "fahrenheit",
 *       wind_speed:   "kph" | "mph" | "ms" | "knots",
 *       pressure:     "mb" | "inhg",
 *       precipitation:"mm" | "in",
 *       distance:     "km" | "mi"
 *     },
 *     theme:          "light" | "dark" | "system",
 *     language:       String,     // ISO 639-1
 *     time_format:    "12h" | "24h",
 *     date_format:    "MDY" | "DMY" | "YMD",
 *     home_screen: {
 *       show_hourly_strip:  Boolean,
 *       show_daily_summary: Boolean,
 *       show_uv_index:      Boolean,
 *       show_feels_like:    Boolean,
 *       show_humidity:      Boolean,
 *       show_wind:          Boolean
 *     },
 *     widget: {
 *       size:           "small" | "medium" | "large",
 *       show_feels_like: Boolean,
 *       show_high_low:   Boolean
 *     },
 *     updated_at: ISO8601 | null
 *   }
 */
router.get(
  '/',
  authenticate({ required: false }),
  userController.getPreferences,
);

// ─────────────────────────────────────────────────────────────────────────────

/**
 * PATCH /api/v1/user/preferences
 *
 * Partially updates user preferences. Only fields included in the request
 * body are modified; all others remain unchanged (true PATCH semantics).
 *
 * Nested objects (units, home_screen, widget) are merged shallowly —
 * send only the specific nested key you want to change.
 *
 * Request body (application/json — all fields optional):
 *   {
 *     units: {
 *       temperature:   "celsius" | "fahrenheit",
 *       wind_speed:    "kph" | "mph" | "ms" | "knots",
 *       pressure:      "mb" | "inhg",
 *       precipitation: "mm" | "in",
 *       distance:      "km" | "mi"
 *     },
 *     theme:        "light" | "dark" | "system",
 *     language:     String,
 *     time_format:  "12h" | "24h",
 *     date_format:  "MDY" | "DMY" | "YMD",
 *     home_screen: {
 *       show_hourly_strip:  Boolean,
 *       show_daily_summary: Boolean,
 *       show_uv_index:      Boolean,
 *       show_feels_like:    Boolean,
 *       show_humidity:      Boolean,
 *       show_wind:          Boolean
 *     },
 *     widget: {
 *       size:            "small" | "medium" | "large",
 *       show_feels_like: Boolean,
 *       show_high_low:   Boolean
 *     }
 *   }
 *
 * Response 200:
 *   { preferences: { ...updated full preference object } }
 */
router.patch(
  '/',
  authenticate({ required: false }),
  [
    body('units').optional().isObject(),
    body('units.temperature').optional().isIn(['celsius', 'fahrenheit']),
    body('units.wind_speed').optional().isIn(['kph', 'mph', 'ms', 'knots']),
    body('units.pressure').optional().isIn(['mb', 'inhg']),
    body('units.precipitation').optional().isIn(['mm', 'in']),
    body('units.distance').optional().isIn(['km', 'mi']),

    body('theme').optional().isIn(['light', 'dark', 'system']),
    body('language').optional().isLength({ min: 2, max: 5 }),
    body('time_format').optional().isIn(['12h', '24h']),
    body('date_format').optional().isIn(['MDY', 'DMY', 'YMD']),

    body('home_screen').optional().isObject(),
    body('home_screen.show_hourly_strip').optional().isBoolean(),
    body('home_screen.show_daily_summary').optional().isBoolean(),
    body('home_screen.show_uv_index').optional().isBoolean(),
    body('home_screen.show_feels_like').optional().isBoolean(),
    body('home_screen.show_humidity').optional().isBoolean(),
    body('home_screen.show_wind').optional().isBoolean(),

    body('widget').optional().isObject(),
    body('widget.size').optional().isIn(['small', 'medium', 'large']),
    body('widget.show_feels_like').optional().isBoolean(),
    body('widget.show_high_low').optional().isBoolean(),
  ],
  validate,
  userController.updatePreferences,
);

// ─────────────────────────────────────────────────────────────────────────────

/**
 * DELETE /api/v1/user/preferences
 *
 * Resets all preferences to system defaults.
 *
 * Response 200:
 *   { preferences: { ...default preference object } }
 */
router.delete(
  '/',
  authenticate({ required: false }),
  userController.resetPreferences,
);

module.exports = router;