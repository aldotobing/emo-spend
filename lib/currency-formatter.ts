/**
 * Formats a number as Indonesian Rupiah currency
 * @param amount - The amount to format
 * @returns Formatted currency string in IDR format
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Formats a number as a compact Indonesian Rupiah currency (e.g., 1.2jt, 1.5M)
 * @param amount - The amount to format
 * @returns Formatted compact currency string in IDR format
 */
export function formatCompactCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    notation: 'compact',
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  })
    .format(amount)
    .replace('Rp', 'Rp '); // Add space after Rp for better readability
}
