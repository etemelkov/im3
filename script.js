// Leaflet Quick-Start: Karte erzeugen, Basiskachel, Marker/Popup

// 1) Karte initialisieren (Mittelpunkt + Zoom)
const map = L.map('map').setView([51.505, -0.09], 13);

// 2) Basiskarten-Layer (OSM)
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap-Mitwirkende'
}).addTo(map);

// 3) Beispiel-Marker + Popup
const marker = L.marker([51.5, -0.09]).addTo(map);
marker.bindPopup('<b>Hallo!</b><br/>Ich bin ein Popup.').openPopup();

// 4) Optional: Klick-Handler zeigt Koordinaten
map.on('click', (e) => {
  L.popup()
    .setLatLng(e.latlng)
    .setContent(`Koordinaten: ${e.latlng.lat.toFixed(5)}, ${e.latlng.lng.toFixed(5)}`)
    .openOn(map);
});

