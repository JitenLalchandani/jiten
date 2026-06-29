function getPreferences(req, res) {
  res.json({
    units: { temperature: 'fahrenheit', wind_speed: 'mph', pressure: 'mb', precipitation: 'in', distance: 'mi' },
    theme: 'dark', language: 'en', time_format: '12h', date_format: 'MDY',
    home_screen: { show_hourly_strip: true, show_daily_summary: true, show_uv_index: true, show_feels_like: true, show_humidity: true, show_wind: true },
    widget: { size: 'medium', show_feels_like: true, show_high_low: true }, updated_at: new Date().toISOString()
  });
}

function updatePreferences(req, res) {
  res.json({ preferences: { ...req.body, updated_at: new Date().toISOString() } });
}

function resetPreferences(req, res) {
  res.json({ preferences: { units: { temperature: 'fahrenheit', wind_speed: 'mph', pressure: 'mb', precipitation: 'in', distance: 'mi' }, theme: 'dark', language: 'en', time_format: '12h', date_format: 'MDY', home_screen: { show_hourly_strip: true, show_daily_summary: true, show_uv_index: true, show_feels_like: true, show_humidity: true, show_wind: true }, widget: { size: 'medium', show_feels_like: true, show_high_low: true }, updated_at: new Date().toISOString() } });
}

module.exports = { getPreferences, updatePreferences, resetPreferences };
