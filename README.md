# TilePoint Enterprise POS & Retail ERP

TilePoint is an enterprise-grade Point-of-Sale (POS), Multi-Branch Inventory Management, Procurement, Logistics, and Financial Auditing system engineered specifically for tile centers, hardware suppliers, and retail chain operations. It combines high-throughput billing, double-entry inventory ledgering, real-time multi-terminal synchronization, solid-black thermal printing, and dual-tier relational database persistence.

---

## 🌟 Key Capabilities

### 🛒 High-Throughput Sales & Cashier POS
- **Rapid Item Lookup & Barcode Scanning**: Instant SKU and barcode searching with hardware barcode scanner wedge support and mobile camera scanner integration (`getUserMedia`).
- **Flexible Pricing & Stock Checks**: Live inventory verification per branch prevents over-selling and negative inventory states during checkout.
- **Payment Methods & Cash Drawer Control**: Support for Cash, Card, Bank Transfer, Cheque, and Store Credit with automatic cash drawer kick triggers (RJ11/RJ12).
- **Staff Approval Overrides**: Secure role-based authorization for discounts, voided items, price adjustments, and tax exemptions.
- **Receipt Printing**: Native 58mm and 80mm ESC/POS thermal printing with 100% solid black vector styling for crisp physical receipts.

### 📦 Inventory Ledger, Batches & Auditing
- **Double-Entry Stock Ledger**: Immutable transaction logging for every sale, purchase receiving, manual adjustment, damage write-off, and inter-branch transfer.
- **Batch & Lot Tracking**: Manage lot numbers, shade codes, calibration variations, and batch expiration dates.
- **Stock Alert Diagnostics**: Real-time notifications for Low Stock Warnings, Critical Stock Levels, and Out-of-Stock items with zero lag.
- **Excel Stock Cards**: One-click multi-sheet `.xlsx` export for comprehensive stock cards, item histories, and audit records.

### 📊 Business Intelligence & Sales Analytics
- **Top 20 Best & Top 10 Slow Selling Analytics**: Dedicated analytics dashboard reporting best sellers by volume and revenue alongside slow-moving inventory with tied-up capital calculations.
- **Shift Reconciliation**: Cashier shift logging with opening cash, payment breakdown, cash drops, and variance tracking.
- **Expense & Margin Tracking**: Categorized store expense logging with real-time gross and net profit margin calculations.

### 📋 Sourcing, Procurement & Transmittals
- **Supplier & Brand Directory**: Central supplier registries with contact information, payment terms, and lead times.
- **Purchase Order Workflows**: Multi-stage procurement flow from requisition drafts and manager approvals to goods receipt and stock ledgering.
- **Inter-Branch Transmittals**: Store-to-store stock transfers with dispatch confirmations, gate passes, and destination receiving verification.

### 🏢 Multi-Branch Management
- **Branch Scope Filtering**: Seamlessly toggle between central headquarters (HQ) and individual branch outlets with automated data isolation.
- **Regional Analytics**: Comparative performance metrics across branches, cashiers, and product lines.

---

## 🏗️ Architecture & Tech Stack

- **Frontend**: React 19, TypeScript, Vite 6, Tailwind CSS v4, Motion (`motion/react`), Recharts, Lucide Icons.
- **Backend Server**: Node.js & Express.js with native HTTPS/TLS termination and anti-crawler security middleware.
- **Real-Time Synchronization**: Dual-channel updates using **Socket.io** (`db_pulse_update`) and **Server-Sent Events (SSE)** (`/api/db/events`).
- **Database Engine (Dual-Tier)**:
  - **Tier 1 (Enterprise Dedicated Server)**: MySQL 8.0+ / MariaDB with connection pooling (`mysql2/promise`), 28 relational tables, and optimized composite indexes.
  - **Tier 2 (Zero-Config Embedded Fallback)**: In-memory AlaSQL relational SQL engine with atomic disk persistence (`server-db.json`) for instant standalone or offline deployments.

---

## 🚀 Quick Start for Windows (1-Click Automated Setup)

TilePoint provides automated deployment batch scripts for Windows 10 and 11:

### 1. Initial Setup & Installation
Right-click **`setup-tilepoint.bat`** and select **Run as Administrator**.
The script automatically:
1. Installs Git and Node.js LTS via `winget` if missing.
2. Installs all npm dependencies (`npm install`).
3. Detects your local LAN IPv4 address.
4. Creates `.env` and generates secure cryptographic secrets.
5. Generates trusted SSL certificates (`key.pem`, `cert.pem`) using `mkcert` and registers the local Root CA in Windows Trust Store.
6. Opens Windows Defender Firewall ports for Port 3000 (POS Server) and Port 3306 (MySQL).
7. Compiles production client assets (`npm run build`).
8. Creates a **TilePoint POS** shortcut on your Windows Desktop.
9. Starts the background service under PM2 and launches your browser to `https://<YOUR_LOCAL_IP>:3000`.

### 2. Everyday Launcher
Double-click the **TilePoint POS** shortcut on your desktop, or run **`start-tilepoint.bat`**.

---

## 🛠️ Cross-Platform Quick Start (Manual Setup)

### Prerequisites
- **Node.js** (v18.0.0 or higher recommended, LTS v20+)
- **npm** (included with Node.js)
- *(Optional)* **MySQL Server 8.0+** on Port 3306

### Installation Steps

1. **Clone & Install Dependencies**
   ```bash
   git clone <repository-url>
   cd TilePoint
   npm install
   ```

2. **Configure Environment Variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` to configure your MySQL connection and server URLs:
   ```env
   # Cryptographic secret for signing offline sessions
   VITE_SECURITY_SECRET="TilePointEnterpriseSecPass2026!"
   SECURITY_SECRET="TilePointEnterpriseSecPass2026!"

   # Dedicated MySQL Configuration (Optional - embedded engine used if absent)
   MYSQL_HOST="localhost"
   MYSQL_PORT=3306
   MYSQL_USER="root"
   MYSQL_PASSWORD=""
   MYSQL_DATABASE="tilepoint_db"

   # Bound server address
   APP_URL="https://localhost:3000"
   ```

3. **(Optional) Initialize MySQL Database**
   ```bash
   mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS tilepoint_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
   mysql -u root -p tilepoint_db < schema.sql
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` (or `https://localhost:3000` if certificates are present).

5. **Build & Run for Production**
   ```bash
   npm run build
   npm start
   ```

---

## 🖨️ Hardware Integration

- **Thermal Receipt Printers (58mm / 80mm)**: Standard ESC/POS printers supported via system print dialog. Ensure "Background graphics" is enabled and "Headers/Footers" is disabled in browser print settings.
- **Barcode Scanners (1D / 2D)**: USB and Bluetooth handheld scanners operating in HID Keyboard Wedge mode work out-of-the-box.
- **Cash Drawers**: Standard RJ11 / RJ12 drawers connected to receipt printer DK port trigger on finalized transactions.
- **Mobile Cashier Tablets / Phones**: Connect any smartphone or iPad on the same Wi-Fi network by visiting `https://<HOST_LOCAL_IP>:3000`.

---

## 💼 User Roles & Access Hierarchy

- **Administrators**: Full system permissions, database backup/restore, branch and store configuration, tax and currency settings, financial ledgers, and user management.
- **Managers**: Procurement creation and approval, stock reconciliations, price overrides, and shift oversight.
- **Cashiers & Staff**: Dedicated point-of-sale checkout, active shift sessions, customer lookup, and damage logging.

---

## 📚 Documentation

For full deployment instructions, firewall rules, static IP setup, SSL CA configuration, and troubleshooting:
- See **`WINDOWS_SETUP_GUIDE.md`** for comprehensive Windows server deployment instructions.
- See **`schema.sql`** for complete MySQL database table definitions and index layouts.

