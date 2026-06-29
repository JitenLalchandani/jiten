function requirePro(req, res, next) {
  if (req.user && req.user.is_pro) {
    return next();
  }
  return res.status(403).json({ error: 'Pro access required' });
}

module.exports = { requirePro };
