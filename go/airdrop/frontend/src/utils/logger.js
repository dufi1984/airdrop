/**
 * utils/logger.js – Automatikus Diagnosztikai és Eseménynapló
 *
 * Minden hálózati, ICE, WebRTC és fájlátviteli eseményt automatikusan
 * időbélyeggel rögzít a memóriában és sessionStorage-ben (utolsó 200 bejegyzés).
 */

const MAX_LOGS = 200;
const STORAGE_KEY = 'airdrop_diag_logs';

class DiagnosticLogger {
  constructor() {
    this.logs = this.loadFromStorage();
    this.listeners = new Set();
  }

  loadFromStorage() {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  }

  saveToStorage() {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(this.logs));
    } catch (_) {}
  }

  log(level, category, message, details = null) {
    const time = new Date().toLocaleTimeString('hu-HU', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
    });

    const entry = {
      id: Date.now() + Math.random(),
      time,
      level, // 'info' | 'success' | 'warn' | 'error' | 'ice'
      category, // 'PEER' | 'ICE' | 'TRANSFER' | 'DISCOVERY' | 'SYSTEM'
      message,
      details: details ? (typeof details === 'object' ? JSON.stringify(details) : String(details)) : null,
    };

    this.logs.push(entry);
    if (this.logs.length > MAX_LOGS) {
      this.logs.shift();
    }

    this.saveToStorage();

    // Standard console output as well
    const prefix = `[${time}] [${category}]`;
    if (level === 'error') {
      console.error(prefix, message, details || '');
    } else if (level === 'warn') {
      console.warn(prefix, message, details || '');
    } else {
      console.log(prefix, message, details || '');
    }

    this.notify();
  }

  info(category, message, details) {
    this.log('info', category, message, details);
  }

  success(category, message, details) {
    this.log('success', category, message, details);
  }

  warn(category, message, details) {
    this.log('warn', category, message, details);
  }

  error(category, message, details) {
    this.log('error', category, message, details);
  }

  ice(message, details) {
    this.log('ice', 'ICE', message, details);
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notify() {
    this.listeners.forEach((cb) => {
      try { cb(this.logs); } catch (_) {}
    });
  }

  getLogs() {
    return [...this.logs];
  }

  clear() {
    this.logs = [];
    try { sessionStorage.removeItem(STORAGE_KEY); } catch (_) {}
    this.notify();
  }

  exportText() {
    return this.logs
      .map((l) => `[${l.time}] [${l.level.toUpperCase()}] [${l.category}] ${l.message}${l.details ? ` | ${l.details}` : ''}`)
      .join('\n');
  }
}

export const logger = new DiagnosticLogger();

// Expose globally for browser console debugging if needed
if (typeof window !== 'undefined') {
  window.__airdrop_logger = logger;
}
