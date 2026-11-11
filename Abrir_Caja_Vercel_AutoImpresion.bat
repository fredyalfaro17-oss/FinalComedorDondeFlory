@echo off
chcp 65001 > nul
title Comedor Donde Flory - Caja con Auto-Impresión (Vercel)

echo ======================================================================
echo       🍽️ COMEDOR DONDE FLORY - CAJA NUBE CON AUTO-IMPRESIÓN
echo ======================================================================
echo.
echo Abriendo Sistema en Modo Kiosco con IMPRESIÓN DIRECTA SILENCIOSA...
echo.
echo   * Cualquier orden enviada desde Teléfonos o Tablets saldrá de inmediato
echo     en la impresora Xprinter.
echo   * NO tendrás que darle clic a 'Aceptar' ni presionar 'Enter'.
echo.

set CHROME_BIN="C:\Program Files\Google\Chrome\Application\chrome.exe"
if not exist %CHROME_BIN% set CHROME_BIN="C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
if not exist %CHROME_BIN% set CHROME_BIN="%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"
if not exist %CHROME_BIN% set CHROME_BIN="C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if not exist %CHROME_BIN% set CHROME_BIN="C:\Program Files\Microsoft\Edge\Application\msedge.exe"

set KIOSK_PROFILE=--user-data-dir="%LOCALAPPDATA%\Google\Chrome\FloryCajaProfile"

start "" %CHROME_BIN% --kiosk-printing %KIOSK_PROFILE% --app=https://comedor-donde-flory.vercel.app/menu.html?caja=true

echo ✅ ¡Caja conectada e imprimiendo automáticamente!
timeout /t 3 > nul
exit

