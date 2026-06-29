/**
 * SkyCast Weather App — Notification Routes
 *
 * Base path: /api/v1/notifications
 *
 * Push notification providers:
 *   iOS     → APNs (Apple Push Notification service)
 *   Android → FCM  (Firebase Cloud Messaging)
 *
 * Alert sources consumed:
 *   US  → NOAA/NWS
 *   EU  → Meteoalarm
 *   ROW → Tomorrow.io alert feeds
 *
 * A device token is tied to a (user | anonymous device) + platform + location set.
 * Authenticated users sync tokens across devices automatically.
 */

const { Router } = require('express');
const { body }   = require('express-validator');
const { authenticate } = require('../middleware/auth.middleware');
const { validate }     = require('../middleware/validate.middleware');
const notificationController = require('../controllers/notification.controller');

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// DEVICE TOKEN REGISTRATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/notifications/register
 *
 * Registers a device push token so the server can deliver alerts.
 * Safe to call on every app launch — duplicate tokens are idempotent.
 *
 * Request body (application/json):
 *   {
 *     token:      String,   // APNs device token or FCM registration token
 *     platform:   String,   // "ios" | "android"
 *     app_version: String,  // e.g. "1.2.0"
 *     device_id:  String    // Client-generated stable UUID (for anonymous users)
 *   }
 *
 * Response 200:
 *   {
 *     device_token_id: ObjectId,
 *     registered_at: ISO8601
 *   }
 *
 * Response 400: Invalid token format or missing required fields.
 *
 * Notes:
 *   - If the same device_id re-registers with a new token (token rotation),
 *     the old token is replaced automatically.
 *   - Tokens are never shared across users; re-assigning a device to a
 *     new account invalidates the previous association.
 */
router.post(
  '/register',
  authenticate({ required: false }),
  [
    body('token').notEmpty().withMessage('token is required'),
    body('platform')
      .isIn(['ios', 'android'])
      .withMessage('platform must be "ios" or "android"'),
    body('app_version')
      .notEmpty()
      .matches(/^\d+\.\d+\.\d+$/)
      .withMessage('app_version must be semver (e.g. "1.0.0")'),
    body('device_id')
      .notEmpty()
      .isUUID()
      .withMessage('device_id must be a valid UUID'),
  ],
  validate,
  notificationController.register,
);

// ─────────────────────────────────────────────────────────────────────────────

/**
 * DELETE /api/v1/notifications/register
 *
 * Unregisters a device push token.
 * Called when the user explicitly disables notifications in the app,
 * or when the OS reports a token has been invalidated.
 *
 * Request body (application/json):
 *   {
 *     token:     String,  // The token to unregister
 *     device_id: String   // UUID — cross-references the token
 *   }
 *
 * Response 204: Token unregistered.
 * Response 404: Token not found.
 */
router.delete(
  '/register',
  authenticate({ required: false }),
  [
    body('token').notEmpty().withMessage('token is required'),
    body('device_id').isUUID().withMessage('device_id must be a valid UUID'),
  ],
  validate,
  notificationController.unregister,
);

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATION PREFERENCES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/notifications/preferences
 *
 * Returns the notification preferences for the authenticated user
 * or anonymous device.
 *
 * Response 200:
 *   {
 *     severe_weather_alerts: Boolean,    // Extreme/Severe NOAA/Meteoalarm alerts
 *     moderate_weather_alerts: Boolean,  // Moderate/minor alerts
 *     daily_summary: {
 *       enabled: Boolean,
 *       time: "HH:MM",                   // 24h local time for morning briefing
 *       days: [0,1,2,3,4,5,6]           // Days of week (0=Sun). Empty = disabled.
 *     },
 *     rain_alert: {
 *       enabled: Boolean,
 *       threshold_mm: Float              // Alert when rain_prob > this amount
 *     },
 *     locations: [
 *       {
 *         location_id: ObjectId,
 *         name: String,
 *         alerts_enabled: Boolean
 *       }
 *     ],
 *     quiet_hours: {
 *       enabled: Boolean,
 *       start: "HH:MM",   // 24h local time
 *       end:   "HH:MM"    // Exclusive — e.g. "22:00" to "07:00"
 *     },
 *     updated_at: ISO8601 | null
 *   }
 */
router.get(
  '/preferences',
  authenticate({ required: false }),
  notificationController.getPreferences,
);

// ─────────────────────────────────────────────────────────────────────────────

/**
 * PATCH /api/v1/notifications/preferences
 *
 * Updates notification preferences. All fields are optional; unset fields
 * are left unchanged (PATCH semantics).
 *
 * Request body (application/json — all optional):
 *   {
 *     severe_weather_alerts:   Boolean,
 *     moderate_weather_alerts: Boolean,
 *     daily_summary: {
 *       enabled: Boolean,
 *       time:    "HH:MM",
 *       days:    [Integer]  // 0-6
 *     },
 *     rain_alert: {
 *       enabled:       Boolean,
 *       threshold_mm:  Float     // 0.5–50.0
 *     },
 *     locations: [
 *       { location_id: ObjectId, alerts_enabled: Boolean }
 *     ],
 *     quiet_hours: {
 *       enabled: Boolean,
 *       start:   "HH:MM",
 *       end:     "HH:MM"
 *     }
 *   }
 *
 * Response 200:
 *   { preferences: { ...updated full preferences object } }
 */
router.patch(
  '/preferences',
  authenticate({ required: false }),
  [
    body('severe_weather_alerts').optional().isBoolean(),
    body('moderate_weather_alerts').optional().isBoolean(),

    body('daily_summary').optional().isObject(),
    body('daily_summary.enabled').optional().isBoolean(),
    body('daily_summary.time')
      .optional()
      .matches(/^([01]\d|2[0-3]):[0-5]\d$/)
      .withMessage('time must be HH:MM (24h)'),
    body('daily_summary.days')
      .optional()
      .isArray()
      .custom((arr) => arr.every((d) => Number.isInteger(d) && d >= 0 && d <= 6))
      .withMessage('days must be an array of integers 0-6'),

    body('rain_alert').optional().isObject(),
    body('rain_alert.enabled').optional().isBoolean(),
    body('rain_alert.threshold_mm')
      .optional()
      .isFloat({ min: 0.5, max: 50 })
      .withMessage('threshold_mm must be between 0.5 and 50'),

    body('locations').optional().isArray(),
    body('locations.*.location_id').isMongoId(),
    body('locations.*.alerts_enabled').isBoolean(),

    body('quiet_hours').optional().isObject(),
    body('quiet_hours.enabled').optional().isBoolean(),
    body('quiet_hours.start')
      .optional()
      .matches(/^([01]\d|2[0-3]):[0-5]\d$/)
      .withMessage('start must be HH:MM (24h)'),
    body('quiet_hours.end')
      .optional()
      .matches(/^([01]\d|2[0-3]):[0-5]\d$/)
      .withMessage('end must be HH:MM (24h)'),
  ],
  validate,
  notificationController.updatePreferences,
);

// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/notifications/test
 *
 * Sends a test push notification to the calling device.
 * Useful during onboarding to verify permissions are correctly granted.
 *
 * Request body (application/json):
 *   {
 *     device_id: String   // UUID
 *   }
 *
 * Response 200:
 *   { sent: Boolean, message: String }
 *
 * Rate limit: 3 req/hour per device (prevent spam)
 */
router.post(
  '/test',
  authenticate({ required: false }),
  [body('device_id').isUUID().withMessage('device_id must be a valid UUID')],
  validate,
  notificationController.sendTest,
);

module.exports = router;