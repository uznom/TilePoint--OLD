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
   - [Step 2.5: Configure MySQL Database & Import schema.sql](#step-25-configure-mysql-database--import-schemasql)
   - [Step 2.6: Configure Windows Defender Firewall for Ports 3000 & 3306](#step-26-configure-windows-defender-firewall-for-ports-3000--3306)
   - [Step 2.7: Build Production Client Assets](#step-27-build-production-client-assets)
   - [Step 2.8: Launch and Manage Server under PM2](#step-28-launch-and-manage-server-under-pm2)
   - [Step 2.9: 1-Click Launcher & Windows Auto-Start on Boot (start-tilepoint.bat)](#step-29-1-click-launcher--windows-auto-start-on-boot-start-tilepointbat)
5. [Database Architecture, Schema & Migration](#-5-database-architecture-schema--migration)
   - [5.1 Dual-Engine Architecture: MySQL 8.0+ & Embedded AlaSQL](#-51-dual-engine-architecture-mysql-80--embedded-alasql)
   - [5.2 MySQL schema.sql Structure & High-Performance Composite Indexes](#-52-mysql-schemasql-structure--high-performance-composite-indexes)
   - [5.3 Wiping Database & Returning to Setup Wizard Installer](#-53-wiping-database--returning-to-setup-wizard-installer)
   - [5.4 Migrating Data between JSON Snapshots and MySQL](#-54-migrating-data-between-json-snapshots-and-mysql)
6. [Hardware Setup: Thermal Printers, Barcode Scanners & Cash Drawers](#-6-hardware-setup-thermal-printers-barcode-scanners--cash-drawers)
7. [Connecting Mobile Cashier Terminals & Staff Devices](#-7-connecting-mobile-cashier-terminals--staff-devices)
8. [Preventing Disconnections: Static IP & Router DHCP Setup](#-8-preventing-disconnections-static-ip--router-dhcp-setup)
   - [Method A: Router DHCP IP Reservation (Recommended)](#method-a-router-dhcp-ip-reservation-recommended)
   - [Method B: Windows Static IP Assignment](#method-b-windows-static-ip-assignment)
9. [Achieving Trusted HTTPS (Zero Security Warnings)](#-9-achieving-trusted-https-zero-security-warnings)
   - [Method A: Local Trusted CA with mkcert](#method-a-local-trusted-ca-with-mkcert)
   - [Method B: Global Enterprise Domain via Cloudflare Tunnels](#method-b-global-enterprise-domain-via-cloudflare-tunnels)
10. [Enterprise Nginx Reverse Proxy Setup (Optional)](#-10-enterprise-nginx-reverse-proxy-setup-optional)
11. [Comprehensive Step-by-Step Troubleshooting Guide](#-11-comprehensive-step-by-step-troubleshooting-guide)
12. [Useful Operational Commands Reference](#-12-useful-operational-commands-reference)

---

## 🏗️ 1. System Overview & Architecture

TilePoint operates as a resilient, enterprise full-stack POS and ERP platform designed for hardware, tile retail, and multi-branch chain stores:

- **Central Server Node (`server.js`)**: Express.js server running on **Port 3000** with native HTTPS/TLS termination.
- **Dual-Engine Relational Database Architecture**:
  - **Tier 1 (Enterprise Dedicated Server)**: High-speed **MySQL 8.0+ / MariaDB 10.5+** connection pool (`mysql2/promise`) connecting to a dedicated MySQL instance on Port 3306 with 28 relational tables, indexed foreign keys, and composite indexes optimized for large datasets.
  - **Tier 2 (Zero-Config Embedded Fallback)**: In-memory **AlaSQL** relational SQL engine with full MySQL-compatible DDL schemas and atomic disk persistence (`server-db.json`) for instant, offline-capable standalone deployments without external database setup.
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
- **(Optional) MySQL Server**: Version 8.0 or MariaDB 10.5+ (if using a dedicated standalone MySQL database server; e.g. via XAMPP, Docker, or MySQL Community Server).
- **User Permissions**: Administrator access (required for Firewall configuration, global PM2 installation, and SSL CA store registration).
- **Local Network**: Wi-Fi or Ethernet router connecting the host Windows PC and cashier tablets/phones on the same local network subnet.

---

## 🚀 3. Option 1: 1-Click Automated Installation (Recommended)

TilePoint includes a fully automated installer batch file (**`setup-tilepoint.bat`**) that handles all dependencies, environment setup, local IP detection, certificate generation, firewall rules, asset compilation, desktop shortcut creation, and background server startup in one click.

### Step-by-Step 1-Click Execution:
1. Open your project folder (`C:\path\to\TilePoint`).
2. Right-click **`setup-tilepoint.bat`** and select **Run as Administrator**.
3. If prompted by Windows User Account Control (UAC), click **Yes**.
4. The automated script will perform these actions sequentially:
   - ✅ Verify and auto-install Git and Node.js LTS via `winget` or direct download if missing.
   - ✅ Execute `npm install` for project dependencies.
   - ✅ Detect your primary local IPv4 address (excluding WSL, Docker, and VirtualBox interfaces).
   - ✅ Create `.env` from `.env.example` with auto-generated security secrets and local IP binding.
   - ✅ Download `mkcert.exe` and generate trusted SSL certificates (`key.pem`, `cert.pem`) for `localhost`, `127.0.0.1`, and your local IP in the Windows Certificate Trust Store.
   - ✅ Add Inbound Firewall Rules in Windows Defender for TCP Ports 3000 (POS Server) and 3306 (MySQL Server).
   - ✅ Compile static production client assets (`npm run build`).
   - ✅ Create a Windows Desktop shortcut (**TilePoint POS**) for quick access.
   - ✅ Install and launch the server under PM2 process manager as `tilepoint-hq-server`.
   - ✅ Launch your default web browser to `https://<YOUR_LOCAL_IP>:3000` with launch choices for Chrome, Edge, and Firefox.

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

1. Open **Command Prompt** or **PowerShell** as **Administrator** in the root directory of TilePoint:
   ```cmd
   cd C:\path\to\TilePoint
   ```
2. Run `npm install` to download required packages (`express`, `alasql`, `mysql2`, `vite`, `dotenv`, `react`, `xlsx`, `lucide-react`, `motion`, etc.):
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
   # Cryptographic secrets for signing offline branch sessions (Minimum 32 characters)
   VITE_SECURITY_SECRET="<YOUR_STRONG_RANDOM_SECRET_AT_LEAST_32_CHARS>"
   SECURITY_SECRET="<YOUR_STRONG_RANDOM_SECRET_AT_LEAST_32_CHARS>"

   # Dedicated MySQL Server Configuration (Optional - embedded AlaSQL used if absent)
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

### Step 2.5: Configure MySQL Database & Import schema.sql

If you are using a dedicated MySQL 8.0+ server (e.g. XAMPP, MySQL Community Server, or Docker):

1. Start your MySQL service on Port 3306.
2. Create the database in MySQL:
   ```sql
   CREATE DATABASE IF NOT EXISTS tilepoint_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```
3. Import the complete 28-table schema with indexed foreign keys and composite indexes from `schema.sql`:
   ```cmd
   mysql -u root -p tilepoint_db < schema.sql
   ```
4. Verify `.env` matches your MySQL credentials (`MYSQL_HOST`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`).

*Note: If MySQL is not configured or goes offline, TilePoint automatically seamlessly uses its embedded AlaSQL engine with `server-db.json` persistence without crashing!*

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

---

### Step 2.8: Launch and Manage Server under PM2

PM2 keeps your server running 24/7 in the background and restarts it automatically if the PC reboots.

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

### Step 2.9: 1-Click Launcher & Windows Auto-Start on Boot (`start-tilepoint.bat`)

TilePoint includes a standalone **`start-tilepoint.bat`** script that allows cashiers, managers, and store staff to launch the system with a single click, or configure it to run automatically whenever the Windows PC powers on.

#### Features of `start-tilepoint.bat`:
1. **Local IPv4 Auto-Detection**: Dynamically queries PowerShell (`Get-NetIPAddress`) to identify your active local area network (LAN) IP address (e.g., `192.168.1.100`), ignoring internal virtual adapters (Docker, WSL, VirtualBox).
2. **Server Port Check & Auto-Start**: Probes TCP Port 3000. If the TilePoint server is already running, it reuses the active connection. If not running, it automatically boots `server.js` in the background (or via PM2).
3. **Automated Web Browser Launch**: Automatically opens your default system browser (Chrome, Edge, or Firefox) directly to `https://<YOUR_LOCAL_IP>:3000` (or `http://` if SSL is not active).

#### How to Configure TilePoint to Auto-Start on Windows Boot:

##### Method A: Windows Startup Folder (Recommended for Desktop PCs & Laptops)
1. Press `Win + R` on your keyboard, type `shell:startup` and press Enter.
   *(This opens `C:\Users\<User>\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup`)*
2. Right-click inside the folder, choose **New** -> **Shortcut**.
3. Target location: Browse to your TilePoint installation directory and select `start-tilepoint.bat` (e.g., `C:\TilePoint\start-tilepoint.bat`).
4. Name the shortcut `TilePoint POS Auto-Start` and click **Finish**.

##### Method B: Windows Task Scheduler (Runs as System Service before User Login)
1. Press `Win + R`, type `taskschd.msc` and press Enter (*Task Scheduler*).
2. In the right panel, click **Create Basic Task...**
3. **Name**: `TilePoint POS Startup Service`.
4. **Trigger**: Select **When the computer starts** or **When I log on**.
5. **Action**: Select **Start a program**.
6. **Program/script**: Click Browse and select `C:\path\to\TilePoint\start-tilepoint.bat`.
7. **Start in (optional)**: Enter `C:\path\to\TilePoint` *(Crucial: set this so relative path resolution loads `server.js` and certificates accurately)*.
8. Click **Finish**.

---

## 💾 5. Database Architecture, Schema & Migration

### 🗄️ 5.1 Dual-Engine Architecture: MySQL 8.0+ & Embedded AlaSQL

TilePoint operates with an enterprise dual-engine persistence layer:
1. **Primary Enterprise Engine (MySQL 8.0+)**: Connects over TCP 3306 using connection pooling (`mysql2/promise`). Supports concurrent branch synchronization, high-volume transactions, and foreign key integrity.
2. **Resilient Embedded Engine (AlaSQL)**: If MySQL is not present or temporarily offline, TilePoint's in-memory relational SQL engine executes all operations with zero configuration and persists atomic snapshots to `server-db.json`.

---

### 📐 5.2 MySQL schema.sql Structure & High-Performance Composite Indexes

The database schema (`schema.sql`) contains 28 production-grade tables with:
- Strict UTF-8 collation (`utf8mb4_unicode_ci`).
- Foreign keys with `ON DELETE CASCADE` or `ON DELETE SET NULL` for referential integrity.
- Optimized composite indexes capped at maximum 4 columns per index to comply with strict query optimizer constraints while maximizing join and filter speed on large inventories.

#### Core Tables Summary:
- `tp_users`: Staff, cashiers, managers, administrators, credentials, roles, PIN hashes.
- `tp_branches`: Store locations, regional assignments, tax IDs.
- `tp_products`: Tile dimensions, surfaces, categories, barcodes, stock levels, unit costs, pricing tiers.
- `tp_inventory_batches`: Lot tracking, shade codes, batch identifiers, expiration dates.
- `tp_sales` & `tp_sale_items`: Invoices, line items, payment methods, cashier shifts, customer assignments.
- `tp_stock_movements`: Immutable double-entry inventory ledger (sales, adjustments, damage, transfers).
- `tp_suppliers`, `tp_purchase_orders` & `tp_po_items`: Sourcing, requisitions, order status, vendor items.
- `tp_transmittals` & `tp_deliveries`: Inter-branch shipments, dispatch notes, logistics tracking.
- `tp_customers`, `tp_expenses`, `tp_audit_logs`, `tp_cashier_shifts`: Financial and operational logging.

---

### 🔄 5.3 Wiping Database & Returning to Setup Wizard Installer

If you need to perform a complete system reset, flush all data, or return TilePoint to its fresh **Setup Wizard (Installer)** state:

#### Method A: Admin Settings UI
1. Navigate to **System Settings** -> **Database Operations**.
2. Click **Truncate Entire System Database (Clean Slate)**.
3. Confirm the security prompt. The system will reset `tp_is_configured` to `false` and automatically redirect to the **Setup & Installer Wizard**.

#### Method B: Command Line API Truncate Call
Execute this fetch command to reset the database to a clean slate state (requires Admin Authorization token or boot with `ALLOW_LOCAL_RESET=true`):
```cmd
node -e "fetch('http://127.0.0.1:3000/api/db/truncate', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer <ADMIN_TOKEN>' }, body: JSON.stringify({ mode: 'all', confirmation: 'RESET' }) }).then(r => r.json()).then(console.log);"
```

#### Method C: Reset Transactions Only (Preserve Store Setup & Users)
To clear sales, shifts, and purchase orders while preserving store setup, branches, and user accounts:
```cmd
node -e "fetch('http://127.0.0.1:3000/api/db/truncate', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer <ADMIN_TOKEN>' }, body: JSON.stringify({ mode: 'transactions', confirmation: 'RESET' }) }).then(r => r.json()).then(console.log);"
```

---

### 🔀 5.4 Migrating Data between JSON Snapshots and MySQL

TilePoint includes an automated migration utility (`scripts/migrateJsonToMysql.js`) to migrate offline JSON snapshots into live MySQL database tables:

1. Ensure MySQL is running and configured in `.env`.
2. Execute the migration script in Command Prompt:
   ```cmd
   node scripts/migrateJsonToMysql.js
   ```
3. The utility uses idempotent `ON DUPLICATE KEY UPDATE` queries to safely migrate all branches, users, products, sales, and inventory records.

---

## 🖨️ 6. Hardware Setup: Thermal Printers, Barcode Scanners & Cash Drawers

### 🧾 Thermal Receipt Printer Configuration (58mm / 80mm ESC/POS)
TilePoint includes dedicated thermal print layouts engineered for crisp, solid-black thermal output without grey tone washouts:
1. **Windows Printer Driver**:
   - Install the official ESC/POS driver for your 58mm or 80mm thermal receipt printer (e.g. Xprinter, Epson TM-T88, POS-80, Rongta).
   - Set the default paper size to **80mm x 297mm** (or **58mm x 210mm**).
2. **Browser Print Settings (One-Time Setup)**:
   - In Google Chrome or Microsoft Edge print dialog:
     - **Destination**: Select your Thermal Receipt Printer.
     - **Margins**: Set to **None** or **Minimum**.
     - **Headers and Footers**: **Uncheck** (removes URL and date stamps).
     - **Background Graphics**: **Check** (ensures solid black line dividers render).
     - **Scale**: Set to **Default** (100%).

### 🔫 Barcode Scanner Configuration (1D / 2D QR)
- **USB / Bluetooth Wireless Scanners**: Any standard plug-and-play barcode scanner operating in **HID Keyboard Wedge mode** works automatically with zero driver installation.
- In POS Billing: Simply scan any barcode or SKU; the fast product search immediately identifies and adds the item to the billing basket.
- **Mobile Camera Scanning**: When accessing via smartphone or tablet over HTTPS, tap the camera icon in the search bar to scan physical barcodes using your device camera (`getUserMedia`).

### 💵 Cash Drawer Kick Trigger (RJ11 / RJ12)
- Connect the RJ11 cable from the bottom of your cash drawer into the **DK (Drawer Kick) Port** on the back of your thermal receipt printer.
- In Windows Printer Properties -> **Device Settings**, set **Cash Drawer** to **Open Before Printing** or **Open After Printing**.

---

## 📱 7. Connecting Mobile Cashier Terminals & Staff Devices

Once the server is running on your Windows host PC, staff tablets and mobile phones can connect:

1. Connect the staff device to the **same Wi-Fi router** as the Windows host PC.
2. Find the host PC's local IP address by running `ipconfig` in CMD on the host PC (e.g. `192.168.1.38`).
3. On the staff phone or tablet, open Google Chrome, Safari, or Microsoft Edge and enter:
   ```
   https://192.168.1.38:3000
   ```
4. **Handling Local SSL Certificate**:
   - If using `mkcert` with root CA installed (see Section 9), the connection opens with a green padlock.
   - If using standard self-signed certificate: Tap **Advanced** -> tap **Proceed to 192.168.1.38 (unsafe)**.
5. The TilePoint POS terminal interface will load and sync in real-time.

---

## 🔒 8. Preventing Disconnections: Static IP & Router DHCP Setup

### The Problem: DHCP IP Address Rotation
Wi-Fi routers dynamically change IP addresses whenever devices reconnect or the router restarts. If your Windows host PC changes IP from `192.168.1.38` to `192.168.1.45`, cashier tablets will lose connection.

---

### Method A: Router DHCP IP Reservation (Recommended)

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

## 🔐 9. Achieving Trusted HTTPS (Zero Security Warnings)

### Method A: Local Trusted CA with mkcert

`mkcert` creates a local Certificate Authority (CA) and registers it directly into the Windows System Trust Store.

1. **Install Local CA to Windows Store**:
   Open PowerShell as Administrator in the project directory and run:
   ```powershell
   .\mkcert.exe -install
   ```
2. **Generate Trusted Certificates**:
   ```powershell
   .\mkcert.exe -key-file key.pem -cert-file cert.pem localhost 127.0.0.1 192.168.1.150
   ```
   *(Replace `192.168.1.150` with your actual static IP).*
3. **Restart PM2 server**:
   ```cmd
   pm2 restart tilepoint-hq-server
   ```
4. **Clear Browser Cache / Restart Browser**:
   Restart Chrome or Edge (`chrome://restart`). The connection will show a green security lock on the host PC!

---

### Method B: Global Enterprise Domain via Cloudflare Tunnels

This assigns your local Windows server a globally trusted, official domain name (e.g. `https://pos.yourstore.com`) with automatic SSL management by Cloudflare.

1. Create a free account at [Cloudflare.com](https://www.cloudflare.com) and add your custom domain.
2. In Cloudflare Dashboard, go to **Zero Trust** -> **Networks** -> **Tunnels** -> **Create a Tunnel**.
3. Name your tunnel `tilepoint-hq` and download the Windows connector installer (`cloudflared`).
4. Install `cloudflared` on your host PC as a Windows background service.
5. Route your chosen subdomain (e.g. `pos.yourstore.com`) to local HTTP service: `localhost:3000`.

---

## 🌐 10. Enterprise Nginx Reverse Proxy Setup (Optional)

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

---

## ❓ 11. Comprehensive Step-by-Step Troubleshooting Guide

### Troubleshooting EADDRINUSE (Port 3000 or 3306 Busy)
1. Find the process occupying Port 3000:
   ```cmd
   netstat -ano | findstr :3000
   ```
2. Identify the PID number at the far right (e.g. `4812`).
3. Terminate the process:
   ```cmd
   taskkill /PID 4812 /F
   ```
4. Restart the server under PM2:
   ```cmd
   pm2 restart tilepoint-hq-server
   ```

---

### Troubleshooting MySQL Connection Errors (ECONNREFUSED)
1. Check if MySQL service is running in Windows Services: Press `Win + R`, type `services.msc`, locate **MySQL** or **MySQL80**, and click **Start**.
2. Verify credentials in `.env` (`MYSQL_HOST`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`).
3. Note: If MySQL is unavailable, TilePoint will automatically safely operate using its embedded **AlaSQL** relational engine without crashing.

---

### Troubleshooting ERR_SSL_PROTOCOL_ERROR
1. Stop the server: `pm2 stop tilepoint-hq-server`
2. Delete `key.pem` and `cert.pem` from the project root directory.
3. Re-generate certificate files using PowerShell:
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process -Force
   .\generate-certs.ps1
   ```
4. Restart PM2: `pm2 restart tilepoint-hq-server`

---

### Troubleshooting Mobile Devices Unable to Connect
1. **Verify Server is Listening**: `netstat -ano | findstr :3000`
2. **Check Windows Network Profile**: Change network profile from **Public** to **Private** in Windows Settings.
3. **Allow Port 3000 Firewall Rule**: Run `New-NetFirewallRule -DisplayName "TilePoint Port 3000" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow` in PowerShell as Admin.
4. **Disable Router AP Isolation**: Turn off AP/Client Isolation in Wi-Fi router settings.

---

## 🛠️ 12. Useful Operational Commands Reference

| Operation | Command | Execution Context |
| :--- | :--- | :--- |
| **Run 1-Click Installer** | `setup-tilepoint.bat` | Windows CMD (Run as Admin) |
| **Run 1-Click Launcher** | `start-tilepoint.bat` | Windows CMD / Desktop Shortcut |
| **Check PM2 Status** | `pm2 status` | CMD / PowerShell |
| **View Real-Time Logs** | `pm2 logs tilepoint-hq-server` | CMD / PowerShell |
| **Restart Server** | `pm2 restart tilepoint-hq-server` | CMD / PowerShell |
| **Stop Server** | `pm2 stop tilepoint-hq-server` | CMD / PowerShell |
| **Install Dependencies** | `npm install` | Project Root Directory |
| **Verify Code & Types** | `npm run lint` | Project Root Directory |
| **Rebuild Client Bundle** | `npm run build` | Project Root Directory |
| **Import MySQL Schema** | `mysql -u root -p tilepoint_db < schema.sql` | CMD / Terminal |
| **Migrate Data to MySQL** | `node scripts/migrateJsonToMysql.js` | Project Root Directory |
| **Reset Database (Clean Slate)** | `node -e "fetch('http://127.0.0.1:3000/api/db/truncate', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer <TOKEN>' }, body: JSON.stringify({ mode: 'all', confirmation: 'RESET' }) }).then(r=>r.json()).then(console.log);"` | CMD / PowerShell |
| **Check Port 3000 Usage** | `netstat -ano \| findstr :3000` | CMD / PowerShell |
| **Kill Process on Port 3000**| `taskkill /PID <PID> /F` | CMD (Run as Admin) |
| **Check Local IP Address** | `ipconfig` | CMD / PowerShell |
| **Generate SSL Certs** | `.\generate-certs.ps1` | PowerShell |

