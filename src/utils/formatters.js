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

// Automatic device and browser detection based on factory browser navigator API
export function detectDeviceName() {
  const ua = navigator.userAgent;
  let os = 'Eszköz';
  let browser = '';

  // Detect Browser
  if (/Chrome/.test(ua) && !/Edg/.test(ua) && !/OPR/.test(ua)) {
    browser = 'Chrome';
  } else if (/Safari/.test(ua) && !/Chrome/.test(ua)) {
    browser = 'Safari';
  } else if (/Edg/.test(ua)) {
    browser = 'Edge';
  } else if (/Firefox/.test(ua)) {
    browser = 'Firefox';
  }

  // Detect Operating System & Form Factor
  if (/iPhone/.test(ua)) {
    os = 'iPhone';
  } else if (/iPad/.test(ua) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(ua))) {
    os = 'iPad';
  } else if (/Android/.test(ua)) {
    if (/Mobile/.test(ua)) {
      os = 'Android Telefon';
    } else {
      os = 'Android Tablet';
    }
  } else if (/Macintosh|Mac OS X/.test(ua)) {
    os = 'MacBook / Mac';
  } else if (/Windows/.test(ua)) {
    os = 'Windows PC';
  } else if (/Linux/.test(ua)) {
    os = 'Linux PC';
  }

  return browser ? `${os} (${browser})` : os;
}
