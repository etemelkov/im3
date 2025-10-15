// js/map.js

// ------- Einstellungen -------
const API_URL = 'https://www.elenatemelkov.ch/unload.php';
const REFRESH_MS = 10000; // alle 10s neu laden (falls API so oft aktualisiert)
const ISS_ICON_URL = 'img/ISS.png'; // Pfad zu deinem Icon

// ------- Leaflet Grundsetup -------
const map = L.map('map', {
  worldCopyJump: true
});

// Kachel-Layer (OpenStreetMap – frei nutzbar mit Attribution)
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

// Startzoom & Mittelpunkt provisorisch (wird beim ersten Fix angepasst)
map.setView([0, 0], 2);

// Custom Icon für die ISS
const issIcon = L.icon({
  iconUrl: ISS_ICON_URL,
  iconSize: [64, 64],      // ggf. anpassen je nach PNG
  iconAnchor: [32, 32],    // Mittelpunkt des Icons
  popupAnchor: [0, -32]
});

let issMarker = null;
let trackLatLngs = [];
let trackPolyline = L.polyline([], { weight: 2, opacity: 0.7 }).addTo(map);

// ------- Helper: flexible JSON-Felder erkennen -------
// Diese Funktion versucht, typische Feldnamen zu erkennen (lat/lon/…)
function extractLatLon(raw) {
  if (!raw || typeof raw !== 'object') return null;

  // 1) open-notify Stil: { iss_position: { latitude: "12.34", longitude: "56.78" } }
  if (raw.iss_position && raw.iss_position.latitude && raw.iss_position.longitude) {
    return {
      latitude: parseFloat(raw.iss_position.latitude),
      longitude: parseFloat(raw.iss_position.longitude)
    };
  }

  // 2) flach: { latitude: 12.34, longitude: 56.78 } oder Strings
  if ((raw.latitude != null && raw.longitude != null) ||
      (raw.lat != null && (raw.lon != null || raw.lng != null))) {
    const lat = raw.latitude ?? raw.lat;
    const lon = raw.longitude ?? raw.lon ?? raw.lng;
    return { lat: parseFloat(lat), lon: parseFloat(lon) };
  }

  // 3) Array-ähnlich: { latlon: [lat, lon] }
  if (Array.isArray(raw.latlon) && raw.latlon.length >= 2) {
    return { lat: parseFloat(raw.latlon[0]), lon: parseFloat(raw.latlon[1]) };
  }

  // 4) Falls die API eingebettet liefert: { data: { ... } }
  if (raw.data) {
    return extractLatLon(raw.data);
  }

  return null;
}

// ------- Daten laden & Marker aktualisieren -------
async function fetchISS() {
  try {
    const res = await fetch(API_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();

    const pos = extractLatLon(json);
    if (!pos || Number.isNaN(pos.lat) || Number.isNaN(pos.lon)) {
      console.warn('Konnte keine Lat/Lon aus der Antwort lesen:', json);
      return;
    }

    const latlng = [pos.lat, pos.lon];

    if (!issMarker) {
      issMarker = L.marker(latlng, { icon: issIcon })
        .addTo(map)
        .bindPopup('ISS – aktuelle Position');
      map.setView(latlng, 4, { animate: true });
    } else {
      issMarker.setLatLng(latlng);
    }

    // Spur aktualisieren
    trackLatLngs.push(latlng);
    // Spur nicht endlos groß werden lassen
    if (trackLatLngs.length > 2000) trackLatLngs = trackLatLngs.slice(-1000);
    trackPolyline.setLatLngs(trackLatLngs);

  } catch (err) {
    console.error('Fehler beim Laden der ISS-Position:', err);
  }
}

// Initial laden & dann regelmäßig aktualisieren
fetchISS();
setInterval(fetchISS, REFRESH_MS);
