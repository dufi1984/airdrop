/**
 * Default Platform Strategy – Android & Desktop
 * Both can trigger direct browser file downloads via <a download>,
 * which saves files straight to the device's Downloads / Gallery storage
 * without any share sheet or user interaction required.
 */

function downloadBlob(blobUrl, name) {
  try {
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = blobUrl;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      if (document.body.contains(a)) document.body.removeChild(a);
    }, 500);
  } catch (e) {
    window.open(blobUrl, '_blank');
  }
}

function makeDefaultPlatform(platformName) {
  return {
    name: platformName,

    /** Chromium-based browsers handle 64KB chunks without issue */
    chunkSize: 64 * 1024,

    /**
     * Android and Desktop can save files automatically the moment they arrive,
     * without requiring a user button press.
     */
    autoDownloads: true,

    /** Save a single received file directly to Downloads / Gallery */
    saveFile(item) {
      downloadBlob(item.blobUrl, item.name);
      return Promise.resolve();
    },

    /** Save all received files, staggered to avoid browser download throttling */
    saveAllFiles(items) {
      items.forEach((item, index) => {
        setTimeout(() => downloadBlob(item.blobUrl, item.name), index * 300);
      });
      return Promise.resolve();
    },

    /** Label for a manual re-download button (shown as fallback) */
    getSaveLabel(count) {
      return count > 1 ? 'Mind letöltése' : 'Letöltés';
    },
  };
}

export const androidPlatform = makeDefaultPlatform('android');
export const desktopPlatform = makeDefaultPlatform('desktop');
