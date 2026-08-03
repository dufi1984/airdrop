/**
 * platform/index.js – Capability-Based Platform Detection
 *
 * Ahelyett, hogy ismert eszközök listáját karbantartanánk (törékenyes),
 * megkérdezzük a böngészőt: mit tudsz ténylegesen csinálni?
 *
 * Ha egy teljesen ismeretlen, új böngésző vagy eszköz csatlakozik,
 * az app automatikusan a helyes stratégiát választja – kódmódosítás nélkül.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * Vizsgált képességek:
 *
 *  1. canShareFiles – Tud-e a böngésző fájlokat megosztani a natív
 *     megosztási menün keresztül? (iOS: igen → Galériába mentés lehetséges)
 *
 *  2. isWebKit – WebKit (Safari) motort használ-e a böngésző?
 *     WebKit RTCDataChannel ~16 KB felett csendes csomagvesztést produkál.
 *
 *  3. silentDownload – Az <a download> kattintás csendben menti-e a fájlt?
 *     iOS Safariban ez megnyitja a fájlt a böngészőben, nem menti el.
 * ─────────────────────────────────────────────────────────────────────────
 */

function downloadBlob(blobUrl, name) {
  try {
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = blobUrl;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { if (document.body.contains(a)) document.body.removeChild(a); }, 500);
  } catch {
    window.open(blobUrl, '_blank');
  }
}

function buildPlatform() {
  const ua = navigator.userAgent;

  // ── Képesség 1: Natív fájlmegosztás (iOS Share Sheet) ─────────────────
  // Ha ez true → a böngésző meg tudja nyitni a "Mentés a Galériába" menüt.
  const canShareFiles = (() => {
    try {
      return !!(
        navigator.share &&
        navigator.canShare &&
        navigator.canShare({ files: [new File(['t'], 'test.txt', { type: 'text/plain' })] })
      );
    } catch {
      return false;
    }
  })();

  // ── Képesség 2: WebKit motor ───────────────────────────────────────────
  // WebKit = Safari és minden iOS böngésző (Chrome iOS is WebKit alatt fut).
  // Blink (Chrome, Edge, Samsung) is tartalmazza a "WebKit" szót a UA-ban,
  // ezért kizárjuk a Chromium-alapú böngészőket.
  const isWebKit = /WebKit/i.test(ua) && !/Chrome|CriOS|Chromium/i.test(ua);

  // ── Képesség 3: Csendes háttér-letöltés ──────────────────────────────
  // Android és Desktop: <a download> azonnal menti → autoDownloads = true
  // iOS Safari: <a download> a böngészőben nyitja meg → autoDownloads = false
  const silentDownload = !isWebKit;

  // ── Platform neve (csak tájékoztató / handshake-hez) ─────────────────
  const name = (() => {
    if (isWebKit && canShareFiles) return 'ios';
    if (isWebKit)                  return 'safari-desktop';
    if (/Android/i.test(ua))       return 'android';
    return 'desktop';
  })();

  return {
    /** Azonosító – handshake-ben kerül a másik eszköznek */
    name,

    /**
     * Optimális chunk méret a WebRTC DataChannel-en.
     * WebKit: max 16 KB (felett csendes csomagvesztés → szürke/hibás képek).
     * Minden más (Chromium, Gecko): 64 KB → ~4× gyorsabb átvitel.
     */
    chunkSize: isWebKit ? 16 * 1024 : 64 * 1024,

    /**
     * Ha true → fájlok fogadáskor azonnal, automatikusan letöltődnek
     * (Android: Downloads mappa, majd megjelenik a Galériában).
     * Ha false → a felhasználónak kell manuálisan mentenie (iOS Share Sheet).
     */
    autoDownloads: silentDownload,

    /** Egyetlen fájl mentése / letöltése */
    saveFile(item) {
      if (canShareFiles) {
        return navigator.share({ files: [item.file], title: item.name })
          .catch(err => { if (err.name !== 'AbortError') console.warn('[platform] share:', err); });
      }
      downloadBlob(item.blobUrl, item.name);
      return Promise.resolve();
    },

    /** Az összes fogadott fájl egyszerre mentése / letöltése */
    saveAllFiles(items) {
      if (canShareFiles) {
        const files = items.map(i => i.file);
        return navigator.share({ files, title: `${items.length} fájl` })
          .catch(err => { if (err.name !== 'AbortError') console.warn('[platform] share:', err); });
      }
      items.forEach((item, i) => setTimeout(() => downloadBlob(item.blobUrl, item.name), i * 300));
      return Promise.resolve();
    },

    /** Szöveg a manuális mentés gombhoz (csak iOS-en jelenik meg) */
    getSaveLabel(count) {
      if (canShareFiles) return count > 1 ? 'Képek mentése' : 'Kép mentése';
      return count > 1 ? 'Mind letöltése' : 'Letöltés';
    },
  };
}

export const platform = buildPlatform();
