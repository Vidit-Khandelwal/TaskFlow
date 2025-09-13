export const requireAuth = (req, res, next) => {
  console.log('Auth check:', {
    hasSession: !!req.session,
    hasUser: !!(req.session && req.session.user),
    sessionId: req.sessionID,
    cookies: req.headers.cookie
  });
  
  if (req.session && req.session.user) {
    return next();
  }
  return res.status(401).json({ message: 'Not authenticated' });
};
