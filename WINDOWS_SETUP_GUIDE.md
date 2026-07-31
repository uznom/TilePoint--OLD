# TilePoint Enterprise - Complete Windows Setup & Deployment Guide

This document provides a comprehensive, step-by-step guide for installing, configuring, running, maintaining, and troubleshooting the **TilePoint Shared Database Server & POS System** on Windows 10 and Windows 11.

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
   - [Step 2.5: Configure MySQL Database (Optional Dedicated SQL Server)](#step-25-configure-mysql-database-optional-dedicated-sql-server)
   - [Step 2.6: Configure Windows Defender Firewall for Ports 3000 & 3306](#step-26-configure-windows-defender-firewall-for-ports-3000--3306)
   - [Step 2.7: Build Production Client Assets](#step-27-build-production-client-assets)
   - [Step 2.8: Launch and Manage Server under PM2](#step-28-launch-and-manage-server-under-pm2)
5. [Database Management, Migration & Resetting to Setup Wizard State](#-5-database-management-migration--resetting-to-setup-wizard-state)
   - [Wiping Database & Returning to Setup Wizard Installer](#wiping-database--returning-to-setup-wizard-installer)
   - [Migrating Data between JSON / AlaSQL and MySQL](#migrating-data-between-json--alasql-and-mysql)
6. [Connecting Mobile Cashier Terminals & Staff Devices](#-6-connecting-mobile-cashier-terminals--staff-devices)
7. [Preventing Disconnections: Static IP & Router DHCP Setup](#-7-preventing-disconnections-static-ip--router-dhcp-setup)
   - [Method A: Router DHCP IP Reservation (Recommended)](#method-a-router-dhcp-ip-reservation-recommended)
   - [Method B: Windows Static IP Assignment](#method-b-windows-static-ip-assignment)
8. [Achieving Trusted HTTPS (Zero Security Warnings)](#-8-achieving-trusted-https-zero-security-warnings)
   - [Method A: Local Trusted CA with mkcert](#method-a-local-trusted-ca-with-mkcert)
   - [Method B: Global Enterprise Domain via Cloudflare Tunnels](#method-b-global-enterprise-domain-via-cloudflare-tunnels)
9. [Enterprise Nginx Reverse Proxy Setup (Optional)](#-9-enterprise-nginx-reverse-proxy-setup-optional)
10. [Comprehensive Step-by-Step Troubleshooting Guide](#-10-comprehensive-step-by-step-troubleshooting-guide)
    - [Troubleshooting EADDRINUSE (Port 3000 or 3306 Busy)](#troubleshooting-eaddrinuse-port-3000-or-3306-busy)
    - [Troubleshooting WebSocket server error: Port 24678 is already in use](#troubleshooting-websocket-server-error-port-24678-is-already-in-use)
    - [Troubleshooting MySQL Connection Errors (ER_ACCESS_DENIED_ERROR / ECONNREFUSED)](#troubleshooting-mysql-connection-errors-er_access_denied_error--econnrefused)
    - [Troubleshooting "Not Secure" / Running in HTTP Mode](#troubleshooting-not-secure--running-in-http-mode)
    - [Troubleshooting ERR_SSL_PROTOCOL_ERROR](#troubleshooting-err_ssl_protocol_error)
    - [Troubleshooting Rollup failed to resolve import "xlsx"](#troubleshooting-rollup-failed-to-resolve-import-xlsx)
    - [Troubleshooting Vite / esbuild Transform Errors](#troubleshooting-vite--esbuild-transform-errors)
    - [Troubleshooting "Server unable to commit configuration records"](#troubleshooting-server-unable-to-commit-configuration-records)
    - [Troubleshooting PowerShell Execution Policy Restrictions](#troubleshooting-powershell-execution-policy-restrictions)
    - [Troubleshooting Mobile Devices Unable to Connect](#troubleshooting-mobile-devices-unable-to-connect)
11. [Useful Operational Commands Reference](#-11-useful-operational-commands-reference)

---

## 🏗️ 1. System Overview & Architecture

TilePoint operates as a resilient, enterprise full-stack POS and ERP platform designed for hardware and tile retail stores:

- **Central Server Node (`server.js`)**: Express.js server running on **Port 3000** with native HTTPS termination.
- **Dual Relational Database Engine**:
  - **Primary Engine**: MySQL 8.0+ Connection Pool (`mysql2/promise`) connecting to a local or remote MySQL Server on Port 3306.
  - **Embedded SQL Engine**: Integrated **AlaSQL** relational SQL engine with 28 fully MySQL-compatible table schemas (`CREATE TABLE IF NOT EXISTS`) and atomic JSON snapshot persistence (`db.json`) for zero-config offline standalone operation when MySQL is not present or offline.
- **Real-Time Synchronizer**: Dual real-time push via **Socket.io** (`db_pulse_update`) and **Server-Sent Events (SSE)** (`/api/db/events`) broadcasting live updates across all cashier and inventory terminals.
- **Reporting Engine & Excel Export**: Multi-sheet `.xlsx` workbook generation (`xlsx`) for inventory stock cards, sales summaries, and transmittals.
- **Security & Shielding**: Anti-crawler middleware shielding API endpoints, HMAC SHA-256 session verification, AES local signature hashing, and role-based access control (Admin, Manager, Cashier).
- **HTTPS SSL Support**: Auto-detects `key.pem` and `cert.pem` in the root directory to run in secure HTTPS mode required for mobile camera barcode scanning (`getUserMedia`) and hardware receipt printing.

---

## 💻 2. Prerequisites & System Requirements

Before deploying TilePoint, ensure your Windows machine meets these minimum requirements:

- **Operating System**: Windows 10 (64-bit) or Windows 11 (64-bit).
- **Node.js**: Version 18.0.0 or higher (LTS v20+ recommended).
- **Git for Windows**: Version 2.40+ (includes OpenSSL CLI tools).
- **(Optional) MySQL Server**: Version 8.0 or MariaDB 10.5+ (if using a dedicated standalone MySQL database server).
- **User Permissions**: Administrator access (required for Firewall configuration, global PM2 installation, and SSL CA store registration).
- **Local Network**: Wi-Fi or Ethernet router connecting the host Windows PC and cashier tablets/phones on the same local network subnet.

---

## 🚀 3. Option 1: 1-Click Automated Installation (Recommended)

TilePoint includes a fully automated installer batch file (**`setup-tilepoint.bat`**) that handles all dependencies, environment setup, local IP detection, certificate generation, firewall rules, asset compilation, and background server startup in one click.

### Step-by-Step 1-Click Execution:
1. Open your project folder (`C:\path\to\TilePoint`).
2. Right-click **`setup-tilepoint.bat`** and select **Run as Administrator**.
3. If prompted by Windows User Account Control (UAC), click **Yes**.
4. The automated script will perform these actions sequentially:
   - ✅ Verify and auto-install Git and Node.js LTS via `winget` if missing.
   - ✅ Execute `npm install` for project dependencies (including `express`, `alasql`, `mysql2`, `xlsx`, `lucide-react`, etc.).
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
2. Run `npm install` to download required packages (`express`, `alasql`, `mysql2`, `vite`, `dotenv`, `react`, `xlsx`, `lucide-react`, etc.):
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
3. Open `.env` in Notepad or VS Code and configure the parameters:
   ```env
   # Cryptographic secrets for signing offline branch sessions (Minimum 16 characters)
   VITE_SECURITY_SECRET="TilePointEnterpriseSecPass2026!"
   SECURITY_SECRET="TilePointEnterpriseSecPass2026!"

   # Optional Dedicated MySQL Server Configuration
   MYSQL_HOST="localhost"
   MYSQL_PORT=3306
   MYSQL_USER="root"
   MYSQL_PASSWORD=""
   MYSQL_DATABASE="tilepoint_db"

   # Bound server address (Replace with your actual local IP)
   APP_URL="https://192.168.1.38:3000"

   # Optional Google AI Studio key for receipt auditing and AI features
   GEMINI_API_KEY=""
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

### Step 2.5: Configure MySQL Database (Optional Dedicated SQL Server)

If you are using a dedicated MySQL 8.0+ server instead of the built-in embedded AlaSQL engine:

1. Log into your MySQL Command Line or MySQL Workbench:
   ```sql
   CREATE DATABASE IF NOT EXISTS tilepoint_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```
2. Import the database schema from `schema.sql`:
   ```cmd
   mysql -u root -p tilepoint_db < schema.sql
   ```
3. Update `.env` with your MySQL credentials (`MYSQL_HOST`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`).

*Note: If MySQL is not configured or goes offline, TilePoint automatically seamlessly uses its embedded AlaSQL engine without crashing!*

---

### Step 2.6: Configure Windows Defender Firewall for Ports 3000 & 3306

By default, Windows Defender Firewall blocks incoming connections from mobile phones and cashier tablets. You must allow inbound traffic on TCP Port 3000 (and Port 3306 if accessing MySQL from remote PCs).

#### Fast PowerShell Command (Run as Administrator):
```powershell
New-NetFirewallRule -DisplayName "TilePoint Server Port 3000" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "TilePoint MySQL Port 3306" -Direction Inbound -LocalPort 3306 -Protocol TCP -Action Allow
```

#### Manual Control Panel Method:
1. Press `Win + R`, type `wf.msc` and press Enter (*Windows Defender Firewall with Advanced Security*).
2. Click **Inbound Rules** in the left sidebar, then click **New Rule...** on the right.
3. Choose **Port** -> click Next.
4. Choose **TCP** and type `3000, 3306` under **Specific local ports** -> click Next.
5. Choose **Allow the connection** -> click Next.
6. Ensure **Domain**, **Private**, and **Public** are checked -> click Next.
7. Name the rule `TilePoint Server Ports 3000 & 3306` and click **Finish**.

---

### Step 2.7: Build Production Client Assets

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

### Step 2.8: Launch and Manage Server under PM2

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

## 🧹 5. Database Management, Migration & Resetting to Setup Wizard State

### Wiping Database & Returning to Setup Wizard Installer

If you need to perform a complete system reset, flush all data, or return TilePoint to its fresh **Setup Wizard (Installer)** state:

#### Method A: Admin Settings UI
1. Navigate to **System Settings** -> **Database Operations**.
2. Click **Truncate Entire System Database (Clean Slate)**.
3. Confirm the security prompt. The system will reset `tp_is_configured` to `false` and automatically redirect to the **Setup & Installer Wizard**.

#### Method B: Command Line API Truncate Call
Execute this curl / fetch command to reset the database to a clean slate state:
```cmd
node -e "fetch('http://127.0.0.1:3000/api/db/truncate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'all' }) }).then(r => r.json()).then(console.log);"
```

#### Method C: Reset Transactions Only (Preserve Store Setup & Users)
To clear sales, shifts, purchase orders, and audit logs while preserving store setup, branches, and user accounts:
```cmd
node -e "fetch('http://127.0.0.1:3000/api/db/truncate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'transactions' }) }).then(r => r.json()).then(console.log);"
```

---

### Migrating Data between JSON / AlaSQL and MySQL

TilePoint includes an automated migration utility (`scripts/migrateJsonToMysql.js`) to migrate offline JSON/AlaSQL snapshots directly into a live MySQL server:

1. Ensure MySQL is configured in `.env`.
2. Execute the migration script in Command Prompt:
   ```cmd
   node scripts/migrateJsonToMysql.js
   ```
3. The utility will automatically create all missing MySQL tables, insert all historical branch, inventory, customer, and sales records, and verify data integrity.

---

## 📱 6. Connecting Mobile Cashier Terminals & Staff Devices

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

## 🔒 7. Preventing Disconnections: Static IP & Router DHCP Setup

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

## 🔐 8. Achieving Trusted HTTPS (Zero Security Warnings)

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

## 🌐 9. Enterprise Nginx Reverse Proxy Setup (Optional)

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

## ❓ 10. Comprehensive Step-by-Step Troubleshooting Guide

---

### Troubleshooting EADDRINUSE (Port 3000 or 3306 Busy)

**Symptom**: Server logs show `Error: listen EADDRINUSE: address already in use 0.0.0.0:3000` or `server.js` fails to start.

**Cause**: Another application or orphaned Node process is running on Port 3000 (or Port 3306).

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
1. **Multiple Dev Server Instances**: Port 24678 is Vite's default Hot Module Replacement (HMR) WebSocket port. Another `node.exe` or `vite` process is already running in a different terminal or background window.
2. **Running in Dev Mode without NODE_ENV=production**: When `server.js` runs in development mode (`NODE_ENV !== 'production'`), it mounts Vite's dev server middleware which attempts to open HMR on port 24678.

**Step-by-Step Fix**:

1. **Option A — Kill Orphaned Node Processes (Quickest)**:
   Open Command Prompt (CMD) as Administrator and run:
   ```cmd
   taskkill /IM node.exe /F
   ```
2. **Option B — Run in Production Mode (Recommended for Store Terminals)**:
   Compile production static assets and run in `production` mode so Vite HMR is disabled:
   ```cmd
   npm run build
   ```
   *In Command Prompt (CMD):*
   ```cmd
   set NODE_ENV=production && node server.js
   ```
   *In PM2:*
   ```cmd
   pm2 start server.js --name "tilepoint-hq-server" --env production
   ```

---

### Troubleshooting MySQL Connection Errors (ER_ACCESS_DENIED_ERROR / ECONNREFUSED)

**Symptom**: Server output shows `[Database] MySQL connection lost (ECONNREFUSED). Running on AlaSQL embedded MySQL Engine.` or authentication failure.

**Cause**: MySQL service is not running on Port 3306 or `.env` credentials do not match MySQL root/user password.

**Step-by-Step Fix**:
1. Check if MySQL service is running in Windows Services:
   - Press `Win + R`, type `services.msc`, locate **MySQL** or **MySQL80**, and click **Start**.
2. Verify credentials in `.env` (`MYSQL_HOST`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`).
3. If MySQL is unavailable, TilePoint will automatically safely operate using its embedded **AlaSQL** relational engine without data loss.

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

To get a **green padlock / "Connection is secure"** on all phones, tablets, and cashier PCs without any warning messages, follow these steps using `mkcert`:

#### Phase 1: Generate Trusted SSL Certificate on Host PC

1. **Install `mkcert` via `winget` or PowerShell (Administrator)**:
   ```cmd
   winget install FiloSottile.mkcert
   ```
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

4. **Restart TilePoint Server**:
   ```cmd
   pm2 restart tilepoint-hq-server
   ```

---

#### Phase 2: Install Root CA on Client Devices (Removes "Not Secure" Badge)

Copy and install the `rootCA.pem` file created in Phase 1 onto each device once.

##### 📍 Finding your `rootCA.pem` file:
Run this command in CMD on the host PC:
```cmd
mkcert -CAROOT
```
*(Typical path: `C:\Users\YourUsername\AppData\Local\mkcert\rootCA.pem`)*.

##### 💻 On Windows Cashier PCs:
1. Copy `rootCA.pem` to the cashier PC.
2. Double-click `rootCA.pem` -> click **Install Certificate...**
3. Select **Local Machine** -> click Next.
4. Select **Place all certificates in the following store** -> click **Browse...**
5. Choose **Trusted Root Certification Authorities** -> click OK -> click Next -> click **Finish**.

##### 📱 On Apple iPhones & iPads (iOS / iPadOS):
1. Send `rootCA.pem` to your iPhone/iPad via AirDrop or local download.
2. Open **Settings** -> tap **Profile Downloaded** -> tap **Install**.
3. Go to **Settings** -> **General** -> **About** -> **Certificate Trust Settings**.
4. Enable full trust for **mkcert development CA**.

##### 🤖 On Android Phones & Tablets:
1. Copy `rootCA.pem` to Android storage.
2. Open Android **Settings** -> **Security & Privacy** -> **More Security Settings** -> **Encryption & Credentials**.
3. Tap **Install a certificate** -> choose **CA certificate** -> select `rootCA.pem`.

---

### Troubleshooting ERR_SSL_PROTOCOL_ERROR

**Symptom**: Browser displays `ERR_SSL_PROTOCOL_ERROR` or PM2 logs report `ERR_OSSL_UNSUPPORTED`.

**Step-by-Step Fix**:
1. Stop the server: `pm2 stop tilepoint-hq-server`
2. Delete `key.pem` and `cert.pem` from the project root directory.
3. Re-generate certificate files using PowerShell:
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process -Force
   .\generate-certs.ps1
   ```
4. Restart PM2: `pm2 restart tilepoint-hq-server`

---

### Troubleshooting Rollup failed to resolve import "xlsx"

**Symptom**: Executing `npm run build` fails with: `Rollup failed to resolve import "xlsx"`.

**Step-by-Step Fix**:
1. Install `xlsx` package:
   ```cmd
   npm install xlsx
   ```
2. Re-run `npm run build`.

---

### Troubleshooting Vite / esbuild Transform Errors

**Symptom**: Build fails with `[vite:esbuild] Transform failed with 1 error`.

**Step-by-Step Fix**:
1. Run `npm run lint` to identify syntax errors.
2. Fix missing brackets or exports in the flagged source file.
3. Re-run `npm run build`.

---

### Troubleshooting "Server unable to commit configuration records"

**Symptom**: Saving store settings or admin credentials in the UI displays an error notice.

**Step-by-Step Fix**:
1. Check PM2 server status: `pm2 status`.
2. Test backend accessibility directly in browser: Open `https://localhost:3000/api/db`.
3. Accept the browser SSL certificate exception if prompted.
4. Ensure Firewall rule for TCP Port 3000 is active.

---

### Troubleshooting PowerShell Execution Policy Restrictions

**Symptom**: Running `.ps1` scripts gives: `generate-certs.ps1 cannot be loaded because running scripts is disabled`.

**Step-by-Step Fix**:
```powershell
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process -Force
.\generate-certs.ps1
```

---

### Troubleshooting Mobile Devices Unable to Connect ("Site Unreachable")

**Symptom**: Staff phones or tablets show `ERR_CONNECTION_TIMED_OUT` or `Server Unreachable`.

**Step-by-Step Diagnostic Checklist**:
1. **Verify Server is Listening**: `netstat -ano | findstr :3000`
2. **Check Windows Network Profile**: Change network profile from **Public** to **Private** in Windows Settings.
3. **Allow Port 3000 Firewall Rule**: Run `New-NetFirewallRule -DisplayName "TilePoint Port 3000" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow` in PowerShell as Admin.
4. **Verify Host IP**: Use physical Wi-Fi/Ethernet IPv4 address, not virtual WSL or Docker IPs.
5. **Disable VPN & Cellular Data**: Turn off cellular data on phones and active VPNs.
6. **Disable Router AP Isolation**: Turn off AP/Client Isolation in Wi-Fi router settings.

---

## 🛠️ 11. Useful Operational Commands Reference

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
| **Migrate Data to MySQL** | `node scripts/migrateJsonToMysql.js` | Project Root Directory |
| **Reset Database (Clean Slate)** | `node -e "fetch('http://127.0.0.1:3000/api/db/truncate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'all' }) }).then(r=>r.json()).then(console.log);"` | CMD / PowerShell |
| **Check Port 3000 Usage** | `netstat -ano \| findstr :3000` | CMD / PowerShell |
| **Kill Process on Port 3000**| `taskkill /PID <PID> /F` | CMD (Run as Admin) |
| **Check Local IP Address** | `ipconfig` | CMD / PowerShell |
| **Generate SSL Certs** | `.\generate-certs.ps1` | PowerShell |

---

*TilePoint Enterprise POS & Shared Database System — Deployment Documentation*
