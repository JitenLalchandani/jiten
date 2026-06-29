function register(req, res) {
  res.json({ device_token_id: 'device-1', registered_at: new Date().toISOString() });
}

function unregister(req, res) {
  res.status(204).send();
}

function getPreferences(req, res) {
  res.json({ push_notifications: true, alert_types: ['severe', 'daily_summary'] });
}

function updatePreferences(req, res) {
  res.json({ preferences: req.body });
}

function sendTest(req, res) {
  res.json({ success: true, message: 'Test notification queued' });
}

module.exports = { register, unregister, getPreferences, updatePreferences, sendTest };
