/** Format a price in Thai Baht. */
export function formatBaht(amount: number): string {
  return `฿${amount}`;
}

/** Quiet order-time stamp next to staff name (local HH:mm). */
export function formatOrderTime(createdAt: number): string {
  const d = new Date(createdAt);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}
