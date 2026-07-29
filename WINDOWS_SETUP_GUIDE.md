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
   - [Troubleshooting ERR_SSL_PROTOCOL_ERROR](#troubleshooting-err_ssl_protocol_error)
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
   - ✅ Execute `npm install` for project dependencies.
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
2. Run `npm install` to download required packages (`express`, `vite`, `dotenv`, `react`, `lucide-react`, etc.):
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

Compile the React / Vite frontend into static production bundle files in the `dist/` directory:
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

### Troubleshooting Mobile Devices Unable to Connect

**Symptom**: Staff phones/tablets show `ERR_CONNECTION_TIMED_OUT` or `Cannot reach server`.

**Step-by-Step Fix**:
1. **Network Check**: Verify phone and host PC are connected to the **exact same Wi-Fi SSID** (ensure phone isn't on mobile 4G/5G data or guest network isolation).
2. **IP Check**: Verify host PC local IP hasn't changed by running `ipconfig` in CMD.
3. **Firewall Rule Check**: Run this PowerShell command as Administrator on the host PC:
   ```powershell
   New-NetFirewallRule -DisplayName "TilePoint Server Port 3000" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
   ```
4. **URL Check**: Ensure the mobile browser uses `https://` prefix with port `3000` (e.g. `https://192.168.1.38:3000`).

---

## 🛠️ 10. Useful Operational Commands Reference

| Operation | Command | Execution Context |
| :--- | :--- | :--- |
| **Run 1-Click Installer** | `setup-tilepoint.bat` | Windows CMD (Run as Admin) |
| **Check PM2 Status** | `pm2 status` | CMD / PowerShell |
| **View Real-Time Logs** | `pm2 logs tilepoint-hq-server` | CMD / PowerShell |
| **Restart Server** | `pm2 restart tilepoint-hq-server` | CMD / PowerShell |
| **Stop Server** | `pm2 stop tilepoint-hq-server` | CMD / PowerShell |
| **Rebuild Client Bundle** | `npm run build` | Project Root Directory |
| **Check Port 3000 Usage** | `netstat -ano \| findstr :3000` | CMD / PowerShell |
| **Kill Process on Port 3000**| `taskkill /PID <PID> /F` | CMD (Run as Admin) |
| **Check Local IP Address** | `ipconfig` | CMD / PowerShell |
| **Generate SSL Certs** | `.\generate-certs.ps1` | PowerShell |

---
*TilePoint Enterprise POS & Shared Database System — Deployment Documentation*
