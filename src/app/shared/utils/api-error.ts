import { HttpErrorResponse } from '@angular/common/http';

/**
 * The message to show for a failed API call. The backend sends its reasons in Arabic:
 * a validation failure lists every wrong field in `errors`, anything else has one `message`.
 */
export function apiErrorMessage(err: unknown, fallback: string): string {
  if (!(err instanceof HttpErrorResponse)) return fallback;
  if (err.status === 0) return 'تعذر الاتصال بالخادم. تأكد إن الباك إند شغال وحاول مرة أخرى.';
  if (err.status === 403) return 'ليس لديك صلاحية لتنفيذ هذا الإجراء.';
  if (err.status >= 500) return fallback;

  const fieldErrors: unknown = err.error?.errors ?? err.error?.details;
  if (Array.isArray(fieldErrors) && fieldErrors.length) {
    const messages = [...new Set(fieldErrors.map(e => e?.message).filter((m): m is string => typeof m === 'string' && !!m))];
    if (messages.length) return messages.join(' • ');
  }
  return typeof err.error?.message === 'string' && err.error.message ? err.error.message : fallback;
}
