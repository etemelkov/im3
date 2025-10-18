// =====================
// Konfiguration
// =====================
const API_URL = 'https://www.elenatemelkov.ch/unload.php';
const REFRESH_MS = 10000;            // alle 10s neu laden
const ISS_ICON_URL = 'img/ISS.png';  // Pfad zu deinem ISS-Icon
let currentWindowHours = 1;          // Buttons (1h / 2h / 3h)

// Zählfenster auf 14 Tage gesetzt
const PASS_COUNT_DAYS = 14; 
// Toleranz in Grad für die Überflug-Zählung (1.0 Grad ≈ 110 km)
// Dies ist ein realistischerer Radius für einen "nahen" Überflug als der vorherige Wert (0.5°)
const TOLERANCE_DEG = 1.0; 

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
let lastUpdate = null;     
let historyData = [];      

const trail = L.polyline([], { weight: 2.5, opacity: 0.9, color: '#ffffff' }).addTo(map);
const pointsLayer = L.layerGroup().addTo(map);

// =====================
// Utils & Parsing
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
// Logik für Überflüge über benutzerdefinierte Koordinaten
// =====================

/**
 * Zählt Überflüge über einen bestimmten Punkt (Lat/Lon) innerhalb der letzten ${PASS_COUNT_DAYS} Tage.
 * Definiert einen "Überflug" als das Eintreten der ISS in einen Kasten um den Punkt.
 * @param {number} userLat - Breitengrad des benutzerdefinierten Standorts
 * @param {number} userLon - Längengrad des benutzerdefinierten Standorts
 * @returns {number} - Anzahl der Überflüge
 */
function countPassesOverPoint(userLat, userLon) {
    let passCount = 0;
    let isCurrentlyOver = false;

    const now = new Date();
    const filterTime = new Date(now.getTime() - PASS_COUNT_DAYS * 24 * 60 * 60 * 1000);
    const pointsFiltered = historyData.filter(p => p.t && p.t >= filterTime);

    for (const point of pointsFiltered) {
        // Prüft, ob der Punkt innerhalb des Toleranz-Rechtecks liegt
        // **Verwendet die neue, grössere TOLERANCE_DEG**
        const isNear = Math.abs(point.lat - userLat) < TOLERANCE_DEG && 
                       Math.abs(point.lon - userLon) < TOLERANCE_DEG;

        // 1. Übergang: Von Nicht-Überflug zu Überflug
        if (isNear && !isCurrentlyOver) {
            passCount++;        
            isCurrentlyOver = true;
        } 
        // 2. Übergang: Von Überflug zu Nicht-Überflug
        else if (!isNear && isCurrentlyOver) {
            isCurrentlyOver = false; 
        }
    }
    
    return passCount;
}


// =====================
// Daten holen & darstellen
// =====================
async function fetchFullHistoryAndCurrent(){
  try{
    // 1. Aktuelle Position holen (für Marker-Update)
    const currentRes = await fetch(API_URL, { cache:'no-store' });
    if (!currentRes.ok) throw new Error(`HTTP ${currentRes.status} bei aktueller Position`);
    const currentJson = await currentRes.json();
    const { last, points } = normalizeResponse(currentJson);
    
    if (!last) {
      console.warn('Konnte aktuelle Lat/Lon nicht lesen:', currentJson);
      return;
    }
    
    // 2. Historische Daten für 14 Tage holen 
    let historyJson = [];
    try {
        // Annahme: API unterstützt '?history=14d'
        const historyRes = await fetch(`${API_URL}?history=${PASS_COUNT_DAYS}d`, { cache:'no-store' });
        if (historyRes.ok) {
            historyJson = await historyRes.json();
        } else {
            console.warn(`Historie HTTP ${historyRes.status} oder ${PASS_COUNT_DAYS}-Tage-Endpunkt nicht vorhanden. Fallback auf lokale Historie.`);
            historyJson = historyData;
        }
    } catch(e) {
        console.error(`Fehler beim Abrufen der ${PASS_COUNT_DAYS}-Tage Historie:`, e);
        historyJson = historyData; 
    }

    // 3. Daten zusammenführen
    const { points: historicPoints } = normalizeResponse(historyJson);
    historyData = historicPoints;
    mergeHistory([last]); 

    lastUpdate = last.t || new Date();
    const latlng = [last.lat, last.lon];

    // Marker aktualisieren (wie bisher)
    if (!issMarker){
      issMarker = L.marker(latlng, { icon: issIcon }).addTo(map);
      issMarker.bindTooltip(infoHTML(last.lat, last.lon, last.t), { direction: 'top', sticky: true, opacity: 0.95 });
      map.setView(latlng, 4, { animate: true });
    } else {
      issMarker.setLatLng(latlng);
      issMarker.setTooltipContent(infoHTML(last.lat, last.lon, last.t));
    }

    // Pfad und Punkte aktualisieren (basierend auf 1h/2h/3h Ansichtsfenster)
    updateTrailAndPoints();
    
  } catch (err) {
    console.error('Fehler beim Laden der ISS-Position:', err);
  }
}

// (mergeHistory und updateTrailAndPoints bleiben unverändert)
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
// Logik für das Popup der Benutzerkoordinaten
// =====================
/**
 * Erstellt und initialisiert den HTML-Inhalt und die Logik für das Popup zur 
 * Berechnung der Überflüge über den Benutzerstandort.
 * @param {L.Map} map - Die Leaflet-Karte, um den Marker zu verwalten.
 * @returns {HTMLElement} - Das Container-Element für das Popup.
 */
function createUserPassesPopupContent(map) {
    const container = L.DomUtil.create('div', 'custom-input-popup');
    
    // Inline-Styles für ein dunkles, leicht transparentes Panel
    container.style.padding = '10px';
    container.style.backgroundColor = 'rgba(30, 30, 30, 0.9)'; // Etwas weniger transparent für Popup
    container.style.color = '#fff';
    container.style.borderRadius = '8px';
    container.style.boxShadow = '0 4px 10px rgba(0,0,0,0.5)';
    container.style.maxWidth = '250px';
    container.style.margin = '-10px'; // Offset Leaflet's Popup padding

    // Dynamische Anzeige der Tage im Titel **KORRIGIERT**
    container.innerHTML = `
        <div style="font-weight:700; margin-bottom: 8px;">Überflüge über deinem Standort prüfen (${PASS_COUNT_DAYS} Tage)</div>
        <div style="display:flex; flex-direction: column; gap: 12px; margin-bottom: 12px;">
            <input type="number" step="0.0001" id="userLat_popup" placeholder="Breitengrad (Lat: 46.9)" min="-90" max="90" style="padding: 10px; border-radius: 4px; border: none; color: #111; width: 100%; box-sizing: border-box; height: 40px;">
            <input type="number" step="0.0001" id="userLon_popup" placeholder="Längengrad (Lon: 7.4)" min="-180" max="180" style="padding: 10px; border-radius: 4px; border: none; color: #111; width: 100%; box-sizing: border-box; height: 40px;">
        </div>
        <button id="calculatePassesBtn_popup" class="custom-btn" style="width: 100%; margin-bottom: 8px; background: #5cb85c; color: white;">Berechnen</button>
        <div id="userPassResult_popup" style="font-size: 14px; text-align: center; min-height: 20px;"></div>
    `;

    const calculateBtn = container.querySelector('#calculatePassesBtn_popup');
    const latInput = container.querySelector('#userLat_popup');
    const lonInput = container.querySelector('#userLon_popup');
    const resultDisplay = container.querySelector('#userPassResult_popup');
    
    // Setzt Standardwerte auf Bern
    latInput.value = '46.9480';
    lonInput.value = '7.4474';

    // Stellt sicher, dass der userMarker auf der Map-Instanz verfolgt wird
    if (!map.userMarker) {
        map.userMarker = null;
    }

    calculateBtn.addEventListener('click', () => {
        const userLat = parseFloat(latInput.value);
        const userLon = parseFloat(lonInput.value);

        if (isNaN(userLat) || isNaN(userLon) || userLat < -90 || userLat > 90 || userLon < -180 || userLon > 180) {
            resultDisplay.innerHTML = '<span style="color: #ff9999;">Ungültige Koordinaten. Bitte prüfen Sie die Werte.</span>';
            return;
        }

        if (historyData.length === 0) {
            resultDisplay.textContent = 'Daten werden noch geladen...';
            return;
        }
        
        resultDisplay.textContent = 'Berechne...';

        const passes = countPassesOverPoint(userLat, userLon);
        
        // 1. Update des Resultat-Displays IM Pop-up (innerhalb des Eingabefensters)
        resultDisplay.innerHTML = `Die ISS überflog deinen Standort <b>${passes}</b>-mal.`;

        // 2. ERSTELLEN des Marker-Popup-Inhalts (mit Koordinaten und Zählergebnis)
        // Dynamische Anzeige der Tage im Popup-Text **KORRIGIERT**
        const markerPopupContent = `
            <div style="font-weight: 600; font-size: 14px;">Deine Position:</div>
            <div>Lat: ${userLat.toFixed(4)}, Lon: ${userLon.toFixed(4)}</div>
            <hr style="margin: 5px 0; border-color: #555;">
            <div style="font-weight: 700; color: #5cb85c;">
                Die ISS überflog deinen Standort <b>${passes}</b>-mal in den letzten ${PASS_COUNT_DAYS} Tagen.
            </div>
        `;

        // Marker an der Benutzerposition hinzufügen/aktualisieren (WEISS)
        const latlng = [userLat, userLon];
        const markerStyle = {
            radius: 8,
            color: '#ffffff', // WEISS
            fillColor: '#ffffff', // WEISS
            fillOpacity: 0.8,
            weight: 2
        };

        if(map.userMarker) {
            map.userMarker.setLatLng(latlng);
            // Bestehenden Inhalt aktualisieren
            map.userMarker.setPopupContent(markerPopupContent); 
        } else {
            map.userMarker = L.circleMarker(latlng, markerStyle).addTo(map)
                // Neuen Marker mit dem gewünschten Inhalt binden
                .bindPopup(markerPopupContent);
        }
        
        // Schließt das Eingabe-Popup, nachdem die Berechnung abgeschlossen und der Marker gesetzt wurde
        map.closePopup(); 
        
        // Stellt die Ansicht auf den Marker ein und öffnet sein Popup
        map.setView(latlng, 5, { animate: true });
        map.userMarker.openPopup();
    });

    return container;
}


// =====================
// Custom Controls (Dropdown für mobile Ansicht)
// =====================
const ButtonsControl = L.Control.extend({
  options: { position: 'topleft' },
  onAdd: function(){
    // Hauptcontainer für alle Bedienelemente
    const container = L.DomUtil.create('div', 'leaflet-control custom-buttons-container');
    L.DomEvent.disableClickPropagation(container);
    L.DomEvent.disableScrollPropagation(container);

    // Flexbox für die vertikale Anordnung und den Abstand
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '8px'; // Abstand zwischen "Zurück" und "Optionen"
    container.style.width = '120px'; // Feste Breite für beide Buttons

    // 1. "Zurück" Button 
    const homeBtn = L.DomUtil.create('button', 'custom-btn home', container);
    homeBtn.title = 'Zurück zum Menü';
    homeBtn.textContent = 'Zurück';
    homeBtn.style.width = '100%'; // Nimmt die Container-Breite an
    homeBtn.style.textAlign = 'center'; // Zentriert den Text im Button
    homeBtn.addEventListener('click', () => { window.location.href = 'menu.html'; });

    // 2. Dropdown-Menü
    const select = L.DomUtil.create('select', 'custom-btn custom-select', container);
    select.title = 'Optionen auswählen';
    select.style.width = '100%'; // Nimmt die Container-Breite an
    // ANPASSUNG: Zentrierung des angezeigten Textes beibehalten
    select.style.textAlign = 'center'; 
    // NEU: Schriftart auf system-ui setzen
    select.style.fontFamily = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif'; 
    
    // Standard-Option/Titel
    const defaultOption = L.DomUtil.create('option', '', select);
    defaultOption.textContent = 'Optionen';
    defaultOption.value = 'default';
    defaultOption.disabled = true;
    defaultOption.selected = true;
    // NEU: Schriftart für die Dropdown-Elemente setzen
    defaultOption.style.fontFamily = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif'; 

    // Optionen hinzufügen
    const optionsData = [
      { label: '1h', value: 1 },
      { label: '2h', value: 2 },
      { label: '3h', value: 3 },
      { label: 'Überflüge berechnen', value: 'calculate' }
    ];

    optionsData.forEach(data => {
      // Zentriert den Text in der Dropdown-Liste
      const opt = L.DomUtil.create('option', '', select);
      opt.textContent = data.label;
      opt.value = data.value;
      opt.style.textAlign = 'center'; 
      // NEU: Schriftart für die Dropdown-Elemente setzen
      opt.style.fontFamily = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif'; 
    });

    // Event Listener für Dropdown
    select.addEventListener('change', (e) => {
      const value = e.target.value;
      
      if (value === 'calculate') {
        // Aktion: Popup öffnen
        const popupContent = createUserPassesPopupContent(map);
        
        L.popup({
            closeButton: true,
            autoClose: false,
            className: 'user-input-popup',
            maxWidth: 300
        })
        .setLatLng(map.getCenter()) 
        .setContent(popupContent)
        .openOn(map);

        // Auswahl zurücksetzen
        e.target.value = 'default'; 

      } else if (Number.isFinite(parseInt(value, 10))) {
        // Aktion: Zeitfenster ändern
        currentWindowHours = parseInt(value, 10);
        updateTrailAndPoints();
      }
    });
    
    currentWindowHours = 1;

    return container;
  }
});
map.addControl(new ButtonsControl());


// =====================
// Start
// =====================
fetchFullHistoryAndCurrent(); 
setInterval(fetchFullHistoryAndCurrent, REFRESH_MS);