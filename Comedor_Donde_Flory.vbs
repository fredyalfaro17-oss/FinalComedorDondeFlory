Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

appDir = "c:\Users\alfar\Downloads\Test_OpenCode"
appUrl = "http://localhost:5173/menu.html?caja=true"

' Iniciar el servidor Vite en segundo plano de manera 100% invisible si aún no está activo
WshShell.Run "powershell -WindowStyle Hidden -Command ""if (!(Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue)) { Start-Process cmd -ArgumentList '/c npm run dev' -WorkingDirectory '" & appDir & "' -WindowStyle Hidden; Start-Sleep -Seconds 2 }""", 0, True

' Detectar Chrome o Edge para modo APP nativo (sin barra de direcciones ni pestañas)
chromeBin = ""
If fso.FileExists("C:\Program Files\Google\Chrome\Application\chrome.exe") Then
    chromeBin = """C:\Program Files\Google\Chrome\Application\chrome.exe"""
ElseIf fso.FileExists("C:\Program Files (x86)\Google\Chrome\Application\chrome.exe") Then
    chromeBin = """C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"""
ElseIf fso.FileExists(WshShell.ExpandEnvironmentStrings("%LOCALAPPDATA%") & "\Google\Chrome\Application\chrome.exe") Then
    chromeBin = """" & WshShell.ExpandEnvironmentStrings("%LOCALAPPDATA%") & "\Google\Chrome\Application\chrome.exe"""
ElseIf fso.FileExists("C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe") Then
    chromeBin = """C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"""
ElseIf fso.FileExists("C:\Program Files\Microsoft\Edge\Application\msedge.exe") Then
    chromeBin = """C:\Program Files\Microsoft\Edge\Application\msedge.exe"""
Else
    chromeBin = "msedge.exe"
End If

' Perfil aislado para que siempre respete --kiosk-printing aunque haya otro navegador abierto
kioskProfile = " --user-data-dir=""" & WshShell.ExpandEnvironmentStrings("%LOCALAPPDATA%") & "\Google\Chrome\FloryCajaProfile"""

' Abrir en modo aplicación de escritorio con auto-impresión
WshShell.Run chromeBin & " --kiosk-printing" & kioskProfile & " --app=" & appUrl, 1, False
