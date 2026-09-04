/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface DocSection {
  id: string;
  heading: string;
  content: string;
  callout?: {
    type: 'tip' | 'note' | 'warning' | 'danger';
    title: string;
    message: string;
  };
  shortcuts?: { key: string; description: string }[];
  codeBlock?: {
    language: string;
    code: string;
  };
  table?: {
    headers: string[];
    rows: string[][];
  };
}

export interface DocArticle {
  id: string;
  title: string;
  category: string;
  badge?: string;
  description: string;
  readTime: string;
  iconName: string;
  targetTab?: string;
  targetTabLabel?: string;
  keywords: string[];
  sections: DocSection[];
}

export interface DocCategory {
  id: string;
  name: string;
  iconName: string;
  articles: DocArticle[];
}

export const DOCS_CATEGORIES: DocCategory[] = [
  {
    id: 'getting-started',
    name: 'Getting Started',
    iconName: 'Sparkles',
    articles: [
      {
        id: 'system-overview',
        title: 'System Architecture & Offline Sync',
        category: 'Getting Started',
        badge: 'Core Architecture',
        description: 'Understand how TilePoint combines in-browser AlaSQL local persistence with background MySQL server synchronization.',
        readTime: '4 min read',
        iconName: 'Database',
        targetTab: 'dashboard',
        targetTabLabel: 'Open Dashboard',
        keywords: ['architecture', 'alasql', 'mysql', 'offline', 'sync', 'database', 'network'],
        sections: [
          {
            id: 'hybrid-storage',
            heading: 'Hybrid Storage & Offline Resiliency',
            content: 'TilePoint utilizes a dual-layer database architecture engineered for 100% uptime in showroom environments. Transactions are instantly written to in-memory/localStorage AlaSQL tables so cashiers are never blocked by network latency. Changes are enqueued in an atomic transaction outbox and automatically replicated to the primary MySQL server via WebSockets and REST endpoints.',
            callout: {
              type: 'tip',
              title: 'Zero Latency Cashiering',
              message: 'Even during total internet blackouts, cashiers can continue ringing sales, printing receipts, and managing drawers without interruption.'
            }
          },
          {
            id: 'sync-status-indicators',
            heading: 'Real-Time Sync Status Indicators',
            content: 'The user profile avatar in the sidebar and header indicates real-time database connectivity: Green (Connected & Synced), Amber with animated pulse (Syncing/Queuing transactions), and Rose (Degraded/Offline mode).',
            table: {
              headers: ['Avatar State', 'Status Code', 'Operational Behavior'],
              rows: [
                ['Green (Success)', 'Connected', 'Direct bidirectional sync with primary MySQL cluster.'],
                ['Amber (Warning)', 'Syncing / Polling', 'Replaying queued writes from transaction outbox.'],
                ['Rose (Danger)', 'Offline / Degraded', 'Writes buffered locally in AlaSQL; automatic replay on reconnection.']
              ]
            }
          },
          {
            id: 'role-permissions',
            heading: 'User Role Permissions',
            content: 'Access is strictly enforced across three main security tiers: Admin (full system access, financials, user management), Manager (inventory overrides, shift variance approvals, supplier PO authorizations), and Cashier (POS checkout, shift drawer operations, daily ledger).',
            callout: {
              type: 'note',
              title: 'Security Note',
              message: 'Sensitive operations such as manual price overrides and high shift variance reconciliation require managerial PIN verification.'
            }
          }
        ]
      }
    ]
  },
  {
    id: 'pos-billing',
    name: 'POS & Billing',
    iconName: 'ShoppingCart',
    articles: [
      {
        id: 'pos-checkout-sop',
        title: 'POS Cashiering & Checkout SOP',
        category: 'POS & Billing',
        badge: 'Cashier Guide',
        description: 'Standard Operating Procedures for scanning tile stock, customer profiles, discount schemes, and executing settlements.',
        readTime: '6 min read',
        iconName: 'ShoppingCart',
        targetTab: 'pos',
        targetTabLabel: 'Open POS Checkout',
        keywords: ['pos', 'checkout', 'cashier', 'cart', 'tender', 'settlement', 'discount', 'exact cash'],
        sections: [
          {
            id: 'shift-prerequisite',
            heading: '1. Active Shift Prerequisite',
            content: 'Before executing any sales in POS Checkout mode, the cashier must have an active shift registered. If no shift is open, POS operations are blocked with an opening float modal prompt.',
            callout: {
              type: 'warning',
              title: 'Mandatory Opening Float',
              message: 'Always count your physical register bills before opening the shift. Cashier sessions without declared floats cannot be reconciled.'
            }
          },
          {
            id: 'adding-items',
            heading: '2. Scanning & Selecting Products',
            content: 'Products can be filtered by Category (Floor Tiles, Wall Tiles, Granite, Mosaics, Adhesives, Tools) or searched via the live search field. Hovering over tile items reveals dimensions, surface finish (Matte, Polished, Glossy), and stock availability across Branch 1, Branch 2, and Branch 3.',
            shortcuts: [
              { key: 'F2', description: 'Focus Product Search input' },
              { key: 'F8', description: 'Open Tile Square Meter & Box Calculator' }
            ]
          },
          {
            id: 'discounts-pricing',
            heading: '3. Discounts & Manager Price Overrides',
            content: 'Customer loyalty members can earn and redeem reward points. Discounts (Senior Citizen 20%, PWD 20%, Special Promo, Custom Amount) can be applied via the discount modal. Any manual unit price override requires a 4-digit Manager PIN verification before the discounted rate is permitted.',
            callout: {
              type: 'tip',
              title: 'Receipt Labeling',
              message: 'All applied discounts are automatically summarized under "Discount Applied:" on customer receipts and audit journals.'
            }
          },
          {
            id: 'tender-settlement',
            heading: '4. Minimum Tender & Settlement Execution',
            content: 'To prevent cashier short-tendering errors, the "Execute Settlement" button remains strictly disabled until the Amount Tendered is equal to or greater than the Grand Total for Cash payments. An informative badge indicates exact shortage or change amount in real time.',
            shortcuts: [
              { key: 'F7', description: 'Execute Settlement & Finalize Sale' },
              { key: 'Esc', description: 'Cancel current transaction / Close modals' }
            ],
            table: {
              headers: ['Payment Method', 'Requirement', 'Settlement Rule'],
              rows: [
                ['Cash', 'Amount Tendered >= Grand Total', 'Exact Cash button auto-fills exact amount; calculates change automatically.'],
                ['GCash / Maya', 'Reference Number Required', 'Must enter official e-wallet transaction reference string.'],
                ['Credit / Debit Card', 'Approval / Auth Code Required', 'Terminal auth code logged for merchant bank reconciliation.'],
                ['Member Credit', 'Available Credit Limit', 'Deducted directly from verified member account receivables.']
              ]
            }
          }
        ]
      },
      {
        id: 'pos-receipts-printing',
        title: 'Receipts, Invoices & Auto-Cut Printing',
        category: 'POS & Billing',
        badge: 'Printing Standards',
        description: 'Comprehensive guide to thermal receipt printing modes, BIR compliance footnotes, and delivery copy auto-cutting.',
        readTime: '4 min read',
        iconName: 'Printer',
        targetTab: 'pos',
        targetTabLabel: 'View Sales Ledger',
        keywords: ['receipt', 'printing', 'thermal', 'auto-cut', 'invoice', 'delivery receipt', 'store copy'],
        sections: [
          {
            id: 'print-modes',
            heading: 'Segmented Receipt View Modes',
            content: 'The POS receipt modal supports three distinct print modes: "All (Auto-Cut)" (prints official Sales Receipt followed by cut lines and Store/Customer Delivery copies), "Sales Receipt" (standalone thermal invoice), and "Delivery" (cargo manifest copies for driver and customer sign-off).',
            callout: {
              type: 'note',
              title: 'Thermal Auto-Cut Formats',
              message: 'Thermal printer cut commands are positioned between Store and Customer copies to facilitate multi-part physical distribution.'
            }
          },
          {
            id: 'receipt-financial-breakdown',
            heading: 'Financial Audit Breakdown',
            content: 'Every sales receipt details: Invoice Number, Cashier Name, Date/Time, Line items with quantities and unit prices, Subtotal, Discount Applied (if any), VATable Sales, VAT-Exempt Sales, 12% Output VAT, Grand Total Due, Amount Tendered, and Change Dispensed.'
          },
          {
            id: 'reprinting-receipts',
            heading: 'Reprinting Historical Receipts',
            content: 'Cashiers can navigate to POS Sales Ledger tab, search by customer name, date range, or invoice number, and trigger official reprints. Each reprint logs an immutable audit event to prevent fraud.'
          }
        ]
      }
    ]
  },
  {
    id: 'shift-accounting',
    name: 'Shift & Drawer',
    iconName: 'LockKeyhole',
    articles: [
      {
        id: 'shift-drawer-balancing',
        title: 'Daily Shift Drawer & Reconciliation Guide',
        category: 'Shift & Drawer',
        badge: 'Audit & Reconciliation',
        description: 'SOP for opening cash floats, recording operational petty cash expenses, and performing shift-end drawer reconciliation.',
        readTime: '5 min read',
        iconName: 'LockKeyhole',
        targetTab: 'shift',
        targetTabLabel: 'Open Shift Drawer',
        keywords: ['shift', 'drawer', 'cash count', 'float', 'expenses', 'variance', 'reconciliation', 'balancing'],
        sections: [
          {
            id: 'opening-float',
            heading: '1. Opening Drawer Declaration',
            content: 'At the start of each cashier shift, physically count bill and coin denominations (₱1,000, ₱500, ₱200, ₱100, ₱50, ₱20, and coins). Enter the aggregate sum into the large Opening Float input. This locks the register baseline.',
            callout: {
              type: 'tip',
              title: 'Best Practice',
              message: 'Never share drawer floats between cashiers. If switching shifts, close the active shift first and have the incoming cashier declare a new float.'
            }
          },
          {
            id: 'petty-expenses',
            heading: '2. In-Shift Operational Expenses',
            content: 'When paying for branch supplies, delivery food, emergency fuel, or showroom maintenance directly from drawer funds, record the disbursement under "Add Expense" with receipt attachment and category. Logged expenses automatically deduct from final expected cash.',
            callout: {
              type: 'warning',
              title: 'Expense Audit Rule',
              message: 'Expenses over ₱1,000 require manager approval and valid official vendor receipts.'
            }
          },
          {
            id: 'closing-shift-variance',
            heading: '3. End-of-Shift Reconciliation & Variance',
            content: 'When closing the shift, perform a physical cash count and input the value into "Physical Cash Counted". The system compares Expected Drawer Cash (Opening Float + Cash Sales - Cash Expenses - Cash Refunds) against Actual Counted Cash. Any variance over ₱50 requires mandatory supervisor annotation before the shift can be submitted.',
            table: {
              headers: ['Variance Type', 'Indicator', 'Required Action'],
              rows: [
                ['Balanced (₱0.00)', 'Emerald Green Check', 'No annotation required; immediate shift wrap-up.'],
                ['Overage (+₱)', 'Blue Indicator', 'Overage noted in shift report and deposited into branch reserve.'],
                ['Shortage (-₱)', 'Rose Indicator', 'Cashier explanation required; supervisor countersign needed if > ₱50.']
              ]
            }
          }
        ]
      }
    ]
  },
  {
    id: 'inventory-warehousing',
    name: 'Inventory & Stocks',
    iconName: 'Layers',
    articles: [
      {
        id: 'inventory-stock-management',
        title: 'Inventory Stock Levels & Ledger Audit',
        category: 'Inventory & Stocks',
        badge: 'Logistics',
        description: 'Managing tile SKU assets, multi-branch stock distribution, square meter conversions, and damage write-offs.',
        readTime: '5 min read',
        iconName: 'Layers',
        targetTab: 'stocks',
        targetTabLabel: 'View Stocks Ledger',
        keywords: ['inventory', 'stocks', 'warehouse', 'sku', 'tile', 'branch', 'transfer', 'damage'],
        sections: [
          {
            id: 'stock-health-gauges',
            heading: 'Stock Health Gauges',
            content: 'The inventory management table features dynamic color-coded stock health gauges: Green (>100 units, Optimal Stock), Yellow (1 to 99 units, Low Stock threshold warning), and Red (0 units, Depleted/Out-of-Stock).',
            callout: {
              type: 'note',
              title: 'Automatic Cart Reservation',
              message: 'When items are added to an active POS cart, stock is temporarily held to prevent race conditions across multiple branch terminals.'
            }
          },
          {
            id: 'square-meter-calculations',
            heading: 'Tile Sizing & Box Quantity Mathematics',
            content: 'Tiles are sold both by individual piece and by standard packaging box. The built-in Tile Calculator (F8) converts floor area in square meters (sqm) into exact box and piece counts with recommended 10% wastage allowance.'
          }
        ]
      },
      {
        id: 'branch-stock-transfers',
        title: 'Inter-Branch Stock Transfers & Transmittals',
        category: 'Inventory & Stocks',
        badge: 'Branch Logistics',
        description: 'How to initiate, transit-lock, and receive inventory transfers between branch locations and central warehouse.',
        readTime: '4 min read',
        iconName: 'Truck',
        targetTab: 'stocks',
        targetTabLabel: 'View Stock Transfers',
        keywords: ['transfers', 'transmittal', 'inter-branch', 'warehouse', 'receiving', 'transit'],
        sections: [
          {
            id: 'initiate-transfer',
            heading: '1. Initiating a Transfer Request',
            content: 'From Stocks Transfer, select "Create Stock Transfer". Specify the Origin Branch, Destination Branch, Product SKU, and Quantity to transfer. Once submitted, the items transition to "In Transit" status and are decremented from the origin branch available inventory.',
            callout: {
              type: 'warning',
              title: 'Transit Safety Lock',
              message: 'Transferred inventory cannot be sold by the receiving branch until official confirmation of delivery is logged.'
            }
          },
          {
            id: 'receiving-transfer',
            heading: '2. Receiving & Ingesting Transmittals',
            content: 'The receiving branch manager checks incoming transmittals against physical cargo. Clicking "Confirm Ingestion" increments local branch stock counts and closes the transmittal ticket with complete timestamp logs.'
          }
        ]
      }
    ]
  },
  {
    id: 'fleet-deliveries',
    name: 'Deliveries & Fleet',
    iconName: 'Truck',
    articles: [
      {
        id: 'cargo-fleet-operations',
        title: 'Fleet Cargo Logistics & Dispatch Operations',
        category: 'Deliveries & Fleet',
        badge: 'Dispatch SOP',
        description: 'Scheduling customer delivery orders, assigning fleet trucks and crew, tracking transit routes, and capturing digital proof of delivery.',
        readTime: '5 min read',
        iconName: 'Truck',
        targetTab: 'deliveries',
        targetTabLabel: 'Open Delivery Center',
        keywords: ['deliveries', 'cargo', 'fleet', 'truck', 'driver', 'dispatch', 'proof of delivery', 'signature'],
        sections: [
          {
            id: 'scheduling-orders',
            heading: '1. Scheduling Cargo Delivery Orders',
            content: 'When a customer requests delivery during POS checkout or via phone order, link the sale invoice to a new Cargo Delivery ticket. Input delivery address, contact numbers, landmarks, and preferred delivery time window.'
          },
          {
            id: 'assigning-carrier',
            heading: '2. Carrier & Crew Fleet Allocation',
            content: 'Assign a branch delivery truck (e.g. Isuzu Elf 6-Wheeler, Canter Closed Van) along with an authorized driver and helper crew. The ticket status transitions to "Dispatched / In Transit".'
          },
          {
            id: 'proof-of-delivery',
            heading: '3. Digital Proof of Delivery (POD)',
            content: 'Upon physical delivery, dispatchers record the receiving party name, capture digital signature, and optionally upload cargo inspection photos. The ticket status updates to "Delivered" and syncs to central sales records.',
            callout: {
              type: 'tip',
              title: 'Customer Copy',
              message: 'Always provide the customer with the stamped "CUSTOMER COPY" Delivery Receipt from the thermal auto-cut printer.'
            }
          }
        ]
      }
    ]
  },
  {
    id: 'procurement-vendors',
    name: 'Procurement',
    iconName: 'FileText',
    articles: [
      {
        id: 'procurement-po-workflow',
        title: 'Vendor Sourcing & Purchase Orders (PO)',
        category: 'Procurement',
        badge: 'Supply Chain',
        description: 'Managing supplier directories, catalog mapping, Purchase Requisitions (PR) with HeroAutocomplete, and PO receiving.',
        readTime: '5 min read',
        iconName: 'FileText',
        targetTab: 'procurement',
        targetTabLabel: 'Open Procurement Desk',
        keywords: ['procurement', 'purchase orders', 'vendors', 'suppliers', 'requisitions', 'sourcing', 'catalog'],
        sections: [
          {
            id: 'vendor-catalogs',
            heading: 'Vendor Directories & Brand Mapping',
            content: 'Register verified tile manufacturers and raw material suppliers. Associate product lines, payment terms (Net 30, Net 60, COD), and direct sales representative contacts.'
          },
          {
            id: 'pr-builder-autocomplete',
            heading: 'Purchase Requisition Builder with HeroAutocomplete',
            content: 'Create Purchase Requisitions using the integrated HeroAutocomplete search selector to rapidly find and add catalog tile items. System computes suggested purchase quantities based on historical sales velocities.',
            callout: {
              type: 'tip',
              title: 'Smart Autocomplete',
              message: 'HeroAutocomplete allows fuzzy-matching by SKU, brand name, and dimensions for rapid catalog entry.'
            }
          },
          {
            id: 'po-approval-receiving',
            heading: 'Purchase Order Approval & Stock Receiving',
            content: 'Approved Requisitions generate formal Purchase Orders with PO Numbers. When shipments arrive at the central warehouse, receiving staff verify quantities against the PO packing list and ingest stocks into inventory.'
          }
        ]
      }
    ]
  },
  {
    id: 'bir-compliance-tax',
    name: 'BIR & Tax',
    iconName: 'ShieldCheck',
    articles: [
      {
        id: 'bir-tax-compliance-guide',
        title: 'BIR Invoicing & Sales Transmission Audit',
        category: 'BIR & Tax',
        badge: 'Statutory Compliance',
        description: 'Tax computation breakdown, VAT exemption standards, discount reporting books, and official BIR electronic export records.',
        readTime: '6 min read',
        iconName: 'ShieldCheck',
        targetTab: 'birReports',
        targetTabLabel: 'Open BIR Tax Reports',
        keywords: ['bir', 'tax', 'vat', 'vat-exempt', 'zero-rated', 'audit', 'invoicing', 'sales transmission'],
        sections: [
          {
            id: 'tax-breakdown-rules',
            heading: 'Statutory Tax Calculations',
            content: 'TilePoint complies with Philippine Bureau of Internal Revenue (BIR) POS standards. Every transaction properly computes VATable Sales (Sales Net of VAT), 12% Output VAT, VAT-Exempt Sales, and Zero-Rated Sales.',
            table: {
              headers: ['Tax Classification', 'Formula / Rate', 'Application'],
              rows: [
                ['12% Output VAT', 'VATable Sales * 0.12', 'Applied to standard retail tile sales.'],
                ['VATable Sales', 'Total / 1.12', 'Net tax base before 12% tax addition.'],
                ['VAT-Exempt Sales', '0% VAT Rate', 'Senior Citizen / PWD qualified purchases.'],
                ['Zero-Rated Sales', '0% VAT Rate', 'Exported materials or PEZA enterprise zones.']
              ]
            }
          },
          {
            id: 'bir-discount-rules',
            heading: 'Discount Book Recording Rules',
            content: 'Senior Citizen and Persons With Disability (PWD) 20% statutory discounts are tracked in dedicated BIR discount ledger books with customer ID numbers. Receipts prominently reflect "Discount Applied:" and net payable amounts.',
            callout: {
              type: 'note',
              title: 'Audit Trail Requirement',
              message: 'Cashiers must record the Senior/PWD identification card number on the physical sales receipt copy for monthly tax audit compliance.'
            }
          },
          {
            id: 'electronic-transmission',
            heading: 'Sales Transmission & Ledger Export',
            content: 'Generate official end-of-day BIR Z-Read reports, periodic sales journals, and consolidated Excel/CSV exports formatted for electronic submission.'
          }
        ]
      }
    ]
  },
  {
    id: 'shortcuts-reference',
    name: 'Shortcuts & Help',
    iconName: 'Command',
    articles: [
      {
        id: 'keyboard-shortcuts-index',
        title: 'Master Keyboard Shortcuts & Hotkeys',
        category: 'Shortcuts & Help',
        badge: 'Quick Reference',
        description: 'Complete hotkey cheat-sheet for rapid, mouse-free cashiering and quick module navigation.',
        readTime: '3 min read',
        iconName: 'Command',
        targetTab: 'pos',
        targetTabLabel: 'Open POS Terminal',
        keywords: ['shortcuts', 'hotkeys', 'keyboard', 'f7', 'f2', 'f8', 'esc', 'quick switch'],
        sections: [
          {
            id: 'pos-hotkeys',
            heading: 'POS Terminal Cashiering Hotkeys',
            content: 'Cashiers can operate high-throughput checkout counters entirely via keyboard shortcuts without touching a mouse.',
            shortcuts: [
              { key: 'F2', description: 'Jump to Product Search field' },
              { key: 'F3', description: 'Add or Select Customer profile' },
              { key: 'F4', description: 'Open Discount scheme modal' },
              { key: 'F7', description: 'Execute Settlement (Finalize payment & print receipt)' },
              { key: 'F8', description: 'Open Tile Sizing & Box Calculator' },
              { key: 'Esc', description: 'Close open modal / Clear active search' }
            ]
          },
          {
            id: 'global-navigation-hotkeys',
            heading: 'Global Navigation & System Shortcuts',
            content: 'Quickly traverse enterprise modules and trigger global actions.',
            shortcuts: [
              { key: 'Ctrl + K', description: 'Open Quick Module Switcher dialog' },
              { key: 'Ctrl + P', description: 'Print active screen / PDF preview' },
              { key: 'F1', description: 'Open Help & Documentation Center' }
            ]
          }
        ]
      },
      {
        id: 'troubleshooting-faq',
        title: 'Troubleshooting & Frequently Asked Questions',
        category: 'Shortcuts & Help',
        badge: 'Support & FAQ',
        description: 'Solutions for common operational challenges: sync warnings, receipt printer jams, offline mode recovery, and PIN resets.',
        readTime: '4 min read',
        iconName: 'AlertCircle',
        targetTab: 'dashboard',
        targetTabLabel: 'Open Dashboard',
        keywords: ['troubleshooting', 'faq', 'printer jam', 'sync error', 'pin reset', 'offline recovery'],
        sections: [
          {
            id: 'offline-recovery-troubleshooting',
            heading: 'Sync Status Showing Amber or Red',
            content: 'If the avatar sync indicator shows Amber (Syncing/Queuing) or Red (Offline), your terminal is operating on local AlaSQL persistence. Check your Wi-Fi or LAN cable. Once connectivity is re-established, the transaction outbox automatically flushes queued sales to the server without data loss.',
            callout: {
              type: 'tip',
              title: 'Do Not Clear Cache',
              message: 'Never clear browser cache or local storage while sync indicator is Amber or Red, as pending transactions are safely queued in local storage.'
            }
          },
          {
            id: 'printer-troubleshooting',
            heading: 'Receipt Thermal Printer Issues',
            content: 'If receipts fail to print: 1) Verify the USB/Ethernet printer cable is securely connected. 2) Ensure the printer paper roll has sufficient 80mm thermal paper. 3) You can reprint any transaction anytime from the POS Sales Ledger tab.'
          },
          {
            id: 'forgotten-pin',
            heading: 'Forgotten Manager Authorization PIN',
            content: 'If a store manager forgets their 4-digit price override PIN, an authorized System Administrator can reset credentials under the Admin Profit & User Security module.'
          }
        ]
      }
    ]
  }
];

export const ALL_DOC_ARTICLES: DocArticle[] = DOCS_CATEGORIES.flatMap(cat => cat.articles);
