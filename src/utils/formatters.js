export function formatBytes(bytes, decimals = 2) {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function formatSpeed(bytesPerSecond) {
  if (!bytesPerSecond || bytesPerSecond <= 0) return '0 KB/s';
  if (bytesPerSecond < 1024 * 1024) {
    return (bytesPerSecond / 1024).toFixed(1) + ' KB/s';
  }
  return (bytesPerSecond / (1024 * 1024)).toFixed(2) + ' MB/s';
}

export function formatEta(seconds) {
  if (!seconds || !isFinite(seconds) || seconds <= 0) return '-- s';
  if (seconds < 60) return `${Math.ceil(seconds)} s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.ceil(seconds % 60);
  return `${mins}m ${secs}s`;
}

export function generateRoomId() {
  return Math.random().toString(36).substring(2, 9);
}
