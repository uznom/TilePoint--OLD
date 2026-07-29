# TilePoint Enterprise - Complete Windows Setup & Deployment Guide

This document provides a comprehensive, step-by-step guide for installing, configuring, running, and troubleshooting the **TilePoint Shared Database Server & POS System** on Windows 10 and Windows 11.

---

## 📖 Table of Contents
1. [System Overview & Architecture](#-1-system-overview--architecture)
2. [Prerequisites & System Requirements](#-2-prerequisites--system-requirements)
3. [Option 1: 1-Click Automated Installation (Recommended)](#-3-option-1-1-click-automated-installation-recommended)
4. [Option 2: Step-by-Step Manual Installation Guide](#-4-option-2-step-by-step-manual-installation-guide)
   - [Step 2.1: Install Node.js & Git for Windows](#step-21-install-nodejs--git-for-windows)
   - [Step 2.2: Install Node Dependencies](#step-22-install-node-dependencies)
   - [Step 2.3: Configure Environment Variables (.env)](#step-23-configure-environment-variables-env)
   - [Step 2.4: Generate SSL Certificates for Local HTTPS](#step-24-generate-ssl-certificates-for-local-https)
   - [Step 2.5: Configure Windows Defender Firewall for Port 3000](#step-25-configure-windows-defender-firewall-for-port-3000)
   - [Step 2.6: Build Production Client Assets](#step-26-build-production-client-assets)
   - [Step 2.7: Launch and Manage Server under PM2](#step-27-launch-and-manage-server-under-pm2)
5. [Connecting Mobile Cashier Terminals & Staff Devices](#-5-connecting-mobile-cashier-terminals--staff-devices)
6. [Preventing Disconnections: Static IP & Router DHCP Setup](#-6-preventing-disconnections-static-ip--router-dhcp-setup)
   - [Method A: Router DHCP IP Reservation (Recommended)](#method-a-router-dhcp-ip-reservation-recommended)
   - [Method B: Windows Static IP Assignment](#method-b-windows-static-ip-assignment)
7. [Achieving Trusted HTTPS (Zero Security Warnings)](#-7-achieving-trusted-https-zero-security-warnings)
   - [Method A: Local Trusted CA with mkcert](#method-a-local-trusted-ca-with-mkcert)
   - [Method B: Global Enterprise Domain via Cloudflare Tunnels](#method-b-global-enterprise-domain-via-cloudflare-tunnels)
8. [Enterprise Nginx Reverse Proxy Setup (Optional)](#-8-enterprise-nginx-reverse-proxy-setup-optional)
9. [Comprehensive Step-by-Step Troubleshooting Guide](#-9-comprehensive-step-by-step-troubleshooting-guide)
   - [Troubleshooting EADDRINUSE (Port 3000 Busy)](#troubleshooting-eaddrinuse-port-3000-busy)
   - [Troubleshooting WebSocket server error: Port 24678 is already in use](#troubleshooting-websocket-server-error-port-24678-is-already-in-use)
   - [Troubleshooting "Not Secure" / Running in HTTP Mode](#troubleshooting-not-secure--running-in-http-mode)
   - [Troubleshooting ERR_SSL_PROTOCOL_ERROR](#troubleshooting-err_ssl_protocol_error)
   - [Troubleshooting Rollup failed to resolve import "xlsx"](#troubleshooting-rollup-failed-to-resolve-import-xlsx)
   - [Troubleshooting Vite / esbuild Transform Errors (e.g. Unexpected "export")](#troubleshooting-vite--esbuild-transform-errors-eg-unexpected-export)
   - [Troubleshooting "Server unable to commit configuration records"](#troubleshooting-server-unable-to-commit-configuration-records)
   - [Troubleshooting PowerShell Execution Policy Restrictions](#troubleshooting-powershell-execution-policy-restrictions)
   - [Troubleshooting Mobile Devices Unable to Connect](#troubleshooting-mobile-devices-unable-to-connect)
10. [Useful Operational Commands Reference](#-10-useful-operational-commands-reference)

---

## 🏗️ 1. System Overview & Architecture

TilePoint operates as a resilient, full-stack POS and ERP platform designed for hardware and tile retail stores:
- **Central Node (`server.js`)**: Runs on Express.js on **Port 3000**.
- **Shared Storage (`server-db.json`)**: Local JSON file storage with atomic temp-file writing and MD5 hash caching for zero data loss during power outages.
- **Real-Time Synchronizer**: Server-Sent Events (SSE) broadcasting live updates (`/api/db/events`) across all connected cashier and store terminals.
- **Reporting Engine & Excel Export**: Client-side reporting with multi-sheet `.xlsx` workbook generation (`xlsx`) for inventory reports, sales summaries, and transmittals.
- **Security & Shielding**: Anti-crawler middleware shielding API endpoints, HMAC SHA-256 session token verification, and role-based access control (Admin, Manager, Cashier).
- **HTTPS SSL Support**: Auto-detects `key.pem` and `cert.pem` in the root directory to run in secure HTTPS mode required for mobile camera barcode and receipt scanning.

---

## 💻 2. Prerequisites & System Requirements

Before deploying TilePoint, ensure your Windows machine meets these minimum requirements:
- **Operating System**: Windows 10 (64-bit) or Windows 11 (64-bit).
- **Node.js**: Version 18.0.0 or higher (LTS v20+ recommended).
- **Git for Windows**: Version 2.40+ (includes OpenSSL CLI tools).
- **User Permissions**: Administrator access (required for Firewall configuration, global PM2 installation, and SSL CA store registration).
- **Local Network**: Wi-Fi or Ethernet router connecting the host Windows PC and cashier tablets/phones on the same local network subnet.

---

## 🚀 3. Option 1: 1-Click Automated Installation (Recommended)

TilePoint includes a fully automated installer batch file (`setup-tilepoint.bat`) that handles all dependencies, environment setup, local IP detection, certificate generation, firewall rules, asset compilation, and background server startup in one click.

### Step-by-Step 1-Click Execution:
1. Open your project folder (`C:\path\to\TilePoint`).
2. Right-click **`setup-tilepoint.bat`** and select **Run as Administrator**.
3. If prompted by Windows User Account Control (UAC), click **Yes**.
4. The automated script will perform these actions sequentially:
   - ✅ Verify and auto-install Git and Node.js LTS via `winget` if missing.
   - ✅ Execute `npm install` for project dependencies (including `express`, `xlsx`, `lucide-react`, etc.).
   - ✅ Detect your primary local IPv4 address (excluding WSL, Docker, and VirtualBox interfaces).
   - ✅ Create `.env` from `.env.example` with auto-generated security secrets and local IP binding.
   - ✅ Download `mkcert.exe` and generate trusted SSL certificates (`key.pem`, `cert.pem`) for `localhost` and your local IP.
   - ✅ Add an Inbound Firewall Rule in Windows Defender for TCP Port 3000.
   - ✅ Compile production client bundle (`npm run build`).
   - ✅ Install and launch the server under PM2 process manager as `tilepoint-hq-server`.
   - ✅ Open your default browser to `https://<YOUR_LOCAL_IP>:3000`.

---

## 🛠️ 4. Option 2: Step-by-Step Manual Installation Guide

If you prefer to install and configure each component manually, follow this sequential step-by-step guide.

---

### Step 2.1: Install Node.js & Git for Windows

1. **Install Node.js**:
   - Download the LTS installer from [https://nodejs.org/](https://nodejs.org/).
   - Run the `.msi` setup and ensure **"Add to PATH"** is checked.
   - Verify installation in Command Prompt:
     ```cmd
     node -v
     npm -v
     ```

2. **Install Git for Windows**:
   - Download Git from [https://git-scm.com/](https://git-scm.com/).
   - Complete standard installation (this installs native OpenSSL command line utilities).
   - Verify installation in Command Prompt:
     ```cmd
     git --version
     ```

---

### Step 2.2: Install Node Dependencies

1. Open **Command Prompt** or **PowerShell** in the root directory of TilePoint:
   ```cmd
   cd C:\path\to\TilePoint
   ```
2. Run `npm install` to download required packages (`express`, `vite`, `dotenv`, `react`, `xlsx`, `lucide-react`, etc.):
   ```cmd
   npm install
   ```

---

### Step 2.3: Configure Environment Variables (.env)

1. Check if a `.env` file exists in the root folder.
2. If not, copy `.env.example` to create `.env`:
   ```cmd
   copy .env.example .env
   ```
3. Open `.env` in Notepad or VS Code and set the values:
   ```env
   # Cryptographic secret for signing offline branch sessions (Minimum 16 characters)
   VITE_SECURITY_SECRET="TilePointEnterpriseSecPass2026!"

   # Optional Google AI Studio key for local receipt auditing and AI assistant features
   GEMINI_API_KEY=""

   # Bound server address (Replace with your actual local IP)
   APP_URL="https://192.168.1.38:3000"
   ```

---

### Step 2.4: Generate SSL Certificates for Local HTTPS

Node.js requires `key.pem` and `cert.pem` in the root folder to boot in HTTPS mode. Choose one of the methods below:

#### Method A: Automated Batch Script (OpenSSL via Git)
Double-click **`generate-certs.bat`** in the project folder. It will locate OpenSSL from Git and create `key.pem` and `cert.pem`.

#### Method B: Native PowerShell Script (No OpenSSL Required)
If OpenSSL is not installed, run our native PowerShell generator:
```powershell
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process -Force
.\generate-certs.ps1
```

#### Method C: Manual Git Bash Command
Open **Git Bash** in the project root folder and execute:
```bash
openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -sha256 -days 365 -nodes -subj "/CN=localhost"
```

---

### Step 2.5: Configure Windows Defender Firewall for Port 3000

By default, Windows Defender Firewall blocks incoming connections from mobile phones and cashier tablets. You must allow inbound traffic on TCP Port 3000.

#### Fast PowerShell Command (Run as Administrator):
```powershell
New-NetFirewallRule -DisplayName "TilePoint Server Port 3000" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
```

#### Manual Control Panel Method:
1. Press `Win + R`, type `wf.msc` and press Enter (*Windows Defender Firewall with Advanced Security*).
2. Click **Inbound Rules** in the left sidebar, then click **New Rule...** on the right.
3. Choose **Port** -> click Next.
4. Choose **TCP** and type `3000` under **Specific local ports** -> click Next.
5. Choose **Allow the connection** -> click Next.
6. Ensure **Domain**, **Private**, and **Public** are checked -> click Next.
7. Name the rule `TilePoint Server Port 3000` and click **Finish**.

---

### Step 2.6: Build Production Client Assets

1. Check for any TypeScript syntax or type issues:
   ```cmd
   npm run lint
   ```
2. Compile the React / Vite frontend into static production bundle files in the `dist/` directory:
   ```cmd
   npm run build
   ```
*(Verify that the `dist` folder is created and contains `index.html` and assets).*

---

### Step 2.7: Launch and Manage Server under PM2

PM2 keeps your server running 24/7 in the background and restarts it automatically if the laptop reboots.

1. **Install PM2 globally**:
   ```cmd
   npm install -g pm2
   ```

2. **Install Windows Startup Service**:
   ```cmd
   npm install -g pm2-windows-startup
   pm2-startup install
   ```

3. **Start TilePoint Server**:
   ```cmd
   pm2 start server.js --name "tilepoint-hq-server"
   ```

4. **Save PM2 process list to Windows Registry**:
   ```cmd
   pm2 save
   ```

5. **Verify server status**:
   ```cmd
   pm2 status
   ```

---

## 📱 5. Connecting Mobile Cashier Terminals & Staff Devices

Once the server is running under PM2 on your Windows host laptop, staff tablets and mobile phones can connect:

1. Connect the staff device to the **same Wi-Fi router** as the Windows host PC.
2. Find the host PC's local IP address by running `ipconfig` in CMD on the host PC (e.g. `192.168.1.38`).
3. On the staff phone or tablet, open Google Chrome, Safari, or Microsoft Edge and enter:
   ```
   https://192.168.1.38:3000
   ```
4. **Handling Self-Signed SSL Warning**:
   Because the server uses a local self-signed certificate, the mobile browser will display a *"Your connection is not private"* warning on first load:
   - Tap **Advanced** (or *Show Details*).
   - Tap **Proceed to 192.168.1.38 (unsafe)**.
5. The TilePoint POS terminal interface will load and sync with the central database.

---

## 🔒 6. Preventing Disconnections: Static IP & Router DHCP Setup

### The Problem: DHCP IP Address Rotation
Wi-Fi routers dynamically change IP addresses whenever devices reconnect or the router restarts. If your Windows host PC changes IP from `192.168.1.38` to `192.168.1.45`, cashier tablets will immediately lose connection.

To prevent this, pin your host PC's IP address permanently using one of the two methods below.

---

### Method A: Router DHCP IP Reservation (Recommended)

This tells your Wi-Fi router to always assign the same IP address to your PC's hardware address (MAC address).

1. Find your host PC's MAC address in Command Prompt:
   ```cmd
   getmac /v /fo list
   ```
   Copy the **Physical Address** for your active Wi-Fi or Ethernet adapter (e.g. `9C-B6-D0-11-22-33`).
2. Access your router's admin panel in a web browser (usually `http://192.168.1.1` or `http://192.168.0.1`).
3. Navigate to **DHCP Server** -> **Address Reservation** (or *Static Leases* / *IP & MAC Binding*).
4. Enter your MAC address and assign a fixed local IP (e.g. `192.168.1.150`).
5. Save changes and reboot the router.

---

### Method B: Windows Static IP Assignment

Configure static IP directly within Windows:

#### PowerShell Method (Run as Administrator):
```powershell
$adapter = Get-NetAdapter | Where-Object { $_.Status -eq "Up" } | Select-Object -First 1
$ipConfig = Get-NetIPAddress -InterfaceIndex $adapter.InterfaceIndex -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike "169.*" } | Select-Object -First 1
$gateway = (Get-NetRoute -DestinationPrefix "0.0.0.0/0" -InterfaceIndex $adapter.InterfaceIndex).NextHop | Select-Object -First 1

New-NetIPAddress -InterfaceIndex $adapter.InterfaceIndex -IPAddress $ipConfig.IPAddress -PrefixLength 24 -DefaultGateway $gateway -Confirm:$false
Set-DnsClientServerAddress -InterfaceIndex $adapter.InterfaceIndex -ServerAddresses ("8.8.8.8", "8.8.4.4")
```

#### Manual Control Panel Method:
1. Press `Win + R`, type `ncpa.cpl` and press Enter.
2. Right-click your active Network Adapter -> click **Properties**.
3. Double-click **Internet Protocol Version 4 (TCP/IPv4)**.
4. Select **Use the following IP address**:
   - **IP Address**: `192.168.1.150`
   - **Subnet Mask**: `255.255.255.0`
   - **Default Gateway**: `192.168.1.1` (Your router IP)
5. Select **Use the following DNS server addresses**:
   - **Preferred DNS**: `8.8.8.8`
   - **Alternate DNS**: `8.8.4.4`
6. Click **OK** and apply.

---

## 🔐 7. Achieving Trusted HTTPS (Zero Security Warnings)

If you want to eliminate the browser *"Not Secure"* warning on cashier devices, choose one of these solutions:

---

### Method A: Local Trusted CA with mkcert

`mkcert` creates a local Certificate Authority (CA) and registers it directly into the Windows System Trust Store.

1. **Download mkcert**:
   - `setup-tilepoint.bat` automatically downloads `mkcert.exe` into your folder.
   - Alternatively, install via Chocolatey: `choco install mkcert`
2. **Install Local CA to Windows Store**:
   Open PowerShell as Administrator in the project directory and run:
   ```powershell
   .\mkcert.exe -install
   ```
3. **Generate Trusted Certificates**:
   ```powershell
   .\mkcert.exe -key-file key.pem -cert-file cert.pem localhost 127.0.0.1 192.168.1.150
   ```
   *(Replace `192.168.1.150` with your actual static IP).*
4. **Restart PM2 server**:
   ```cmd
   pm2 restart tilepoint-hq-server
   ```
5. **Clear Browser Cache / Restart Browser**:
   Restart Chrome or Edge (`chrome://restart`). The connection will show a green security lock on the host PC!

---

### Method B: Global Enterprise Domain via Cloudflare Tunnels

This assigns your local Windows server a globally trusted, official domain name (e.g. `https://pos.yourstore.com`) with automatic SSL management by Cloudflare.

1. Create a free account at [Cloudflare.com](https://www.cloudflare.com) and add your custom domain.
2. In Cloudflare Dashboard, go to **Zero Trust** -> **Networks** -> **Tunnels** -> **Create a Tunnel**.
3. Name your tunnel `tilepoint-hq` and download the Windows connector installer (`cloudflared`).
4. Install `cloudflared` on your host PC as a Windows background service.
5. In Cloudflare Dashboard, route your chosen subdomain (e.g. `pos.yourstore.com`) to local HTTP service:
   - **Service Type**: `HTTP`
   - **URL**: `localhost:3000`
6. **Result**: Your staff can access the POS anywhere in the world securely over `https://pos.yourstore.com` with zero browser warnings and no port-forwarding required.

---

## 🌐 8. Enterprise Nginx Reverse Proxy Setup (Optional)

If you prefer using Nginx for Windows as an enterprise reverse proxy instead of Express directly terminating SSL:

1. Download Nginx for Windows from [https://nginx.org/en/download.html](https://nginx.org/en/download.html) and extract to `C:\nginx`.
2. Locate `nginx.conf.example` in the TilePoint root directory.
3. Copy `nginx.conf.example` into `C:\nginx\conf\nginx.conf`.
4. Update certificate file paths in `nginx.conf`:
   ```nginx
   ssl_certificate     C:/path/to/TilePoint/cert.pem;
   ssl_certificate_key C:/path/to/TilePoint/key.pem;
   ```
5. Start Nginx from Command Prompt:
   ```cmd
   cd C:\nginx
   start nginx
   ```
   *(To stop Nginx: `nginx -s stop` | To reload: `nginx -s reload`)*.

---

## ❓ 9. Comprehensive Step-by-Step Troubleshooting Guide

---

### Troubleshooting EADDRINUSE (Port 3000 Busy)

**Symptom**: Server logs show `Error: listen EADDRINUSE: address already in use 0.0.0.0:3000` or `server.js` fails to start.

**Cause**: Another application or orphaned Node process is running on Port 3000.

**Step-by-Step Fix**:
1. Open Command Prompt (CMD) as Administrator.
2. Find the process occupying Port 3000:
   ```cmd
   netstat -ano | findstr :3000
   ```
   *Example output:*
   `TCP    0.0.0.0:3000           0.0.0.0:0              LISTENING       4812`
3. Identify the PID number at the far right (e.g. `4812`).
4. Force terminate the process:
   ```cmd
   taskkill /PID 4812 /F
   ```
5. Stop any lingering PM2 tasks:
   ```cmd
   pm2 kill
   ```
6. Restart the TilePoint server:
   ```cmd
   pm2 start server.js --name "tilepoint-hq-server"
   ```

---

### Troubleshooting WebSocket server error: Port 24678 is already in use

**Symptom**: Console or terminal displays: `WebSocket server error: Port 24678 is already in use` when running `npm run dev` or `node server.js`.

**Cause**:
1. **Multiple Dev Server Instances**: Port 24678 is Vite's default Hot Module Replacement (HMR) WebSocket port. Another `node.exe` or `vite` process is already running in a different terminal, background window, or via PM2.
2. **Running in Dev Mode without NODE_ENV=production**: When `server.js` runs in development mode (`NODE_ENV !== 'production'`), it mounts Vite's dev server middleware which attempts to open HMR on port 24678.

**Step-by-Step Fix**:

1. **Option A — Kill Orphaned Node Processes (Quickest)**:
   Open Command Prompt (CMD) as Administrator and run:
   ```cmd
   taskkill /IM node.exe /F
   ```
   Or locate and terminate the specific process holding port 24678:
   ```cmd
   netstat -ano | findstr :24678
   taskkill /PID <PID_NUMBER> /F
   ```

2. **Option B — Run in Production Mode (Recommended for Store Terminals)**:
   If deploying for store/cashier usage, compile production static assets and run in `production` mode so Vite HMR is disabled:
   ```cmd
   npm run build
   ```
   *In Command Prompt (CMD):*
   ```cmd
   set NODE_ENV=production && node server.js
   ```
   *In PowerShell:*
   ```powershell
   $env:NODE_ENV="production"; node server.js
   ```
   *In PM2:*
   ```cmd
   pm2 start server.js --name "tilepoint-hq-server" --env production
   ```

---

### Troubleshooting "Not Secure" / Running in HTTP Mode

**Symptom**: Opening `https://192.168.1.11:3000` or `https://localhost:3000` shows a **"Not Secure"** / **"Your connection is not private"** warning badge in Chrome, Edge, or Safari.

#### Why does this happen on `192.168.1.11`?
1. **Local IP Certificates are Self-Signed**: Official public Certificate Authorities (like Let's Encrypt or DigiCert) cannot issue public SSL certificates for local private IP addresses like `192.168.1.11`.
2. **Browser Trust Policy**: Chrome, Edge, and Safari only show a green padlock for certificates issued by a known trusted CA. Self-signed certificates created via OpenSSL without a trusted Root CA trigger the "Not Secure" badge.
3. **Is the connection encrypted?**: **YES!** All traffic between devices and the host PC is 100% encrypted over TLS/HTTPS regardless of the "Not Secure" badge.
4. **Why HTTPS is required**: Modern browsers strictly mandate HTTPS for camera barcode scanning (`getUserMedia`) and secure POS sessions.

---

### 🛡️ How to Generate a Trusted SSL Certificate & Remove "Not Secure"

To get a **green padlock / "Connection is secure"** on all phones, tablets, and cashier PCs without any warning messages, follow these steps using `mkcert` (a tool specifically made to generate trusted local SSL certificates).

#### Phase 1: Generate Trusted SSL Certificate on Host PC

1. **Install `mkcert` via `winget` or PowerShell (Administrator)**:
   ```cmd
   winget install FiloSottile.mkcert
   ```
   *Or download `mkcert.exe` directly from https://github.com/FiloSottile/mkcert/releases and place it in your project folder.*

2. **Install Local Root CA on Host PC**:
   Open CMD or PowerShell as **Administrator** in the TilePoint directory and run:
   ```cmd
   mkcert -install
   ```
   *(This creates a local Root Certificate Authority and automatically installs it into the Windows Trusted Root Store).*

3. **Generate Certificates for your LAN IP and Localhost**:
   Replace `192.168.1.11` with your actual PC IP address:
   ```cmd
   mkcert -key-file key.pem -cert-file cert.pem localhost 127.0.0.1 192.168.1.11 ::1
   ```
   *(This replaces `key.pem` and `cert.pem` in your project folder with certificates signed by your new local Root CA).*

4. **Restart TilePoint Server**:
   ```cmd
   pm2 restart tilepoint-hq-server
   ```

---

#### Phase 2: Install Root CA on Client Devices (Removes "Not Secure" Badge)

To make phones, tablets, and other PCs trust your server without warning, you simply copy and install the `rootCA.pem` file created in Phase 1 onto each device once.

##### 📍 Finding your `rootCA.pem` file:
Run this command in CMD on the host PC to find the exact location of `rootCA.pem`:
```cmd
mkcert -CAROOT
```
*(Typical path: `C:\Users\YourUsername\AppData\Local\mkcert\rootCA.pem`)*.

---

##### 💻 On Windows Cashier PCs:
1. Copy `rootCA.pem` to the cashier PC.
2. Double-click `rootCA.pem` -> click **Install Certificate...**
3. Select **Local Machine** -> click Next.
4. Select **Place all certificates in the following store** -> click **Browse...**
5. Choose **Trusted Root Certification Authorities** -> click OK -> click Next -> click **Finish**.
6. Open `https://192.168.1.11:3000` in Chrome/Edge — it will now show a **green padlock**!

---

##### 📱 On Apple iPhones & iPads (iOS / iPadOS):
1. Send `rootCA.pem` to your iPhone/iPad via AirDrop, Email, or download it from a local file share.
2. Open **Settings** on iOS -> tap **Profile Downloaded** near the top.
3. Tap **Install** in the top-right corner -> enter your iPhone Passcode -> tap **Install** -> tap **Done**.
4. **Critical Step (Enable Full Trust)**:
   - Go to **Settings** -> **General** -> **About** -> **Certificate Trust Settings** (at the bottom).
   - Under *"Enable full trust for root certificates"*, find **mkcert development CA**.
   - Toggle the switch to **ON (Green)** -> tap **Continue**.
5. Open `https://192.168.1.11:3000` in Safari or Chrome on iOS — **"Not Secure" is completely gone** and camera barcode scanning works instantly!

---

##### 🤖 On Android Phones & Tablets:
1. Copy `rootCA.pem` to the Android device storage or download via Google Drive/email.
2. Open Android **Settings** -> go to **Security & Privacy** (or Security).
3. Scroll down to **More Security Settings** -> tap **Encryption & Credentials**.
4. Tap **Install a certificate** -> choose **CA certificate**.
5. Tap **Install anyway** if prompted with a security warning.
6. Browse to and select `rootCA.pem`.
7. Enter a name (e.g. `TilePoint Root CA`) -> tap **OK**.
8. Refresh `https://192.168.1.11:3000` in Chrome for Android — the connection will now show as **100% Secure**!

---

#### Quick Fallback (Bypass Warning without Installing Root CA):
If you do not want to install `rootCA.pem` on staff phones, you can simply tap through the browser warning once:
- **Chrome / Edge**: Click **Advanced** -> tap **Proceed to 192.168.1.11 (unsafe)**.
- **Safari**: Tap **Show Details** -> tap **visit this website** -> confirm with Passcode.

---

### Troubleshooting ERR_SSL_PROTOCOL_ERROR

**Symptom**: Browser displays `ERR_SSL_PROTOCOL_ERROR` or PM2 logs report `ERR_OSSL_UNSUPPORTED` / `nested asn1 error`.

**Cause**: `key.pem` or `cert.pem` files are corrupted, empty, or incorrectly formatted as PKCS#12 instead of PKCS#8 PEM.

**Step-by-Step Fix**:
1. Stop the server:
   ```cmd
   pm2 stop tilepoint-hq-server
   ```
2. Delete `key.pem` and `cert.pem` from the project root directory.
3. Re-generate valid certificate files using PowerShell:
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process -Force
   .\generate-certs.ps1
   ```
4. Restart PM2:
   ```cmd
   pm2 restart tilepoint-hq-server
   ```

---

### Troubleshooting Rollup failed to resolve import "xlsx"

**Symptom**: Executing `npm run build` fails with: `Rollup failed to resolve import "xlsx" from "src/lib/excelExportHelper.ts"`.

**Cause**: The `xlsx` package is missing or not present in `node_modules`.

**Step-by-Step Fix**:
1. Run `npm install` or explicitly install the `xlsx` package:
   ```cmd
   npm install xlsx
   ```
2. Re-run `npm run build` to verify the production bundle builds without errors:
   ```cmd
   npm run build
   ```

---

### Troubleshooting Vite / esbuild Transform Errors (e.g. Unexpected "export")

**Symptom**: Build fails with `[vite:esbuild] Transform failed with 1 error: ERROR: Unexpected "export"` in React context files or components.

**Cause**: A missing or extra brace `}`, dangling syntax, or invalid export placement in a TypeScript source file.

**Step-by-Step Fix**:
1. Run the linter / TypeScript type checker to quickly pinpoint the syntax error line:
   ```cmd
   npm run lint
   ```
2. Open the file reported in the error message (e.g., `src/context/DbContext.tsx`), inspect the syntax around the line number, and ensure all functions, objects, and export statements are properly formatted and enclosed.
3. Re-run `npm run build` to confirm the fix.

---

### Troubleshooting "Server unable to commit configuration records"

**Symptom**: Saving store settings, admin credentials, or branch records in the UI fails with a red error notice.

**Cause**: The web browser cannot reach the backend server on Port 3000 because `server.js` is offline, blocked by firewall, or the browser hasn't accepted the SSL certificate exception.

**Step-by-Step Fix**:
1. Check PM2 server status:
   ```cmd
   pm2 status
   ```
   If status is `stopped` or `errored`, check error logs: `pm2 logs tilepoint-hq-server`.
2. Test backend accessibility directly in browser:
   Open `https://localhost:3000/api/db` in your browser.
3. Ensure you click **Advanced -> Proceed to localhost (unsafe)** if prompted by the SSL warning screen.
4. Verify firewall status: Ensure Inbound TCP Rule for Port 3000 is active in Windows Firewall.

---

### Troubleshooting PowerShell Execution Policy Restrictions

**Symptom**: Running `.ps1` scripts gives: `generate-certs.ps1 cannot be loaded because running scripts is disabled on this system`.

**Step-by-Step Fix**:
Unblock the script for the current process session:
```powershell
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process -Force
.\generate-certs.ps1
```

---

### Troubleshooting Mobile Devices Unable to Connect ("Site Unreachable")

**Symptom**: Staff phones or tablets show `ERR_CONNECTION_TIMED_OUT`, `ERR_CONNECTION_REFUSED`, `This site can’t be reached`, or `Server Unreachable` when attempting to access `https://192.168.1.11:3000`.

**Step-by-Step Diagnostic Checklist**:

1. **Verify `server.js` is Active and Listening on `0.0.0.0:3000`**:
   - On the host PC, open CMD and check if the server is running:
     ```cmd
     netstat -ano | findstr :3000
     ```
   - If nothing appears, start the server:
     ```cmd
     pm2 start server.js --name "tilepoint-hq-server"
     ```
   - Test locally on the host PC browser: `https://localhost:3000` or `https://192.168.1.11:3000`. If it works on the host PC but not on the phone, proceed to step 2.

2. **Check Windows Network Profile (Change from Public to Private)**:
   - Windows Firewall silently blocks ALL inbound phone connections if your Wi-Fi is set to **Public Network**.
   - Go to Windows **Settings** -> **Network & internet** -> **Wi-Fi** (or **Ethernet**).
   - Select your connected network and change Network profile type to **Private network**.

3. **Allow Port 3000 Through Windows Defender Firewall**:
   - Open PowerShell as **Administrator** on the host PC and run this command:
     ```powershell
     New-NetFirewallRule -DisplayName "TilePoint Port 3000" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
     ```
   - If using 3rd-party antivirus/firewall software (e.g. Kaspersky, Norton, McAfee, ESET, Bitdefender), temporarily disable its Network Shield/Firewall or add an inbound rule for TCP Port 3000.

4. **Verify Correct IPv4 Address on Host PC (Avoid Virtual IPs)**:
   - Run `ipconfig` in CMD on the host PC.
   - Look specifically for **Wireless LAN adapter Wi-Fi** or **Ethernet adapter**.
   - Make sure you are using the actual physical LAN IP (e.g., `192.168.1.11`), NOT a virtual adapter IP from WSL, Docker, Hyper-V, VMware, or VirtualBox (e.g., `172.x.x.x` or `192.168.56.x`).

5. **Turn Off Phone Cellular Data & VPNs**:
   - **Cellular Data**: Turn off 4G/5G/LTE on the phone so traffic routes solely through Wi-Fi.
   - **VPN Services**: Disable active VPNs (ExpressVPN, NordVPN, Cloudflare WARP) on both the phone and host PC, as VPNs redirect traffic away from the local subnet.

6. **Check Router AP / Client Isolation**:
   - If the phone and PC are both on Wi-Fi but cannot see each other, log into your Wi-Fi router admin page (e.g., `192.168.1.1`).
   - Check if **AP Isolation**, **Client Isolation**, or **Guest Network Isolation** is enabled. Turn it **OFF** so Wi-Fi devices can communicate locally.

7. **Ensure `https://` Protocol is Included**:
   - Modern phone browsers will default to searching Google if you type `192.168.1.11:3000` without `https://`.
   - Type the full URL into the address bar: `https://192.168.1.11:3000`
   - Tap **Advanced** -> **Proceed to 192.168.1.11 (unsafe)** when the SSL warning appears.

---

## 🛠️ 10. Useful Operational Commands Reference

| Operation | Command | Execution Context |
| :--- | :--- | :--- |
| **Run 1-Click Installer** | `setup-tilepoint.bat` | Windows CMD (Run as Admin) |
| **Check PM2 Status** | `pm2 status` | CMD / PowerShell |
| **View Real-Time Logs** | `pm2 logs tilepoint-hq-server` | CMD / PowerShell |
| **Restart Server** | `pm2 restart tilepoint-hq-server` | CMD / PowerShell |
| **Stop Server** | `pm2 stop tilepoint-hq-server` | CMD / PowerShell |
| **Install Dependencies** | `npm install` | Project Root Directory |
| **Verify Code & Types** | `npm run lint` | Project Root Directory |
| **Rebuild Client Bundle** | `npm run build` | Project Root Directory |
| **Check Port 3000 Usage** | `netstat -ano \| findstr :3000` | CMD / PowerShell |
| **Kill Process on Port 3000**| `taskkill /PID <PID> /F` | CMD (Run as Admin) |
| **Check Local IP Address** | `ipconfig` | CMD / PowerShell |
| **Generate SSL Certs** | `.\generate-certs.ps1` | PowerShell |

---

*TilePoint Enterprise POS & Shared Database System — Deployment Documentation*
