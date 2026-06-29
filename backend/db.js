const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const dataDir = path.resolve(__dirname, 'data');
fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, 'skycast.sqlite');
const db = new Database(dbPath);

// Enable WAL mode for better concurrency and reliability.
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS locations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  place_id TEXT NOT NULL,
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  region TEXT,
  country TEXT,
  country_code TEXT,
  lat REAL NOT NULL,
  lon REAL NOT NULL,
  timezone TEXT NOT NULL,
  is_default INTEGER NOT NULL DEFAULT 0,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_locations_user_place ON locations(user_id, place_id);
`);

const getSavedLocations = db.prepare('SELECT * FROM locations WHERE user_id = ? ORDER BY order_index ASC, created_at ASC');
const getLocationById = db.prepare('SELECT * FROM locations WHERE id = ? AND user_id = ?');
const getLocationByPlaceId = db.prepare('SELECT * FROM locations WHERE place_id = ? AND user_id = ?');
const getSavedCount = db.prepare('SELECT COUNT(*) AS count FROM locations WHERE user_id = ?');
const insertLocation = db.prepare(`INSERT INTO locations (user_id, place_id, name, display_name, region, country, country_code, lat, lon, timezone, is_default, order_index, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
const updateLocation = db.prepare(`UPDATE locations SET name = ?, display_name = ?, region = ?, country = ?, country_code = ?, timezone = ?, is_default = ? WHERE id = ? AND user_id = ?`);
const deleteLocation = db.prepare('DELETE FROM locations WHERE id = ? AND user_id = ?');
const reorderLocation = db.prepare('UPDATE locations SET order_index = ? WHERE id = ? AND user_id = ?');
const reorderLocations = db.transaction((userId, ids) => {
  ids.forEach((id, index) => {
    reorderLocation.run(index, id, userId);
  });
});

module.exports = {
  getSavedLocations,
  getLocationById,
  getLocationByPlaceId,
  getSavedCount,
  insertLocation,
  updateLocation,
  deleteLocation,
  reorderLocations,
};
