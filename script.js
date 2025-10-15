// =====================
// Konfiguration
// =====================
const API_URL = 'https://www.elenatemelkov.ch/unload.php';
const REFRESH_MS = 10000;            // alle 10s neu laden
const ISS_ICON_URL = 'img/ISS.png';  // Pfad zu deinem ISS-Icon
let currentWindowHours = 1;          // Buttons (1h / 2h / 3h)

// =====================
// Leaflet Setup
// =====================
const map = L.map('map', { worldCopyJump: true });

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution:'&copy; OpenStreetMap contributors'
}).addTo(map);

map.setView([0,0], 2);

const issIcon = L.icon({
  iconUrl: ISS_ICON_URL,
  iconSize: [64,64],
  iconAnchor: [32,32],
  popupAnchor: [0,-32]
});

// =====================
// State
// =====================
let issMarker = null;
let lastUpdate = null;     // Date des letzten Datensatzes (oder Fetch-Zeit)
let historyData = [];      // [{ lat:Number, lon:Number, t:Date|null }]

const trail = L.polyline([], { weight: 2.5, opacity: 0.9, color: '#ffffff' }).addTo(map);
const pointsLayer = L.layerGroup().addTo(map);

// =====================
// Utils
// =====================
function fmtTime(d){
  if (!d) return '—';
  return d.toLocaleString('de-CH', {
    year:'numeric', month:'2-digit', day:'2-digit',
    hour:'2-digit', minute:'2-digit', second:'2-digit'
  });
}

function infoHTML(lat, lon, t){
  return `
    <div style="font:600 14px/1.35 system-ui, -apple-system, Segoe UI, Roboto">
      <div><strong>Lat.:</strong> ${lat.toFixed(4)}</div>
      <div><strong>Lon.:</strong> ${lon.toFixed(4)}</div>
      <div><strong>Zeit:</strong> ${fmtTime(t || lastUpdate)}</div>
    </div>
  `;
}

function pointTooltipHTML(p){
  return `
    <div style="font:600 12px/1.25 system-ui, -apple-system, Segoe UI, Roboto">
      <div><strong>Lat.:</strong> ${p.lat.toFixed(4)}</div>
      <div><strong>Lon.:</strong> ${p.lon.toFixed(4)}</div>
      <div><strong>Zeit:</strong> ${fmtTime(p.t || lastUpdate)}</div>
    </div>
  `;
}

// =====================
// Parsing der API-Antwort
// =====================
function getPointFromObject(o){
  if (!o || typeof o !== 'object') return null;

  const lat = o.latitude ?? o.lat ?? (Array.isArray(o.latlon) ? o.latlon[0] : undefined);
  const lon = o.longitude ?? o.lon ?? o.lng ?? (Array.isArray(o.latlon) ? o.latlon[1] : undefined);
  if (lat == null || lon == null) return null;

  let timeRaw = o.timestamp ?? o.time ?? o.t ?? o.date ?? o.datetime ?? o.created_at;
  let t = null;
  if (timeRaw != null) {
    if (typeof timeRaw === 'number') {
      t = new Date(timeRaw < 2e12 ? timeRaw * 1000 : timeRaw);
    } else {
      const parsed = Date.parse(timeRaw);
      if (!isNaN(parsed)) t = new Date(parsed);
    }
  }

  const latNum = parseFloat(lat);
  const lonNum = parseFloat(lon);
  if (!Number.isFinite(latNum) || !Number.isFinite(lonNum)) return null;

  return { lat: latNum, lon: lonNum, t };
}

function normalizeResponse(raw){
  const points = [];

  const direct = getPointFromObject(raw?.iss_position ?? raw?.data ?? raw);
  if (direct) points.push(direct);

  if (Array.isArray(raw)){
    for (const item of raw){
      const p = getPointFromObject(item?.iss_position ?? item?.data ?? item);
      if (p) points.push(p);
    }
  }

  points.sort((a,b) => {
    const ta = a.t ? a.t.getTime() : 0;
    const tb = b.t ? b.t.getTime() : 0;
    return ta - tb;
  });

  const last = points.length ? points[points.length - 1] : null;
  return { last, points };
}

// =====================
// Daten holen & darstellen
// =====================
async function fetchData(){
  try{
    const res = await fetch(API_URL, { cache:'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();

    const { last, points } = normalizeResponse(json);
    if (!last) {
      console.warn('Konnte keine Lat/Lon aus der Antwort lesen:', json);
      return;
    }

    mergeHistory(points);

    lastUpdate = last.t || new Date();
    const latlng = [last.lat, last.lon];

    if (!issMarker){
      issMarker = L.marker(latlng, { icon: issIcon }).addTo(map);
      // NUR Hover: Tooltip (kein Popup)
      issMarker.bindTooltip(infoHTML(last.lat, last.lon, last.t), {
        direction: 'top',
        sticky: true,
        opacity: 0.95
      });
      map.setView(latlng, 4, { animate: true });
    } else {
      issMarker.setLatLng(latlng);
      issMarker.setTooltipContent(infoHTML(last.lat, last.lon, last.t));
    }

    updateTrailAndPoints();

  } catch (err) {
    console.error('Fehler beim Laden der ISS-Position:', err);
  }
}

function mergeHistory(newPoints){
  const toAdd = newPoints.map(p => ({ lat: p.lat, lon: p.lon, t: p.t || null }));
  historyData = historyData.concat(toAdd);

  // Duplikate entfernen
  const seen = new Set();
  historyData = historyData.filter(p => {
    const key = `${p.lat.toFixed(6)},${p.lon.toFixed(6)},${p.t ? p.t.getTime() : 'x'}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  historyData.sort((a,b) => {
    const ta = a.t ? a.t.getTime() : 0;
    const tb = b.t ? b.t.getTime() : 0;
    return ta - tb;
  });
}

function updateTrailAndPoints(){
  const now = new Date();
  const from = new Date(now.getTime() - currentWindowHours * 60 * 60 * 1000);

  let filtered;
  if (historyData.some(p => !!p.t)) {
    filtered = historyData.filter(p => !p.t || p.t >= from);
  } else {
    filtered = historyData.slice(-200);
  }

  // Pfad aktualisieren
  const latlngs = filtered.map(p => [p.lat, p.lon]);
  trail.setLatLngs(latlngs);

  // Punkte (etwas größer) – nur Tooltip (Hover), KEIN Popup
  pointsLayer.clearLayers();
  const pointStyle = { radius: 4, color: '#ffffff', fillColor: '#ffffff', fillOpacity: 0.95, weight: 1 };
  for (const p of filtered){
    const m = L.circleMarker([p.lat, p.lon], pointStyle)
      .bindTooltip(pointTooltipHTML(p), { direction: 'top', sticky: true, opacity: 0.95 });
    pointsLayer.addLayer(m);
  }
}

// =====================
// Custom Controls (Home, 1h/2h/3h)
// =====================
const ButtonsControl = L.Control.extend({
  options: { position: 'topleft' },
  onAdd: function(){
    const container = L.DomUtil.create('div', 'leaflet-control custom-buttons');
    L.DomEvent.disableClickPropagation(container);
    L.DomEvent.disableScrollPropagation(container);

    // Home
    const homeBtn = L.DomUtil.create('button', 'custom-btn home', container);
    homeBtn.title = 'Zurück zum Menü';
    homeBtn.textContent = 'Home';
    homeBtn.addEventListener('click', () => { window.location.href = 'menu.html'; });

    // Zeitfenster
    const btn1 = makeRangeBtn(container, '1h', 1);
    const btn2 = makeRangeBtn(container, '2h', 2);
    const btn3 = makeRangeBtn(container, '3h', 3);
    btn1.classList.add('active');

    function makeRangeBtn(parent, label, hours){
      const btn = L.DomUtil.create('button', 'custom-btn', parent);
      btn.textContent = label;
      btn.addEventListener('click', () => {
        currentWindowHours = hours;
        [btn1, btn2, btn3].forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        updateTrailAndPoints();
      });
      return btn;
    }

    return container;
  }
});
map.addControl(new ButtonsControl());

// =====================
// Start
// =====================
fetchData();
setInterval(fetchData, REFRESH_MS);
