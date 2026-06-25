# TilePoint Native PowerShell SSL Certificate Generator
# Generates localhost self-signed key.pem and cert.pem natively on Windows without requiring OpenSSL!

$certName = "localhost"
$days = 365

Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host "   TILEPOINT NATIVE WINDOWS SSL CERTIFICATE GENERATOR    " -ForegroundColor Cyan
Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host "Generating self-signed certificate natively using .NET Cryptography..."

try {
    # Generate the self-signed certificate in the Windows certificate store temp
    $cert = New-SelfSignedCertificate -DnsName $certName -CertStoreLocation "Cert:\CurrentUser\My" -FriendlyName "TilePoint Development" -NotAfter (Get-Date).AddDays($days)
    
    # Export Certificate (Public Key) in PEM format
    $certPem = "-----BEGIN CERTIFICATE-----`r`n" + [System.Convert]::ToBase64String($cert.Export([System.Security.Cryptography.X509Certificates.X509ContentType]::Cert), [System.Base64FormattingOptions]::InsertLineBreaks) + "`r`n-----END CERTIFICATE-----"
    Set-Content -Path "cert.pem" -Value $certPem -Encoding Ascii
    
    # Export Private Key in PEM format
    $rsaPrivateKey = [System.Security.Cryptography.X509Certificates.RSACertificateExtensions]::GetRSAPrivateKey($cert)
    $keyBytes = $rsaPrivateKey.ExportPkcs8PrivateKey()
    $keyPem = "-----BEGIN PRIVATE KEY-----`r`n" + [System.Convert]::ToBase64String($keyBytes, [System.Base64FormattingOptions]::InsertLineBreaks) + "`r`n-----END PRIVATE KEY-----"
    Set-Content -Path "key.pem" -Value $keyPem -Encoding Ascii
    
    # Clean up from the Windows Certificate Store to keep it clean
    $store = New-Object System.Security.Cryptography.X509Certificates.X509Store "My", "CurrentUser"
    $store.Open([System.Security.Cryptography.X509Certificates.OpenFlags]::ReadWrite)
    $store.Remove($cert)
    $store.Close()
    
    Write-Host ""
    Write-Host "=========================================================" -ForegroundColor Green
    Write-Host "SUCCESS! Certificates generated successfully:" -ForegroundColor Green
    Write-Host "  - key.pem  (Private Key)" -ForegroundColor Green
    Write-Host "  - cert.pem (Certificate)" -ForegroundColor Green
    Write-Host "=========================================================" -ForegroundColor Green
}
catch {
    Write-Host ""
    Write-Host "[!] Natively signed generation failed: $_" -ForegroundColor Yellow
    Write-Host "Attempting fallback via OpenSSL in Git Bash..." -ForegroundColor Yellow
    
    # Fallback to looking for OpenSSL in popular paths
    $openssl = "openssl"
    if (Test-Path "C:\Program Files\Git\usr\bin\openssl.exe") {
        $openssl = "C:\Program Files\Git\usr\bin\openssl.exe"
    }

    try {
        & $openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -sha256 -days 365 -nodes -subj "/CN=localhost"
        Write-Host "SUCCESS! Generated certs using OpenSSL fallback." -ForegroundColor Green
    }
    catch {
        Write-Host ""
        Write-Host "[ERROR] All certificate generation paths failed." -ForegroundColor Red
        Write-Host "Please open Git Bash in this directory and paste the following command manually:" -ForegroundColor Red
        Write-Host "openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -sha256 -days 365 -nodes -subj \"/CN=localhost\"" -ForegroundColor Yellow
    }
}
