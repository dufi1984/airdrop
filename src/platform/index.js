/**
 * Platform Detection & Export
 *
 * Detects the current device type once at startup and exports
 * the appropriate platform strategy. The rest of the codebase
 * imports `platform` and calls its methods without any if/else branching.
 *
 * Usage:
 *   import { platform } from '../platform';
 *   await platform.saveFile(receivedItem);
 *   const chunkSize = platform.chunkSize;
 *   if (platform.autoDownloads) { ... }
 */

import { iosPlatform } from './ios';
import { androidPlatform, desktopPlatform } from './default';

function detect() {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return iosPlatform;
  if (/Android/i.test(ua))          return androidPlatform;
  return desktopPlatform;
}

export const platform = detect();
