@echo off
title Airdrop - Windows EXE fordito
color 0A
echo.
echo  ============================================
echo   Airdrop by Dufi - Windows EXE Forditas
echo  ============================================
echo.

REM -- Go elerhetove tetele
set "GOPATH=%USERPROFILE%\go"
set "PATH=C:\Program Files\Go\bin;%GOPATH%\bin;%PATH%"

REM -- Frontend fajlok szinkronizalasa
echo  [1/3] Frontend fajlok masolasa...
xcopy /E /I /Y "src" "go\airdrop\frontend\src" > nul 2>&1
copy /Y "index.html"        "go\airdrop\frontend\index.html" > nul 2>&1
copy /Y "package.json"      "go\airdrop\frontend\package.json" > nul 2>&1
copy /Y "tailwind.config.js" "go\airdrop\frontend\tailwind.config.js" > nul 2>&1
copy /Y "postcss.config.js" "go\airdrop\frontend\postcss.config.js" > nul 2>&1
copy /Y "vite.config.js"    "go\airdrop\frontend\vite.config.js" > nul 2>&1
echo        Kesz!
echo.

REM -- npm install
echo  [2/3] npm csomagok ellenorzese...
cd go\airdrop\frontend
npm install > nul 2>&1
cd ..\..\..
echo        Kesz!
echo.

REM -- Wails build
echo  [3/3] EXE forditas folyamatban (par perc)...
cd go\airdrop
wails build -o airdrop.exe
cd ..\..

echo.
if exist "go\airdrop\build\bin\airdrop.exe" (
    echo  ============================================
    echo   SIKER! Az EXE elkeszult:
    echo   go\airdrop\build\bin\airdrop.exe
    echo  ============================================
) else (
    echo  HIBA: Az EXE nem keszult el. Lasd a fenti hibauzeneteket!
)

echo.
pause
