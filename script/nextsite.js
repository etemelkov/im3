// nextsite.js
(function () {
    'use strict';
  
    const NEXT_URL = 'menu.html';
    const SELECTORS = ['.iss', '.earth'];
    const SAFETY_BUFFER_MS = 400;        // kleiner Puffer
    const DEFAULT_FALLBACK_MS = 11000;   // 7s Delay + ~3–4s Animation
  
    // Bei reduziertem Bewegungswunsch sofort weiter
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      window.location.href = NEXT_URL;
      return;
    }
  
    // Warte bis DOM da ist (falls Script doch im <head> landet)
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  
    function init() {
      const els = SELECTORS.map(s => document.querySelector(s)).filter(Boolean);
      if (!els.length) {
        // Keine Elemente gefunden -> direkt weiter
        window.location.href = NEXT_URL;
        return;
      }
  
      let finished = 0;
      const done = () => {
        finished++;
        if (finished >= els.length) {
          window.location.href = NEXT_URL;
        }
      };
  
      // längste (delay + duration) je Element ermitteln – auch bei Komma-Listen
      const longestAnimMs = (cs) => {
        const names = (cs.animationName || '').split(',').map(s => s.trim()).filter(n => n && n !== 'none');
        if (!names.length) return 0;
        const delays = (cs.animationDelay || '').split(',').map(v => parseFloat(v) || 0);
        const durs   = (cs.animationDuration || '').split(',').map(v => parseFloat(v) || 0);
        let max = 0;
        for (let i = 0; i < names.length; i++) {
          const total = ((delays[i] ?? delays[0] ?? 0) + (durs[i] ?? durs[0] ?? 0)) * 1000;
          if (total > max) max = total;
        }
        return max;
      };
  
      let maxAnimTime = 0;
  
      els.forEach(el => {
        try {
          const cs = getComputedStyle(el);
          const names = (cs.animationName || '').trim();
  
          if (names && names !== 'none') {
            maxAnimTime = Math.max(maxAnimTime, longestAnimMs(cs));
            // Standard + Safari (webkit) Events
            const opts = { once: true };
            el.addEventListener('animationend', done, opts);
            el.addEventListener('webkitAnimationEnd', done, opts);
          } else {
            // Keine Animation -> sofort zählen
            done();
          }
        } catch (e) {
          // Bei Fehler: nicht hängen bleiben
          done();
        }
      });
  
      // Sicherheits-Fallback
      setTimeout(() => {
        if (finished < els.length) window.location.href = NEXT_URL;
      }, (maxAnimTime || DEFAULT_FALLBACK_MS) + SAFETY_BUFFER_MS);
    }
  })();
  