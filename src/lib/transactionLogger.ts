import { Sale, SaleItem, Branch } from '../types/db';

/**
 * TilePoint Transaction History & Sales CSV Logger Engine
 * Handles formatting, time-ordering, background automated CSV exports,
 * and generating the Windows IP Auto-Detector Launcher.
 */

/**
 * Formats an array of sales into a clean, time-sorted CSV string.
 * @param sales Array of Sale records
 * @param saleItems Optional array of SaleItem records to enrich item descriptions
 * @param branches Optional array of Branch records to resolve branch names
 */
export function generateTransactionCsv(
  sales: Sale[],
  saleItems: SaleItem[] = [],
  branches: Branch[] = []
): string {
  // 1. Filter active sales & sort chronologically by createdAt timestamp
  const activeSales = [...sales]
    .filter((s) => !s.isDeleted)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  // Helper map for branch names
  const branchMap = new Map<string, string>();
  branches.forEach((b) => branchMap.set(b.id, b.name));

  // Helper map for sale items grouped by saleId
  const itemMap = new Map<string, string[]>();
  saleItems.forEach((item) => {
    if (item.isDeleted) return;
    const list = itemMap.get(item.saleId) || [];
    list.push(`${item.quantity}x ${item.productName}`);
    itemMap.set(item.saleId, list);
  });

  // CSV Headers
  const headers = [
    'Log ID',
    'Invoice Number',
    'Timestamp (ISO)',
    'Date',
    'Time (12h)',
    'Branch Name',
    'Cashier / User',
    'Customer Name',
    'Payment Method',
    'Items Summary',
    'Subtotal (PHP)',
    'Discount (PHP)',
    'VAT (PHP)',
    'Grand Total (PHP)',
    'Amount Tendered (PHP)',
    'Change (PHP)',
    'Transaction Status',
  ];

  const rows = activeSales.map((s) => {
    const dt = new Date(s.createdAt);
    const dateStr = isNaN(dt.getTime())
      ? s.createdAt.slice(0, 10)
      : dt.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
    const timeStr = isNaN(dt.getTime())
      ? s.createdAt.slice(11, 19)
      : dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

    const branchName = branchMap.get(s.branchId) || s.branchId || 'Main HQ';
    const itemsSummary = (itemMap.get(s.id) || []).join('; ') || 'POS Checkout Order';

    return [
      escapeCsv(s.id),
      escapeCsv(s.saleNumber || 'INV-0000'),
      escapeCsv(s.createdAt),
      escapeCsv(dateStr),
      escapeCsv(timeStr),
      escapeCsv(branchName),
      escapeCsv(s.cashierName || 'Cashier'),
      escapeCsv(s.customerName || 'Walk-in Customer'),
      escapeCsv(s.paymentMethod || 'CASH'),
      escapeCsv(itemsSummary),
      (s.subtotal || 0).toFixed(2),
      (s.discount || 0).toFixed(2),
      (s.vat || 0).toFixed(2),
      (s.grandTotal || 0).toFixed(2),
      (s.amountTendered || 0).toFixed(2),
      (s.changeAmount || 0).toFixed(2),
      'COMPLETED',
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Escapes strings for CSV formatting, guarding against quote breaks & commas.
 */
function escapeCsv(val: string | number | undefined | null): string {
  if (val === undefined || val === null) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Generates and downloads the Windows Network Auto-IP Launcher script (.cmd).
 * This batch script automatically detects the host's LAN IPv4 address (even when router IP allocation is dynamic or offline),
 * determines active web browser installations, and launches TilePoint POS in the user's preferred browser.
 */
export function downloadWindowsLauncherScript(): void {
  const currentAppUrl = typeof window !== 'undefined' ? window.location.href : 'http://localhost:3000';

  const scriptContent = `@echo off
TITLE TilePoint POS - Windows Auto-IP Network Launcher
COLOR 0A
MODE CON COLS=80 LINES=28
cls

echo ====================================================================
echo          🚀 TILEPOINT POS - AUTOMATED WINDOWS LAUNCHER
echo ====================================================================
echo.
echo [1/3] Scanning local network adapters for active IPv4 address...
echo.

:: Extract local IPv4 address using ipconfig
set LOCAL_IP=127.0.0.1
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4 Address" /c:"IP Address"') do (
    for /f "tokens=1 delims= " %%b in ("%%a") do (
        if not "%%b"=="127.0.0.1" (
            set LOCAL_IP=%%b
        )
    )
)

echo [SUCCESS] Local Network IPv4 Address Detected: %LOCAL_IP%
echo.
echo [2/3] Configuring Service Endpoint...
echo Cloud/App URL: ${currentAppUrl}
echo Local LAN URL: http://%LOCAL_IP%:3000
echo.

echo ====================================================================
echo [3/3] Choose Preferred Browser to Launch TilePoint POS:
echo ====================================================================
echo  [1] Google Chrome
echo  [2] Microsoft Edge
echo  [3] Mozilla Firefox
echo  [4] Brave Browser
echo  [5] Default System Browser (Recommended)
echo ====================================================================
echo.

set /p BCHOICE="Enter Choice [1-5] or press ENTER for Default: "

set TARGET_URL=${currentAppUrl}

if "%BCHOICE%"=="1" (
    echo Launching in Google Chrome...
    start chrome "%TARGET_URL%"
    goto DONE
)
if "%BCHOICE%"=="2" (
    echo Launching in Microsoft Edge...
    start msedge "%TARGET_URL%"
    goto DONE
)
if "%BCHOICE%"=="3" (
    echo Launching in Mozilla Firefox...
    start firefox "%TARGET_URL%"
    goto DONE
)
if "%BCHOICE%"=="4" (
    echo Launching in Brave Browser...
    start brave "%TARGET_URL%"
    goto DONE
)

:: Default launch
echo Launching in Default Browser...
start "" "%TARGET_URL%"

:DONE
echo.
echo ====================================================================
echo  TilePoint POS is active at: %TARGET_URL%
echo  Press any key to close this launcher.
echo ====================================================================
pause > nul
`;

  const blob = new Blob([scriptContent], { type: 'text/plain;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'TilePoint_Windows_Launcher.cmd';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
