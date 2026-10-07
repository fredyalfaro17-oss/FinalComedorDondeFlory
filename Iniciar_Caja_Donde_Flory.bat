@echo off
chcp 65001 > nul
title Comedor Donde Flory - Servidor y Modo Auto-Impresión

echo ======================================================================
echo       🍽️ COMEDOR DONDE FLORY - PUNTO DE VENTA Y CAJA AUTOMÁTICA
echo ======================================================================
echo.
echo [1/2] Verificando servidor local en segundo plano...
powershell -Command "if (!(Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue)) { Start-Process cmd -ArgumentList '/c npm run dev' -WindowStyle Minimized; Start-Sleep -Seconds 3 }"

echo [2/2] Abriendo Google Chrome con IMPRESIÓN SILENCIOSA (Xprinter)...
echo.
echo   * Los pedidos de Tablet y Teléfono saldrán DIRECTO en la Xprinter.
echo   * NO tendrás que darle clic a 'Imprimir' ni saldrá ventana de diálogo.
echo.

set CHROME_BIN="C:\Program Files\Google\Chrome\Application\chrome.exe"
if not exist %CHROME_BIN% set CHROME_BIN="C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
if not exist %CHROME_BIN% set CHROME_BIN="C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

start "" %CHROME_BIN% --kiosk-printing --app=http://localhost:5173/menu.html

echo ✅ ¡Sistema de Caja listo e imprimiendo automáticamente!
timeout /t 5 > nul
exit
