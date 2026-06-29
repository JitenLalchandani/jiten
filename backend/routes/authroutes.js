/**
 * SkyCast Weather App — Auth Routes
 *
 * Base path: /api/v1/auth
 *
 * Strategy:
 *   - OAuth 2.0 via Google Sign-In and Apple Sign-In
 *   - JWT access tokens  (short-lived: 15 minutes)
 *   - Refresh tokens     (long-lived: 30 days, stored as httpOnly cookies)
 *   - No username/password auth — accounts are required only for Pro features
 *
 * Privacy:
 *   - No location data is stored server-side
 *   - Minimal PII: email (hashed) + provider sub ID only
 *   - GDPR/CCPA compliant — right to erasure via DELETE /me
 */

const { Router }  = require('express');
const { body }    = require('express-validator');
const { authenticate } = require('../middleware/auth.middleware');
const { validate }     = require('../middleware/validate.middleware');
const { rateLimitStrict } = require('../middleware/rate-limit.middleware');
const authController = require('../controllers/auth.controller');

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// OAUTH — GOOGLE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/auth/google
 *
 * Exchanges a Google ID token (obtained client-side via Google Sign-In SDK)
 * for a SkyCast JWT access token and refresh token.
 *
 * Request body (application/json):
 *   {
 *     id_token: String   // Google ID token from Google Sign-In
 *   }
 *
 * Response 200 (existing user):
 *   {
 *     access_token: String,   // JWT, 15-min expiry
 *     token_type: "Bearer",
 *     expires_in: 900,        // seconds
 *     user: {
 *       id: ObjectId,
 *       email_hash: String,   // SHA-256 of email — never return raw email
 *       display_name: String,
 *       avatar_url: String | null,
 *       is_pro: Boolean,
 *       created_at: ISO8601
 *     }
 *   }
 *   Set-Cookie: refresh_token=...; HttpOnly; Secure; SameSite=Strict; Max-Age=2592000
 *
 * Response 201 (new user, first login):
 *   { ...same shape, user.created_at is now }
 *
 * Response 401: Invalid or expired Google ID token.
 *
 * Rate limit: 10 req/min per IP (strict — auth endpoint)
 */
router.post(
  '/google',
  rateLimitStrict,
  [body('id_token').notEmpty().withMessage('id_token is required')],
  validate,
  authController.loginWithGoogle,
);

// ─────────────────────────────────────────────────────────────────────────────
// OAUTH — APPLE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/auth/apple
 *
 * Exchanges an Apple identity token (from Sign in with Apple) for a
 * SkyCast JWT access token and refresh token.
 *
 * Request body (application/json):
 *   {
 *     identity_token: String,     // JWT from Apple
 *     authorization_code: String, // One-time code from Apple
 *     full_name: {                // Only present on FIRST login (Apple sends once)
 *       given_name: String | null,
 *       family_name: String | null
 *     }
 *   }
 *
 * Response 200/201 — same shape as /auth/google
 *
 * Notes:
 *   - Apple sends full_name only on the first authentication.
 *     Store it immediately; subsequent logins will not include it.
 *   - Apple's "Hide My Email" relay addresses are fully supported.
 *
 * Rate limit: 10 req/min per IP
 */
router.post(
  '/apple',
  rateLimitStrict,
  [
    body('identity_token').notEmpty().withMessage('identity_token is required'),
    body('authorization_code').notEmpty().withMessage('authorization_code is required'),
    body('full_name').optional().isObject(),
    body('full_name.given_name').optional().isString().isLength({ max: 100 }),
    body('full_name.family_name').optional().isString().isLength({ max: 100 }),
  ],
  validate,
  authController.loginWithApple,
);

// ─────────────────────────────────────────────────────────────────────────────
// TOKEN MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/auth/refresh
 *
 * Issues a new access token using the httpOnly refresh token cookie.
 * Implements refresh token rotation: the old refresh token is invalidated
 * and a new one is issued.
 *
 * Request:
 *   Cookie: refresh_token=<token>   (set automatically by browser/WebKit)
 *
 * Response 200:
 *   {
 *     access_token: String,
 *     token_type: "Bearer",
 *     expires_in: 900
 *   }
 *   Set-Cookie: refresh_token=<new_token>; HttpOnly; Secure; ...
 *
 * Response 401: Refresh token missing, expired, or already rotated (replay attack).
 *
 * Rate limit: 20 req/min per user
 */
router.post(
  '/refresh',
  authController.refresh,
);

// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/auth/logout
 *
 * Revokes the current refresh token and clears the cookie.
 * Access tokens are stateless JWTs; they expire on their own after 15 minutes.
 *
 * Request:
 *   Authorization: Bearer <access_token>
 *   Cookie: refresh_token=<token>
 *
 * Query params:
 *   all  {Boolean}  If true, revokes ALL refresh tokens for this user
 *                   (signs out all devices). Default: false.
 *
 * Response 204: No content. Cookie cleared.
 */
router.post(
  '/logout',
  authenticate({ required: true }),
  authController.logout,
);

// ─────────────────────────────────────────────────────────────────────────────
// CURRENT USER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/auth/me
 *
 * Returns the authenticated user's profile.
 *
 * Response 200:
 *   {
 *     id: ObjectId,
 *     email_hash: String,
 *     display_name: String,
 *     avatar_url: String | null,
 *     provider: "google" | "apple",
 *     is_pro: Boolean,
 *     pro_expires_at: ISO8601 | null,
 *     created_at: ISO8601,
 *     last_login_at: ISO8601
 *   }
 */
router.get(
  '/me',
  authenticate({ required: true }),
  authController.getMe,
);

// ─────────────────────────────────────────────────────────────────────────────

/**
 * DELETE /api/v1/auth/me
 *
 * Permanently deletes the user account and all associated data.
 * Satisfies GDPR Art. 17 "right to erasure" and CCPA deletion requests.
 *
 * Deletes:
 *   - User record
 *   - All saved locations
 *   - All notification preferences and device tokens
 *   - Active Pro subscription (cancels via Stripe/RevenueCat)
 *   - All refresh tokens (invalidates all sessions)
 *
 * Request body (application/json):
 *   {
 *     confirm: "DELETE MY ACCOUNT"   // Exact confirmation string required
 *   }
 *
 * Response 204: Account deleted. Cookie cleared.
 * Response 400: Confirmation string does not match.
 *
 * Rate limit: 3 req/hour per user (prevent abuse)
 */
router.delete(
  '/me',
  authenticate({ required: true }),
  [
    body('confirm')
      .equals('DELETE MY ACCOUNT')
      .withMessage('confirm must equal "DELETE MY ACCOUNT"'),
  ],
  validate,
  authController.deleteAccount,
);

module.exports = router;