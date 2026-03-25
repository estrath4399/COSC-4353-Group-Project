export function requireAuth(store) {
  return (req, res, next) => {
    const user = store.getSessionUser(req.headers.authorization);
    if (!user) return res.status(401).json({ message: 'Unauthorized' });
    req.user = user;
    next();
  };
}

export function requireAdmin(store) {
  return (req, res, next) => {
    const user = store.getSessionUser(req.headers.authorization);
    if (!user) return res.status(401).json({ message: 'Unauthorized' });
    if (user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
    req.user = user;
    next();
  };
}

export function requireSelfOrAdmin(paramName) {
  return (req, res, next) => {
    if (req.user.role === 'admin') return next();
    if (req.params[paramName] !== req.user.id) return res.status(403).json({ message: 'Forbidden' });
    next();
  };
}
