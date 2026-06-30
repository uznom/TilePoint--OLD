# TilePoint Enterprise - Windows Deployment Guide

This guide describes how to run and manage the **TilePoint Shared Database Server** with **HTTPS (SSL)** on a standard Windows 10 or 11 laptop.

---

## 🚀 1-Click Automated Installation (RECOMMENDED)
We have built a single, fully-automated utility that sets up everything for you. It installs dependencies, creates your `.env` configuration file, detects your local IP address, generates correct SSL certificates, configures your Windows Firewall, and boots PM2 cleanly in the background.

To run it:
1. Locate **`setup-tilepoint.bat`** in your project folder.
2. Double-click it or run it from a standard command window.
3. If prompted by Windows User Account Control (UAC) to configure the firewall, click **Yes** or **Allow**.
4. Once completed, you are fully deployed and ready to go!

---

## 🛠️ Step 1: Install Dependencies
To run the server locally, ensure you have these installed on your Windows laptop:
1. **Node.js (LTS version)**: [Download Node.js](https://nodejs.org/)
2. **Git for Windows (Git Bash)**: [Download Git](https://git-scm.com/) (highly recommended as it installs native OpenSSL command line utilities).

---

## 🔒 Step 2: Generate SSL Certificates for Windows
We have included automated scripts to generate certificates on Windows.

### Method A: Native PowerShell (No OpenSSL or Git required)
If you don't have Git Bash or OpenSSL installed, you can generate them natively using Windows PowerShell:
1. Open **PowerShell** in your project folder (`C:\Users\USER\Documents\GitHub\TilePoint`).
2. Run this command to **unblock** the script first (required on Windows for downloaded scripts):
   ```powershell
   Unblock-File .\generate-certs.ps1
   ```
3. Run the script:
   ```powershell
   .\generate-certs.ps1
   ```
   *(If you still get an execution policy block, run `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` and then run `.\generate-certs.ps1` again).*
4. This will create `key.pem` and `cert.pem` directly in your folder!

### Method A.1: Copy & Paste Single PowerShell Command (Fastest & Guaranteed)
If Windows still blocks the script file, you can copy, paste, and run this single-line script block directly in **PowerShell**. It doesn't load a file, so it **always bypasses security restrictions**:
```powershell
$cert = New-SelfSignedCertificate -DnsName "localhost" -CertStoreLocation "Cert:\CurrentUser\My" -FriendlyName "TilePoint Local HTTPS" -NotAfter (Get-Date).AddDays(365); [System.IO.File]::WriteAllText("cert.pem", ("-----BEGIN CERTIFICATE-----`r`n" + [Convert]::ToBase64String($cert.Export([Security.Cryptography.X509Certificates.X509ContentType]::Cert), "InsertLineBreaks") + "`r`n-----END CERTIFICATE-----")); [System.IO.File]::WriteAllText("key.pem", ("-----BEGIN PRIVATE KEY-----`r`n" + [Convert]::ToBase64String($cert.Export([Security.Cryptography.X509Certificates.X509ContentType]::Pkcs12), "InsertLineBreaks") + "`r`n-----END PRIVATE KEY-----")); $store = New-Object Security.Cryptography.X509Certificates.X509Store "My", "CurrentUser"; $store.Open("ReadWrite"); $store.Remove($cert); $store.Close(); Write-Host "Successfully generated key.pem and cert.pem!" -ForegroundColor Green
```

### Method B: Use the 1-Click Batch File
1. Double-click the file named `generate-certs.bat` in your project folder.
2. It will locate OpenSSL (from your Git installation) and automatically create:
   - `key.pem`
   - `cert.pem`

### Method C: Generate manually using Git Bash
If you prefer Git Bash, open it inside the project root folder and run:
```bash
openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -sha256 -days 365 -nodes -subj "/CN=localhost"
```

*Once these two files (`key.pem` and `cert.pem`) exist in your server directory, the Node server will **automatically boot in secure HTTPS mode**.*

---

## ⚡ Troubleshooting EADDRINUSE (Address already in use 3000)
If your log says `Error: listen EADDRINUSE: address already in use 0.0.0.0:3000`, it means **another process is already using port 3000** (likely an old Node/PM2 instance or a stale server).

### How to fix it:
1. **Find what is running on Port 3000**:
   Open **Command Prompt** (CMD) or PowerShell and run:
   ```cmd
   netstat -ano | findstr :3000
   ```
   Based on your output, you found that process **`2528`** is listening on Port 3000:
   ```
   TCP    0.0.0.0:3000           0.0.0.0:0              LISTENING       2528
   ```

2. **Kill the running process**:
   Kill process **`2528`** to instantly free up port 3000. In Command Prompt or PowerShell, run:
   ```cmd
   taskkill /PID 2528 /F
   ```

3. **Kill PM2 duplicates (Optional but recommended)**:
   Sometimes PM2 keeps restarting the broken server in a loop. Stop all active PM2 tasks:
   ```cmd
   pm2 kill
   ```

4. **Restart the secure server**:
   After port 3000 is free and your `.pem` files are generated, restart the PM2 instance:
   ```cmd
   pm2 start server.js --name "tilepoint-hq-server"
   ```

---

## 🔒 Troubleshooting ERR_SSL_PROTOCOL_ERROR (Invalid Response)
If you try to go to `https://192.168.1.38:3000` and get an **`ERR_SSL_PROTOCOL_ERROR`** or if PM2 logs show **`ERR_OSSL_UNSUPPORTED` / `nested asn1 error` / `wrong tag`**, it means your generated certificates are corrupted or encoded with an invalid format (like a raw PKCS#12 binary disguised as a PEM file).

Node.js expects a clean, decrypted **PKCS#8 Private Key** inside `key.pem`.

### How to resolve it:

#### Option A: Quick Bypass (Run in HTTP mode)
If you do not want to set up SSL certificates right now, you can simply delete the invalid certificate files:
1. Delete `key.pem` and `cert.pem` from your project folder.
2. Restart PM2:
   ```cmd
   pm2 restart tilepoint-hq-server
   ```
3. Access the site via plain HTTP:
   ```
   http://192.168.1.38:3000
   ```
*(Note: Some advanced browser features like camera access for receipt scanning might be restricted on non-localhost HTTP connections. If you plan to use mobile camera scanning, follow Option B instead).*

#### Option B: Active SSL Mode (Recommended & Fully Compliant)
We have included a built-in PowerShell script that generates **100% correct PKCS#8 keys** natively without any errors.

1. **Delete any corrupted certificate files first**:
   Make sure you delete any existing `key.pem` and `cert.pem` from your project root.

2. **Run our native PowerShell script**:
   Open **PowerShell as Administrator**, navigate to your project directory, and run:
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process -Force
   .\generate-certs.ps1
   ```
   *(This will run our native generator script, which exports the correct decrypted PKCS#8 key block. It will output a green success message once completed).*

3. **Alternative (Git Bash OpenSSL Method)**:
   If you have Git for Windows installed, you can also just double-click **`generate-certs.bat`** to generate the certificates using Git's built-in OpenSSL.

4. **Restart your PM2 server** to load the clean files:
   ```cmd
   pm2 restart tilepoint-hq-server
   ```

5. Now, open your browser and navigate to:
   ```
   https://192.168.1.38:3000
   ```
   Click **Advanced -> Proceed to 192.168.1.38 (unsafe)** when the browser shows its standard local certificate warning.

---

## ⚙️ Setting Up Environment Variables (.env) on Windows
### Do I need to configure `.env`?
* **For offline operations (Standalone/Local only)**: No, you do not *need* it. The system has smart offline fallbacks that automatically generate secure keys and mock endpoints if the variables are empty.
* **For production, security, and AI integrations**: **Yes, it is highly recommended!**

### How to configure your `.env` file:
1. In your project root folder, locate the `.env.example` file.
2. Duplicate it and rename the copy to **`.env`** (make sure your explorer doesn't accidentally save it as `.env.txt`).
3. Open `.env` in Notepad or VS Code and update these lines:
   * **`VITE_SECURITY_SECRET`**: Replace this with a random secure password of at least 16 characters. This is used to cryptographically sign your offline branch data packets.
     ```env
     VITE_SECURITY_SECRET="EmmanTilePointSecPass2026!"
     ```
   * **`GEMINI_API_KEY`**: If you want to use the optional local AI features (such as receipt categorization, AI help hub, or automated inventory audit reviews), get a key from Google AI Studio and enter it here:
     ```env
     GEMINI_API_KEY="AIzaSy..."
     ```
   * **`APP_URL`**: Set this to your local address to point back to your laptop:
     ```env
     APP_URL="https://192.168.1.38:3000"
     ```
4. Restart your PM2 server to apply the `.env` settings:
   ```cmd
   pm2 restart tilepoint-hq-server
   ```

---

## 🚀 Step 3: Run with PM2 on Windows
PM2 is a production process manager that keeps your application running 24/7.

### 1. Install PM2 globally
Open **Command Prompt (CMD)** or **PowerShell** as **Administrator** and run:
```cmd
npm install -g pm2
```

### 2. Startup PM2 on Windows Boot (Automatic Service)
Unlike Linux, PM2 on Windows requires a wrapper to restart automatically when your Windows laptop restarts.
Install the Windows-specific startup daemon:
```cmd
npm install -g pm2-windows-startup
pm2-startup install
```

### 3. Start TilePoint Server under PM2
Run this command from your project root folder:
```cmd
pm2 start server.js --name "tilepoint-hq-server"
```

### 4. Save the process list to Windows registry
To make sure PM2 recovers the server after a Windows restart or system update:
```cmd
pm2 save
```

### Useful PM2 Commands:
* **Check Status**: `pm2 status`
* **Real-time Logs**: `pm2 logs tilepoint-hq-server`
* **Restart Server**: `pm2 restart tilepoint-hq-server`
* **Stop Server**: `pm2 stop tilepoint-hq-server`

---

## 🌐 Step 4: Option 2 - Nginx on Windows (Enterprise Reverse Proxy)
If you prefer running a dedicated reverse proxy (Nginx) on Windows rather than letting Node handle SSL directly:

1. **Download Nginx for Windows**: [Download Nginx](https://nginx.org/en/download.html) (choose the stable `.zip` package).
2. Unzip Nginx (e.g., to `C:\nginx`).
3. Copy the configuration template we generated in your project root named `nginx.conf.example`.
4. Open `C:\nginx\conf\nginx.conf` and replace its content with the contents of your `nginx.conf.example`.
5. Update path directions to your SSL files in the Nginx config:
   ```nginx
   ssl_certificate     C:/your-project-path/cert.pem;
   ssl_certificate_key C:/your-project-path/key.pem;
   ```
6. Start Nginx on Windows via Command Prompt:
   ```cmd
   cd C:\nginx
   start nginx
   ```
   *(To stop Nginx, use `nginx -s stop`)*

---

## 📶 Step 5: Connecting Mobile Devices (Staff POS) & Configuring Windows 11 Firewall
If you want tablet or phone screens to connect securely over local Wi-Fi:
1. Make sure your Windows laptop and mobile devices are connected to the **same Wi-Fi router**.
2. Find your laptop's Local IP address. In **Command Prompt**, run:
   ```cmd
   ipconfig
   ```
   Look for the **IPv4 Address** (typically `192.168.1.XX` or `10.0.0.XX`).
3. **⚠️ Configure Windows 11 Defender Firewall (CRITICAL STEP)**:
   By default, Windows 11 blocks incoming network connections on port `3000` from external devices. You must explicitly allow port `3000` through the firewall to let staff tablets connect:
   * **The Quick PowerShell Method (Recommended)**:
     Open **PowerShell as Administrator** and run this single command:
     ```powershell
     New-NetFirewallRule -DisplayName "TilePoint Server Port 3000" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
     ```
   * **The Manual Control Panel Method**:
     1. Press the Windows Key, search for **"Windows Defender Firewall with Advanced Security"** and open it.
     2. Click **Inbound Rules** in the left sidebar, then click **New Rule...** in the right sidebar.
     3. Select **Port** and click Next.
     4. Select **TCP** and enter `3000` in **Specific local ports**, then click Next.
     5. Select **Allow the connection** and click Next.
     6. Keep Domain, Private, and Public checked, and click Next.
     7. Name the rule `TilePoint Port 3000` and click **Finish**.
4. On your mobile devices, open the browser and navigate to:
   ```
   https://192.168.1.XX:3000
   ```
5. **Note about Self-Signed Certificates**: Because this is a local self-signed certificate, your browser will show a "Your connection is not private" warning on first load. Simply click **"Advanced"** and select **"Proceed to Local IP (unsafe)"** to connect securely.

---

## 🔒 Step 6: How to get "True" Trusted HTTPS (No Browser Warnings)

A **"True" HTTPS** connection requires a certificate signed by a globally trusted Certificate Authority (CA). Local self-signed certificates are encrypted but show browser warnings because your browser doesn't recognize your laptop as a verified CA. 

To run with a **100% genuine, green-lock secure HTTPS** (no warning prompts on your laptop or mobile phones), choose one of the two industry-standard methods below:

### 🌟 Option A: Cloudflare Tunnels (Easiest & Most Professional)
This is the modern enterprise best practice. It assigns your local server a real, trusted domain name (e.g., `https://pos.emmantilecenter.com`) with automatic SSL management by Cloudflare.
* **Pros**: 100% verified HTTPS on all laptops, tablets, and phones anywhere; zero router/port-forwarding setup; completely secure.
* **Cost**: **Free** (requires owning any custom domain name, which costs ~$5–$10/year).

#### Setup steps:
1. Create a free account at [Cloudflare](https://www.cloudflare.com/) and connect your domain.
2. Go to your Cloudflare Dashboard -> **Zero Trust** -> **Networks** -> **Tunnels** and click **Create a Tunnel**.
3. Name it `tilepoint-hq` and download the **Cloudflare Tunnel Windows installer** (`cloudflared`).
4. Install it on your Windows laptop as a continuous background service (Cloudflare provides the exact command during setup).
5. In your Cloudflare dashboard, route your subdomain (e.g., `pos.emmantilecenter.com`) to the local service:
   * **Service Type**: `HTTP`
   * **URL**: `localhost:3000` *(Cloudflare handles the SSL encryption for you on their network!)*
6. **No local cert files needed!** Cloudflare takes care of the green secure SSL lock automatically. Your team can access it anywhere in the world securely.

---

### 💻 Option B: mkcert (True local HTTPS for Laptop only)
If you do not have a domain or internet access, you can force Windows and Chrome to fully trust your local server using **`mkcert`**. This creates a custom Local Certificate Authority on your laptop and registers it into the Windows system registry.

#### Setup steps:
1. **Install Chocolatey** (the Windows package manager) if you don't have it. Open PowerShell as Administrator and run:
   ```powershell
   Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
   ```
2. **Install mkcert** via PowerShell:
   ```powershell
   choco install mkcert
   ```
3. **Install the Local CA** into your Windows Trusted Root Store:
   ```powershell
   mkcert -install
   ```
   *(Accept the prompt confirming you want to install the certificate).*
4. **Generate trusted local certificates** in your project folder:
   ```powershell
   mkcert localhost 127.0.0.1 ::1 192.168.1.38
   ```
   *(Replace `192.168.1.38` with your actual laptop local IP address).*
5. This creates two files:
   - `localhost+3.pem` (Your Cert)
   - `localhost+3-key.pem` (Your Private Key)
6. **Rename these files** to `cert.pem` and `key.pem` in your project folder.
7. Restart your server. **Chrome will now show a fully valid, green-locked connection with zero security warnings on your laptop!**

---

### ⚠️ Why is my browser STILL saying "Not secure" after using mkcert?

If you followed the `mkcert` steps but still see a **"Not Secure"** warning or a red certificate warning line, here is the exact checklist to solve it instantly:

#### 1. Did you restart your browser?
Browsers (especially Google Chrome and Edge) read the Windows Trusted Root Certification authorities when they startup.
* **Solution**: Close all your browser windows entirely, or type `chrome://restart` in your address bar and press Enter. This forces Chrome to reload the Windows Trust Registry and recognize your custom CA.

#### 2. Are you using Firefox?
Unlike Chrome and Edge, Firefox does **not** look at the Windows Certificate Store by default; it uses its own built-in store.
* **Solution**: In your PowerShell window, run:
  ```powershell
  mkcert -install
  ```
  This command will automatically inject the certificate authority into Firefox's certificate database as well (Firefox must be closed during this). Alternatively, you can open Firefox -> **Settings** -> **Privacy & Security** -> search for "Certificates" -> click **View Certificates** -> **Authorities** -> **Import**, and import `C:\Users\USER\AppData\Local\mkcert\rootCA.pem`.

#### 3. Are you checking from a mobile phone, tablet, or another computer?
`mkcert` works by installing a **Local CA** onto **your Windows laptop's registry**.
* **Your laptop** now trusts the certificate completely (hence the green lock).
* **Your mobile phone or other computers** do not have your laptop's Local CA installed, so they will still show "Not secure"!
* **Solution**:
  * **Option A**: Use **Cloudflare Tunnels (Step 6 Option A)**. This is highly recommended because it gives you a globally trusted HTTPS link (`https://yourname.cloudflare.com`) that works on **all mobile devices and laptops** without installing anything on them.
  * **Option B**: If you want a mobile device to trust it locally, you must email the file `C:\Users\USER\AppData\Local\mkcert\rootCA.pem` to your mobile phone, open it on your phone, and install/trust it in your iOS or Android Settings as a Trusted Root Profile.

#### 4. Did your laptop's local IP address change?
If you generated the certificate using `192.168.1.38` but your Wi-Fi router assigned your laptop a new IP address (e.g. `192.168.1.42`), the browser will flag a **"Common Name Mismatch"** warning because the IP doesn't match the SSL certificate.
* **Solution**: Check your current local IP using `ipconfig` in Command Prompt, then re-generate the cert files with the correct IP address:
  ```powershell
  mkcert localhost 127.0.0.1 ::1 YOUR_NEW_IP_HERE
  ```
  Rename them to `cert.pem` and `key.pem`, copy them to your folder, and restart PM2 (`pm2 restart tilepoint-hq-server`).

