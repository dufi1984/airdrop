# ⚡ Airdrop P2P WebApp (`dufi1984/airdrop`)

Egy böngészőből futó, **0 telepítést és 0 regisztrációt igénylő** P2P fájlküldő és képmegosztó webalkalmazás iOS (Safari) és Android (Chrome) okostelefonokra, iPad-re és asztali számítógépekre.

---

## 🎓 Érthető Útmutató: Hogyan Működik Ez Az Alkalmazás?

### ❓ Kell regisztrálni valahová a használatához?
**NEM! Semmilyen regisztrációra vagy előfizetésre nincs szükség!**
Ha ezt a kódot bárki letölti (vagy leklónozza) a saját GitHub fiókjába, az alkalmazás **azonnal, automatikusan működik**. Nem kell a Render.com-ra vagy más fizetős/bonyolult szerverre regisztrálni.

---

## 🔒 Miért Ingyenes És Biztonságos Örökké?

1. **Nincs Szerverköltség (P2P WebRTC)**:
   - A fájlok (képek, videók) **közvetlenül a két eszköz böngészője között** áramlanak a helyi hálózaton / interneten.
   - Egyetlen központi szerver sem tárolja vagy látja a képeidet, így 0 MB szerver-adatforgalmi költség keletkezik.
2. **Örökké Ingyenes GitHub Pages Tárhely**:
   - A GitHub ingyenesen biztosítja a felület tárhelyét örökre.
3. **Beépített Nyílt Hálózati Összekapcsoló (PeerJS Cloud)**:
   - Az eszközök automatikusan megtalálják egymást a beépített nyilvános felhőhálózaton keresztül.

---

## 📱 Használati Útmutató Családtagoknak / Felhasználóknak

```
[Küldő Eszköz (pl. PC)]                           [Fogadó Eszköz (pl. Telefon)]
1. Megnyitod az oldalt                           1. Megnyitod az oldalt
2. Kiválasztod a fotókat / videókat              2. Megjelensz az "Online Eszközök" listában
3. Rákoppintasz az Online Eszköz kártyájára ----> 4. Megérkezik a csomag!
                                                 5. "Mentés mindet a Galériába" (1 kattintás!)
```

### 🖼️ Mi történik, ha több képet vagy videót küldesz egyszerre?
- **Nincs ZIP tömörítés**: A fájlok eredeti minőségükben áramlanak át egyesével.
- **Egyesített Fogadás**: A fogadó félnek a felület egyetlen **Fogadott Fájlcsomagként** mutatja az anyagokat.
- **1-Kattintásos Galériába Mentés**: A fogadó telefonon a **"Mentés mindet a Galériába"** gombra koppintva az iOS Safari / Android Chrome az **összes fotót és videót egyszerre elmenti a telefon Fotógalériájába**!

---

## 🚀 Hogyan Hozhatod Létre A Saját Verziódat (Lépésről Lépésre)?

Ha szeretnéd a saját GitHub fiókodban elindítani az alkalmazást:

### 1. Lépés: Kód feltöltése a GitHubra
Másold be a projekt kódját a gépedre egy mappába, majd futtasd a terminálban:

```bash
git init
git add .
git commit -m "Initial commit: Airdrop P2P WebApp"
git branch -M main
git remote add origin https://github.com/FELHASZNÁLÓNEVED/airdrop.git
git push -u origin main
```

### 2. Lépés: GitHub Pages Ingyenes Weboldal Bekapcsolása (1 Kattintás)
Miután a kód felkerült a GitHubra:
1. Nyisd meg a repódat a GitHubon: `https://github.com/FELHASZNÁLÓNEVED/airdrop`
2. Kattints a **Settings** (Beállítások) fülre -> majd a bal sávban a **Pages** menüpontra.
3. A **Build and deployment -> Source** mezőben válaszd ki: **`GitHub Actions`**!
4. Kattints a bal oldali **Settings** -> **Actions** -> **General** gombra, görgess le a **Workflow permissions** részhez, és válaszd a **`Read and write permissions`** opciót, majd mentés (**Save**).

A GitHub automatikusan lefordítja a React kódot, és kb. **30 másodperc múlva** élőben fut az oldalad az alábbi címen:
👉 **`https://FELHASZNÁLÓNEVED.github.io/airdrop`**

---

## 🛠️ Technikai Stack (Fejlesztőknek)

- **Frontend**: React 18, Vite, Tailwind CSS (Glassmorphism dark theme UI).
- **P2P Engine**: Native WebRTC RTCDataChannel via PeerJS.
- **Mobile Integration**: Web Share API (`navigator.share`) multi-file gallery export.
- **Hosting**: GitHub Pages via GitHub Actions CI/CD pipeline.
