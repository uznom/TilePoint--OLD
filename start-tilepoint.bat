@echo off
:: =====================================================================
:: TILEPOINT POS SYSTEM - AUTOMATIC LAUNCHER & AUTO-START SCRIPT
:: =====================================================================
:: This script detects your current LAN IP address, verifies or starts the 
:: TilePoint server, and automatically opens the POS in your default browser.
:: =====================================================================

title TilePoint System Launcher
color 0A
cls

:: Always run in the directory of this batch file
cd /d "%~dp0"

echo =====================================================================
echo                 TILEPOINT POS SYSTEM LAUNCHER
echo =====================================================================
echo.

:: Step 1: Detect Local LAN IPv4 Address
echo [1/3] Detecting local IP address...
set LOCAL_IP=
for /f "usebackq tokens=*" %%i in (`powershell -NoProfile -Command "try { $adapters = Get-NetIPInterface -ConnectionState Connected -AddressFamily IPv4 -ErrorAction SilentlyContinue; if ($adapters) { $indexes = $adapters.InterfaceIndex; (Get-NetIPAddress -AddressFamily IPv4 -InterfaceIndex $indexes | Where-Object { $_.IPAddress -notlike '127*' -and $_.IPAddress -notlike '169.254*' -and $_.InterfaceAlias -notlike '*Loopback*' -and $_.InterfaceAlias -notlike '*WSL*' -and $_.InterfaceAlias -notlike '*VirtualBox*' -and $_.InterfaceAlias -notlike '*vEthernet*' -and $_.InterfaceAlias -notlike '*Docker*' } | Select-Object -ExpandProperty IPAddress -First 1) } else { (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127*' -and $_.IPAddress -notlike '169.254*' -and $_.InterfaceAlias -notlike '*Loopback*' } | Select-Object -ExpandProperty IPAddress -First 1) } } catch { (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127*' -and $_.IPAddress -notlike '169.254*' -and $_.InterfaceAlias -notlike '*Loopback*' } | Select-Object -ExpandProperty IPAddress -First 1) }"`) do (
    set "LOCAL_IP=%%i"
)

if "%LOCAL_IP%"=="" (
    echo [!] Wireless/Ethernet IP address not found. Falling back to localhost.
    set "LOCAL_IP=localhost"
) else (
    echo [OK] Active Local IP detected: %LOCAL_IP%
)
echo.

:: Step 2: Ensure Node.js and TilePoint Server are running
echo [2/3] Checking TilePoint Server status...
set "PATH=%PATH%;C:\Program Files\nodejs;%APPDATA%\npm"

set SERVER_RUNNING=0
powershell -NoProfile -Command "$conn = Try { (New-Object Net.Sockets.TcpClient('127.0.0.1', 3000)).Connected } Catch { $false }; if ($conn) { exit 0 } else { exit 1 }" >nul 2>&1
if %errorlevel% equ 0 (
    set SERVER_RUNNING=1
    echo [OK] TilePoint Server is already running on Port 3000.
) else (
    echo [!] Server is not running. Starting TilePoint Server now...
    
    :: Try starting via PM2 if available
    where pm2 >nul 2>&1
    if %errorlevel% equ 0 (
        call pm2 start server.js --name "tilepoint-hq-server" >nul 2>&1
    ) else (
        start "TilePoint Enterprise POS Server" /min cmd /c "node server.js"
    )
    
    :: Wait a few seconds for server boot
    echo [INFO] Waiting for server initialization...
    timeout /t 3 /nobreak >nul
)
echo.

:: Step 3: Launch in default web browser
echo [3/3] Opening TilePoint POS in browser...
set PROTOCOL=http
if exist cert.pem set PROTOCOL=https

set "APP_URL=%PROTOCOL%://%LOCAL_IP%:3000"

echo.
echo =====================================================================
echo  TILEPOINT POS IS READY
echo  Local Console URL : %APP_URL%
echo =====================================================================
echo.

start "" "%APP_URL%"

echo Application opened successfully!
timeout /t 5
exit /b
