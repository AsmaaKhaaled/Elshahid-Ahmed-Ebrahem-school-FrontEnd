import { Pipe, PipeTransform } from '@angular/core';

/** Relative Arabic time, e.g. "منذ 5 دقائق" / "منذ ساعتين" / "منذ يوم". */
@Pipe({
  name: 'timeAgo',
  standalone: true
})
export class TimeAgoPipe implements PipeTransform {
  transform(value: string | number | Date | null | undefined): string {
    return value ? timeAgo(value) : '';
  }
}

export function timeAgo(value: string | number | Date): string {
  const minutes = Math.floor((Date.now() - new Date(value).getTime()) / 60000);
  if (minutes < 1) return 'الآن';
  if (minutes < 60) return `منذ ${arabicCount(minutes, 'دقيقة', 'دقيقتين', 'دقائق')}`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `منذ ${arabicCount(hours, 'ساعة', 'ساعتين', 'ساعات')}`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `منذ ${arabicCount(days, 'يوم', 'يومين', 'أيام')}`;

  const months = Math.floor(days / 30);
  return `منذ ${arabicCount(months, 'شهر', 'شهرين', 'أشهر')}`;
}

// Arabic number agreement: 1 -> singular, 2 -> dual, 3..10 -> plural, 11+ -> singular
export function arabicCount(n: number, one: string, two: string, few: string): string {
  if (n === 1) return one;
  if (n === 2) return two;
  return n <= 10 ? `${n} ${few}` : `${n} ${one}`;
}
