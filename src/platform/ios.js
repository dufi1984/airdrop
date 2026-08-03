/**
 * iOS Platform Strategy
 * Saving files on iOS requires navigator.share() because the browser
 * sandbox cannot write directly to the Photos library.
 * All file saves go through the native iOS Share Sheet.
 */

function shareFiles(files, title) {
  if (!navigator.share || !navigator.canShare?.({ files })) return Promise.resolve();
  return navigator.share({ files, title }).catch((err) => {
    if (err.name !== 'AbortError') console.warn('[platform/ios] share failed:', err);
  });
}

export const iosPlatform = {
  name: 'ios',

  /** iOS Safari DataChannel payload limit – larger chunks get silently dropped */
  chunkSize: 16 * 1024,

  /**
   * iOS cannot auto-save without user interaction.
   * The UI must show a manual save button.
   */
  autoDownloads: false,

  /** Save a single received file via iOS Share Sheet */
  saveFile(item) {
    return shareFiles([item.file], item.name);
  },

  /** Save all received files at once via iOS Share Sheet */
  saveAllFiles(items) {
    return shareFiles(
      items.map((i) => i.file),
      `${items.length} fájl`
    );
  },

  /** Label for the save button shown in the UI */
  getSaveLabel(count) {
    return count > 1 ? 'Képek mentése' : 'Kép mentése';
  },
};
