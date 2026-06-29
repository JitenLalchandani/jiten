function getBrief(req, res) {
  const { location, weather } = req.body;
  const city = location?.name || "your area";
  const condition = weather?.condition?.text || "current conditions";
  const temp = weather?.temp_f ?? weather?.temp ?? "a moderate";
  const feelsLike = weather?.feels_like_f != null ? `${weather.feels_like_f}°F` : null;
  const wind = weather?.wind_mph != null ? `${weather.wind_mph} mph` : null;

  let brief = `Today's forecast for ${city} is ${condition} at ${temp}°F`;
  if (feelsLike) brief += `, feeling like ${feelsLike}`;
  if (wind) brief += ` with ${wind} winds`;
  brief += `. Enjoy your day and bring a light layer if the temperature drops.`;

  return res.json({ brief });
}

module.exports = { getBrief };