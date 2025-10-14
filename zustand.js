console.log("Hello, Visibility!");

(async function () {
  const API_URL = 'https://www.elenatemelkov.ch/unload.php';

  // Ziel-Elemente aus dem HTML:
  const textEl = document.getElementById('iss-visibility');      // <p> unten
  const illuEl = document.getElementById('state-illustration');   // Bild in der Mitte

  if (!textEl || !illuEl) {
    console.error('Container nicht gefunden. Stelle sicher, dass #iss-visibility und #state-illustration im HTML vorhanden sind.');
    return;
  }

  // Hilfsfunktionen
  function pickVisibilityKey(obj) {
    // Finde Key, der "visibility" enthält (case-insensitive)
    const k = Object.keys(obj).find(key => key.toLowerCase().includes('visibility'));
    return k || null;
  }

  function normalize(str) {
    return String(str || '').toLowerCase().trim();
  }

  function pickStateImage(visText) {
    const t = normalize(visText);

    // Mapping nach deinem Wunsch:
    // "sind wach" -> Astronaut_sindwach
    // "sind am schlafen" -> Astronaut_schlafen
    // "schauen sich den Sonnenauf- oder untergang an" -> Astronaut_Sonnenaufuntergang
    if (t.includes('wach')) {
      return { src: 'img/Astronaut_sindwach.png', alt: 'Astronauten sind wach' };
    }
    if (t.includes('schlaf')) {
      return { src: 'img/Astronaut_schlafen.png', alt: 'Astronauten schlafen' };
    }
    if (t.includes('sonnen')) {
      // deckt Sonnenaufgang / Sonnenuntergang
      return { src: 'img/Astronaut_Sonnenaufuntergang.png', alt: 'Astronauten beobachten Sonnenauf-/-untergang' };
    }
    // Fallback (optional eigenes Bild anlegen)
    return { src: 'img/Astronaut_sindwach.png', alt: 'Aktueller Zustand' };
  }

  try {
    const res = await fetch(API_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status} – ${res.statusText}`);

    const data = await res.json();
    console.log('API Antwort:', data);

    // Daten prüfen
    if (!data || (Array.isArray(data) && data.length === 0)) {
      textEl.textContent = 'Keine Sichtbarkeitsdaten verfügbar.';
      return;
    }

    // Nehme den jüngsten Datensatz (letztes Element, falls Array), sonst das Objekt selbst
    const latest = Array.isArray(data) ? data[data.length - 1] : data;

    const visKey = pickVisibilityKey(latest);
    if (!visKey) {
      textEl.textContent = 'Feld "visibility" nicht gefunden.';
      return;
    }

    const visibilityValue = latest[visKey];
    const { src, alt } = pickStateImage(visibilityValue);

    // Bild einsetzen (Mitte)
    illuEl.innerHTML = `<img src="${src}" alt="${alt}" class="state-img">`;

    // Text unten (dein <p>, globales Styling)
    textEl.textContent = String(visibilityValue ?? '—');

  } catch (err) {
    console.error('Fehler beim Laden:', err);
    textEl.textContent = `Daten konnten nicht geladen werden: ${err.message}`;
  }
})();
