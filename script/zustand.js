console.log("Hello, Visibility!");

(async function () {
  const API_URL = 'https://www.elenatemelkov.ch/unload.php';

  const textEl = document.getElementById('iss-visibility');      // <p> unten
  const illuEl = document.getElementById('state-illustration');   // Bild in der Mitte

  if (!textEl || !illuEl) {
    console.error('Container nicht gefunden (#iss-visibility / #state-illustration).');
    return;
  }

  // --- Helpers ---
  const normalize = (s) => String(s ?? '').toLowerCase().trim();

  function pickVisibilityKey(obj) {
    return Object.keys(obj).find(k => k.toLowerCase().includes('visibility')) || null;
  }

  // Nutzt genau Dateinamen im /img Ordner
  function pickStateImage(visText) {
    const t = normalize(visText);

    // "sind wach"
    if (t.includes('wach')) {
      return { src: 'img/Astronaut_wachtauf.png', alt: 'Astronauten sind wach' };
    }
    // "sind am schlafen"
    if (t.includes('schlaf')) {
      return { src: 'img/Astronaut_schlafen.png', alt: 'Astronauten schlafen' };
    }
    // "schauen sich den Sonnenauf- oder untergang an"
    if (t.includes('sonnen')) {
      return { src: 'img/Astronaut_Sonnenaufuntergang.png', alt: 'Astronauten beobachten Sonnenauf-/untergang' };
    }

    // Fallback (falls Text nicht erkannt)
    return { src: 'img/Astronaut_wachtauf.png', alt: 'Aktueller Zustand' };
  }

  // Bild sauber einfügen (mit Fallback falls 404)
  async function renderImage(src, alt) {
    return new Promise((resolve) => {
      const img = new Image();
      img.className = 'state-img';
      img.alt = alt;
      img.onload = () => {
        illuEl.innerHTML = '';
        illuEl.appendChild(img);
        resolve(true);
      };
      img.onerror = () => {
        console.warn('Bild nicht gefunden:', src, '→ Fallback verwenden');
        const fallback = 'img/Astronaut_wachtauf.png';
        if (src !== fallback) {
          img.src = fallback;
        } else {
          illuEl.innerHTML = '<p style="margin:0">Kein Bild verfügbar</p>';
          resolve(false);
        }
      };
      img.src = src; // WICHTIG: Pfad ist relativ zur HTML-Datei, nicht zur JS-Datei
    });
  }

  try {
    const res = await fetch(API_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status} – ${res.statusText}`);

    const data = await res.json();
    console.log('API Antwort:', data);

    if (!data || (Array.isArray(data) && data.length === 0)) {
      textEl.textContent = 'Keine Sichtbarkeitsdaten verfügbar.';
      return;
    }

    const latest = Array.isArray(data) ? data[data.length - 1] : data;
    const visKey = pickVisibilityKey(latest);
    if (!visKey) {
      textEl.textContent = 'Feld "visibility" nicht gefunden.';
      return;
    }

    const visibilityValue = latest[visKey];
    const { src, alt } = pickStateImage(visibilityValue);

    await renderImage(src, alt);
    textEl.textContent = String(visibilityValue ?? '—');
  } catch (err) {
    console.error('Fehler beim Laden:', err);
    textEl.textContent = `Daten konnten nicht geladen werden: ${err.message}`;
  }
})();
