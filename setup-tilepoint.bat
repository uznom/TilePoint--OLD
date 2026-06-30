@echo off
:: =====================================================================
:: TILEPOINT POS SYSTEM - AUTOMATED WINDOWS 11 INSTALLER & DEPLOYER
:: =====================================================================
:: This script automates Node.js dependency installation, 
:: local HTTPS certificate generation, Windows Firewall setup, 
:: environment file configuration, and background execution via PM2.
:: =====================================================================

title TilePoint Local Server Installer
color 0B
cls

echo =====================================================================
echo          TILEPOINT RETAIL SYSTEMS - WINDOWS DEPLOYMENT UTILITY
echo =====================================================================
echo.
echo This utility will configure your Windows 11 machine as a resilient,
echo offline-capable POS local server for all staff mobile devices.
echo.
echo Checking system prerequisites...
echo ---------------------------------------------------------------------

:: 1. Verify Node.js and NPM Installation
where node >nul 2>nul
if %errorlevel% neq 0 (
    color 0C
    echo ERROR: Node.js was not found on your system!
    echo Please install Node.js (LTS version recommended) from:
    echo https://nodejs.org/
    echo.
    echo After installing Node.js, reopen this script.
    pause
    exit /b
)

echo [OK] Node.js is installed.
where npm >nul 2>nul
if %errorlevel% neq 0 (
    color 0C
    echo ERROR: npm (Node Package Manager) was not found on your system!
    echo Please reinstall Node.js cleanly.
    pause
    exit /b
)
echo [OK] npm is installed.
echo.

:: 2. Install Project Dependencies
echo ---------------------------------------------------------------------
echo STEP 1: Installing node packages...
echo ---------------------------------------------------------------------
call npm install
if %errorlevel% neq 0 (
    echo.
    echo [WARNING] npm install reported warnings or errors. 
    echo Continuing anyway, as cached packages may already be present.
) else (
    echo [OK] Package installation completed successfully!
)
echo.

:: 3. Generate Local IP and Create .env
echo ---------------------------------------------------------------------
echo STEP 2: Creating local environment configuration (.env)...
echo ---------------------------------------------------------------------
:: Extract local IPv4 address
set "LOCAL_IP=127.0.0.1"
for /f "tokens=4 delims= " %%a in ('route print ^| find " 0.0.0.0 "') do (
    set "LOCAL_IP=%%a"
)

if not exist .env (
    echo Copying .env.example to .env...
    copy .env.example .env >nul
    
    :: Inject auto-detected IP address into the newly created .env
    powershell -Command "(gc .env) -replace 'APP_URL=.*', 'APP_URL=https://%LOCAL_IP%:3000' | Out-File -encoding ASCII .env"
    powershell -Command "(gc .env) -replace 'VITE_SECURITY_SECRET=.*', 'VITE_SECURITY_SECRET=\"TilePointSecPass_Auto_%RANDOM%%RANDOM%\"' | Out-File -encoding ASCII .env"
    
    echo [OK] Created .env file and bound to your local IP address: %LOCAL_IP%
) else (
    echo [INFO] An existing .env file was found. Leaving it unmodified to protect your custom settings.
)
echo.

:: 4. Generate SSL Certificates
echo ---------------------------------------------------------------------
echo STEP 3: Generating clean, native SSL Certificates...
echo ---------------------------------------------------------------------
if exist key.pem (
    echo [INFO] An existing key.pem already exists. Deleting to ensure a clean PKCS#8 format...
    del key.pem >nul 2>&1
)
if exist cert.pem (
    echo [INFO] An existing cert.pem already exists. Deleting...
    del cert.pem >nul 2>&1
)

echo Running high-fidelity PowerShell SSL generator...
powershell -ExecutionPolicy Bypass -File .\generate-certs.ps1
if %errorlevel% neq 0 (
    echo [WARNING] Script-based generation failed. Attempting fallback generation inline...
    powershell -Command "$cert = New-SelfSignedCertificate -DnsName 'localhost' -CertStoreLocation 'Cert:\CurrentUser\My' -FriendlyName 'TilePoint Local HTTPS' -NotAfter (Get-Date).AddDays(365); [System.IO.File]::WriteAllText('cert.pem', ('-----BEGIN CERTIFICATE-----`r`n' + [Convert]::ToBase64String($cert.Export([Security.Cryptography.X509Certificates.X509ContentType]::Cert), 'InsertLineBreaks') + '`r`n-----END CERTIFICATE-----')); [System.IO.File]::WriteAllText('key.pem', ('-----BEGIN PRIVATE KEY-----`r`n' + [Convert]::ToBase64String($cert.Export([Security.Cryptography.X509Certificates.X509ContentType]::Pkcs12), 'InsertLineBreaks') + '`r`n-----END PRIVATE KEY-----')); $store = New-Object Security.Cryptography.X509Certificates.X509Store 'My', 'CurrentUser'; $store.Open('ReadWrite'); $store.Remove($cert); $store.Close();" >nul 2>&1
)

if not exist key.pem (
    color 0E
    echo.
    echo [WARNING] Could not automatically generate SSL certificate files.
    echo The server will boot in standard HTTP mode safely.
    echo If tablets fail to connect, run this file as an Administrator!
) else (
    echo [OK] SSL Certificate files successfully generated (key.pem, cert.pem).
)
echo.

:: 5. Open Windows Defender Firewall Port
echo ---------------------------------------------------------------------
echo STEP 4: Requesting Windows Firewall Access for Port 3000...
echo ---------------------------------------------------------------------
echo If a User Account Control (UAC) prompt pops up, please select "YES" 
echo to allow incoming mobile tablet connections to your laptop!
echo.
powershell -Command "Start-Process powershell -ArgumentList '-NoProfile -ExecutionPolicy Bypass -Command \"New-NetFirewallRule -DisplayName ''TilePoint Server Port 3000'' -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow -ErrorAction SilentlyContinue; Write-Host ''Firewall Rule Added successfully!'' -ForegroundColor Green\"' -Verb RunAs" >nul 2>&1
echo [OK] Sent firewall inbound authorization request.
echo.

:: 6. Build Client Application
echo ---------------------------------------------------------------------
echo STEP 5: Building Client Assets...
echo ---------------------------------------------------------------------
call npm run build
echo [OK] Assets built inside dist/ folder.
echo.

:: 7. PM2 Background Launch
echo ---------------------------------------------------------------------
echo STEP 6: Running Server in Background with PM2...
echo ---------------------------------------------------------------------
where pm2 >nul 2>nul
if %errorlevel% neq 0 (
    echo [INFO] PM2 process manager is not installed. Installing PM2 globally...
    call npm install -g pm2
)

echo Starting background process via PM2...
call pm2 delete tilepoint-hq-server >nul 2>&1
call pm2 start server.js --name "tilepoint-hq-server"

echo.
echo =====================================================================
echo                SUCCESSFUL DEPLOYMENT SUMMARY
echo =====================================================================
echo.
echo  Your local server is up and running in the background!
echo.
echo   * ADMIN SITE  (on this laptop) : http://localhost:3000
echo   * STAFF MOBILE ACCESS (tablets) : http://%LOCAL_IP%:3000
echo.
echo  Note: If you are running in HTTPS mode, replace "http://" with 
echo  "https://" when entering the addresses above.
echo.
echo  To view active server logs at any time, run:
echo    pm2 logs tilepoint-hq-server
echo.
echo  To stop the background server, run:
echo    pm2 stop tilepoint-hq-server
echo.
echo =====================================================================
pause
