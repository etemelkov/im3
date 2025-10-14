// ===== map.js — ISS Live-Position mit Leaflet =====

const API_URL = 'https://www.elenatemelkov.ch/unload.php';
const REFRESH_MS = 60000; // alle 60s neu laden (bei Bedarf anpassen)

const elLat  = document.getElementById('lat');
const elLon  = document.getElementById('lon');
const elTime = document.getElementById('time');

// Leaflet Karte initialisieren
const map = L.map('map', {
  worldCopyJump: true,   // beim Pannen über die Dateigrenze springen
  zoomControl: false
}).setView([0, 0], 2);

// Dark Basemap (kostenfrei) + Attribution
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
  maxZoom: 19,
  attribution:
    '&copy; OpenStreetMap &copy; CARTO'
}).addTo(map);

// ISS Icon (verwende dein Bild im /img Ordner)
const issIcon = L.icon({
  iconUrl: 'img/ISS.png', // Pfad anpassen, falls nötig
  iconSize:   [56, 56],
  iconAnchor: [28, 28],   // zentriert
  popupAnchor:[0, -28]
});

let issMarker = null;

// Hilfen
const normalizeKey = (s) => String(s || '').toLowerCase();
function findKey(obj, needle){
  const n = needle.toLowerCase();
  return Object.keys(obj).find(k => normalizeKey(k).includes(n));
}
function parseTimeToLocalLabel(ts){
  // erwartet "YYYY-MM-DD HH:MM:SS" o.ä.; fallback: original
  try{
    const d = new Date(ts.replace(' ', 'T') + 'Z');
    if (isNaN(d)) return ts;
    // Zeige lokale Uhrzeit HH:MM
    const hh = String(d.getHours()).padStart(2,'0');
    const mm = String(d.getMinutes()).padStart(2,'0');
    return `${hh}:${mm}`;
  }catch(_){ return ts; }
}

// Daten holen & Karte updaten
async function updateISS(){
  try{
    const res = await fetch(API_URL, { cache: 'no-store' });
    if(!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    if(!data || (Array.isArray(data) && data.length === 0)) throw new Error('Keine Daten');

    const latest = Array.isArray(data) ? data[data.length - 1] : data;

    // Keys robust ermitteln
    const latKey  = findKey(latest, 'latitude')  || 'latitude';
    const lonKey  = findKey(latest, 'longitude') || 'longitude';
    const timeKey = findKey(latest, 'timestamp') || 'timestamp';

    const lat = parseFloat(latest[latKey]);
    const lon = parseFloat(latest[lonKey]);
    const tRaw = latest[timeKey];

    if(Number.isNaN(lat) || Number.isNaN(lon)) throw new Error('Ungültige Koordinaten');

    // Marker setzen/verschieben
    if(!issMarker){
      issMarker = L.marker([lat, lon], { icon: issIcon }).addTo(map);
      map.setView([lat, lon], 3, { animate: true });
    }else{
      issMarker.setLatLng([lat, lon]);
      // sanft zentrieren, ohne ständig reinzuzoomen
      map.panTo([lat, lon], { animate: true, duration: 0.8 });
    }

    // Info-Panel
    elLat.textContent  = lat.toFixed(4);
    elLon.textContent  = lon.toFixed(4);
    elTime.textContent = parseTimeToLocalLabel(tRaw ?? '—');

  }catch(err){
    console.error('ISS-Update fehlgeschlagen:', err);
    elTime.textContent = 'Fehler beim Laden';
  }
}

// sofort laden, danach regelmäßig
updateISS();
setInterval(updateISS, REFRESH_MS);
