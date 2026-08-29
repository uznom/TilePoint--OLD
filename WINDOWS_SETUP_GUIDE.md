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
   # Cryptographic secrets for signing offline branch sessions (Minimum 16 characters)
   VITE_SECURITY_SECRET="TilePointEnterpriseSecPass2026!"
   SECURITY_SECRET="TilePointEnterpriseSecPass2026!"

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

---

*TilePoint Enterprise POS & Shared Database System — Deployment Documentation*


---

## 🏗️ 1. System Overview & Architecture

TilePoint operates as a resilient, enterprise full-stack POS and ERP platform designed for hardware and tile retail stores:

- **Central Server Node (`server.js`)**: Express.js server running on **Port 3000** with native HTTPS termination.
- **Triple-Tier Relational Database Engine Architecture**:
  - **Primary Local Engine**: **`better-sqlite3` High-Performance Native SQLite Engine** writing to `tilepoint_sqlite.db` with WAL (Write-Ahead Logging) mode (`journal_mode = WAL`), indexed queries, and single-file ACID transactional safety.
  - **In-Memory Query Engine**: Integrated **AlaSQL** relational SQL engine with 28 fully MySQL-compatible table schemas (`CREATE TABLE IF NOT EXISTS`) and atomic JSON snapshot persistence (`server-db.json`) for zero-config offline standalone operations.
  - **Enterprise Cloud/Remote Pool**: Optional **MySQL 8.0+** Connection Pool (`mysql2/promise`) connecting to a dedicated MySQL Server on Port 3306 for multi-branch corporate synchronization.
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
   - ✅ Execute `npm install` for project dependencies and rebuild `better-sqlite3` native C++ add-ons.
   - ✅ Execute `better-sqlite3` native engine verification test to confirm binary ABI compatibility.
   - ✅ Detect your primary local IPv4 address (excluding WSL, Docker, and VirtualBox interfaces).
   - ✅ Create `.env` from `.env.example` with auto-generated security secrets and local IP binding.
   - ✅ Download `mkcert.exe` and generate trusted SSL certificates (`key.pem`, `cert.pem`) for `localhost`, `127.0.0.1`, and your local IP in the Windows Certificate Trust Store.
   - ✅ Add Inbound Firewall Rules in Windows Defender for TCP Ports 3000 (POS Server) and 3306 (MySQL Server).
   - ✅ Compile static production client assets (`npm run build`).
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
2. Run `npm install` to download required packages (`better-sqlite3`, `express`, `alasql`, `mysql2`, `vite`, `dotenv`, `react`, `xlsx`, `lucide-react`, etc.):
   ```cmd
   npm install
   ```

> ⚠️ **Important Note on `better-sqlite3` Native Add-on for Windows**:
> `better-sqlite3` is a high-performance native C++ Node.js add-on. `npm install` automatically downloads official precompiled binary wheels (`better_sqlite3.node`) for 64-bit Windows and Node LTS. If prebuilt binaries cannot be retrieved (e.g. strict corporate proxy, offline environment, or non-standard Node ABI), `npm` will attempt a native build using `node-gyp`. If building from source fails, see [Troubleshooting Visual C++ Build Tools](#troubleshooting-node-gyp--windows-visual-c-build-tools-compilation-failures).

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

### Step 2.9: 1-Click Launcher & Windows Auto-Start on Boot (`start-tilepoint.bat`)

TilePoint includes a standalone **`start-tilepoint.bat`** script that allows cashiers, managers, and store staff to launch the system with a single click, or configure it to run automatically whenever the Windows PC powers on.

#### Features of `start-tilepoint.bat`:
1. **Local IPv4 Auto-Detection**: Dynamically queries PowerShell (`Get-NetIPAddress`) to identify your active local area network (LAN) IP address (e.g., `192.168.1.100`), ignoring internal virtual adapters (Docker, WSL, VirtualBox).
2. **Server Port Check & Auto-Start**: Probes TCP Port 3000. If the TilePoint server is already running, it reuses the active connection. If not running, it automatically boots `server.js` in the background (or via PM2).
3. **Automated Web Browser Launch**: Automatically opens your default system browser (Chrome, Edge, or Firefox) directly to `http://<YOUR_LOCAL_IP>:3000` or `https://<YOUR_LOCAL_IP>:3000` (when SSL certificates are present).

#### How to Configure TilePoint to Auto-Start on Windows Boot:

##### Method A: Windows Startup Folder (Recommended for Desktop PCs & Laptops)
1. Press `Win + R` on your keyboard, type `shell:startup` and press Enter.
   *(This opens the Windows user startup directory: `C:\Users\<User>\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup`)*
2. Right-click inside the folder, choose **New** -> **Shortcut**.
3. Target location: Browse to your TilePoint installation directory and select `start-tilepoint.bat` (e.g., `C:\Users\USER\Documents\GitHub\TilePoint\start-tilepoint.bat`).
4. Name the shortcut `TilePoint POS Auto-Start` and click **Finish**.
5. **Result**: Whenever Windows powers on or logs in, TilePoint will automatically initialize the server, detect your IP address, and launch the POS interface in your browser without requiring manual terminal commands!

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

## 🧹 5. Database Management, Migration & Resetting to Setup Wizard State

### 💾 5.1 `better-sqlite3` Database Architecture & File Layout

TilePoint utilizes **`better-sqlite3`** as its high-speed local persistent database engine.

- **Primary Database File**: `tilepoint_sqlite.db` in the project root folder.
- **WAL Journaling Files**:
  - `tilepoint_sqlite.db-wal` (Write-Ahead Log containing active uncommitted/committed transaction logs).
  - `tilepoint_sqlite.db-shm` (Shared Memory index file for multi-threaded read/write synchronization).
- **WAL Journaling Configuration**: `journal_mode = WAL` and `synchronous = NORMAL` are enabled automatically for concurrent performance without blocking read operations during receipt checkout.
- **Self-Healing Table Schemas**: At server boot, `server.js` executes `ensureSqliteTable()` across all 28 relational tables to verify columns, append missing fields, and apply indexed lookups (`CREATE INDEX IF NOT EXISTS`).

#### Backing Up the SQLite Database:
1. Stop the PM2 server process: `pm2 stop tilepoint-hq-server`
2. Copy `tilepoint_sqlite.db`, `tilepoint_sqlite.db-wal`, and `tilepoint_sqlite.db-shm` to your backup directory or USB drive:
   ```cmd
   copy tilepoint_sqlite.db C:\Backups\tilepoint_sqlite_%date:~-4,4%%date:~-10,2%%date:~-7,2%.db
   ```
3. Restart the server: `pm2 restart tilepoint-hq-server`

---

### 🧪 5.2 `better-sqlite3` Diagnostic & Verification Protocol (Testing If Working)

To verify whether `better-sqlite3` is compiled properly, loaded without error, actively writing to disk, and handling queries in real-time, execute these 5 diagnostic tests:

#### Test 1: Direct Node.js Native Add-on Load & Version Check
Run this quick command in Command Prompt or PowerShell:
```cmd
node -e "import Database from 'better-sqlite3'; const db = new Database(':memory:'); console.log('✅ better-sqlite3 loaded! SQLite Version:', db.prepare('SELECT sqlite_version() AS v').get().v);"
```
*Expected Output:* `✅ better-sqlite3 loaded! SQLite Version: 3.x.x`  
*(If this fails with `Could not locate the bindings file` or `NODE_MODULE_VERSION mismatch`, see Section 10 troubleshooting below).*

#### Test 2: In-Memory Read/Write Transaction Test
Execute a real atomic transaction test:
```cmd
node -e "import Database from 'better-sqlite3'; import fs from 'fs'; const db = new Database('test_diag.db'); db.exec('CREATE TABLE test (id INT, val TEXT)'); db.prepare('INSERT INTO test VALUES (?, ?)').run(1, 'TilePoint OK'); console.log('✅ SQLite Write/Read Test:', db.prepare('SELECT * FROM test').get()); db.close(); fs.unlinkSync('test_diag.db');"
```
*Expected Output:* `✅ SQLite Write/Read Test: { id: 1, val: 'TilePoint OK' }`

#### Test 3: Check Server Boot Console Log Output
Start server or inspect PM2 logs:
```cmd
pm2 logs tilepoint-hq-server --lines 50
```
Look for the startup log entry:
```
[Database Engine] better-sqlite3 Local Persistent SQLite Engine initialized successfully at: C:\...\TilePoint\tilepoint_sqlite.db
```

#### Test 4: Live HTTP/HTTPS API Status Endpoint Verification
Query the live `/api/db/sqlite-status` endpoint in browser (`http://127.0.0.1:3000/api/db/sqlite-status`) or via Command Prompt:
```cmd
node -e "fetch('http://127.0.0.1:3000/api/db/sqlite-status').then(r => r.json()).then(console.log);"
```
*Expected JSON Response:*
```json
{
  "success": true,
  "engine": "better-sqlite3",
  "dbPath": "C:\\path\\to\\TilePoint\\tilepoint_sqlite.db",
  "sizeFormatted": "0.85 MB",
  "totalTables": 29,
  "totalRecords": 1420,
  "journalMode": "WAL"
}
```

#### Test 5: Verify Disk File & Journal Artifact Creation
Check if `tilepoint_sqlite.db`, `tilepoint_sqlite.db-wal`, and `tilepoint_sqlite.db-shm` exist in the root directory:
```cmd
dir tilepoint_sqlite*
```
*If all files exist and size is > 0 KB, `better-sqlite3` is fully functional and actively persisting POS data.*

---

### 🔄 5.3 Wiping Database & Returning to Setup Wizard Installer

If you need to perform a complete system reset, flush all data, or return TilePoint to its fresh **Setup Wizard (Installer)** state:

#### Method A: Admin Settings UI
1. Navigate to **System Settings** -> **Database Operations**.
2. Click **Truncate Entire System Database (Clean Slate)**.
3. Confirm the security prompt. The system will reset `tp_is_configured` to `false` and automatically redirect to the **Setup & Installer Wizard**.

#### Method B: Command Line API Truncate Call
Execute this curl / fetch command to reset the database to a clean slate state (requires Admin Authorization token or boot with `ALLOW_LOCAL_RESET=true`):
```cmd
node -e "fetch('http://127.0.0.1:3000/api/db/truncate', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer <ADMIN_TOKEN>' }, body: JSON.stringify({ mode: 'all', confirmation: 'RESET' }) }).then(r => r.json()).then(console.log);"
```

#### Method C: Reset Transactions Only (Preserve Store Setup & Users)
To clear sales, shifts, and purchase orders while preserving store setup, branches, and user accounts:
```cmd
node -e "fetch('http://127.0.0.1:3000/api/db/truncate', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer <ADMIN_TOKEN>' }, body: JSON.stringify({ mode: 'transactions', confirmation: 'RESET' }) }).then(r => r.json()).then(console.log);"
```

---

### 🔀 5.4 Migrating Data between JSON / AlaSQL, SQLite, and MySQL

TilePoint includes automated sync endpoints and a migration utility (`scripts/migrateJsonToMysql.js`) to migrate offline JSON/AlaSQL snapshots into SQLite and live MySQL servers:

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

### 🔨 Troubleshooting `better-sqlite3` Native Binary Missing (`better_sqlite3.node`)

**Symptom**: Server fails to start with:
`Error: Could not locate the bindings file. Tried: ...\node_modules\better-sqlite3\build\Release\better_sqlite3.node`

**Cause**: The compiled C++ binary add-on (`better_sqlite3.node`) was not generated or was moved during node_modules installation.

**Step-by-Step Fix**:
1. Open Command Prompt as Administrator in project root.
2. Recompile `better-sqlite3` for your current Node.js runtime:
   ```cmd
   npm rebuild better-sqlite3
   ```
3. If `npm rebuild` does not solve it, force re-install without source build:
   ```cmd
   npm install better-sqlite3 --force --build-from-source=false
   ```
4. Restart server under PM2:
   ```cmd
   pm2 restart tilepoint-hq-server
   ```

---

### ⚠️ Troubleshooting `NODE_MODULE_VERSION` Mismatch & Node.js ABI Errors

**Symptom**: Server fails with:
`Error: The module '\\?\C:\...\better_sqlite3.node' was compiled against a different Node.js version using NODE_MODULE_VERSION 108. This version of Node.js requires NODE_MODULE_VERSION 115.`

**Cause**: Node.js was upgraded on the host PC (e.g., from Node v18 to Node v20) after `npm install` was performed.

**Step-by-Step Fix**:
1. Check your active Node.js version:
   ```cmd
   node -v
   ```
2. Delete the stale `better-sqlite3` build folder:
   ```cmd
   rd /s /q node_modules\better-sqlite3
   ```
3. Re-install and rebuild `better-sqlite3` for the active Node ABI:
   ```cmd
   npm install better-sqlite3
   npm rebuild better-sqlite3
   ```
4. Confirm resolution using Test 1:
   ```cmd
   node -e "import Database from 'better-sqlite3'; const db = new Database(':memory:'); console.log('SQLite Version:', db.prepare('SELECT sqlite_version() AS v').get().v);"
   ```

---

### 🏗️ Troubleshooting `node-gyp` & Windows Visual C++ Build Tools Compilation Failures

**Symptom**: `npm install` or `npm rebuild` fails with errors such as:
`gyp ERR! build error`, `MSB4019: The imported project ... was not found`, or `cl.exe not found`.

**Cause**: `npm` attempted to compile `better-sqlite3` from source code because prebuilt binaries were not retrieved, but Windows lacks Visual Studio C++ compilers and Python.

**Step-by-Step Fix**:

#### Solution A — Force Prebuilt Binary Download (Fastest, No Compilers Needed):
Ensure npm downloads pre-compiled Windows x64 binaries without attempting `node-gyp` source builds:
```cmd
npm install better-sqlite3 --prefer-online --build-from-source=false
```

#### Solution B — Install Visual Studio C++ Build Tools (Full Compilers):
If prebuilt binaries are unavailable due to an offline network:
1. Open PowerShell as Administrator and run:
   ```powershell
   winget install Microsoft.VisualStudio.2022.BuildTools
   ```
2. Open **Visual Studio Installer** -> select **Desktop development with C++** -> click Install.
3. Install Python 3.x if missing: `winget install Python.Python.3.11`
4. Re-run native rebuild:
   ```cmd
   npm rebuild better-sqlite3
   ```

---

### 🔒 Troubleshooting SQLite Database Locked (`SQLITE_BUSY` / Concurrent Locks)

**Symptom**: Server logs report `SqliteError: database is locked` or `SQLITE_BUSY`.

**Cause**: An external application (e.g. DB Browser for SQLite, DBeaver, VS Code extension) or an orphaned `node.exe` background process holds an exclusive write lock on `tilepoint_sqlite.db`.

**Step-by-Step Fix**:
1. Close any database GUI applications viewing `tilepoint_sqlite.db`.
2. Terminate all orphaned Node processes:
   ```cmd
   taskkill /IM node.exe /F
   ```
3. Verify that WAL mode is active (`journal_mode = WAL`) by inspecting `server.js` startup logs.
4. Restart PM2 server:
   ```cmd
   pm2 start server.js --name "tilepoint-hq-server"
   ```

---

### 🔑 Troubleshooting SQLite Permission Denied (`SQLITE_CANTOPEN` / Windows Access Rights)

**Symptom**: Server logs show `SqliteError: unable to open database file` or `SQLITE_CANTOPEN`.

**Cause**: Windows file permissions restrict write access to `tilepoint_sqlite.db` or its directory (e.g., project stored in `Program Files` or folder set to Read-Only).

**Step-by-Step Fix**:
1. Remove read-only attributes from the project directory:
   ```cmd
   attrib -r "C:\path\to\TilePoint\*" /s
   ```
2. Run Command Prompt / PowerShell as **Administrator**.
3. Move project to a non-restricted folder (e.g. `C:\TilePoint` or `C:\Users\Public\TilePoint`).

---

### 💥 Troubleshooting Corrupted SQLite Database (`SQLITE_CORRUPT`) & Emergency Recovery

**Symptom**: Server logs report `SqliteError: database disk image is malformed` or `SQLITE_CORRUPT`.

**Cause**: Unscheduled PC shutdown or power loss while writes were active without proper WAL sync.

**Step-by-Step Fix**:
1. Stop the PM2 server process:
   ```cmd
   pm2 stop tilepoint-hq-server
   ```
2. Rename corrupted database files for backup:
   ```cmd
   ren tilepoint_sqlite.db tilepoint_sqlite_corrupt.db
   ren tilepoint_sqlite.db-wal tilepoint_sqlite_corrupt.db-wal
   ren tilepoint_sqlite.db-shm tilepoint_sqlite_corrupt.db-shm
   ```
3. Restart server under PM2:
   ```cmd
   pm2 start server.js --name "tilepoint-hq-server"
   ```
4. **Self-Healing Recovery**: `server.js` will automatically recreate a fresh `tilepoint_sqlite.db`, initialize all 28 table schemas, and auto-seed database records from `db.json`!

---

### 🛡️ Troubleshooting Multi-Tier Database Fallback (AlaSQL + JSON Engine)

**Symptom**: What happens if `better-sqlite3` completely fails to load on a restricted PC?

**Resilient Architecture**:
TilePoint is designed with a **triple-redundant database architecture**:
- **Tier 1 (Primary Engine)**: High-speed native **`better-sqlite3`** persistent database.
- **Tier 2 (Zero-Config Fallback)**: In-memory **`AlaSQL`** relational SQL engine with 28 tables and atomic snapshot persistence (`db.json`).
- **Tier 3 (Enterprise Cloud)**: Dedicated **`MySQL 8.0+`** pool (`mysql2/promise`).

*If `better-sqlite3` fails, TilePoint automatically seamlessly operates on AlaSQL + `db.json` without crashing or interrupting cashier terminal checkouts!*

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

### Troubleshooting PWA Service Worker Registration & Self-Signed SSL Certificates

**Symptom**: Console error when loading TilePoint on LAN IP (`https://192.168.1.6:3000`):
`[PWA] TilePoint PWA Service Worker registration failed: SecurityError: Failed to register a ServiceWorker for scope ('https://192.168.1.6:3000/') with script ('https://192.168.1.6:3000/sw.js'): An SSL certificate error occurred when fetching the script.`

**Why This Happens**:
Chromium (Chrome / Edge) enforces strict security rules for Service Workers. Service Workers cannot be registered over HTTPS on IP addresses using self-signed SSL certificates unless the certificate is installed into the OS **Trusted Root Certification Authorities** store.

**Fix Method 1: Install `tilepoint-ca.crt` into Windows Trusted Root Certificate Store (Recommended)**
1. In PowerShell as Administrator in the project directory, run:
   ```powershell
   Import-Certificate -FilePath ".\tilepoint-ca.crt" -CertStoreLocation "Cert:\LocalMachine\Root"
   ```
   *(Or double-click `tilepoint-ca.crt` -> Install Certificate -> Store Location: Local Machine -> Place all certificates in the following store -> Browse -> Trusted Root Certification Authorities -> Finish).*
2. Restart Chrome / Edge.

**Fix Method 2: Enable Chrome Flag for Insecure LAN Origins (Ideal for Cashier Tablets/Phones)**
1. On Chrome / Edge, navigate to: `chrome://flags/#unsafely-treat-insecure-origin-as-secure`
2. Add your LAN IP and port: `https://192.168.1.6:3000` (replace with your server IP).
3. Set the flag dropdown to **Enabled** and click **Relaunch**.
4. The PWA Service Worker will now register cleanly and allow offline caching!

---

## 🛠️ 11. Useful Operational Commands Reference

| Operation | Command | Execution Context |
| :--- | :--- | :--- |
| **Run 1-Click Installer** | `setup-tilepoint.bat` | Windows CMD (Run as Admin) |
| **Test `better-sqlite3` Binding** | `node -e "import Database from 'better-sqlite3'; const db = new Database(':memory:'); console.log('SQLite:', db.prepare('SELECT sqlite_version() AS v').get().v);"` | CMD / PowerShell |
| **Rebuild `better-sqlite3` Native Add-on** | `npm rebuild better-sqlite3` | CMD / PowerShell |
| **Check SQLite Health API** | `node -e "fetch('http://127.0.0.1:3000/api/db/sqlite-status').then(r=>r.json()).then(console.log);"` | CMD / PowerShell |
| **Check PM2 Status** | `pm2 status` | CMD / PowerShell |
| **View Real-Time Logs** | `pm2 logs tilepoint-hq-server` | CMD / PowerShell |
| **Restart Server** | `pm2 restart tilepoint-hq-server` | CMD / PowerShell |
| **Stop Server** | `pm2 stop tilepoint-hq-server` | CMD / PowerShell |
| **Install Dependencies** | `npm install` | Project Root Directory |
| **Verify Code & Types** | `npm run lint` | Project Root Directory |
| **Rebuild Client Bundle** | `npm run build` | Project Root Directory |
| **Migrate Data to MySQL** | `node scripts/migrateJsonToMysql.js` | Project Root Directory |
| **Reset Database (Clean Slate)** | `node -e "fetch('http://127.0.0.1:3000/api/db/truncate', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer <TOKEN>' }, body: JSON.stringify({ mode: 'all', confirmation: 'RESET' }) }).then(r=>r.json()).then(console.log);"` | CMD / PowerShell |
| **Check Port 3000 Usage** | `netstat -ano \| findstr :3000` | CMD / PowerShell |
| **Kill Process on Port 3000**| `taskkill /PID <PID> /F` | CMD (Run as Admin) |
| **Check Local IP Address** | `ipconfig` | CMD / PowerShell |
| **Generate SSL Certs** | `.\generate-certs.ps1` | PowerShell |

---

*TilePoint Enterprise POS & Shared Database System — Deployment Documentation*
