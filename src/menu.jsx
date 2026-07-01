import React from "react";
import { useState, useRef, useEffect, useCallback } from "react";
import {
  Search, MapPin, Settings, AlertTriangle, Wind, Droplets, Eye,
  Thermometer, ChevronRight, Plus, X, Gauge, Sun, Moon,
  Check, Navigation, RefreshCw, Star, Bell, BellOff,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────
// DESIGN TOKENS
// ─────────────────────────────────────────────────────────────────

const GLASS = {
  card:   "rgba(255,255,255,0.11)",
  strong: "rgba(255,255,255,0.18)",
  border: "1px solid rgba(255,255,255,0.20)",
  blur:   "blur(22px) saturate(200%)",
};

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

function apiUrl(path) {
  return `${API_BASE_URL}${path}`;
}

// Atmospheric background gradients — the signature element.
// Computed from real color science: dawn amber → cerulean day → slate storm → midnight navy.
const BG = {
  clear_day:     ["#0B4F9E","#1976D2","#42A5F5","#A8D5FA"],
  partly_cloudy: ["#11529E","#2476C4","#5B9FD4","#A4CCE9"],
  cloudy:        ["#2E3F4F","#455B6B","#627D8E","#8FA7B5"],
  rain:          ["#1A2474","#263496","#3949AB","#5A6FBE"],
  storm:         ["#160029","#30005C","#5E0090","#8E24AA"],
  snow:          ["#3A4F6A","#556E8A","#7A9BB5","#B0CCE0"],
  fog:           ["#3A4D58","#506070","#6B808C","#94AABA"],
  clear_night:   ["#060D1E","#0C1A38","#152348","#1C2F5A"],
  cloudy_night:  ["#18202E","#232E40","#2E3D52","#3C4F67"],
  rain_night:    ["#0D1628","#152236","#1D3148","#263F5C"],
  storm_night:   ["#0E0018","#1E0038","#380058","#550080"],
};

function getBgStyle(condition, isDay) {
  const key = isDay ? condition : `${condition}_night`;
  const stops = BG[key] ?? (isDay ? BG.partly_cloudy : BG.clear_night);
  return {
    background: `linear-gradient(170deg, ${stops[0]} 0%, ${stops[1]} 30%, ${stops[2]} 65%, ${stops[3]} 100%)`,
    transition: "background 0.9s cubic-bezier(.4,0,.2,1)",
  };
}

// ─────────────────────────────────────────────────────────────────
// MOCK DATA  (shapes mirror the API route response schemas)
// ─────────────────────────────────────────────────────────────────

const LOCATIONS_INIT = [
  { id:"sf",     name:"San Francisco", region:"CA",         country:"US", lat:37.77,  lon:-122.42, condition:"partly_cloudy", isDay:true,  temp:68, isDefault:true,  order:0 },
  { id:"nyc",    name:"New York",      region:"NY",         country:"US", lat:40.71,  lon:-74.01,  condition:"clear_day",     isDay:true,  temp:78, isDefault:false, order:1 },
  { id:"london", name:"London",        region:"England",    country:"GB", lat:51.51,  lon:-0.13,   condition:"rain",          isDay:true,  temp:54, isDefault:false, order:2 },
  { id:"tokyo",  name:"Tokyo",         region:"Kanto",      country:"JP", lat:35.68,  lon:139.69,  condition:"cloudy",        isDay:false, temp:72, isDefault:false, order:3 },
  { id:"sydney", name:"Sydney",        region:"NSW",        country:"AU", lat:-33.87, lon:151.21,  condition:"clear_day",     isDay:true,  temp:82, isDefault:false, order:4 },
];

// GET /api/v1/weather/current response shape
const CURRENT_WEATHER = {
  sf:     { temp_f:68, feels_like_f:65, high_f:72, low_f:56, humidity_pct:62, wind_mph:12, wind_compass:"NW", uv_index:5, visibility_mi:10, pressure_mb:1013, dew_point_f:54, condition:{ code:"partly_cloudy", text:"Partly Cloudy", emoji:"⛅" }, is_day:true },
  nyc:    { temp_f:78, feels_like_f:81, high_f:82, low_f:64, humidity_pct:55, wind_mph:8,  wind_compass:"S",  uv_index:8, visibility_mi:10, pressure_mb:1018, dew_point_f:60, condition:{ code:"clear_day",     text:"Sunny",         emoji:"☀️" }, is_day:true },
  london: { temp_f:54, feels_like_f:50, high_f:60, low_f:48, humidity_pct:88, wind_mph:18, wind_compass:"SW", uv_index:1, visibility_mi:4,  pressure_mb:998,  dew_point_f:51, condition:{ code:"rain",          text:"Light Rain",    emoji:"🌧️" }, is_day:true },
  tokyo:  { temp_f:72, feels_like_f:74, high_f:76, low_f:66, humidity_pct:72, wind_mph:10, wind_compass:"E",  uv_index:3, visibility_mi:8,  pressure_mb:1010, dew_point_f:62, condition:{ code:"cloudy",        text:"Overcast",      emoji:"☁️" }, is_day:false },
  sydney: { temp_f:82, feels_like_f:80, high_f:86, low_f:68, humidity_pct:46, wind_mph:14, wind_compass:"SE", uv_index:9, visibility_mi:10, pressure_mb:1022, dew_point_f:57, condition:{ code:"clear_day",     text:"Sunny",         emoji:"☀️" }, is_day:true },
};

// GET /api/v1/weather/daily response shape (7-day)
const DAILY_FORECAST = [
  { date:"Today", condition:{ emoji:"⛅", text:"Partly Cloudy" }, high_f:72, low_f:56, precip_prob_pct:18 },
  { date:"Tue",   condition:{ emoji:"☀️", text:"Sunny"         }, high_f:76, low_f:58, precip_prob_pct:5  },
  { date:"Wed",   condition:{ emoji:"🌧️", text:"Rain"          }, high_f:63, low_f:52, precip_prob_pct:82 },
  { date:"Thu",   condition:{ emoji:"⛈️", text:"Thunderstorms" }, high_f:59, low_f:50, precip_prob_pct:91 },
  { date:"Fri",   condition:{ emoji:"☁️", text:"Cloudy"        }, high_f:64, low_f:54, precip_prob_pct:28 },
  { date:"Sat",   condition:{ emoji:"⛅", text:"Partly Cloudy" }, high_f:68, low_f:56, precip_prob_pct:15 },
  { date:"Sun",   condition:{ emoji:"☀️", text:"Sunny"         }, high_f:74, low_f:60, precip_prob_pct:4  },
];

// GET /api/v1/weather/hourly — generated dynamically
function buildHourly(baseTemp, conditionCode) {
  const emojis = { clear_day:"☀️", partly_cloudy:"⛅", cloudy:"☁️", rain:"🌧️", storm:"⛈️", snow:"❄️", fog:"🌫️" };
  const nightEmoji = "🌙";
  const now = new Date();
  return Array.from({ length: 24 }, (_, i) => {
    const t = new Date(now); t.setHours(now.getHours() + i, 0, 0, 0);
    const hr = t.getHours();
    const isDay = hr >= 6 && hr <= 20;
    const curve = Math.sin(((hr - 6) / 14) * Math.PI);
    const temp_f = Math.round(baseTemp + curve * 8 - 4 + (Math.random() - 0.5) * 2);
    const precip = conditionCode === "rain" ? 55 + Math.round(Math.random()*30)
      : conditionCode === "partly_cloudy" && hr >= 14 && hr <= 18 ? 20 + Math.round(Math.random()*20)
      : 5;
    return {
      label: i === 0 ? "Now" : t.toLocaleTimeString("en-US", { hour:"numeric", hour12:true }),
      temp_f, precip_prob_pct: precip,
      condition:{ emoji: isDay ? (emojis[conditionCode] ?? "⛅") : nightEmoji },
      is_day: isDay,
    };
  });
}

// GET /api/v1/weather/alerts — active alerts list
const WEATHER_ALERTS = [
  { id:"nws-ca-001", severity:"moderate", event_type:"Wind Advisory",      headline:"Wind Advisory Until 6:00 PM PDT", description:"Winds 25–35 mph with gusts to 50 mph. Secure loose objects outdoors and be cautious while driving high-profile vehicles.", expires:"6:00 PM", area:"San Francisco Bay Area", source:"nws" },
  { id:"nws-ca-002", severity:"minor",    event_type:"Dense Fog Advisory", headline:"Dense Fog Advisory Until 10 AM Thursday", description:"Visibility ¼ mile or less expected overnight. Slow down and use your headlights. Leave extra following distance.", expires:"Thu 10 AM", area:"Coastal San Francisco", source:"nws" },
];

const SEARCH_POOL = [];

// ─────────────────────────────────────────────────────────────────
// CLAUDE API — GET /api/v1/weather/current → AI brief
// ─────────────────────────────────────────────────────────────────

async function fetchAiBrief(location, weather) {
  const res = await fetch(apiUrl('/api/v1/ai/brief'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ location, weather }),
  });
  if (!res.ok) {
    throw new Error('AI brief request failed');
  }
  const data = await res.json();
  return data.brief || 'Weather brief unavailable.';
}

// ─────────────────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────────────────

function toC(f) { return Math.round((f - 32) * 5 / 9); }
function displayTemp(f, unit) { return unit === "C" ? toC(f) : f; }

const UV_LABELS = ["Low","Low","Moderate","Moderate","High","High","Very High","Very High","Extreme","Extreme","Extreme"];
const SEVERITY_BG = { extreme:"rgba(239,83,80,0.22)", severe:"rgba(255,112,67,0.22)", moderate:"rgba(255,167,38,0.22)", minor:"rgba(102,187,106,0.22)" };
const SEVERITY_BORDER = { extreme:"rgba(239,83,80,0.55)", severe:"rgba(255,112,67,0.55)", moderate:"rgba(255,167,38,0.55)", minor:"rgba(102,187,106,0.55)" };
const SEVERITY_DOT = { extreme:"#EF5350", severe:"#FF7043", moderate:"#FFA726", minor:"#66BB6A" };

// ─────────────────────────────────────────────────────────────────
// PRIMITIVE COMPONENTS
// ─────────────────────────────────────────────────────────────────

function Glass({ children, style }) {
  return (
    <div style={{
      background: GLASS.card, backdropFilter: GLASS.blur, WebkitBackdropFilter: GLASS.blur,
      border: GLASS.border, borderRadius: 22, ...style,
    }}>
      {children}
    </div>
  );
}

function SectionLabel({ text }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.52)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 9, paddingLeft: 4 }}>
      {text}
    </div>
  );
}

function Toggle({ on, onChange }) {
  return (
    <button onClick={() => onChange(!on)} style={{ width: 48, height: 27, borderRadius: 14, border: "none", cursor: "pointer", background: on ? "#34D399" : "rgba(255,255,255,0.18)", position: "relative", flexShrink: 0, transition: "background 0.25s" }}>
      <div style={{ width: 21, height: 21, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, left: on ? 24 : 3, transition: "left 0.22s", boxShadow: "0 2px 8px rgba(0,0,0,0.25)" }} />
    </button>
  );
}

function Chip({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{ padding: "5px 13px", borderRadius: 10, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, background: active ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.14)", color: active ? "#1565C0" : "rgba(255,255,255,0.75)", transition: "all 0.2s" }}>
      {label}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────
// BOTTOM TAB BAR
// ─────────────────────────────────────────────────────────────────

function TabBar({ active, onChange, alertCount }) {
  const tabs = [
    { id: "home",      Icon: Sun,          label: "Weather"   },
    { id: "locations", Icon: MapPin,        label: "Locations" },
    { id: "alerts",    Icon: AlertTriangle, label: "Alerts"    },
    { id: "settings",  Icon: Settings,      label: "Settings"  },
  ];
  return (
    <nav style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 200, background: "rgba(8,14,30,0.72)", backdropFilter: "blur(28px)", WebkitBackdropFilter: "blur(28px)", borderTop: "1px solid rgba(255,255,255,0.10)", display: "flex", justifyContent: "space-around", padding: "10px 0 22px" }}>
      {tabs.map(({ id, Icon, label }) => {
        const isActive = active === id;
        return (
          <button key={id} onClick={() => onChange(id)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", color: isActive ? "#fff" : "rgba(255,255,255,0.38)", transition: "color 0.2s", padding: "0 20px", position: "relative" }}>
            <Icon size={22} strokeWidth={isActive ? 2.2 : 1.6} />
            {id === "alerts" && alertCount > 0 && (
              <span style={{ position: "absolute", top: -3, right: 14, background: "#EF5350", borderRadius: "50%", width: 14, height: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "#fff" }}>{alertCount}</span>
            )}
            <span style={{ fontSize: 10, fontWeight: isActive ? 700 : 400, letterSpacing: "0.02em" }}>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}

// ─────────────────────────────────────────────────────────────────
// HOME SCREEN SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────

function HourlyStrip({ hourly, unit }) {
  return (
    <Glass style={{ overflow: "hidden" }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.52)", textTransform: "uppercase", letterSpacing: "0.1em", padding: "14px 16px 0" }}>Hourly Forecast</div>
      <div style={{ overflowX: "auto", display: "flex", gap: 0, padding: "8px 12px 12px", scrollbarWidth: "none" }}>
        {hourly.map((h, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, minWidth: 58, padding: "10px 4px", borderRadius: 14, background: i === 0 ? "rgba(255,255,255,0.18)" : "transparent", border: i === 0 ? "1px solid rgba(255,255,255,0.28)" : "1px solid transparent", flexShrink: 0 }}>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.70)", fontWeight: i === 0 ? 700 : 500 }}>{h.label}</span>
            <span style={{ fontSize: 20 }}>{h.condition.emoji}</span>
            {h.precip_prob_pct > 25
              ? <span style={{ fontSize: 10, color: "#90CAF9", fontWeight: 600 }}>{h.precip_prob_pct}%</span>
              : <span style={{ fontSize: 10, opacity: 0 }}>—</span>}
            <span style={{ fontSize: 16, fontWeight: 600, color: "#fff" }}>{displayTemp(h.temp_f, unit)}°</span>
          </div>
        ))}
      </div>
    </Glass>
  );
}

const DAILY_TEMP_RANGE = { min: 50, max: 86 };
function DailyForecast({ daily, unit }) {
  const range = DAILY_TEMP_RANGE.max - DAILY_TEMP_RANGE.min;
  return (
    <Glass style={{ padding: "14px 16px" }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.52)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>7-Day Forecast</div>
      {daily.map((d, i) => {
        const leftPct = ((d.low_f - DAILY_TEMP_RANGE.min) / range) * 100;
        const widthPct = ((d.high_f - d.low_f) / range) * 100;
        return (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "60px 28px 1fr 56px", alignItems: "center", gap: "0 12px", padding: "10px 0", borderBottom: i < daily.length - 1 ? "1px solid rgba(255,255,255,0.09)" : "none" }}>
            <span style={{ fontSize: 15, fontWeight: 500, color: "rgba(255,255,255,0.90)" }}>{d.date}</span>
            <span style={{ fontSize: 20, textAlign: "center" }}>{d.condition.emoji}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {d.precip_prob_pct > 20
                ? <span style={{ fontSize: 11, color: "#90CAF9", fontWeight: 700, minWidth: 26 }}>{d.precip_prob_pct}%</span>
                : <span style={{ minWidth: 26 }} />}
              <div style={{ flex: 1, height: 4, borderRadius: 3, background: "rgba(255,255,255,0.14)", position: "relative" }}>
                <div style={{ position: "absolute", height: "100%", borderRadius: 3, left: `${leftPct}%`, width: `${widthPct}%`, background: "linear-gradient(90deg,#90CAF9,#FFB74D)" }} />
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 14 }}>{displayTemp(d.low_f, unit)}°</span>
              <span style={{ color: "#fff", fontSize: 14, fontWeight: 700 }}>{displayTemp(d.high_f, unit)}°</span>
            </div>
          </div>
        );
      })}
    </Glass>
  );
}

function DetailGrid({ weather, unit }) {
  const cells = [
    { Icon: Droplets,    label: "Humidity",   value: `${weather.humidity_pct}%`,    sub: weather.humidity_pct > 75 ? "High" : weather.humidity_pct > 50 ? "Moderate" : "Low" },
    { Icon: Wind,        label: "Wind",       value: `${weather.wind_mph} mph`,     sub: weather.wind_compass },
    { Icon: Sun,         label: "UV Index",   value: weather.uv_index,              sub: UV_LABELS[weather.uv_index] ?? "—" },
    { Icon: Eye,         label: "Visibility", value: `${weather.visibility_mi} mi`, sub: weather.visibility_mi >= 7 ? "Clear" : weather.visibility_mi >= 3 ? "Hazy" : "Poor" },
    { Icon: Gauge,       label: "Pressure",   value: `${weather.pressure_mb}`,      sub: "mb" },
    { Icon: Thermometer, label: "Dew Point",  value: `${displayTemp(weather.dew_point_f, unit)}°`, sub: weather.dew_point_f > 65 ? "Uncomfortable" : weather.dew_point_f > 55 ? "Humid" : "Comfortable" },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
      {cells.map(({ Icon, label, value, sub }) => (
        <Glass key={label} style={{ padding: "13px 14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 6 }}>
            <Icon size={13} style={{ color: "rgba(255,255,255,0.55)" }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.55)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</span>
          </div>
          <span style={{ fontSize: 24, fontWeight: 700, color: "#fff", display: "block" }}>{value}</span>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.50)", marginTop: 2, display: "block" }}>{sub}</span>
        </Glass>
      ))}
    </div>
  );
}

function AiBriefCard({ state, onFetch }) {
  return (
    <Glass style={{ padding: "14px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: state.text ? 10 : 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: state.loading ? "#F5A623" : state.text ? "#34D399" : "rgba(255,255,255,0.35)", boxShadow: state.loading ? "0 0 10px #F5A623" : state.text ? "0 0 10px #34D399" : "none", transition: "all 0.4s" }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.88)" }}>AI Weather Brief</span>
        </div>
        {!state.text && !state.loading && (
          <button onClick={onFetch} style={{ background: GLASS.strong, border: GLASS.border, borderRadius: 10, padding: "6px 14px", fontSize: 12, fontWeight: 700, color: "#fff", cursor: "pointer" }}>
            Generate
          </button>
        )}
        {state.loading && <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>Thinking…</span>}
      </div>
      {state.text && <p style={{ margin: 0, fontSize: 14, color: "rgba(255,255,255,0.82)", lineHeight: 1.65 }}>{state.text}</p>}
    </Glass>
  );
}

// ─────────────────────────────────────────────────────────────────
// HOME SCREEN
// ─────────────────────────────────────────────────────────────────

function HomeScreen({ location, weather, unit, onSearchTap, onAiBrief, aiState }) {
  const hourly = buildHourly(weather.temp_f, weather.condition.code);
  const t  = displayTemp(weather.temp_f,       unit);
  const fl = displayTemp(weather.feels_like_f, unit);
  const hi = displayTemp(weather.high_f,       unit);
  const lo = displayTemp(weather.low_f,        unit);

  return (
    <div style={{ paddingTop: 60, paddingBottom: 100 }}>
      {/* Location header */}
      <div style={{ textAlign: "center", padding: "20px 20px 8px" }}>
        <button onClick={onSearchTap} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, margin: "0 auto" }}>
          <MapPin size={14} style={{ color: "rgba(255,255,255,0.75)" }} />
          <span style={{ fontSize: 20, fontWeight: 700, color: "#fff", letterSpacing: "-0.3px" }}>{location.name}</span>
          <ChevronRight size={15} style={{ color: "rgba(255,255,255,0.55)" }} />
        </button>
        <p style={{ margin: "2px 0 0", fontSize: 13, color: "rgba(255,255,255,0.55)" }}>
          {location.region}{location.country !== "US" ? `, ${location.country}` : ""} · {weather.is_day ? "Day" : "Night"}
        </p>
      </div>

      {/* Hero temperature — hairline weight against rich sky: the signature element */}
      <div style={{ textAlign: "center", padding: "8px 20px 28px" }}>
        <div style={{ display: "inline-flex", alignItems: "flex-start" }}>
          <span style={{ fontSize: 124, fontWeight: 100, color: "#fff", lineHeight: 1, letterSpacing: "-6px", textShadow: "0 6px 48px rgba(0,0,0,0.22)" }}>{t}</span>
          <span style={{ fontSize: 52, fontWeight: 200, color: "rgba(255,255,255,0.85)", marginTop: 18, marginLeft: 4 }}>°{unit}</span>
        </div>
        <p style={{ margin: "2px 0 0", fontSize: 20, color: "rgba(255,255,255,0.88)", fontWeight: 400 }}>
          {weather.condition.emoji} {weather.condition.text}
        </p>
        <p style={{ margin: "6px 0 0", fontSize: 14, color: "rgba(255,255,255,0.58)", display: "flex", justifyContent: "center", gap: 18 }}>
          <span>Feels {fl}°</span><span>H: {hi}°</span><span>L: {lo}°</span>
        </p>
      </div>

      {/* Content cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "0 14px" }}>
        <AiBriefCard state={aiState} onFetch={onAiBrief} />
        <HourlyStrip hourly={hourly} unit={unit} />
        <DailyForecast daily={DAILY_FORECAST} unit={unit} />
        <div>
          <SectionLabel text="Weather Details" />
          <DetailGrid weather={weather} unit={unit} />
        </div>
        {/* Pro teaser */}
        <Glass style={{ padding: "16px 18px", background: "rgba(33,0,66,0.35)", border: "1px solid rgba(156,39,176,0.35)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <Star size={13} style={{ color: "#CE93D8" }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: "#CE93D8" }}>SkyCast Pro</span>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.60)", lineHeight: 1.5 }}>Radar · Minute-by-minute · AQI · Pollen</p>
            </div>
            <button style={{ background: "#9C27B0", border: "none", borderRadius: 10, padding: "7px 14px", fontSize: 12, fontWeight: 700, color: "#fff", cursor: "pointer", whiteSpace: "nowrap" }}>
              Try Free
            </button>
          </div>
        </Glass>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// LOCATIONS SCREEN
// ─────────────────────────────────────────────────────────────────

function LocationCard({ loc, isActive, onSelect, onRemove, saved }) {
  const bg = getBgStyle(loc.condition || 'clear_day', loc.isDay ?? true);
  const label = loc.name || loc.display_name || 'Unnamed location';
  const tempLabel = Number.isFinite(loc.temp) ? `${loc.temp}°` : '—';
  const regionLabel = loc.region || (loc.display_name ? loc.display_name.split(',')[1]?.trim() : '');
  const countryLabel = loc.country === 'US' || !loc.country ? '' : `, ${loc.country}`;

  return (
    <div onClick={() => onSelect(loc.id)} style={{ ...bg, borderRadius: 18, marginBottom: 10, cursor: "pointer", padding: "15px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 4px 24px rgba(0,0,0,0.28)" }}>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
          {isActive && <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#34D399", boxShadow: "0 0 6px #34D399" }} />}
          <span style={{ fontSize: 17, fontWeight: 700, color: "#fff" }}>{label}</span>
        </div>
        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.60)" }}>
          {regionLabel}{countryLabel} · {loc.isDay ? "Day" : "Night"}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 38, fontWeight: 100, color: "#fff", letterSpacing: "-1px" }}>{tempLabel}</span>
        {!loc.isDefault && saved && (
          <button onClick={e => { e.stopPropagation(); onRemove(loc.id); }} style={{ background: "rgba(0,0,0,0.22)", border: "none", borderRadius: "50%", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "rgba(255,255,255,0.65)", flexShrink: 0 }}>
            <X size={13} />
          </button>
        )}
        {!saved && (
          <div style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.8)" }}>
            <Plus size={18} />
          </div>
        )}
      </div>
    </div>
  );
}

function LocationsScreen({ locations, activeId, onSelect, onRemove, onAdd }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const timerRef = useRef(null);

  function handleQuery(q) {
    setQuery(q);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (q.length < 2) { setResults([]); setSearching(false); return; }
    setSearching(true);
    timerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(apiUrl(`/api/v1/locations/search?q=${encodeURIComponent(q)}&limit=6`));
        if (!res.ok) throw new Error('Search failed');
        const payload = await res.json();
        setResults(payload.results || []);
      } catch (err) {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 380);
  }

  const savedIds = new Set(locations.map(l => l.id));

  return (
    <div style={{ padding: "70px 14px 100px" }}>
      {/* Search bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.13)", backdropFilter: GLASS.blur, WebkitBackdropFilter: GLASS.blur, border: GLASS.border, borderRadius: 14, padding: "11px 14px", marginBottom: 18 }}>
        <Search size={15} style={{ color: "rgba(255,255,255,0.55)", flexShrink: 0 }} />
        <input value={query} onChange={e => handleQuery(e.target.value)} placeholder="Search city or region…" style={{ flex: 1, background: "none", border: "none", outline: "none", color: "#fff", fontSize: 15 }} />
        {searching && <RefreshCw size={14} style={{ color: "rgba(255,255,255,0.45)", animation: "spin 0.8s linear infinite" }} />}
        {query && !searching && <button onClick={() => { setQuery(""); setResults([]); }} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.55)", padding: 0, display: "flex" }}><X size={14} /></button>}
      </div>

      {results.length > 0 && (
        <>
          <SectionLabel text={`Results (${results.length})`} />
          {results.map(r => (
            <LocationCard key={r.id} loc={r} isActive={false} saved={false}
              onSelect={() => { if (!savedIds.has(r.id)) onAdd(r); }}
              onRemove={() => {}} />
          ))}
        </>
      )}

      {!query && (
        <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 9, paddingLeft: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.52)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Saved — {locations.length} / 5</span>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>Pro: unlimited</span>
          </div>
          {locations.map(loc => (
            <LocationCard key={loc.id} loc={loc} isActive={loc.id === activeId} saved={true}
              onSelect={onSelect} onRemove={onRemove} />
          ))}
          <p style={{ textAlign: "center", fontSize: 12, color: "rgba(255,255,255,0.30)", marginTop: 16 }}>
            Search above to add a city · Tap to switch
          </p>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// ALERTS SCREEN
// ─────────────────────────────────────────────────────────────────

function AlertCard({ alert }) {
  const [open, setOpen] = useState(false);
  return (
    <div onClick={() => setOpen(o => !o)} style={{ background: SEVERITY_BG[alert.severity] ?? SEVERITY_BG.moderate, border: `1px solid ${SEVERITY_BORDER[alert.severity] ?? SEVERITY_BORDER.moderate}`, backdropFilter: GLASS.blur, WebkitBackdropFilter: GLASS.blur, borderRadius: 18, padding: 16, marginBottom: 12, cursor: "pointer" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <div style={{ width: 9, height: 9, borderRadius: "50%", background: SEVERITY_DOT[alert.severity], marginTop: 5, flexShrink: 0, boxShadow: `0 0 8px ${SEVERITY_DOT[alert.severity]}` }} />
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: SEVERITY_DOT[alert.severity] }}>{alert.severity}</span>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.45)" }}>via {alert.source.toUpperCase()}</span>
          </div>
          <p style={{ margin: "0 0 3px", fontSize: 15, fontWeight: 700, color: "#fff" }}>{alert.headline}</p>
          <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.50)" }}>Expires {alert.expires}</p>
          {open && <p style={{ margin: "12px 0 0", fontSize: 14, color: "rgba(255,255,255,0.78)", lineHeight: 1.6, borderTop: "1px solid rgba(255,255,255,0.12)", paddingTop: 12 }}>{alert.description}</p>}
        </div>
        <ChevronRight size={16} style={{ color: "rgba(255,255,255,0.40)", flexShrink: 0, transform: open ? "rotate(90deg)" : "none", transition: "transform 0.2s" }} />
      </div>
    </div>
  );
}

function AlertsScreen({ alerts }) {
  return (
    <div style={{ padding: "70px 14px 100px" }}>
      <SectionLabel text={`Active Alerts (${alerts.length})`} />
      {alerts.map(a => <AlertCard key={a.id} alert={a} />)}
      {alerts.length === 0 && (
        <Glass style={{ padding: 40, textAlign: "center" }}>
          <div style={{ fontSize: 44, marginBottom: 10 }}>✅</div>
          <p style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 700, color: "#fff" }}>All Clear</p>
          <p style={{ margin: 0, fontSize: 14, color: "rgba(255,255,255,0.55)" }}>No active alerts for your saved locations.</p>
        </Glass>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// SETTINGS SCREEN
// ─────────────────────────────────────────────────────────────────

function Row({ label, sub, children, danger }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
      <div>
        <p style={{ margin: 0, fontSize: 15, fontWeight: 500, color: danger ? "#EF9A9A" : "#fff" }}>{label}</p>
        {sub && <p style={{ margin: "2px 0 0", fontSize: 12, color: "rgba(255,255,255,0.45)" }}>{sub}</p>}
      </div>
      {children}
    </div>
  );
}

function SettingsGroup({ title, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: "0.1em", padding: "0 4px 8px" }}>{title}</div>
      <Glass style={{ overflow: "hidden" }}>{children}</Glass>
    </div>
  );
}

function SettingsScreen({ unit, onUnit, notif, onNotif, theme, onTheme }) {
  return (
    <div style={{ padding: "70px 14px 100px" }}>
      {/* Pro Card */}
      <div style={{ borderRadius: 22, overflow: "hidden", background: "linear-gradient(135deg,#1565C0 0%,#6A1B9A 55%,#0D47A1 100%)", padding: "20px 20px 22px", marginBottom: 18, boxShadow: "0 8px 32px rgba(0,0,0,0.35)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
          <Star size={16} style={{ color: "#FFD54F" }} />
          <span style={{ fontSize: 18, fontWeight: 800, color: "#fff" }}>SkyCast Pro</span>
        </div>
        <p style={{ margin: "0 0 16px", fontSize: 13, color: "rgba(255,255,255,0.78)", lineHeight: 1.55 }}>Minute-by-minute rain · Animated radar · Air quality index · Pollen counts · 10-day extended forecast</p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button style={{ background: "#fff", color: "#1565C0", border: "none", borderRadius: 11, padding: "9px 18px", fontSize: 14, fontWeight: 800, cursor: "pointer" }}>7-day free trial</button>
          <button style={{ background: "rgba(255,255,255,0.15)", color: "#fff", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 11, padding: "9px 18px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>$1.99/month</button>
        </div>
      </div>

      <SettingsGroup title="Units">
        <Row label="Temperature" sub="Affects all screens and widgets">
          <div style={{ display: "flex", gap: 5 }}>
            <Chip label="°F" active={unit === "F"} onClick={() => onUnit("F")} />
            <Chip label="°C" active={unit === "C"} onClick={() => onUnit("C")} />
          </div>
        </Row>
        <Row label="Wind Speed" sub="mph · kph · m/s">
          <span style={{ fontSize: 13, color: "rgba(255,255,255,0.40)" }}>mph ›</span>
        </Row>
        <Row label="Pressure" sub="mb · inHg">
          <span style={{ fontSize: 13, color: "rgba(255,255,255,0.40)" }}>mb ›</span>
        </Row>
      </SettingsGroup>

      <SettingsGroup title="Notifications">
        <Row label="Severe Weather Alerts" sub="Extreme & severe NWS/Meteoalarm events">
          <Toggle on={notif.severe} onChange={v => onNotif("severe", v)} />
        </Row>
        <Row label="Morning Weather Brief" sub="Delivered at 7:00 AM local time">
          <Toggle on={notif.daily} onChange={v => onNotif("daily", v)} />
        </Row>
        <Row label="Rain Alerts" sub="When rain likely within 60 minutes">
          <Toggle on={notif.rain} onChange={v => onNotif("rain", v)} />
        </Row>
        <Row label="Quiet Hours" sub="10:00 PM – 7:00 AM · No alerts">
          <Toggle on={notif.quiet} onChange={v => onNotif("quiet", v)} />
        </Row>
      </SettingsGroup>

      <SettingsGroup title="Appearance">
        <Row label="Theme" sub="App background">
          <div style={{ display: "flex", gap: 5 }}>
            {["System", "Light", "Dark"].map(t => <Chip key={t} label={t} active={theme === t} onClick={() => onTheme(t)} />)}
          </div>
        </Row>
        <Row label="Time Format">
          <div style={{ display: "flex", gap: 5 }}>
            <Chip label="12h" active onClick={() => {}} />
            <Chip label="24h" active={false} onClick={() => {}} />
          </div>
        </Row>
      </SettingsGroup>

      <SettingsGroup title="Account">
        <Row label="Sign in with Google" sub="Sync locations & preferences">
          <ChevronRight size={15} style={{ color: "rgba(255,255,255,0.30)" }} />
        </Row>
        <Row label="Sign in with Apple" sub="Sync locations & preferences">
          <ChevronRight size={15} style={{ color: "rgba(255,255,255,0.30)" }} />
        </Row>
      </SettingsGroup>

      <SettingsGroup title="Legal">
        <Row label="Privacy Policy" sub="GDPR · CCPA compliant">
          <ChevronRight size={15} style={{ color: "rgba(255,255,255,0.30)" }} />
        </Row>
        <Row label="Terms of Service">
          <ChevronRight size={15} style={{ color: "rgba(255,255,255,0.30)" }} />
        </Row>
        <Row label="Delete Account" sub="Erase all data permanently" danger>
          <ChevronRight size={15} style={{ color: "rgba(239,154,154,0.55)" }} />
        </Row>
      </SettingsGroup>

      <div style={{ textAlign: "center", paddingTop: 8 }}>
        <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.22)" }}>SkyCast v1.0.0 · Data: Tomorrow.io, Open-Meteo</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────────────────────────

export default function SkyCastApp() {
  const [tab,       setTab]       = useState("home");
  const [activeId,  setActiveId]  = useState("sf");
  const [locations, setLocations] = useState(LOCATIONS_INIT);
  const [unit,      setUnit]      = useState("F");
  const [theme,     setTheme]     = useState("System");
  const [notif,     setNotif]     = useState({ severe: true, daily: false, rain: false, quiet: false });
  const [aiState,   setAiState]   = useState({ text: "", loading: false });
  const [weather,   setWeather]   = useState(CURRENT_WEATHER.sf);
  const [loading,   setLoading]   = useState(false);

  useEffect(() => {
    async function loadSavedLocations() {
      try {
        const res = await fetch(apiUrl('/api/v1/locations/saved'));
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data.locations) && data.locations.length > 0) {
          const normalized = data.locations.map((loc, index) => ({
            ...loc,
            temp: loc.temp ?? 0,
            condition: loc.condition ?? 'clear_day',
            isDay: loc.isDay ?? true,
            order: loc.order ?? index,
            isDefault: loc.is_default ?? false,
          }));
          setLocations(normalized);
          setActiveId(normalized[0].id);
        }
      } catch (err) {
        // keep defaults on failure
      }
    }

    loadSavedLocations();
  }, []);

  const location = locations.find(l => l.id === activeId) || locations[0];

  useEffect(() => {
    async function loadWeather() {
      setLoading(true);
      try {
        const res = await fetch(apiUrl(`/api/v1/weather/current?lat=${location.lat}&lon=${location.lon}`));
        if (!res.ok) throw new Error('Failed to load weather');
        const data = await res.json();
        setWeather(data.current);
      } catch {
        setWeather(CURRENT_WEATHER[activeId] || CURRENT_WEATHER.sf);
      } finally {
        setLoading(false);
      }
    }

    loadWeather();
  }, [activeId, location.lat, location.lon]);

  const handleAiBrief = useCallback(async () => {
    setAiState({ text: "", loading: true });
    try {
      const text = await fetchAiBrief(location, weather);
      setAiState({ text, loading: false });
    } catch {
      setAiState({ text: "Brief unavailable — check your connection.", loading: false });
    }
  }, [location, weather]);

  const handleSelect = useCallback((id) => {
    setActiveId(id);
    setAiState({ text: "", loading: false });
    setTab("home");
  }, []);

  const handleRemove = useCallback(async (id) => {
    setLocations(prev => {
      const next = prev.filter(l => l.id !== id);
      if (activeId === id) setActiveId(next[0] && next[0].id ? next[0].id : "sf");
      return next;
    });

    if (/^\d+$/.test(String(id))) {
      try {
        await fetch(apiUrl(`/api/v1/locations/saved/${id}`), { method: 'DELETE' });
      } catch {
        // ignore delete failures for now
      }
    }
  }, [activeId]);

  const handleAdd = useCallback(async (loc) => {
    const existing = locations.find(l => l.place_id === loc.place_id || l.id === loc.id);
    if (existing) { handleSelect(existing.id); return; }

    try {
      const res = await fetch(apiUrl('/api/v1/locations/saved'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          place_id: String(loc.place_id),
          name: loc.name,
          display_name: loc.display_name || loc.name,
          region: loc.region || '',
          country: loc.country || '',
          country_code: loc.country_code || '',
          lat: loc.lat,
          lon: loc.lon,
          timezone: loc.timezone || 'UTC',
          is_default: false,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to save location');
      }

      const data = await res.json();
      const entry = {
        ...data.location,
        temp: loc.temp ?? 0,
        condition: loc.condition || 'clear_day',
        isDay: loc.isDay ?? true,
      };
      setLocations(prev => [...prev, entry]);
      handleSelect(String(data.location.id));
    } catch {
      const entry = {
        id: loc.id,
        place_id: loc.place_id,
        name: loc.name,
        region: loc.region || '',
        country: loc.country || '',
        lat: loc.lat,
        lon: loc.lon,
        timezone: loc.timezone || 'UTC',
        isDefault: false,
        order: locations.length,
        condition: loc.condition || 'clear_day',
        isDay: loc.isDay ?? true,
        temp: loc.temp ?? 0,
      };
      setLocations(prev => [...prev, entry]);
      handleSelect(loc.id);
    }
  }, [locations, handleSelect]);

  const handleNotif = useCallback((key, val) => setNotif(prev => ({ ...prev, [key]: val })), []);

  const bgStyle = getBgStyle(weather.condition?.code ?? "partly_cloudy", weather.is_day ?? true);

  return (
    <div style={{ minHeight: "100dvh", fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', system-ui, sans-serif", ...bgStyle, position: "relative" }}>
      <style>{`
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { display: none; }
        input::placeholder { color: rgba(255,255,255,0.40); }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.35} }
      `}</style>

      {/* Top gradient fade */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: 70, background: "linear-gradient(to bottom,rgba(0,0,0,0.30) 0%,transparent 100%)", pointerEvents: "none", zIndex: 50 }} />

      {/* Screen header label */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px 0" }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: "rgba(255,255,255,0.80)", textTransform: "uppercase", letterSpacing: "0.14em" }}>
          {tab !== "home" ? { locations: "Locations", alerts: "Alerts", settings: "Settings" }[tab] : ""}
        </span>
        {tab === "home" && (
          <button onClick={handleAiBrief} style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.22)", borderRadius: 20, padding: "4px 12px", color: "rgba(255,255,255,0.75)", fontSize: 11, fontWeight: 700, cursor: "pointer", backdropFilter: "blur(12px)", display: "flex", alignItems: "center", gap: 5 }}>
            <Navigation size={10} /> Refresh
          </button>
        )}
      </div>

      {/* Screens */}
      {tab === "home" && (
        <HomeScreen location={location} weather={weather} unit={unit} onSearchTap={() => setTab("locations")} onAiBrief={handleAiBrief} aiState={aiState} />
      )}
      {tab === "locations" && (
        <LocationsScreen locations={locations} activeId={activeId} onSelect={handleSelect} onRemove={handleRemove} onAdd={handleAdd} />
      )}
      {tab === "alerts" && <AlertsScreen alerts={WEATHER_ALERTS} />}
      {tab === "settings" && (
        <SettingsScreen unit={unit} onUnit={setUnit} notif={notif} onNotif={handleNotif} theme={theme} onTheme={setTheme} />
      )}

      <TabBar active={tab} onChange={setTab} alertCount={WEATHER_ALERTS.length} />
    </div>
  );
}
