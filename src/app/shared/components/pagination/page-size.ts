/** The page sizes every paginated list offers; 15 unless the user picked another one. */
export const PAGE_SIZE_OPTIONS: readonly number[] = [15, 20, 50, 100];
export const DEFAULT_PAGE_SIZE = 15;

const STORAGE_PREFIX = 'sch_page_size:';

/** The size this list was last shown with (each list keeps its own); the default if none or no longer offered. */
export function loadPageSize(key: string): number {
  try {
    const stored = Number(localStorage.getItem(STORAGE_PREFIX + key));
    return PAGE_SIZE_OPTIONS.includes(stored) ? stored : DEFAULT_PAGE_SIZE;
  } catch {
    return DEFAULT_PAGE_SIZE;
  }
}

export function savePageSize(key: string, size: number): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, String(size));
  } catch {
    // Storage blocked (private window): the size just isn't remembered
  }
}
