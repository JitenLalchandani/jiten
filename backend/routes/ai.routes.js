const { Router } = require('express');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate.middleware');
const aiController = require('../controllers/ai.controller');

const router = Router();

router.post(
  '/brief',
  [
    body('location').isObject().withMessage('location is required'),
    body('weather').isObject().withMessage('weather is required'),
  ],
  validate,
  aiController.getBrief,
);

module.exports = router;