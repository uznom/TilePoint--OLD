@echo off
echo ==========================================
echo    TILEPOINT SSL CERTIFICATE GENERATOR    
echo ==========================================
echo.
echo Searching for OpenSSL on your Windows laptop...

:: Check if openssl is in PATH
set OPENSSL_BIN=openssl

where %OPENSSL_BIN% >nul 2>nul
if %errorlevel% neq 0 (
    :: Try Git installation directory (very common on Windows developers)
    if exist "C:\Program Files\Git\usr\bin\openssl.exe" (
        set "OPENSSL_BIN=C:\Program Files\Git\usr\bin\openssl.exe"
        echo Found OpenSSL in standard Git Bash directory!
    ) else if exist "C:\Program Files (x86)\Git\usr\bin\openssl.exe" (
        set "OPENSSL_BIN=C:\Program Files (x86)\Git\usr\bin\openssl.exe"
        echo Found OpenSSL in 32-bit Git directory!
    ) else (
        echo [!] OpenSSL was not found in your PATH or Git installation directories.
        echo.
        echo Alternative Fallback:
        echo 1. Open 'Git Bash' on your laptop.
        echo 2. Paste the following command and press Enter:
        echo    openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -sha256 -days 365 -nodes -subj "/CN=localhost"
        echo.
        pause
        exit /b 1
    )
)

echo Generating secure SSL private key (key.pem) and certificate (cert.pem)...
"%OPENSSL_BIN%" req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -sha256 -days 365 -nodes -subj "/CN=localhost"

if %errorlevel% equ 0 (
    echo.
    echo ========================================================
    echo SUCCESS! Secure certificates generated!
    echo Files created in current directory:
    echo   - key.pem (Private SSL Key)
    echo   - cert.pem (SSL Certificate)
    echo.
    echo When you start the server via PM2 or Node, it will
    echo automatically boot in SECURE HTTPS mode.
    echo ========================================================
) else (
    echo.
    echo [ERROR] OpenSSL failed to execute. Try running Git Bash and typing:
    echo openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -sha256 -days 365 -nodes -subj "/CN=localhost"
)
pause
