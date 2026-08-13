// Format bytes into human readable format (KB, MB, GB)
export function formatBytes(bytes, decimals = 1) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

// Format speed into readable format (e.g., 4.2 MB/s)
export function formatSpeed(bytesPerSec) {
  if (!bytesPerSec || bytesPerSec === 0) return '0 KB/s';
  return `${formatBytes(bytesPerSec)}/s`;
}

// Format seconds into ETA mm:ss
export function formatTime(seconds) {
  if (!seconds || seconds <= 0 || !isFinite(seconds)) return '--s';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

// Export formatEta alias for TransferProgress component
export function formatEta(seconds) {
  return formatTime(seconds);
}

// Clean device detection with Hungarian sentence case (e.g. "Android telefon", "Android tablet")
export function detectDeviceName() {
  const ua = navigator.userAgent;

  if (/iPhone/.test(ua)) {
    return 'iPhone';
  }
  if (/iPad/.test(ua) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(ua))) {
    return 'iPad';
  }
  if (/Android/.test(ua)) {
    if (/Mobile/.test(ua)) {
      return 'Android telefon';
    }
    return 'Android tablet';
  }
  if (/Macintosh|Mac OS X/.test(ua)) {
    return 'MacBook / Mac';
  }
  if (/Windows/.test(ua)) {
    return 'Windows PC';
  }
  if (/Linux/.test(ua)) {
    return 'Linux PC';
  }

  return 'Eszköz';
}
