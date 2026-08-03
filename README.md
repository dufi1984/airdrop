# Airdrop WebApp

Közvetlen fájl- és képmegosztás bármilyen eszköz között – regisztráció és telepítés nélkül. Küldj fájlokat azonnal iOS, Android, iPad és számítógép között: a csatlakozott eszközök közvetlenül (P2P) vihetik át az adatokat a böngészőből.

1. **Nincs Szerverköltség (P2P WebRTC)**:
   - A fájlok (képek, videók) **közvetlenül a két eszköz böngészője között** áramlanak a helyi hálózaton / interneten.
   - Egyetlen központi szerver sem tárolja vagy látja a képeidet, így 0 MB szerver-adatforgalmi költség keletkezik.
2. **Örökké Ingyenes GitHub Pages Tárhely**:
   - A GitHub ingyenesen biztosítja a felület tárhelyét örökre.
3. **Beépített Nyílt Hálózati Összekapcsoló (PeerJS Cloud)**:
   - Az eszközök automatikusan megtalálják egymást a beépített nyilvános felhőhálózaton keresztül.

### Mi történik, ha több képet vagy videót küldesz egyszerre?
- **Nincs ZIP tömörítés**: A fájlok eredeti minőségükben áramlanak át egyesével.
- **Egyesített Fogadás**: A fogadó félnek a felület egyetlen **Fogadott Fájlcsomagként** mutatja az anyagokat.
- **Fájlonkénti Azonnali Mentés**: Androidon és PC-n minden fájl **azonnal letöltődik, amint megérkezik** – nem kell megvárni a csomag többi tagját. iOS-on az összes fájl megérkezése után az **"Képek mentése"** gombbal egyszerre menthető a Galériába.

## Technikai Stack

- **Frontend**: React 18, Vite, Tailwind CSS (Glassmorphism Dark Theme UI).
- **P2P Engine**: Native WebRTC RTCDataChannel via PeerJS with Multi-Region STUN (Google + Twilio).
- **Átviteli Architektúra**: Eseményvezérelt backpressure (`bufferedamountlow`), 20 másodperces watchdog timer, byte-pontos fájlellenőrzés (`end` üzenetben `totalBytes` mező).
- **Platform Stratégia**: Képességalapú eszközdetektálás (`canShareFiles`, `isWebKit`, `silentDownload`) – ismeretlen böngészők is automatikusan a helyes viselkedést kapják, kódmódosítás nélkül.
- **Dinamikus Chunk Méret**: A küldő a fogadó platformja alapján választ chunk méretet (iOS/WebKit: 16 KB; Android/PC Chromium: 64 KB → ~4× gyorsabb átvitel).
- **Hosting & CI/CD**: GitHub Pages via GitHub Actions.
