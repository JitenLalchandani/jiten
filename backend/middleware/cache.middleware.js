function cache(options = {}) {
  return (req, res, next) => {
    next();
  };
}

module.exports = { cache };
