/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  BookOpen, 
  ShoppingCart, 
  Layers, 
  Truck, 
  CheckCircle2, 
  ChevronRight, 
  Sparkles,
  LockKeyhole,
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
  const safeSteps = selectedTopic?.steps || [];
  const safeActiveStepIdx = Math.min(activeStepIdx, Math.max(0, safeSteps.length - 1));
  const currentStep = safeSteps[safeActiveStepIdx] || { title: 'No Steps Defined', description: 'This module is under development.' };

  const handleSelectTopic = (id: string) => {
    setSelectedTopicId(id);
    setActiveStepIdx(0);
  };

  const handlePrintCompleteManual = () => {
    const printHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>TilePoint Standard Operating Manual & Guidelines Handbook</title>
  <style>
    @page {
      size: A4;
      margin: 1.5cm;
    }
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      color: #1a1a1a;
      line-height: 1.6;
      font-size: 10pt;
      margin: 0;
      padding: 0;
    }
    .cover-page {
      page-break-after: always;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      min-height: 90vh;
      text-align: center;
      border: 3px double #006FEE;
      padding: 3cm 2cm;
      box-sizing: border-box;
    }
    .cover-badge {
      display: inline-block;
      padding: 6px 14px;
      font-size: 8pt;
      font-weight: 800;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      color: #006FEE;
      border: 1px solid #006FEE;
      border-radius: 9999px;
      margin-bottom: 24px;
    }
    .cover-title {
      font-size: 26pt;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #0f172a;
      margin: 0 0 12px 0;
      line-height: 1.2;
    }
    .cover-subtitle {
      font-size: 13pt;
      color: #475569;
      font-weight: 600;
      margin-bottom: 36px;
    }
    .cover-meta {
      font-size: 9pt;
      color: #64748b;
      margin-top: 48px;
      border-top: 1px solid #e2e8f0;
      padding-top: 24px;
      width: 80%;
    }
    .toc-page {
      page-break-after: always;
      padding: 1cm 0;
    }
    .toc-title {
      font-size: 16pt;
      font-weight: 800;
      text-transform: uppercase;
      border-bottom: 2px solid #006FEE;
      padding-bottom: 8px;
      margin-bottom: 24px;
      color: #006FEE;
    }
    .toc-item {
      display: flex;
      justify-content: space-between;
      margin-bottom: 12px;
      font-size: 10pt;
      border-bottom: 1px dotted #cbd5e1;
      padding-bottom: 4px;
    }
    .toc-label {
      font-weight: 700;
      color: #1e293b;
    }
    .toc-dots {
      flex: 1;
      border-bottom: 1px dotted #94a3b8;
      margin: 0 8px 4px 8px;
    }
    .toc-num {
      font-weight: 800;
      color: #006FEE;
    }
    h1 {
      font-size: 14pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #006FEE;
      border-bottom: 1.5px solid #e2e8f0;
      padding-bottom: 6px;
      margin-top: 24px;
      margin-bottom: 12px;
      page-break-before: always;
    }
    h1.first-section {
      page-break-before: avoid;
    }
    h2 {
      font-size: 11pt;
      font-weight: 700;
      color: #0f172a;
      margin-top: 16px;
      margin-bottom: 6px;
    }
    p {
      margin: 0 0 10px 0;
      text-align: justify;
    }
    ul, ol {
      margin: 0 0 12px 0;
      padding-left: 20px;
    }
    li {
      margin-bottom: 4px;
    }
    .guideline-tip {
      background: #eff6ff;
      border-left: 3.5px solid #006FEE;
      padding: 10px 14px;
      border-radius: 0 6px 6px 0;
      font-size: 9pt;
      color: #1e3a8a;
      margin: 14px 0;
    }
    .guideline-warning {
      background: #fffbeb;
      border-left: 3.5px solid #f59e0b;
      padding: 10px 14px;
      border-radius: 0 6px 6px 0;
      font-size: 9pt;
      color: #78350f;
      margin: 14px 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 14px 0;
      font-size: 8.5pt;
    }
    th, td {
      border: 1px solid #cbd5e1;
      padding: 6px 10px;
      text-align: left;
    }
    th {
      background-color: #f1f5f9;
      font-weight: 800;
      text-transform: uppercase;
      font-size: 8pt;
      color: #334155;
    }
  </style>
</head>
<body>
  <!-- Cover Page -->
  <div class="cover-page">
    <div class="cover-badge">Official Standard Operating Manual</div>
    <div class="cover-title">TilePoint ERP</div>
    <div class="cover-subtitle">Enterprise Operational Playbook & Procedural Guidelines</div>
    <div style="font-size: 9.5pt; color: #64748b; max-width: 400px; line-height: 1.5;">
      Standard Operating Procedures (SOP) for Showroom Cashiering, Inventory Warehousing, Fleet Logistics, and Executive Auditing.
    </div>
    <div class="cover-meta">
      <div><strong>Version:</strong> 2.4.0 Production Release</div>
      <div><strong>Document ID:</strong> TP-SOP-2026-HQ</div>
      <div><strong>Scope:</strong> Multi-Branch Operations Network</div>
      <div style="margin-top: 8px;"><em>Authorized for internal enterprise operations only.</em></div>
    </div>
  </div>

  <!-- Table of Contents -->
  <div class="toc-page">
    <div class="toc-title">Table of Contents</div>
    <div class="toc-item">
      <span class="toc-label">Chapter I: Point-of-Sale (POS) Checkout & Billing Operations</span>
      <span class="toc-dots"></span>
      <span class="toc-num">Page 3</span>
    </div>
    <div class="toc-item">
      <span class="toc-label">Chapter II: Inventory Control, Stocks Management & Transmittals</span>
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

    <div class="guideline-tip" style="margin-top: 2.5cm;">
      <strong>Manual Administration Directive:</strong> Authorized System Administrators hold sole authority to authorize departures from standard procedures. Unreported drawer discrepancies will undergo procedural inquiry.
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
    <div className="space-y-6 w-full min-h-full p-1 sm:p-2 md:p-4 text-left" id="tilepoint-tutorials-panel">
      {/* Dynamic Header Badge */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/70 dark:border-white/10 shadow-elevation-soft relative overflow-hidden">
        <div className="space-y-1 relative z-10">
          <div className="inline-flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20 font-mono">
            <Sparkles className="h-3 w-3" /> System Academy Guide
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-foreground tracking-tight">Onboarding Walkthrough</h2>
          <p className="text-xs text-default-500 max-w-xl font-medium">
            Welcome to the official interactive tutorial suite. Understand the transactional, logs, and logistical functions of your newly created enterprise setup.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 relative z-10 shrink-0">
          <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 p-2.5 rounded-2xl border border-zinc-200/50 dark:border-white/5">
            <BookOpen className="h-4.5 w-4.5 text-primary" />
            <div className="text-left">
              <div className="text-[10px] font-bold uppercase text-default-400 font-mono">Active Manual</div>
              <div className="text-xs font-bold text-foreground">Digital Operation Procedures</div>
            </div>
          </div>

          <button
            type="button"
            onClick={handlePrintCompleteManual}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/95 text-white rounded-full font-bold text-xs uppercase tracking-wider transition-all shadow-[0_2px_8px_rgba(0,111,238,0.25)] active:scale-95 cursor-pointer font-mono"
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
          <span className="text-[10px] font-bold uppercase tracking-wider text-default-500 pl-1 block mb-1 font-mono">Browse Procedures</span>
          <div className="space-y-2">
            {TUTORIALS_DATA.map((topic) => {
              const Icon = topic.icon;
              const isSelected = topic.id === selectedTopicId;
              return (
                <button
                  id={`tutorial-topic-btn-${topic.id}`}
                  key={topic.id}
                  onClick={() => handleSelectTopic(topic.id)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 group select-none ${
                    isSelected 
                      ? 'bg-white dark:bg-zinc-900 border-primary shadow-[0_2px_12px_rgba(0,111,238,0.15)] text-foreground' 
                      : 'bg-white dark:bg-zinc-900 border-zinc-200/70 dark:border-white/10 hover:border-primary/40 shadow-elevation-soft text-default-500'
                  }`}
                >
                  <div className={`p-2.5 rounded-2xl border transition-transform group-hover:scale-105 shrink-0 ${
                    isSelected ? 'bg-primary text-primary-foreground border-primary' : 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200/50 dark:border-white/5 text-primary'
                  }`}>
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <span className="text-[9.5px] uppercase font-bold text-primary tracking-wider font-mono">{topic.category}</span>
                    <h3 className="text-xs font-bold text-foreground">{topic.title}</h3>
                    <p className="text-[11px] line-clamp-2 leading-relaxed font-medium text-default-500">{topic.shortDesc}</p>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/70 dark:border-white/10 shadow-elevation-soft space-y-2">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5 font-mono">
              <UserCheck className="h-3.5 w-3.5 text-primary" /> Active Setup Information
            </h4>
            <p className="text-[11px] text-default-500 font-medium leading-relaxed">
              This sandbox POS environment is configured for offline-resilient local operation. Transactions are stored directly in your browser's persistent localStorage structure.
            </p>
          </div>
        </div>

        {/* Right Tutorial detail stage */}
        <div className="lg:col-span-8 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/70 dark:border-white/10 overflow-hidden shadow-elevation-soft">
          {/* Detail stage top bar */}
          <div className="px-6 py-4 bg-zinc-100/50 dark:bg-zinc-800/50 border-b border-divider/15 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary/10 rounded-xl text-primary">
                <BookOpen className="h-4 w-4" />
              </div>
              <div>
                <span className="text-[9.5px] uppercase text-primary px-2 py-0.5 bg-primary/10 rounded-full font-bold font-mono">Active Module</span>
                <h3 className="text-xs font-bold text-foreground uppercase mt-0.5">{selectedTopic.title}</h3>
              </div>
            </div>
            <div className="text-right text-[10px] text-default-500 font-mono font-bold">
              <span>Procedure {safeActiveStepIdx + 1} of {safeSteps.length}</span>
            </div>
          </div>

          {/* Master visual / slide view */}
          <div className="p-6 md:p-8 space-y-6">
            {/* Steps indicator nodes */}
            <div className="flex items-center gap-1.5 pb-4 border-b border-divider/15 overflow-x-auto">
              {safeSteps.map((_st, sidx) => (
                <button
                  id={`tutorial-${selectedTopicId}-progress-${sidx}`}
                  key={sidx}
                  onClick={() => setActiveStepIdx(sidx)}
                  className={`px-3 py-1.5 rounded-full text-[10px] font-bold tracking-wider cursor-pointer uppercase border transition-all font-mono ${
                    sidx === safeActiveStepIdx
                      ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                      : sidx < safeActiveStepIdx
                      ? 'bg-primary/10 text-primary border-primary/20'
                      : 'bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-default-500 border-zinc-200/50 dark:border-white/5'
                  }`}
                >
                  <span className="flex items-center gap-1">
                    {sidx < safeActiveStepIdx ? <CheckCircle2 className="h-3 w-3" /> : null}
                    Step {sidx + 1}
                  </span>
                </button>
              ))}
            </div>

            {/* Selected Step Description Screen */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <span className="text-[10px] uppercase font-bold tracking-wider text-primary block font-mono">Action Workflow • Stage {safeActiveStepIdx + 1}</span>
                <h2 className="text-lg font-bold text-foreground">
                  {currentStep.title}
                </h2>
              </div>
              
              <div className="text-xs text-default-600 dark:text-default-400 leading-relaxed font-medium bg-zinc-100 dark:bg-zinc-800/80 p-4 rounded-2xl border border-zinc-200/50 dark:border-white/5">
                {currentStep.description}
              </div>

              {currentStep.actionTip && (
                <div className="p-3.5 bg-primary/5 rounded-2xl border border-primary/15 flex items-start gap-2.5 text-left">
                  <MousePointerClick className="h-4.5 w-4.5 text-primary shrink-0 mt-0.5" />
                  <p className="text-[11px] text-default-600 dark:text-default-400 leading-normal font-medium">
                    <span className="font-bold text-primary uppercase mr-1 inline-block text-[10px] font-mono">Reference Guideline:</span> 
                    {currentStep.actionTip}
                  </p>
                </div>
              )}
            </div>

            {/* Stepper buttons */}
            <div className="flex items-center justify-between pt-6 border-t border-divider/15">
              <button
                id={`tutorial-${selectedTopicId}-prev`}
                disabled={safeActiveStepIdx === 0}
                onClick={() => setActiveStepIdx(prev => Math.max(0, prev - 1))}
                className="px-4 py-2 text-xs font-bold uppercase rounded-full border border-zinc-200/70 dark:border-white/10 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all text-foreground disabled:opacity-30 disabled:pointer-events-none cursor-pointer font-mono"
              >
                Previous Step
              </button>

              {safeActiveStepIdx < safeSteps.length - 1 ? (
                <button
                  id={`tutorial-${selectedTopicId}-next`}
                  onClick={() => setActiveStepIdx(prev => Math.min(safeSteps.length - 1, prev + 1))}
                  className="px-5 py-2 bg-primary hover:bg-primary/95 text-primary-foreground font-bold text-xs uppercase tracking-wider rounded-full cursor-pointer flex items-center gap-1 shadow-[0_2px_8px_rgba(0,111,238,0.25)] transition-all font-mono"
                >
                  Next Step
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              ) : (
                <div className="p-2 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 font-mono">
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

export default TutorialOnboarding;
