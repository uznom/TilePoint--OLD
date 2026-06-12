/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  BookOpen, 
  ShoppingCart, 
  Layers, 
  TrendingUp, 
  Truck, 
  HelpCircle, 
  CheckCircle2, 
  ChevronRight, 
  Sparkles,
  Building2,
  LockKeyhole,
  FileText,
  MousePointerClick,
  UserCheck,
  Printer
} from 'lucide-react';

interface TutorialTopic {
  id: string;
  title: string;
  category: string;
  icon: React.ComponentType<any>;
  shortDesc: string;
  steps: {
    title: string;
    description: string;
    actionTip?: string;
  }[];
}

const TUTORIALS_DATA: TutorialTopic[] = [
  {
    id: 'pos',
    title: 'POS Checkout & Tile Sales',
    category: 'Billing & Cashier',
    icon: ShoppingCart,
    shortDesc: 'Learn how to scan products, add customer profile info, check tile stock availability, apply discounts, and generate official sales records.',
    steps: [
      {
        title: 'Open your Active Shift Drawer',
        description: 'Before checkout, navigate to "Shift drawer" under Sales directory and declare your initial start cash. This locks and audits cash registers for the day.',
        actionTip: 'Quick Tip: Cashier operations are completely blocked until the active shift is created.'
      },
      {
        title: 'Select Products into the Cart',
        description: 'Go to "POS Checkout Mode", browsable by categories. Tap on tile products to add them to your active checkout list. The screen displays live Stock status for B1, B2, B3 nodes.',
        actionTip: 'Quick Tip: Hover over any product to instantly preview its dimensions and description details.'
      },
      {
        title: 'Set Customer Details & Discounts',
        description: 'Input the customer name for invoice tracking. You can optionally apply a percentage-based discount or manual numeric deductions if pre-approved by branch managers.',
        actionTip: 'Important: Manager safety PIN authorization code (4-digits) is strictly required for manager-level overrides.'
      },
      {
        title: 'Finalize Payment & Print Receipt',
        description: 'Select Cash, GCash, Maya, Credit Card, or Bank Transfer as your payment node. Input the amount tendered, match the breakdown, and print the auto-generated tax invoice receipt.',
        actionTip: 'Note: Completed transactions automatically sync in real-time to the central ledger database.'
      }
    ]
  },
  {
    id: 'inventory',
    title: 'Inventory & Stock Transfers',
    category: 'Logistics',
    icon: Layers,
    shortDesc: 'How to manage tile assets, track warehouse stock levels, request transmittals, and initiate transfers between branches.',
    steps: [
      {
        title: 'Review Warehouse Stocks',
        description: 'Under "Inventory" -> "Stocks", observe real-time color-coded stock count gauges (Green = healthy, Yellow = low stock, Red = out-of-stock) for all registered tile SKU items.',
        actionTip: 'Feature: Use the search bar to filter by custom criteria: Ceramic, Porcelain, Glossy, Matte, etc.'
      },
      {
        title: 'Initiate Stock Transfer Request',
        description: 'To transfer products from and to branches, choose "Stocks Transfer" and press "Create Stock Transfer". Specify the Origin and Destination branches, items, quantity, and reason.',
        actionTip: 'Note: Stocks remain locked in the origin branch during transfer transit.'
      },
      {
        title: 'Transmit Cargo Dispatch & Accept',
        description: 'Managers in the receiving branch must view the pending transmittal index to confirm delivery receipt and officially ingest products into the local branch inventory ledger.',
        actionTip: 'Crucial: Never receipt stocks until physical count has been validated by dispatch personnel.'
      }
    ]
  },
  {
    id: 'shift',
    title: 'Daily Shift Drawer & Balancing',
    category: 'Finance Auditing',
    icon: LockKeyhole,
    shortDesc: 'Understand how cashiers audit their physical register drawer balance, account for petty expenses, and report daily shift summaries.',
    steps: [
      {
        title: 'Declare Opening Ledger Balance',
        description: 'Every shift starts with a verified cash base in physical bill counts. Declaring this ensures correct net-margins are computed at checkout completion.',
      },
      {
        title: 'Log Daily Expenses',
        description: 'If you need to pay for showroom utilities, office goods, or dispatch services directly from the drawer, log them in "Add Expenses" to keep ledger entries accurate.',
        actionTip: 'Rule: Expenses deducted directly from current shift reserves will subtract from final "Expected Cash" values.'
      },
      {
        title: 'End Shift Count & Reconciliation',
        description: 'At shift wrap up, enter the exact physical cash amount remaining. The system compares physical counts with computerized sales, flagging shortages or overages immediately.',
        actionTip: 'Audit Rule: Standard variance exceeding ₱50 requires a mandatory branch manager override annotation.'
      }
    ]
  },
  {
    id: 'deliveries',
    title: 'Cargo Delivery Logistics Scheduler',
    category: 'Warehouse Dispatch',
    icon: Truck,
    shortDesc: 'Manage customer deliveries, schedule trucks, dispatch crew personnel, and capture status log records.',
    steps: [
      {
        title: 'Add Cargo Dispatch Record',
        description: 'Under "Cargo Deliveries" -> "Delivery Center", click "Create Delivery Order". Link it to a completed checkout sale number, specify customer address, and schedule the delivery date.',
      },
      {
        title: 'Assign Truck and Dispatch Fleet Crew',
        description: 'Select an available truck/carrier, assign an authorized branch system driver, and helper staff. This updates state to "Dispatched / Transit".',
        actionTip: 'Feature: Crew members can update shipment logs to notify showroom personnel in real-time.'
      },
      {
        title: 'Sign and Lock Digital Receipt',
        description: 'On physical arrival, dispatcher inputs receiver name, uploads proof of delivery, and locks customer signature. This closes the delivery timeline cleanly.',
        actionTip: 'Audit Proof: The delivery state converts immediately to "Completed" to update sales ledger targets.'
      }
    ]
  }
];

export const TutorialOnboarding: React.FC = () => {
  const [selectedTopicId, setSelectedTopicId] = useState('pos');
  const [activeStepIdx, setActiveStepIdx] = useState(0);

  const selectedTopic = TUTORIALS_DATA.find(t => t.id === selectedTopicId) || TUTORIALS_DATA[0];

  const handleSelectTopic = (id: string) => {
    setSelectedTopicId(id);
    setActiveStepIdx(0);
  };

  const handlePrintCompleteManual = () => {
    const printHtml = `
      <html>
        <head>
          <title>TilePoint - Operations & Instructions Manual</title>
          <style>
            @page {
              size: letter;
              margin: 2cm;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              color: #111111;
              background-color: #ffffff;
              line-height: 1.6;
              font-size: 11pt;
              padding: 0;
              margin: 0;
            }
            
            /* Cover Page Styling */
            .cover-page {
              height: 25cm;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              border: 4px double #111;
              padding: 2.5cm 2cm;
              box-sizing: border-box;
              page-break-after: always;
            }
            .cover-header {
              text-align: center;
              margin-top: 1.5cm;
            }
            .logo-text {
              font-size: 32pt;
              font-weight: 950;
              letter-spacing: 3px;
              color: #000000;
              margin-bottom: 5px;
            }
            .logo-sub {
              font-size: 11pt;
              font-weight: bold;
              text-transform: uppercase;
              letter-spacing: 4px;
              color: #555555;
              border-bottom: 2px solid #222222;
              padding-bottom: 12px;
              display: inline-block;
            }
            .cover-body {
              text-align: center;
              margin: 3.5cm 0;
            }
            .manual-title {
              font-size: 26pt;
              font-weight: 900;
              text-transform: uppercase;
              line-height: 1.25;
              margin-bottom: 15px;
              letter-spacing: 0.5px;
            }
            .manual-subtitle {
              font-size: 13pt;
              color: #444444;
              font-weight: 500;
              max-width: 90%;
              margin: 0 auto;
            }
            .cover-footer {
              text-align: center;
              font-size: 10pt;
              color: #444444;
              border-top: 1px solid #e5e7eb;
              padding-top: 1.5cm;
            }
            .divider-line {
              width: 100px;
              height: 4px;
              background-color: #111;
              margin: 25px auto;
            }
            
            /* Sections & Typography */
            h1 {
              font-size: 18pt;
              margin-top: 1.8cm;
              margin-bottom: 0.6cm;
              border-bottom: 2px solid #111111;
              padding-bottom: 10px;
              text-transform: uppercase;
              page-break-before: always;
              font-weight: 850;
              color: #000000;
            }
            h1.first-section {
              page-break-before: avoid;
            }
            h2 {
              font-size: 13pt;
              margin-top: 0.8cm;
              margin-bottom: 0.3cm;
              color: #111111;
              text-transform: uppercase;
              border-left: 3px solid #111111;
              padding-left: 10px;
              font-weight: 750;
            }
            h3 {
              font-size: 11pt;
              margin-top: 0.5cm;
              margin-bottom: 0.2cm;
              color: #333333;
              font-weight: 700;
            }
            p {
              margin-top: 0;
              margin-bottom: 15px;
              text-align: justify;
              color: #222222;
            }
            
            /* TOC and Lists */
            .toc-list {
              list-style-type: none;
              padding: 0;
              margin: 1.5cm 0;
            }
            .toc-item {
              display: flex;
              justify-content: space-between;
              margin-bottom: 15px;
              font-size: 11pt;
            }
            .toc-label {
              font-weight: 600;
            }
            .toc-dots {
              flex-grow: 1;
              border-bottom: 1px dotted #888888;
              margin: 0 10px;
              position: relative;
              top: -4px;
            }
            .toc-num {
              font-weight: bold;
              min-width: 50px;
              text-align: right;
            }
            
            /* Operational callouts */
            .guideline-tip {
              background-color: #f3f4f6;
              border-left: 4px solid #1f2937;
              padding: 14px 20px;
              margin: 20px 0;
              font-size: 10pt;
              font-style: italic;
              color: #111111;
              border-radius: 0 8px 8px 0;
            }
            .guideline-warning {
              background-color: #fef2f2;
              border-left: 4px solid #991b1b;
              padding: 14px 20px;
              margin: 20px 0;
              font-size: 10pt;
              color: #7f1d1d;
              border-radius: 0 8px 8px 0;
            }
            
            /* Lists configuration */
            ol, ul {
              margin-top: 0;
              margin-bottom: 18px;
              padding-left: 24px;
            }
            li {
              margin-bottom: 8px;
              color: #222222;
            }
            
            /* Tables */
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 25px 0;
            }
            th, td {
              border: 1px solid #cbd5e1;
              padding: 11px;
              font-size: 10pt;
              text-align: left;
            }
            th {
              background-color: #f8fafc;
              font-weight: bold;
              color: #0f172a;
              text-transform: uppercase;
              font-size: 9pt;
              letter-spacing: 0.5px;
            }
            
            /* Print Specific Overrides */
            @media print {
              .no-print {
                display: none;
              }
              body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
            }
          </style>
        </head>
        <body>
          <!-- Cover Page -->
          <div class="cover-page">
            <div class="cover-header">
              <div class="logo-text">TILEPOINT</div>
              <div class="logo-sub">Enterprise Management Ecosystem</div>
            </div>
            <div class="cover-body">
              <div class="manual-title">Operations Manual & Instructions Manual</div>
              <div class="divider-line"></div>
              <div class="manual-subtitle">The Complete Standard Reference Guidelines for Showroom Staff, Cashiers, Warehouse Logistics, and Administrators</div>
            </div>
            <div class="cover-footer">
              <div style="font-weight: bold; letter-spacing: 0.5px; margin-bottom: 4px;">Corporate Standard Operating Document • Rev v4.1</div>
              <div style="font-size: 9pt; margin-top: 3px; color: #555555;">Generated on ${new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</div>
              <div style="font-size: 8pt; color: #777777; margin-top: 10px; font-family: monospace;">TilePoint Security Token: COMPLIANCE_APPROVED_EM_04</div>
            </div>
          </div>

          <!-- Table of Contents -->
          <div style="page-break-after: always; padding: 1cm 0;">
            <h1 class="first-section" style="border-bottom: 3px solid #000; padding-bottom: 12px;">Table of Contents</h1>
            <p style="margin-top: 20px; font-size: 11pt;">This regulatory handbook outlines standard operation parameters for TilePoint branches. All personnel are required to review, comprehend, and implement these steps to guarantee fiscal accountability, catalog precision, and seamless multi-browser logistical transport.</p>
            
            <div class="toc-list" style="margin-top: 2cm;">
              <div class="toc-item">
                <span class="toc-label">Chapter I: POS Checkout, Billing & Cashiering Guidelines</span>
                <span class="toc-dots"></span>
                <span class="toc-num">Page 3</span>
              </div>
              <div class="toc-item">
                <span class="toc-label">Chapter II: Inventory Control, Warehousing & Stock Transmittals</span>
                <span class="toc-dots"></span>
                <span class="toc-num">Page 4</span>
              </div>
              <div class="toc-item">
                <span class="toc-label">Chapter III: Daily Shift Drawer Audits, Balancing & Reconciliation</span>
                <span class="toc-dots"></span>
                <span class="toc-num">Page 5</span>
              </div>
              <div class="toc-item">
                <span class="toc-label">Chapter IV: Customer Cargo Deliveries & Fleet Crew Logistics</span>
                <span class="toc-dots"></span>
                <span class="toc-num">Page 6</span>
              </div>
              <div class="toc-item">
                <span class="toc-label">Chapter V: Administrative Security, Access Controls & PIN Overrides</span>
                <span class="toc-dots"></span>
                <span class="toc-num">Page 7</span>
              </div>
            </div>
            
            <div class="guideline-tip" style="margin-top: 2.5cm;">
              <strong>Manual Administration Directive:</strong> Erica Manaban, as local general administrator, holds sole authority to authorize departures from standard procedures. Unreported drawer discrepancies will undergo procedural inquiry.
            </div>
          </div>

          <!-- Chapter I -->
          <div>
            <h1 class="first-section">Chapter I: POS Checkout & Billing Procedures</h1>
            <p>Processing customer transactions is our highest frequency action. Standard checkout steps are detailed below to ensure errorless billing logs:</p>
            
            <h2>1. Shift Drawer Prerequisite</h2>
            <p>The billing workstation automatically locks out any transaction attempts until an active shift is officially initialized. Cashiers must report their initial physical starting cash count in bill breakdowns to unlock register access.</p>
            
            <h2>2. Cart Selection & Live SKU Inspections</h2>
            <p>Using the browsable POS product tile deck, locate selections. Tap item tiles. Inspect displayed dimensions (e.g., 60x60, 30x60, 80x80) and composition (Porcelain, Cerámica, Matte, Glossy) to confirm selection accuracy. Ensure selected items possess corresponding stock inside the system node before completing checkout.</p>
            
            <h2>3. Safe Manager Override & Discount Rules</h2>
            <p>Manual price deductions, percentage discount items, or deleting active sales receipts are protected actions. The following rules govern overrides:</p>
            <ul>
              <li><strong>Discretionary Limit:</strong> Cashiers can apply standard promotional coupon files or up to 5% percentage discretion directly.</li>
              <li><strong>PIN Code Requirement:</strong> Any numeric reductions beyond 5% require manager auth. The manager must physically inspect items and key in their <strong>4-digit validation PIN</strong> (Default is 4321, adjustable under settings).</li>
            </ul>
            <div class="guideline-warning">
              <strong>Audit Notice:</strong> Every manager override PIN entry registers in the transaction audit files. Persistent log overrides without physical customer invoices are subject to auditing.
            </div>

            <h2>4. Payment Modes Verification Matrix</h2>
            <table>
              <thead>
                <tr>
                  <th>Method</th>
                  <th>Clearing Requirement</th>
                  <th>Receipt Documentation Policy</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Physical Cash</strong></td>
                  <td>Declare cash tendered. Input EXACT amount.</td>
                  <td>Confirm banknote authenticity. Change is returned from drawer safely.</td>
                </tr>
                <tr>
                  <td><strong>GCash / Electronic</strong></td>
                  <td>Scan digital QR plate. Verify receipt banner.</td>
                  <td>Transcribe the 11-digit GCash receipt transaction reference id.</td>
                </tr>
                <tr>
                  <td><strong>Credit Terminal</strong></td>
                  <td>Swipe or insert card. Wait for connection beep.</td>
                  <td>Save receipt printout copy under drawer clips.</td>
                </tr>
                <tr>
                  <td><strong>Bank Transfer</strong></td>
                  <td>Verify mobile app transaction screenshot.</td>
                  <td>Confirm bank ledger transfer arrival with branch manager before dispatch.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Chapter II -->
          <div>
            <h1>Chapter II: Inventory Control & Branch-to-Branch Transfers</h1>
            <p>Tile products undergo complex shipping cycles given heavy shipping carton loads. This chapter details visual inventory guides and branch-to-branch logistics:</p>
            
            <h2>1. Visual Alerts Stock Gaging</h2>
            <p>To reduce store shortage events, inventory monitoring panels represent product SKU levels on a continuous visual gauge:</p>
            <ul>
              <li><strong style="color: #16a34a;">Green Node:</strong> Healthy stock. Level is above target thresholds. Instant checkouts are allowed.</li>
              <li><strong style="color: #ea580c;">Yellow Node:</strong> Stock is below reorder limits. Trigger rebalancing transfers or contact dispatch suppliers immediately.</li>
              <li><strong style="color: #dc2626;">Red Node:</strong> Stock is completely empty. The system blocks cashier sales processing until stock balances are replenished.</li>
            </ul>

            <h2>2. Stock Relocation Request Protocol</h2>
            <p>When stock is allocated between branches, requestors must use the "Stocks Transfer Editor" to register the transit. Specify originating stock node, receiving warehouse node, SKU codes, item quantity, and reasoning.</p>
            
            <div class="guideline-tip">
              <strong>Procedural Rule (Transit Locks):</strong> After sending, the system places requested tiles into a locked "In Transit" status, deducting them from originating counts so they cannot be sold duplicate times during transit.
            </div>

            <h2>3. Receiving Cargo Acceptance Checks</h2>
            <p>Upon transit truck arrival, warehouse personnel must perform physical carton audits. Verify the numbers of pristine cartons versus those showing breakage fractures. Do not press "Accept Transmittal" on screen until verifying the physical condition. Once accepted, transit statuses change and stock balances combine.</p>
          </div>

          <!-- Chapter III -->
          <div>
            <h1>Chapter III: Daily Shift Drawer & Financial Reconciliation</h1>
            <p>Register balancing verifies branch integrity. All procedures in this chapter correspond directly to shift ledger files.</p>
            
            <h2>1. Starting Cash Declaration</h2>
            <p>Initialize shifts by counting actual paper notes. Input cash totals to start operations. The standardized corporate starting drawer is established at <strong>₱3,000.00</strong> to simplify change payouts.</p>
            
            <h2>2. Logging Drawer Expenses</h2>
            <p>If minor funds must be withdrawn from register physical change piles for office needs, food runs, or delivery gas, log these as active expenses to maintain correct ledger data. Expense types are categorized for accounting clarity.</p>

            <h2>3. Shift Reconciliation Audit Rules</h2>
            <p>At shift end, close transactions and enter actual counted cash. The computer estimates standard Expected Cash according to this formula:</p>
            <div class="guideline-tip" style="text-align: center; font-family: monospace; font-weight: bold;">
              Expected Cash = Starting Cash + Total Cash Sales - Total Drawer Expenses
            </div>
            
            <p>The system calculates differences, highlighting any variances:</p>
            <table>
              <thead>
                <tr>
                  <th>State</th>
                  <th>Analysis of Variance</th>
                  <th>Mandatory Security Procedure</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Balanced (₱0.00 Variance)</strong></td>
                  <td>Actual cash matches expected cash.</td>
                  <td>Confirm closure. Lock cash box and send summary dispatch.</td>
                </tr>
                <tr>
                  <td><strong>Shortage (Negative State)</strong></td>
                  <td>Counting reveals physical cash is lesser than computer expectation.</td>
                  <td>File explanation log notes. Shortages exceeding ₱150 undergo register drawer inspection.</td>
                </tr>
                <tr>
                  <td><strong>Overage (Positive State)</strong></td>
                  <td>Physical cash exceeds expected totals.</td>
                  <td>Leave excess inside the till. File explanatory report. Do not distribute overage to employees.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Chapter IV -->
          <div>
            <h1>Chapter IV: Customer Cargo Deliveries & Fleet Scheduler</h1>
            <p>For large construction projects, reliable dispatch procedures protect company liability. Follow standard dispatch guidelines:</p>
            
            <h2>1. Dispatch Order Creation</h2>
            <p>Bind all active shipments to a valid sales receipt ID. Note address specifications, landmarks, recipient phone numbers, and delivery dates.</p>
            
            <h2>2. Vehicle Dispatch Logistics</h2>
            <p>Our fleet consists of three primary classes. Match dispatch weights to the appropriate category:</p>
            <ul>
              <li><strong>6-Wheeler Flatbed:</strong> Maximum load 400 cartons (Required for bulk warehouse dispatches).</li>
              <li><strong>4-Wheeler Cargo Truck:</strong> Maximum load 180 cartons (Standard for local residence requests).</li>
              <li><strong>Showroom Utility Trike:</strong> Maximum load 30 cartons (Ideal for urgent, same-day site replacements).</li>
            </ul>
            <div class="guideline-warning">
              <strong>Crew Rule:</strong> Each delivery requires an assigned Driver and Logistics Helper. Never allow single-person dispatches for orders exceeding 20 cartons due to heavy lifting safety standards.
            </div>

            <h2>3. Signature Handover Verification</h2>
            <p>On physical arrival at the job site, follow these checkout procedures:</p>
            <ol>
              <li>Audit carton quantities with the receiver before moving boxes off the vehicle.</li>
              <li>Have the receiver sign the digital pad on your device, or capture a clear photo of the delivered pallets at the customer site.</li>
              <li>Enter the recipient's name and tap "Complete Delivery" to release vehicle constraints.</li>
            </ol>
          </div>

          <!-- Chapter V -->
          <div>
            <h1>Chapter V: Administrative Safety & Access Oversight</h1>
            <p>Security and database oversight protect critical business records. Administrators must implement standard security controls:</p>
            
            <h2>1. User Audits and Access Management</h2>
            <p>Limit administrative accounts exclusively to general managers. Cashiers are restricted from accessing system data views and transfer lists. Password files must meet security standards.</p>
            
            <h2>2. Safe Manager PIN Code Practices</h2>
            <p>Branch manager PIN credentials must be updated monthly. To maintain security, managers must never share active security PIN codes through messages, sticky notes, or verbally across checkout lanes.</p>

            <h2>3. Real-Time Oversight Monitor</h2>
            <p>Administrators should regularly review the Live Sales Transmission Monitor to detect register anomalies. Checking revenue composition progress and cashier leaderboard states helps detect discrepancies early.</p>
            
            <div class="guideline-tip" style="margin-top: 5cm; text-align: center;">
              <strong>[ TILEPOINT COMPLIANCE LEDGER SECURED ]</strong><br/>
              <span style="font-size: 8.5pt; color: #666666; font-style: normal;">This document serves as standard operating documentation. Bypassing guidelines is subject to administrative review.</span>
            </div>
          </div>
        </body>
      </html>
    `;

    let opened = false;
    try {
      const pWin = window.open('', '_blank', 'width=950,height=750');
      if (pWin) {
        pWin.document.write(printHtml);
        pWin.document.close();
        opened = true;
      }
    } catch (e) {
      console.warn("Popup blocked. Engaging background iframe printing fallback.", e);
    }

    if (!opened) {
      try {
        const fallFrame = document.createElement('iframe');
        fallFrame.style.position = 'fixed';
        fallFrame.style.width = '0px';
        fallFrame.style.height = '0px';
        fallFrame.style.border = 'none';
        fallFrame.style.bottom = '0px';
        fallFrame.style.right = '0px';
        fallFrame.style.opacity = '0';
        document.body.appendChild(fallFrame);

        const fdoc = fallFrame.contentWindow ? fallFrame.contentWindow.document : fallFrame.contentDocument;
        if (fdoc) {
          fdoc.open();
          fdoc.write(printHtml);
          fdoc.close();

          setTimeout(() => {
            if (fallFrame.contentWindow) {
              fallFrame.contentWindow.focus();
              fallFrame.contentWindow.print();
            }
            setTimeout(() => {
              if (document.body.contains(fallFrame)) {
                document.body.removeChild(fallFrame);
              }
            }, 4000);
          }, 800);
        }
      } catch (err) {
        console.error("Manual printing fallback failed", err);
      }
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-2" id="tilepoint-tutorials-panel">
      
      {/* Dynamic Header Badge */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-gradient-to-r from-m3-primary/5 via-m3-secondary-container/15 to-transparent rounded-2xl border border-m3-outline-variant/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 bg-m3-primary/5 rounded-full blur-2xl pointer-events-none" />
        <div className="space-y-1 relative z-10">
          <div className="inline-flex items-center gap-1 text-[10px] uppercase font-black tracking-wider text-m3-primary bg-m3-primary/10 px-2.5 py-1 rounded-full border border-m3-primary/20">
            <Sparkles className="h-3 w-3" /> System Academy Guide
          </div>
          <h2 className="text-xl md:text-2xl font-black text-m3-on-surface uppercase tracking-tight">Onboarding Walkthrough</h2>
          <p className="text-xs text-m3-on-surface-variant max-w-xl font-medium">
            Welcome to the official interactive tutorial suite. Understand the transactional, logs, and logistical functions of your newly created enterprise setup.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 relative z-10 shrink-0">
          <div className="flex items-center gap-2 bg-m3-surface p-2.5 rounded-xl border border-m3-outline-variant/30 shadow-sm">
            <BookOpen className="h-5 w-5 text-m3-primary" />
            <div className="text-left">
              <div className="text-[10px] font-black uppercase text-m3-on-surface-variant">Active Manual</div>
              <div className="text-xs font-bold text-m3-on-surface">Digital Operation Procedures</div>
            </div>
          </div>

          <button
            type="button"
            onClick={handlePrintCompleteManual}
            className="flex items-center gap-2 px-4 py-2.5 bg-m3-primary hover:bg-m3-primary/95 text-white rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-md hover:shadow-lg active:scale-95 cursor-pointer border border-transparent"
            title="Download or Print complete Ops & Instructions handbook to PDF format"
          >
            <Printer className="h-4 w-4 shrink-0" />
            <span>Save Complete Manual (PDF)</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Topics selector rail */}
        <div className="lg:col-span-4 space-y-3">
          <span className="text-[9.5px] font-black uppercase tracking-widest text-zinc-400 pl-1 block mb-1">Browse Procedures</span>
          <div className="space-y-2">
            {TUTORIALS_DATA.map((topic) => {
              const Icon = topic.icon;
              const isSelected = topic.id === selectedTopicId;
              return (
                <button
                  id={`tutorial-topic-btn-${topic.id}`}
                  key={topic.id}
                  onClick={() => handleSelectTopic(topic.id)}
                  className={`w-full text-left p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3.5 group select-none ${
                    isSelected 
                      ? 'bg-m3-primary-container/20 border-m3-primary/50 text-m3-on-surface' 
                      : 'bg-m3-surface-low border-m3-outline-variant/30 hover:bg-m3-primary/5 text-m3-on-surface-variant'
                  }`}
                >
                  <div className={`p-2 rounded-xl border m3-shape-asymmetric transition-transform group-hover:scale-105 ${
                    isSelected ? 'bg-m3-primary text-m3-on-primary border-transparent' : 'bg-m3-surface-high border-m3-outline-variant/40'
                  }`}>
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[9.5px] uppercase font-mono font-bold text-m3-primary tracking-wider">{topic.category}</span>
                    <h3 className="text-xs font-black tracking-tight">{topic.title}</h3>
                    <p className="text-[11px] line-clamp-2 leading-snug font-medium text-m3-on-surface-variant/80">{topic.shortDesc}</p>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="p-4 bg-m3-surface-high/30 rounded-xl border border-m3-outline-variant/20 space-y-2.5">
            <h4 className="text-[10px] font-black uppercase tracking-wider text-m3-on-surface flex items-center gap-1.5">
              <UserCheck className="h-3.5 w-3.5 text-m3-primary" /> Active Setup Information
            </h4>
            <p className="text-[10.5px] text-m3-on-surface-variant font-medium leading-relaxed">
              This sandbox POS environment is configured for offline-resilient local operation. Transactions are stored directly in your browser's persistent localStorage structure.
            </p>
          </div>
        </div>

        {/* Right Tutorial detail stage */}
        <div className="lg:col-span-8 bg-m3-surface-low rounded-2xl border border-m3-outline-variant/30 overflow-hidden shadow-sm">
          
          {/* Detail stage top bar */}
          <div className="px-6 py-4 bg-m3-surface-high/50 border-b border-m3-outline-variant/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-m3-primary/10 rounded-lg text-m3-primary">
                <BookOpen className="h-4 w-4" />
              </div>
              <div>
                <span className="text-[9.5px] font-mono uppercase text-m3-primary px-1.5 py-0.5 bg-m3-primary/10 rounded">Active Module</span>
                <h3 className="text-xs font-black text-m3-on-surface uppercase tracking-tight mt-0.5">{selectedTopic.title}</h3>
              </div>
            </div>
            <div className="text-right text-[10px] font-mono text-m3-on-surface-variant">
              <span>Procedure {activeStepIdx + 1} of {selectedTopic.steps.length}</span>
            </div>
          </div>

          {/* Master visual / slide view */}
          <div className="p-6 md:p-8 space-y-6">
            
            {/* Steps indicator nodes */}
            <div className="flex items-center gap-1.5 pb-4 border-b border-m3-outline-variant/15 overflow-x-auto">
              {selectedTopic.steps.map((st, sidx) => (
                <button
                  id={`tutorial-${selectedTopicId}-progress-${sidx}`}
                  key={sidx}
                  onClick={() => setActiveStepIdx(sidx)}
                  className={`px-3 py-1.5 rounded-full text-[10px] font-mono font-bold tracking-wider cursor-pointer uppercase border transition-all ${
                    sidx === activeStepIdx
                      ? 'bg-m3-primary text-m3-on-primary border-transparent'
                      : sidx < activeStepIdx
                        ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                        : 'bg-m3-surface hover:bg-m3-primary/5 text-m3-on-surface-variant border-m3-outline-variant/30'
                  }`}
                >
                  <span className="flex items-center gap-1">
                    {sidx < activeStepIdx ? <CheckCircle2 className="h-3 w-3" /> : null}
                    Step {sidx + 1}
                  </span>
                </button>
              ))}
            </div>

            {/* Selected Step Description Screen */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <span className="text-[10px] uppercase font-black tracking-widest text-m3-primary font-mono block">Action Workflow • Stage {activeStepIdx + 1}</span>
                <h2 className="text-lg font-black tracking-tight text-m3-on-surface leading-tight">
                  {selectedTopic.steps[activeStepIdx].title}
                </h2>
              </div>
              
              <div className="text-xs text-m3-on-surface-variant leading-relaxed font-sans font-medium bg-m3-surface-high/40 p-4 rounded-xl border border-m3-outline-variant/15">
                {selectedTopic.steps[activeStepIdx].description}
              </div>

              {selectedTopic.steps[activeStepIdx].actionTip && (
                <div className="p-3.5 bg-m3-primary/5 rounded-xl border border-m3-primary/10 flex items-start gap-2.5 text-left">
                  <MousePointerClick className="h-4.5 w-4.5 text-m3-primary shrink-0 mt-0.5" />
                  <p className="text-[11px] text-m3-on-surface-variant leading-normal">
                    <span className="font-black text-m3-primary uppercase mr-1 inline-block text-[10px]">Reference Guideline:</span> 
                    {selectedTopic.steps[activeStepIdx].actionTip}
                  </p>
                </div>
              )}
            </div>

            {/* Stepper buttons */}
            <div className="flex items-center justify-between pt-6 border-t border-m3-outline-variant/15">
              <button
                id={`tutorial-${selectedTopicId}-prev`}
                disabled={activeStepIdx === 0}
                onClick={() => setActiveStepIdx(prev => Math.max(0, prev - 1))}
                className="px-4 py-2 text-xs font-bold uppercase rounded-xl border border-m3-outline-variant/40 hover:bg-m3-primary/5 transition-all text-m3-on-surface disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
              >
                Previous Step
              </button>

              {activeStepIdx < selectedTopic.steps.length - 1 ? (
                <button
                  id={`tutorial-${selectedTopicId}-next`}
                  onClick={() => setActiveStepIdx(prev => Math.min(selectedTopic.steps.length - 1, prev + 1))}
                  className="px-5 py-2 bg-m3-primary hover:bg-m3-primary/95 text-m3-on-primary font-extrabold text-xs uppercase tracking-wider rounded-xl cursor-pointer flex items-center gap-1 shadow-sm transition-all shadow-m3-primary/10"
                >
                  Next Step
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              ) : (
                <div className="p-2 py-1 bg-emerald-500/10 rounded-lg border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" /> Operations Manual Complete
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
