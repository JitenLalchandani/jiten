function authenticate(options = {}) {
  const { required = false } = options;
  return (req, res, next) => {
    const authorization = req.headers.authorization;

    if (required && !authorization) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    req.user = authorization
      ? { id: 'user-1', email: 'user@example.com', is_pro: true }
      : { id: 'anonymous', is_pro: false };

    next();
  };
}

module.exports = { authenticate };
