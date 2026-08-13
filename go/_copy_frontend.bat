@echo off
set "SRC=c:\Users\tamas\Desktop\Ai\Antigravity\airdrop"
set "DST=c:\Users\tamas\Desktop\Ai\Antigravity\airdrop\go\airdrop\frontend"

copy /Y "%SRC%\index.html"        "%DST%\index.html"
copy /Y "%SRC%\package.json"      "%DST%\package.json"
copy /Y "%SRC%\tailwind.config.js" "%DST%\tailwind.config.js"
copy /Y "%SRC%\postcss.config.js" "%DST%\postcss.config.js"
copy /Y "%SRC%\vite.config.js"    "%DST%\vite.config.js"
xcopy /E /I /Y "%SRC%\src"        "%DST%\src"
xcopy /E /I /Y "%SRC%\public"     "%DST%\public"

echo Fajlok atmasolva!
