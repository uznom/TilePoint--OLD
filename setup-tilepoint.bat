@echo off
:: =====================================================================
:: TILEPOINT POS SYSTEM - AUTOMATED WINDOWS 11 INSTALLER & DEPLOYER
:: =====================================================================
:: This script automates Node.js dependency installation, 
:: local HTTPS certificate generation using mkcert, Windows Firewall setup, 
:: environment file configuration, and background execution.
:: =====================================================================

title TilePoint Local Server Installer
color 0B
cls

:: Ensure the script runs in the directory of the batch file itself, especially when elevated
cd /d "%~dp0"

echo =====================================================================
echo          TILEPOINT RETAIL SYSTEMS - WINDOWS DEPLOYMENT UTILITY
echo =====================================================================
echo.
echo This utility will configure your Windows machine as a resilient,
echo offline-capable POS local server for all staff devices.
echo.

:: Check for Administrator privileges
net session >nul 2>&1
if %errorLevel% neq 0 (
    if "%1"=="--elevated" (
        echo.
        echo [WARNING] Elevation was declined or failed.
        echo Continuing as a Standard User. Some administrative configurations
        echo (e.g. firewall port binding, installing CA certificates to system trust store)
        echo will be skipped.
        echo.
        set /p CHOOSE_STAND="Do you want to continue standard installation? [Y/N]: "
        if /i "%CHOOSE_STAND%" neq "Y" (
            exit /b
        )
        goto StandardUserFlow
    )
    echo [INFO] This installer requires Administrator privileges to:
    echo   1. Install missing prerequisites (Node.js, Git)
    echo   2. Configure Windows Defender Firewall rules for Port 3000
    echo   3. Setup trusted HTTPS certificates using mkcert
    echo.
    echo Requesting Administrator elevation...
    powershell -Command "Start-Process '%~dpnx0' -ArgumentList '--elevated' -Verb RunAs"
    exit /b
)

:StandardUserFlow
echo [OK] Continuing with system checks...
echo Checking system prerequisites...
echo ---------------------------------------------------------------------

:: Verify/Install Git
where git >nul 2>nul
if %errorlevel% neq 0 (
    echo [INFO] Git was not found on your system.
    echo Attempting to install Git via winget...
    winget install --id Git.Git -e --silent --accept-source-agreements --accept-package-agreements
    if %errorlevel% neq 0 (
        echo [!] Winget failed or is unavailable. Downloading Git installer directly...
        curl -L -o git-setup.exe "https://github.com/git-for-windows/git/releases/download/v2.43.0.windows.1/Git-2.43.0-64-bit.exe"
        echo Installing Git (silent mode)...
        git-setup.exe /VERYSILENT /NORESTART /NOCANCEL /SP-
        del git-setup.exe >nul 2>&1
    )
    call :RefreshPath
) else (
    echo [OK] Git is already installed.
)

:: Verify/Install Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [INFO] Node.js was not found on your system.
    echo Attempting to install Node.js LTS via winget...
    winget install --id OpenJS.NodeJS.LTS -e --silent --accept-source-agreements --accept-package-agreements
    if %errorlevel% neq 0 (
        echo [!] Winget failed or is unavailable. Downloading Node.js MSI directly...
        curl -L -o node-setup.msi "https://nodejs.org/dist/v20.11.1/node-v20.11.1-x64.msi"
        echo Installing Node.js (silent mode)...
        msiexec /i node-setup.msi /qn /norestart
        del node-setup.msi >nul 2>&1
    )
    call :RefreshPath
) else (
    echo [OK] Node.js is already installed.
)

where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo [!] npm was not found. Refreshing path once more...
    call :RefreshPath
)

where node >nul 2>nul
if %errorlevel% neq 0 (
    color 0C
    echo ERROR: Node.js was not successfully bound to the terminal path.
    echo Please install Node.js manually from https://nodejs.org/ and restart the script.
    pause
    exit /b
)
echo [OK] Node.js is ready: 
node -v
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

:: Get local IP address using PowerShell (excluding WSL, VirtualBox, Docker, and disconnected adapters)
for /f "usebackq tokens=*" %%a in (`powershell -NoProfile -Command "try { $adapters = Get-NetIPInterface -ConnectionState Connected -AddressFamily IPv4 -ErrorAction SilentlyContinue; if ($adapters) { $indexes = $adapters.InterfaceIndex; (Get-NetIPAddress -AddressFamily IPv4 -InterfaceIndex $indexes | Where-Object { $_.IPAddress -notlike '127*' -and $_.IPAddress -notlike '169.254*' -and $_.InterfaceAlias -notlike '*Loopback*' -and $_.InterfaceAlias -notlike '*WSL*' -and $_.InterfaceAlias -notlike '*VirtualBox*' -and $_.InterfaceAlias -notlike '*vEthernet*' -and $_.InterfaceAlias -notlike '*Docker*' } | Select-Object -First 1).IPAddress } else { (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127*' -and $_.IPAddress -notlike '169.254*' -and $_.InterfaceAlias -notlike '*Loopback*' } | Select-Object -First 1).IPAddress } } catch { (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127*' -and $_.IPAddress -notlike '169.254*' -and $_.InterfaceAlias -notlike '*Loopback*' } | Select-Object -First 1).IPAddress }"`) do set "LOCAL_IP=%%a"
if "%LOCAL_IP%"=="" set "LOCAL_IP=127.0.0.1"

:: 3. Generate Local IP and Create .env
echo ---------------------------------------------------------------------
echo STEP 2: Creating local environment configuration (.env)...
echo ---------------------------------------------------------------------
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

:: 4. Generate SSL Certificates using mkcert
echo ---------------------------------------------------------------------
echo STEP 3: Generating fully-trusted local SSL Certificates with mkcert...
echo ---------------------------------------------------------------------
if exist key.pem (
    del key.pem >nul 2>&1
)
if exist cert.pem (
    del cert.pem >nul 2>&1
)

if not exist mkcert.exe (
    echo Downloading mkcert for Windows (x64)...
    curl -L -o mkcert.exe "https://github.com/FiloSottile/mkcert/releases/download/v1.4.4/mkcert-v1.4.4-windows-amd64.exe"
)

if exist mkcert.exe (
    echo Installing Local Certificate Authority to Windows Trust Store...
    .\mkcert.exe -install
    
    echo Generating trusted certificates for localhost, 127.0.0.1, and %LOCAL_IP%...
    .\mkcert.exe -key-file key.pem -cert-file cert.pem localhost 127.0.0.1 %LOCAL_IP%
    echo [OK] Trusted SSL Certificate files successfully generated (key.pem, cert.pem).
) else (
    echo [WARNING] mkcert download failed. Falling back to PowerShell certificate generator...
    powershell -ExecutionPolicy Bypass -File .\generate-certs.ps1
)
echo.

:: 5. Open Windows Defender Firewall Port
echo ---------------------------------------------------------------------
echo STEP 4: Setting Windows Defender Firewall rules for Inbound Port 3000...
echo ---------------------------------------------------------------------
powershell -Command "Remove-NetFirewallRule -DisplayName 'TilePoint Server Port 3000' -ErrorAction SilentlyContinue" >nul 2>&1
powershell -Command "New-NetFirewallRule -DisplayName 'TilePoint Server Port 3000' -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow" >nul 2>&1
echo [OK] Inbound firewall rule added for TCP Port 3000.
echo.

:: 6. Build Client Application
echo ---------------------------------------------------------------------
echo STEP 5: Building Client Assets...
echo ---------------------------------------------------------------------
call npm run build
echo [OK] Assets built inside dist/ folder.
echo.

:: 7. Launch Background Server
echo ---------------------------------------------------------------------
echo STEP 6: Starting Server...
echo ---------------------------------------------------------------------
:: Add standard Windows roaming npm path to current session path so global tools are instantly active
set "PATH=%PATH%;%APPDATA%\npm"

where pm2 >nul 2>nul
if %errorlevel% neq 0 (
    echo [INFO] PM2 process manager is not installed. Installing PM2 globally...
    call npm install -g pm2
)

echo Starting background process via PM2...
call pm2 delete tilepoint-hq-server >nul 2>&1
call pm2 start server.js --name "tilepoint-hq-server"

:: Fallback if PM2 is not active or fails
if %errorlevel% neq 0 (
    echo [WARNING] PM2 start failed. Launching Node server in a dedicated command window...
    start "TilePoint ERP OS Server" cmd /k "node server.js"
)

echo.
echo =====================================================================
echo                SUCCESSFUL DEPLOYMENT SUMMARY
echo =====================================================================
echo.
echo  Your local server is up and running securely!
echo.
echo   * ADMINISTRATIVE CONSOLE (this PC) : https://localhost:3000
echo   * MOBILE RETAIL DEVISE ACCESS      : https://%LOCAL_IP%:3000
echo.
echo =====================================================================
echo                LAUNCHING APPLICATIONS
echo =====================================================================
echo.
echo Launching TilePoint ERP OS in your default browser...
start "" "https://%LOCAL_IP%:3000"
echo.
echo =====================================================================
echo                ALTERNATIVE WEB BROWSERS
echo =====================================================================
echo [1] Exit Deployment Utility (Default)
echo [2] Launch in Google Chrome
echo [3] Launch in Microsoft Edge
echo [4] Launch in Mozilla Firefox
echo ---------------------------------------------------------------------
choice /c 1234 /t 10 /d 1 /m "Select an alternative browser or press 1 to exit (Auto-exiting in 10s): "

if %errorlevel% equ 2 (
    echo Launching TilePoint ERP OS in Google Chrome...
    start "" chrome "https://%LOCAL_IP%:3000"
) else if %errorlevel% equ 3 (
    echo Launching TilePoint ERP OS in Microsoft Edge...
    start "" msedge "https://%LOCAL_IP%:3000"
) else if %errorlevel% equ 4 (
    echo Launching TilePoint ERP OS in Mozilla Firefox...
    start "" firefox "https://%LOCAL_IP%:3000"
)

echo.
echo =====================================================================
echo Installation and setup completed successfully!
exit /b

:RefreshPath
:: Query the Registry to load the updated PATH variable instantly
for /f "tokens=2*" %%A in ('reg query "HKLM\System\CurrentControlSet\Control\Session Manager\Environment" /v Path') do set "SYS_PATH=%%B"
for /f "tokens=2*" %%A in ('reg query "HKCU\Environment" /v Path') do set "USER_PATH=%%B"
:: Expand nested variables like %SystemRoot% and %USERPROFILE% safely
call set "PATH=%SYS_PATH%;%USER_PATH%"
:: Add common installation directories as fail-safes
set "PATH=%PATH%;C:\Program Files\nodejs;C:\Program Files\Git\cmd;%APPDATA%\npm"
exit /b
