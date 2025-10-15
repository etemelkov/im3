// script.js

const API_URL = 'https://www.elenatemelkov.ch/unload.php';
const REFRESH_MS = 10000;
const ISS_ICON_URL = 'img/ISS.png';

// Leaflet Map
const map = L.map('map', { worldCopyJump: true });
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);
map.setView([0,0], 2);

const issIcon = L.icon({
  iconUrl: ISS_ICON_URL,
  iconSize: [64,64],
  iconAnchor: [32,32],
  popupAnchor: [0,-32]
});

let issMarker = null;
let trackLatLngs = [];
const trackPolyline = L.polyline([], { weight:2, opacity:.7 }).addTo(map);

// -------- Hilfsfunktionen --------

// finde in einem Objekt Koordinaten
function getLatLonFromObject(o){
  if (!o || typeof o !== 'object') return null;
  const lat = o.latitude ?? o.lat ?? (Array.isArray(o.latlon) ? o.latlon[0] : undefined);
  const lon = o.longitude ?? o.lon ?? o.lng ?? (Array.isArray(o.latlon) ? o.latlon[1] : undefined);
  if (lat == null || lon == null) return null;
  const latNum = parseFloat(lat);
  const lonNum = parseFloat(lon);
  return (Number.isFinite(latNum) && Number.isFinite(lonNum)) ? {lat:latNum, lon:lonNum} : null;
}

// akzeptiere: einzelnes Objekt ODER Array von Objekten
function extractLatLon(raw){
  // 1) direktes Objekt
  const direct = getLatLonFromObject(raw?.iss_position ?? raw?.data ?? raw);
  if (direct) return direct;

  // 2) Array -> von hinten den ersten mit Lat/Lon nehmen
  if (Array.isArray(raw)){
    for (let i = raw.length - 1; i >= 0; i--){
      const found = getLatLonFromObject(raw[i]?.iss_position ?? raw[i]?.data ?? raw[i]);
      if (found) return found;
    }
  }
  return null;
}

// -------- Daten holen & Marker setzen --------
async function fetchISS(){
  try{
    const res = await fetch(API_URL, { cache:'no-store' });
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();

    const pos = extractLatLon(json);
    if(!pos){
      console.warn('Konnte keine Lat/Lon aus der Antwort lesen:', json);
      return;
    }

    const latlng = [pos.lat, pos.lon];

    if(!issMarker){
      issMarker = L.marker(latlng, { icon: issIcon }).addTo(map).bindPopup('ISS – aktuelle Position');
      map.setView(latlng, 4, { animate:true });
    }else{
      issMarker.setLatLng(latlng);
    }

    trackLatLngs.push(latlng);
    if (trackLatLngs.length > 2000) trackLatLngs = trackLatLngs.slice(-1000);
    trackPolyline.setLatLngs(trackLatLngs);

  }catch(err){
    console.error('Fehler beim Laden der ISS-Position:', err);
  }
}

fetchISS();
setInterval(fetchISS, REFRESH_MS);
