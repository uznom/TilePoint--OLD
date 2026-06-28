# 🧱 TilePoint

### Enterprise-Grade Offline-First Multi-Branch POS & Inventory Management System

TilePoint is a robust, resilient Point of Sale (POS) and inventory management platform architected specifically for retail networks operating in areas with unstable, metered, or completely absent internet connectivity. Built with a decentralized offline-first architecture, TilePoint empowers individual branches to run independently without zero-latency cloud dependencies, using a secure out-of-band data transmission workflow via standard messaging platforms like Facebook Messenger.

---

## 💎 Core Philosophy & Architecture

In regions where infrastructure limitations make continuous cloud synchronization impossible, traditional cloud-hosted POS systems fail. TilePoint solves this by treating **local device storage as the single source of truth during operational shifts**, while maintaining a distributed multi-tenant structure for centralized administrative oversight.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        TILEPOINT NETWORK TOPOLOGY                     │
└────────────────────────────────────────────────────────────────────────┘

    [ BRANCH 01 - LOCAL TERMINAL ]            [ BRANCH 02 - LOCAL TERMINAL ]
    ┌──────────────────────────┐              ┌──────────────────────────┐
    │ IndexedDB / LocalStorage │              │ IndexedDB / LocalStorage │
    └─────────────┬────────────┘              └─────────────┬────────────┘
                  │                                         │
       [ Packaged Data Token ]                   [ Packaged Data Token ]
                  │                                         │
                  ▼                                         ▼
   📎 Manual Paste via Messenger             📎 Manual Paste via Messenger
                  │                                         │
                  └───────────────────┬─────────────────────┘
                                      │
                                      ▼
                      [ HQ ADMIN CONSOLIDATED CONSOLE ]
                      ┌───────────────────────────────┐
                      │  Global Multi-Branch Matrix   │
                      │  Audit Inspection Pipeline    │
                      └───────────────────────────────┘
```

*   **Zero-Dependency Local Execution**: Cashier registers, barcode indexing, checkouts, shift handovers, and double-entry damage logging execute directly in-browser on the local terminal hardware.
*   **Cryptographically Ported Ledger Packets**: Rather than relying on continuous database connections, branch data is bundled into tamper-evident, encrypted JSON summary payload string blocks signed with a state-tracking schema.
*   **Asynchronous Messenger Data Syncing**: In settings with limited infrastructure, data updates are sent manually. Managers copy the signed transaction package from the terminal, send it via Messenger, and the central HQ Admin imports it into the Master Console to update logs.

---

## ✨ Features Profile

### 🛒 Point of Sale & Checkout Core
*   **Fluid Cashier Registers**: Highly optimized keyboard-driven search inputs for swift product lookups, automated discount scaling, and split-tender payment parsing.
*   **Shift & Vault Safeguards**: Granular tracking of drawer openings, expected cash-in-vault tallies, cash drops, and programmatic variance reconciliation logs across cash-outs.
*   **Double-Entry Adjustment Logging**: Every damaged inventory write-off, customer return, or floor variance triggers an audit-compliant double-entry ledger event to isolate operational shrink.

### 📦 Decentralized Inventory & Logistics Matrix
*   **HQ Consolidated Visibility**: Admins can break out of their corporate node to inspect stock matrixes across all physical store locations and low-level threshold alerts.
*   **Multi-Branch Allocations & Transfers**: Secure tracking for moving goods between yards, complete with a dual-stage "Sent" and "Received" validation process to prevent transit leakage.
*   **Differential Pricing Overrides**: Corporate Admins can apply pricing modifiers to specific branch inventories to balance variable shipping and delivery costs.

### 📊 Admin Inspection & Business Analytics
*   **Centralized Audit Console**: An Administrative hub engineered to ingest branch payload strings, recalculate arrays to verify accuracy, and mark logs as *Verified* or *Pending Audit*.
*   **Expense & Margin Tracking**: Unified reporting pipelines that cross-reference operating costs against itemized product sales to show true net profitability metrics.

---

## 🔒 Security Infrastructure & Synchronization Engine

### Cryptographic Packing Mechanism
When a branch closes a operational sequence, TilePoint runs a multi-tier packaging operation:
1.  **Aggregate Verification**: Computes deterministic hash checkpoints across all current shift items, expenses, and invoices.
2.  **Symmetric Packing Layers**: Encodes structural properties using a character-shifting transposition schema to ensure privacy on public channels.
3.  **Tamper-Evident Signatures**: Generates a dynamic cryptographic signature block. Any manual attempt to manipulate prices or records within the string before parsing at HQ triggers an immediate validation failure.

### Storage Optimization & Self-Healing Architecture
Because local storage spaces have physical limits, TilePoint uses a proactive storage monitor:
*   **Quota Interception**: Continually intercepts storage writes to proactively manage allocation thresholds.
*   **Intelligent History Pruning**: Automatically drops legacy telemetry tracking and historical visualization caches when space is tight, preserving critical operational records first.

---

## ⚙️ Technical Blueprint

The TilePoint application is engineered entirely with a modern, high-performance web engineering stack:

*   **Frontend Architecture**: React (TypeScript) driven by functional hooks and a optimized Context provider mapping global application states.
*   **Build Optimization**: Vite tooling to ensure rapid compilation and low footprint runtimes on edge computing hardware.
*   **Design Language**: Tailwind CSS coupled with custom design accents to deliver a professional layout optimized for high-density transactional screens.
*   **Local Storage Engine**: Interconnected LocalStorage API engines wrapped inside defensive memory controllers.

---

## 🚀 Deployment & Initialization Setup

### Standard Requirements
*   **Node.js**: version `18.x` or higher
*   **Package Manager**: `npm` or `yarn`

### Technical Initialization Steps

1.  **Clone and Navigate to the Repository Directory**:
    ```bash
    git clone https://github.com/ericamanaban/tilepoint.git
    cd tilepoint
    ```

2.  **Initialize Environment Variables**:
    Copy the sample configuration file to instantiate environment variables:
    ```bash
    cp .env.example .env
    ```

3.  **Install Application Dependencies**:
    Download and configure required node modules:
    ```bash
    npm install
    ```

4.  **Launch Local Operational Workspace**:
    Spin up the optimized local development engine:
    ```bash
    npm run dev
    ```

5.  **Compile & Package for Production**:
    Generate static, production-ready distributions deployable to any localized edge web server or container:
    ```bash
    npm run build
    ```

---

## 🗺️ Operational Sync Workflow (Step-by-Step)

To guarantee exact compliance across remote branch nodes, personnel must observe the following sync protocols:

### At the Remote Branch Location
1.  Complete the evening cash checkout routine and close the active cashier shift inside the terminal portal.
2.  Navigate into the **Sales Transmission Module**.
3.  Click **Generate Sync Token**; copy the generated cryptographic text block to your system clipboard.
4.  Open the designated Facebook Messenger thread for corporate communications and paste the string directly into the secure chat workspace.

### At the HQ Central Office
1.  Access the Master Admin Dashboard and navigate to the **Data Ingestion Portal**.
2.  Copy the sync string received from the branch chat bubble and paste it into the secure upload text region.
3.  Click **Authorize Data Audit**. The TilePoint signature verification matrix will parse the string, check for tampering, clear any inter-branch transfer sequences, and update the global multi-branch analytics view.