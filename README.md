# TilePoint 🧱

TilePoint is an enterprise-grade Point-of-Sale (POS), Inventory Management, Procurement, and Multi-Branch Management system designed specifically for tile center and hardware store chains. It offers a secure, resilient, and highly interactive experience to streamline daily retail operations, stock movements, supplier sourcing, and branch performance tracking.

---

## 🌟 Key Capabilities

### 🛒 Sales & Checkout (POS)
* **Real-Time Billing Basket**: Quick product search, interactive item adding, and dynamic pricing calculations.
* **Stock Checks**: Built-in verification during checkout prevents inventory deficits and stock inconsistencies.
* **Staff Access Overrides**: Role-based action approvals allow managers and admins to secure transaction flows.
* **Offline Readiness**: Log sales transactions seamlessly during temporary network drops; changes automatically sync once connection returns.

### 📦 Inventory Ledger & Auditing
* **Double-Entry Ledger Tracking**: Every product addition, sale, adjustment, and transfer registers an immutable log entry.
* **Manual Stock Correction**: Easily balance digital inventory levels with physical stocktakes through Adjustments.
* **Damage Logs**: Log broken or damaged tiles directly with detailed reason tracking to ensure waste audit accountability.

### 📋 Sourcing & Procurement
* **Supplier & Brand Registry**: Maintain comprehensive directories of manufacturing partners and product brands.
* **Order Templates**: Create reusable purchase order templates to speed up repeating supply requisitions.
* **Procurement Workflows**: Transition from initial requisition drafts to finalized order sheets smoothly.

### 🏢 Multi-Branch Allocation
* **Branch Assignment**: Assign employees and cashiers to specific branch locations with automated data scope matching.
* **Stock Reallocation**: Seamlessly request and record store-to-store stock transfers.
* **Regional Insights**: View custom statistics and alert notifications filtered automatically by branch context.

### ⚙️ System Settings & Backups
* **Smart Save Pooling**: Configure database save delays to optimize performance and reduce local computer load.
* **Secure Database Backups**: Create secure snapshot recovery points directly from the interface. Restoring from a backup instantly brings back products, inventories, logs, and account configurations.
* **Built-in Accessibility & Styling**: Full system theme personalization with custom text sizing and display themes.

---

## 🛠️ Quick Start (Local Run)

Get TilePoint running on your machine in just a few steps:

### Prerequisites
* **Node.js** (v18 or higher recommended)
* **npm** (included with Node.js)

### Installation & Run

1. **Install Project Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment Variables**
   Create a `.env.local` file in the root directory (or edit `.env`) and add your secret credentials:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

3. **Start the Development Server**
   ```bash
   npm run dev
   ```
   Open your browser and navigate to the local address displayed in your terminal (typically `http://localhost:3000`).

---

## 💼 User Roles Reference

To test different administrative scopes inside the application, refer to the pre-seeded credentials or assign roles directly via the User Management screen:
* **Administrators**: Full access to Database Settings, Backups, Store/Branch Configuration, Supplier Registries, and Financial Ledgers.
* **Managers**: Full access to Procurement drafts, Inventory reconciliations, and staff approval overrides.
* **Cashiers/Employees**: Focused workspace for POS billing, active shifts, damage registrations, and self-service portals.
