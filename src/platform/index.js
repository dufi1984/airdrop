/**
 * Platform Detection & Export
 *
 * Detects the current device type ONCE at app startup and exports
 * the matching platform strategy object. The rest of the codebase
 * only imports `platform` and calls its methods — no if/else branching needed.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * HOW TO ADD A NEW DEVICE TYPE IN THE FUTURE
 * ─────────────────────────────────────────────────────────────────────────────
 * 1. Create `src/platform/<newdevice>.js` implementing the platform interface:
 *      {
 *        name: string,           // e.g. 'samsung-dex'
 *        chunkSize: number,      // bytes per WebRTC chunk (16384 or 65536)
 *        autoDownloads: boolean, // true = save files automatically on receive
 *        saveFile(item),         // save a single received file
 *        saveAllFiles(items),    // save all received files
 *        getSaveLabel(count),    // label for the manual save button in the UI
 *      }
 *
 * 2. Import it here and add a detection condition in detect() ABOVE the
 *    generic Android / desktop fallbacks.
 *
 * 3. Nothing else needs to change — components use `platform.*` uniformly.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Usage anywhere in the codebase:
 *   import { platform } from '../platform';
 *   await platform.saveFile(receivedItem);
 *   const chunkSize = platform.chunkSize;
 *   if (platform.autoDownloads) { ... }
 */

import { iosPlatform }                    from './ios';
import { androidPlatform, desktopPlatform } from './default';

function detect() {
  const ua = navigator.userAgent;

  // ── Apple ────────────────────────────────────────────────────────────────
  // iPhone, iPad (both classic UA and modern iPadOS desktop-mode UA)
  if (/iPhone|iPod/i.test(ua))  return iosPlatform;
  if (/iPad/i.test(ua))         return iosPlatform;
  // MacOS Safari (not Chrome/Firefox on Mac – those are 'desktop')
  if (/Macintosh/i.test(ua) && /Safari/i.test(ua) && !/Chrome|CriOS|FxiOS/i.test(ua)) {
    return iosPlatform;
  }

  // ── Android ──────────────────────────────────────────────────────────────
  // Samsung DeX (desktop mode): UA contains 'Android' but has a pointer device.
  // Treat as Android (same download strategy, but could have its own strategy
  // later if Samsung-specific APIs become useful).
  if (/Android/i.test(ua)) return androidPlatform;

  // ── KaiOS / feature phones ────────────────────────────────────────────────
  // Very limited WebRTC support; treat as desktop fallback for now.
  // If a dedicated strategy is needed, create platform/kaios.js here.
  // if (/KAIOS/i.test(ua)) return kaiosPlatform;

  // ── Desktop (Windows, Linux, ChromeOS, macOS + Chrome/Firefox) ───────────
  return desktopPlatform;
}

export const platform = detect();
