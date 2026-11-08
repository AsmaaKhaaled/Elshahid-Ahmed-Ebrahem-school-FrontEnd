import { HttpContextToken, HttpErrorResponse, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { tap } from 'rxjs';
import { TokenService } from '../auth/token.service';
import { ToastService } from '../notifications/toast.service';

/** No toasts at all for this request: api.post(url, body, undefined, new HttpContext().set(SILENT_REQUEST, true)) */
export const SILENT_REQUEST = new HttpContextToken<boolean>(() => false);
/** The request's own success message, e.g. 'تم إغلاق دفتر اليوم'; '' = the page says it itself. */
export const SUCCESS_MESSAGE = new HttpContextToken<string | null>(() => null);

// Sent in the background (not by a click on save / delete), or handled by their own page:
// signing in can fail for reasons only the login page knows (e.g. a teacher on the admin login)
const UNANNOUNCED_URLS = [/\/read$/, /\/read-all$/, /auth\/refresh/, /auth\/logout/, /auth\/login/];

const SUCCESS_BY_METHOD: Record<string, string> = {
  POST: 'تم الحفظ بنجاح.',
  PUT: 'تم حفظ التعديلات بنجاح.',
  PATCH: 'تم حفظ التعديلات بنجاح.',
  DELETE: 'تم الحذف بنجاح.'
};

const ERROR_BY_STATUS: Record<number, string> = {
  0: 'تعذر الاتصال بالخادم. تأكد من اتصال الإنترنت وحاول مرة أخرى.',
  400: 'البيانات المرسلة غير صحيحة. راجعها وحاول مرة أخرى.',
  401: 'انتهت جلستك. سجّل الدخول مرة أخرى.',
  403: 'ليس لديك صلاحية لتنفيذ هذا الإجراء.',
  404: 'العنصر المطلوب غير موجود، ربما تم حذفه.',
  409: 'هذه البيانات مسجّلة من قبل.',
  413: 'حجم الملف أكبر من المسموح.',
  422: 'البيانات المدخلة غير صحيحة. راجع الحقول وحاول مرة أخرى.',
  429: 'طلبات كثيرة متتالية. انتظر قليلاً وحاول مرة أخرى.'
};
const SERVER_ERROR = 'حدثت مشكلة في الخادم. حاول مرة أخرى بعد قليل.';

// The backend's messages are partly English ("Teacher created successfully"); only Arabic ones are shown as they are
export const isArabicText = (text: unknown): text is string => typeof text === 'string' && /[؀-ۿ]/.test(text);

/** What went wrong, in Arabic: the backend's own message when it wrote one, else by the status. */
export function errorMessageOf(error: HttpErrorResponse): string {
  const body = error.error;
  const fieldMessage = Array.isArray(body?.errors)
    ? body.errors.map((e: { message?: string }) => e?.message).find(isArabicText)
    : null;
  if (fieldMessage) return fieldMessage;
  if (isArabicText(body?.message)) return body.message;
  return ERROR_BY_STATUS[error.status] ?? (error.status >= 500 ? SERVER_ERROR : 'تعذر إتمام العملية. حاول مرة أخرى.');
}

/**
 * Tells the user how each request ended, as a toast:
 * - save / edit / delete (POST, PUT, PATCH, DELETE): success, or what went wrong
 * - loading data (GET): only when the server is down or broke, or the session expired,
 *   since pages show their own empty states
 */
export const notifyInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.context.get(SILENT_REQUEST) || UNANNOUNCED_URLS.some(pattern => pattern.test(req.url))) {
    return next(req);
  }
  const toasts = inject(ToastService);
  const signedIn = !!inject(TokenService).getToken();
  const isWrite = req.method in SUCCESS_BY_METHOD;

  return next(req).pipe(
    tap({
      next: event => {
        if (!(event instanceof HttpResponse) || !isWrite) return;
        const ownMessage = req.context.get(SUCCESS_MESSAGE);
        if (ownMessage === '') return;
        const body = event.body as { message?: unknown } | null;
        toasts.success(ownMessage ?? (isArabicText(body?.message) ? body.message : SUCCESS_BY_METHOD[req.method]));
      },
      error: (error: unknown) => {
        if (!(error instanceof HttpErrorResponse)) return;
        // A visitor asking for something that needs signing in: nothing to tell them
        if (error.status === 401 && !signedIn) return;
        if (isWrite || error.status === 0 || error.status >= 500 || error.status === 401) {
          toasts.error(errorMessageOf(error));
        }
      }
    })
  );
};
