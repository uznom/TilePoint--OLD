/**
 * Pure date formatting and date manipulation utilities.
 */

/**
 * Returns a human-friendly date string (e.g., "Aug 4, 2026").
 */
export function formatDate(
  dateInput: string | number | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!dateInput) return 'N/A';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return 'N/A';

  const defaultOptions: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  };

  return d.toLocaleDateString('en-US', options || defaultOptions);
}

/**
 * Returns a 24-hour or 12-hour formatted time string (e.g., "02:30 PM").
 */
export function formatTime(dateInput: string | number | Date | null | undefined): string {
  if (!dateInput) return 'N/A';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return 'N/A';

  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Formats full timestamp (e.g., "Aug 4, 2026, 02:30 PM").
 */
export function formatDateTime(dateInput: string | number | Date | null | undefined): string {
  if (!dateInput) return 'N/A';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return 'N/A';

  return `${formatDate(d)}, ${formatTime(d)}`;
}

/**
 * Returns ISO date YYYY-MM-DD for input controls.
 */
export function toISODateString(dateInput?: Date | string | number): string {
  if (!dateInput) return new Date().toISOString().slice(0, 10);
  if (typeof dateInput === 'string') {
    const match = dateInput.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
    const normalized = dateInput.replace(' ', 'T');
    const d = new Date(normalized);
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
  return d.toISOString().slice(0, 10);
}

/**
 * Extracts YYYY-MM-DD cleanly from any ISO string, SQL datetime string, or Date.
 */
export function extractDateOnly(dateInput?: Date | string | number | null): string {
  if (!dateInput) return '';
  if (typeof dateInput === 'string') {
    const match = dateInput.match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
    const d = new Date(dateInput.replace(' ', 'T'));
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    return '';
  }
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Formats relative time elapsed (e.g., "5 mins ago", "Just now").
 */
export function formatRelativeTime(dateInput: string | number | Date | null | undefined): string {
  if (!dateInput) return 'N/A';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return 'N/A';

  const diffMs = Date.now() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 15) return 'Just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;

  return formatDate(d);
}
