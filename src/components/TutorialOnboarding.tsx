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
  UserCheck
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

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-2" id="tilepoint-tutorials-panel">
      
      {/* Dynamic Header Badge */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-gradient-to-r from-m3-primary/5 via-m3-secondary-container/15 to-transparent rounded-2xl border border-m3-outline-variant/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 bg-m3-primary/5 rounded-full blur-2xl pointer-events-none" />
        <div className="space-y-1 relative z-10">
          <div className="inline-flex items-center gap-1 text-[10px] uppercase font-black tracking-wider text-m3-primary bg-m3-primary/10 px-2.5 py-1 rounded-full border border-m3-primary/20">
            <Sparkles className="h-3 w-3" /> System Academy Academy Guide
          </div>
          <h2 className="text-xl md:text-2xl font-black text-m3-on-surface uppercase tracking-tight">Onboarding Walkthrough</h2>
          <p className="text-xs text-m3-on-surface-variant max-w-xl font-medium">
            Welcome to the official interactive tutorial suite. Understand the transactional, logs, and logistical functions of your newly created enterprise setup.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 bg-m3-surface p-2.5 rounded-xl border border-m3-outline-variant/30 shadow-sm relative z-10">
          <BookOpen className="h-5 w-5 text-m3-primary" />
          <div className="text-left">
            <div className="text-[10px] font-black uppercase text-m3-on-surface-variant">Active Manual</div>
            <div className="text-xs font-bold text-m3-on-surface">Digital Operation Procedures</div>
          </div>
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
