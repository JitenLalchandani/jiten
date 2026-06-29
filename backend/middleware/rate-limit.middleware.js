function rateLimitStrict(req, res, next) {
  next();
}

module.exports = { rateLimitStrict };
