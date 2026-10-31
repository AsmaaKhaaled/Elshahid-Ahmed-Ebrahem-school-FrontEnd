/**
 * Alphabetical order key for Arabic names (same rule as the backend): hamza & taa marbuta
 * variants are folded, so "أحمد" and "احمد" sort together and lists read from أ to ي.
 */
export function arabicSortKey(name: string): string {
  return (name || '')
    .replace(/[ً-ْـ]/g, '') // tashkeel & tatweel
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ؤ/g, 'و')
    .replace(/[ئى]/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ')
    .trim();
}

export function compareArabic(a: string, b: string): number {
  return arabicSortKey(a).localeCompare(arabicSortKey(b), 'ar');
}
