# ⚡ Airdrop P2P Web Application (`dufi1984/airdrop`)

Egy böngészőből futó, telepítést nem igénylő P2P fájlküldő és képmegosztó webalkalmazás iOS (Safari) és Android (Chrome) mobilokra, valamint asztali számítógépekre.

---

## 🔒 100% Ingyenes Garancia
- **Nincs előfizetés, nincs lejáró trial verzió, nincsenek rejtett költségek**.
- **P2P WebRTC**: A fájlok közvetlenül eszközről eszközre áramlanak a böngészőben (0 MB szerver adatforgalom).
- **GitHub Pages**: Örökké ingyenes frontend web tárhely.
- **Render.com / Glitch**: Ingyenes Node.js signaling backend.
- **Google Public STUN**: Ingyenes nyílt STUN szerverek (`stun.l.google.com:19302`).

---

## 🚀 Főbb Funkciók
1. **Egyszerű QR-kódos Használat**:
   - Válaszd ki a küldendő fájlokat/képeket a küldő eszközön.
   - Azonnal létrejön egy QR-kód a képernyőn.
   - A fogadó fél az okostelefonja normál kamerájával leolvassa a QR-t, megnyílik az oldal, és a fájlok automatikusan átküldésre kerülnek!
2. **Mobilos Galériába Mentés**:
   - iOS Safari és Android Chrome böngészőkben a kapott fájlok alatt lévő **"Mentés a Galériába"** (`navigator.share`) gombra koppintva közvetlenül a telefon Fotók / Képgalériájába menthető a média.
3. **ZIP Nélküli Streaming**:
   - A fájlokat egyesével/folyamatként (64KB-os csomagokban) küldi át, valós idejű sebességértékkel (MB/s) és hátralévő idővel (ETA).
4. **Kétnyelvű UI**:
   - Alapértelmezetten **Magyar (HU)** nyelv a családi használathoz, 1 kattintással átváltható **Angol (EN)** nyelvre.

---

## 💻 Helyi Futtatás (Local Development)

### 1. Frontend indítása:
```bash
npm install
npm run dev
```
Nyisd meg a böngészőben: `http://localhost:3000`

### 2. Signaling szerver indítása helyileg:
```bash
cd server
npm install
npm start
```
A szerver elindul a `http://localhost:3001` címen.

---

## 🌐 Ingyenes Telepítés (Production Hosting)

### 1. Signaling Szerver Ingyenes Futtatása Render.com-on (1 kattintás):
1. Regisztrálj ingyenesen a [Render.com](https://render.com) oldalon.
2. Hozz létre egy új **Web Service**-t, és csatlakoztasd a GitHub repódat (`dufi1984/airdrop`).
3. **Root Directory**: `server`
4. **Build Command**: `npm install`
5. **Start Command**: `node server.js`
6. A kifizetéshez NEM kell kártyát megadni (Free instance)!
7. A kapott URL-t (pl. `https://my-airdrop-server.onrender.com`) állítsd be a webalkalmazás Beállítások (Fogaskerék) menüjében!

### 2. GitHub Pages Frontend Aktiválása:
A kód feltöltése után a GitHub repódban:
1. Nyisd meg a repót: `https://github.com/dufi1984/airdrop`
2. Menj a **Settings** -> **Pages** menüpontba.
3. Source: **Deploy from a branch** -> Válaszd a **main** ágat és a **/(root)** mappát (vagy futtasd a `npm run build` parancsot a dist ágra).
4. Mentés után az alkalmazás elérhető lesz a `https://dufi1984.github.io/airdrop` címen!

---

## 📤 Feltöltés a GitHub Repóba (`dufi1984/airdrop`)

Futtasd a következő parancsokat a projekt gyökérmappájában:

```bash
git init
git add .
git commit -m "Initial commit: Complete P2P Airdrop web app"
git branch -M main
git remote add origin https://github.com/dufi1984/airdrop.git
git push -u origin main
```
