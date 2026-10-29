import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'arabicDate',
  standalone: true
})
export class ArabicDatePipe implements PipeTransform {
  transform(
    value: string | number | Date | null | undefined,
    format: 'full' | 'medium' | 'short' | 'dateOnly' | 'timeOnly' | 'monthYear' = 'medium'
  ): string {
    if (!value) return '';

    const date = typeof value === 'string' || typeof value === 'number' ? new Date(value) : value;
    if (isNaN(date.getTime())) return '';

    const locale = 'ar-EG';

    switch (format) {
      case 'full':
        return new Intl.DateTimeFormat(locale, {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: 'numeric',
          minute: 'numeric',
          hour12: true
        }).format(date);

      case 'dateOnly':
        return new Intl.DateTimeFormat(locale, {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }).format(date);

      case 'timeOnly':
        return new Intl.DateTimeFormat(locale, {
          hour: 'numeric',
          minute: 'numeric',
          hour12: true
        }).format(date);

      case 'monthYear':
        return new Intl.DateTimeFormat(locale, {
          month: 'long',
          year: 'numeric'
        }).format(date);

      case 'short':
        return new Intl.DateTimeFormat(locale, {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        }).format(date);

      case 'medium':
      default:
        return new Intl.DateTimeFormat(locale, {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        }).format(date);
    }
  }
}

