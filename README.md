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
- **1-Kattintásos Galériába Mentés**: A fogadó telefonon a **"Mentés mindet a Galériába"** gombra koppintva az iOS Safari / Android Chrome az **összes fotót és videót egyszerre elmenti a telefon Fotógalériájába**!

## Technikai Stack

- **Frontend**: React 18, Vite, Tailwind CSS (Glassmorphism Dark Theme UI).
- **P2P Engine**: Native WebRTC RTCDataChannel via PeerJS with Multi-Region STUN & Backpressure Flow Control.
- **Mobile & Desktop Integration**: Native iOS Web Share API (`navigator.share`) + Direct Android & PC Storage Download (`a.download`).
- **Hosting & CI/CD**: GitHub Pages via GitHub Actions.
