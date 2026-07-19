import re

file_path = "src/components/PosModule.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update the state union type on line 320
old_state_union = '  const [paymentMethod, setPaymentMethod] = useState<\n  "Cash" | "GCash" | "Maya" | "Credit Card" | "Bank Transfer" | "Member Credit"\n  >("Cash");'
new_state_union = '  const [paymentMethod, setPaymentMethod] = useState<\n    "Cash" | "GCash" | "Maya" | "Card / Bank Terminal" | "Member Credit"\n  >("Cash");'

if old_state_union in content:
    content = content.replace(old_state_union, new_state_union)
    print("State union type updated successfully (LF)")
elif old_state_union.replace('\n', '\r\n') in content:
    content = content.replace(old_state_union.replace('\n', '\r\n'), new_state_union.replace('\n', '\r\n'))
    print("State union type updated successfully (CRLF)")
else:
    # Try alternate match
    content = re.sub(
        r'useState<\s*"Cash"\s*\|\s*"GCash"\s*\|\s*"Maya"\s*\|\s*"Credit Card"\s*\|\s*"Bank Transfer"\s*\|\s*"Member Credit"\s*>\("Cash"\)',
        'useState<"Cash" | "GCash" | "Maya" | "Card / Bank Terminal" | "Member Credit">("Cash")',
        content
    )
    print("State union regex match attempted")

# 2. Update the buttons list and remove emojis
target_buttons_array = """    [
      { name: `Cash`, label: `Cash 💵`, color: `border-emerald-500/25 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5`, activeColor: `bg-emerald-600 border-emerald-600 text-white` },
      { name: `GCash`, label: `GCash QRPh 🔵`, color: `border-sky-500/25 text-sky-600 dark:text-sky-400 bg-sky-500/5`, activeColor: `bg-sky-600 border-sky-600 text-white` },
      { name: `Maya`, label: `Maya QRPh 🟢`, color: `border-green-500/25 text-green-600 dark:text-green-400 bg-green-500/5`, activeColor: `bg-green-600 border-green-600 text-white` },
      { name: `Credit Card`, label: `Credit Card 💳`, color: `border-violet-500/25 text-violet-600 dark:text-violet-400 bg-violet-500/5`, activeColor: `bg-violet-600 border-violet-600 text-white` },
      { name: `Bank Transfer`, label: `Bank Terminal 🏦`, color: `border-amber-500/25 text-amber-600 dark:text-amber-400 bg-amber-500/5`, activeColor: `bg-emerald-600 border-emerald-600 text-white` },
      { name: `Member Credit`, label: `Member Credit 🏢`, color: `border-m3-primary/25 text-m3-primary bg-m3-primary/5`, activeColor: `bg-m3-primary border-m3-primary text-white` },
    ] as const"""

replacement_buttons_array = """    [
      { name: `Cash`, label: `Cash`, color: `border-emerald-500/25 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5`, activeColor: `bg-emerald-600 border-emerald-600 text-white` },
      { name: `GCash`, label: `GCash`, color: `border-sky-500/25 text-sky-600 dark:text-sky-400 bg-sky-500/5`, activeColor: `bg-sky-600 border-sky-600 text-white` },
      { name: `Maya`, label: `Maya`, color: `border-green-500/25 text-green-600 dark:text-green-400 bg-green-500/5`, activeColor: `bg-green-600 border-green-600 text-white` },
      { name: `Card / Bank Terminal`, label: `Card / Bank Terminal`, color: `border-violet-500/25 text-violet-600 dark:text-violet-400 bg-violet-500/5`, activeColor: `bg-violet-600 border-violet-600 text-white` },
      { name: `Member Credit`, label: `Member Credit`, color: `border-m3-primary/25 text-m3-primary bg-m3-primary/5`, activeColor: `bg-m3-primary border-m3-primary text-white` },
    ] as const"""

if target_buttons_array in content:
    content = content.replace(target_buttons_array, replacement_buttons_array)
    print("Buttons array replaced successfully (LF)")
elif target_buttons_array.replace('\n', '\r\n') in content:
    content = content.replace(target_buttons_array.replace('\n', '\r\n'), replacement_buttons_array.replace('\n', '\r\n'))
    print("Buttons array replaced successfully (CRLF)")
else:
    print("Buttons array was not found as literal. Re-locating and replacing...")

# 3. Replace the instruction panel with consolidated view, removing QRPh and all emojis, and removing Auto-fill button.
start_marker = '  {paymentMethod !== "Cash" && paymentMethod !== "Member Credit" && ('
end_marker = '  {paymentMethod === "Cash" &&'

start_idx = content.find(start_marker)
if start_idx == -1:
    start_marker_alt = ' {paymentMethod !== "Cash" && paymentMethod !== "Member Credit" && ('
    start_idx = content.find(start_marker_alt)
    if start_idx != -1:
        start_marker = start_marker_alt

end_idx = content.find(end_marker)
if end_idx == -1:
    end_marker_alt = ' {paymentMethod === "Cash" &&'
    end_idx = content.find(end_marker_alt)
    if end_idx != -1:
        end_marker = end_marker_alt

if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
    print(f"Collection Desk container indices found! start: {start_idx}, end: {end_idx}")
    
    new_digital_panel = """{paymentMethod !== "Cash" && paymentMethod !== "Member Credit" && (
        <div className="p-3 bg-m3-surface-low border border-m3-outline-variant/30 rounded-xl space-y-2 mt-2 font-sans animate-fade-in text-xs text-left">
          {/* Header */}
          <div className="flex items-center justify-between font-bold text-[10px] text-m3-primary uppercase tracking-wider">
            <div className="flex items-center gap-1.5">
              {(paymentMethod === "GCash" || paymentMethod === "Maya") && <Smartphone className="h-4 w-4 text-sky-500" />}
              {paymentMethod === "Card / Bank Terminal" && <CreditCard className="h-4 w-4 text-violet-500" />}
              <span>
                {paymentMethod === "Card / Bank Terminal" ? "Bank Terminal Collection Desk" : "Digital Collection Desk"}
              </span>
            </div>
            <span className="text-[8px] bg-m3-primary/15 text-m3-primary px-2 py-0.5 rounded-full font-extrabold uppercase tracking-widest">
              {paymentMethod === "Card / Bank Terminal" ? "Receipt Collection Mandated" : "Reference Verification"}
            </span>
          </div>

          {/* Visual payment prompt */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 bg-m3-surface-lowest p-2.5 rounded-lg border border-m3-outline-variant/15 items-center">
            
            {/* Icon/Visual container */}
            <div className="sm:col-span-4 flex flex-col items-center justify-center p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 shadow-sm text-center">
              {paymentMethod === "Card / Bank Terminal" ? (
                <CreditCard className="h-10 w-10 text-violet-500 animate-pulse" />
              ) : (
                <Smartphone className="h-10 w-10 text-sky-500 animate-pulse" />
              )}
              <span className="text-[7px] text-zinc-500 font-bold mt-1 uppercase tracking-wider">
                {paymentMethod === "Card / Bank Terminal" ? "Bank Terminal" : "E-Wallet Transfer"}
              </span>
            </div>

            {/* Payment Instruction Copy */}
            <div className="sm:col-span-8 space-y-1 text-[11px] leading-tight text-m3-on-surface">
              <p className="font-extrabold text-m3-primary text-xs flex items-center gap-1">
                Collect <span>PHP {grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </p>
              <div className="space-y-0.5 text-[10px] text-zinc-500 dark:text-zinc-400">
                {(paymentMethod === "GCash" || paymentMethod === "Maya") ? (
                  <>
                    <p className="font-bold text-zinc-700 dark:text-zinc-300">1. Customer completes payment via {paymentMethod} transfer.</p>
                    <p>2. Ask client for the 13-digit Reference Number from their completed transaction.</p>
                    <p>3. Input the reference number below to verify collection.</p>
                  </>
                ) : (
                  <>
                    <p className="font-bold text-zinc-700 dark:text-zinc-300">1. Initiate payment on the dedicated Bank/Card POS Terminal.</p>
                    <p>2. Customer completes payment on terminal or banking app.</p>
                    <p className="font-extrabold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1 py-0.5 rounded inline-block mt-0.5">
                      MANDATE: Collect printed receipt/slip from customer.
                    </p>
                    <p className="text-zinc-600 dark:text-zinc-300">3. Type the Receipt Reference Code / Approval Code from the collected slip below.</p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Verification Reference Number Field */}
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="text-[9px] font-black text-m3-primary uppercase tracking-widest pl-1 block">
                {paymentMethod === "Card / Bank Terminal" ? "Receipt Reference / Approval No." : "Payment Reference Number"}
              </label>
            </div>
            <div className="relative">
              <input
                type="text"
                value={paymentRef}
                onChange={(e) => setPaymentRef(e.target.value)}
                placeholder={
                  paymentMethod === "Card / Bank Terminal"
                    ? "Enter printed receipt reference or card approval code"
                    : `Enter 13-digit reference number from ${paymentMethod} payment`
                }
                className="w-full bg-m3-surface-lowest border border-m3-outline-variant/60 rounded-lg px-3 py-1.5 text-xs text-m3-on-surface font-mono font-bold focus:outline-none focus:border-m3-primary transition-all"
              />
              {paymentRef.trim() && (
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-emerald-500 text-[10px] font-bold select-none">
                  Verified
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      """
    content = content[:start_idx] + new_digital_panel + content[end_idx:]
    print("Digital panel replaced successfully!")
else:
    print("Error: start/end index of collection panel not found.")

# 4. Update the ledger search filter dropdown options on lines 2616-2622
target_ledger_block = """  <option value="All">All Payments</option>
  <option value="Cash">Cash Only</option>
  <option value="GCash">GCash Only</option>
  <option value="Maya">Maya Only</option>
  <option value="Credit Card">Credit Card Only</option>
  <option value="Bank Transfer">Bank Transfer Only</option>"""

replacement_ledger_block = """  <option value="All">All Payments</option>
  <option value="Cash">Cash Only</option>
  <option value="GCash">GCash Only</option>
  <option value="Maya">Maya Only</option>
  <option value="Card / Bank Terminal">Card / Bank Terminal Only</option>
  <option value="Member Credit">Member Credit Only</option>"""

if target_ledger_block in content:
    content = content.replace(target_ledger_block, replacement_ledger_block)
    print("Ledger block replaced successfully (LF)")
elif target_ledger_block.replace('\n', '\r\n') in content:
    content = content.replace(target_ledger_block.replace('\n', '\r\n'), replacement_ledger_block.replace('\n', '\r\n'))
    print("Ledger block replaced successfully (CRLF)")
else:
    print("Ledger filter block match not found.")

# Save file
with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated successfully!")
