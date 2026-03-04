/**
 * Middleware – protects admin routes via session.
 */
function adminAuth(req, res, next) {
  if (req.session && req.session.isAdmin) {
    return next();
  }
  // For AJAX requests return 401, otherwise redirect to login
  if (req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'))) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  return res.redirect('/admin/login');
}

module.exports = adminAuth;
