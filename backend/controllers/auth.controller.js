function loginWithGoogle(req, res) {
  res.json({ access_token: 'fake-token', token_type: 'Bearer', expires_in: 900, user: { id: 'user-1', email_hash: 'abc123', display_name: 'SkyCast User', avatar_url: null, is_pro: false, created_at: new Date().toISOString() } });
}

function loginWithApple(req, res) {
  res.json({ access_token: 'fake-token', token_type: 'Bearer', expires_in: 900, user: { id: 'user-1', email_hash: 'abc123', display_name: 'SkyCast User', avatar_url: null, is_pro: false, created_at: new Date().toISOString() } });
}

function refresh(req, res) {
  res.json({ access_token: 'fake-token', token_type: 'Bearer', expires_in: 900 });
}

function logout(req, res) {
  res.status(204).send();
}

function getMe(req, res) {
  res.json({ id: req.user.id, email_hash: 'abc123', display_name: 'SkyCast User', avatar_url: null, provider: 'google', is_pro: req.user.is_pro, pro_expires_at: null, created_at: new Date().toISOString(), last_login_at: new Date().toISOString() });
}

function deleteAccount(req, res) {
  res.status(204).send();
}

module.exports = { loginWithGoogle, loginWithApple, refresh, logout, getMe, deleteAccount };
