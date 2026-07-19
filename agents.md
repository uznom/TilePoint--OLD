# AT-POS AI Coding Agent Guideline (agents.md)

Welcome! This document outlines the core architectural patterns, styling standards, and system modules of the **AT-POS (Aman Tile Point of Sale) Corporate ERP & Sales Auditing Suite**. Adhere to these guidelines strictly when writing, refactoring, or optimizing code.

---

## 🚀 1. Architecture Overview

AT-POS is a full-stack corporate management system built with **React (TypeScript)**, **Vite**, and **Tailwind CSS**. It operates as a desktop-optimized browser-integrated workspace designed to support high-throughput, low-latency tile retailing operations.

### Key Workspaces & Modules
- **Reconciliation & Transmission (Consolidated)**: Located in `src/components/ReconciliationTransmissionModule.tsx`. Integrates three dedicated tabs:
  1. *Daily Reconciliation*: Visual ledger balancing and itemized cost reconciliations.
  2. *Reports Transmission*: HQ-bound inter-branch telemetry synchronization over web-sockets.
  3. *Admin JSON Import*: Strictly restricted workspace where Administrators drop or paste signed offline corporate JSON payload packets.
- **Hardware Inventory Register**: Live hardware count auditing, custom branch price matrices, transfer logs, and interactive modals for new registers.
- **Supplier Credit and Payment Calendar**: Real-time supplier credit management, active balances, and visual calendars for installment due-dates.
- **BIR & Tax Compliance Search**: Interactive query portals for searching historical X and Z reports.

---

## 🎨 2. Visual Styling & Design System

The application utilizes an elegant, eye-safe **Material Design 3 (M3)** custom token system defined in `src/index.css`.

### Core Rules
* **No Dark Mode Flicker**: Do not toggle or pulse bright high-contrast colors unrequested.
* **Dropdown High-Contrast Safety**: Always apply explicit high-contrast light/dark fallback classes (`bg-white dark:bg-[#131A22] text-[#101828] dark:text-[#F8FAFC]`) to form selects and option tags. This prevents native browser inputs from staying in a dark styling during system-wide light mode.
* **Aesthetic负空间**: Retain generous padding, elegant display typography pairing (**Space Grotesk** for display headings, **Inter** for readable body, **JetBrains Mono** for alphanumeric telemetry), and subtle fade-in transitions.
* **Icons**: Import all UI icons exclusively from `lucide-react`. Do not write custom raw SVGs.

---

## 🔒 3. Data Flow & Security Standards

* **Admin Authorization checks**: Access to the HQ Sales manual JSON import flow and critical rollback snapshot restorations is strictly fenced behind `currentUser.role === UserRole.ADMIN`.
* **Disaster Recovery (Rollback Snapshots)**: The local database maintains a rolling queue of the 5 most recent snapshots (`rollbackSnapshots`). Any manual JSON import or database state transition spawns a recovery snapshot, allowing instant rollback in case of accidental duplicate uploads.
* **Immutable Nonces**: The system records and stores imported payload nonces in `localStorage` under `tp_used_nonces` to prevent duplicate submissions of identical offline files.

---

## 🛠️ 4. React & TypeScript Coding Standards

* **React 18+ Features**: Use functional components, explicit props interfaces, and modern hooks. Avoid legacy class-based architectures.
* **Clean Effects**: Never include arrays, objects, or functions in a `useEffect` dependency array unless they are strictly stabilized outside the component or heavily memoized. Prefer using primitive values (strings, numbers, booleans) to avoid infinite loop cycles.
* **Absolute Import Paths**: Keep file pathways clean. All code edits must use relative paths in the code tree but respect the structure precisely.

---

Remember: AT-POS is built for lightning-fast business administration. Keep interfaces clean, typography sharp, and state changes predictable!
