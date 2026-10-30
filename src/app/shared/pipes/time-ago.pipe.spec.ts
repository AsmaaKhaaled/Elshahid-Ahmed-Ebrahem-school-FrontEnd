import { TimeAgoPipe, arabicCount, timeAgo } from './time-ago.pipe';

const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60000);

describe('timeAgo', () => {
  it('uses Arabic number agreement', () => {
    expect(arabicCount(1, 'يوم', 'يومين', 'أيام')).toBe('يوم');
    expect(arabicCount(2, 'يوم', 'يومين', 'أيام')).toBe('يومين');
    expect(arabicCount(5, 'يوم', 'يومين', 'أيام')).toBe('5 أيام');
    expect(arabicCount(15, 'يوم', 'يومين', 'أيام')).toBe('15 يوم');
  });

  it('describes how long ago something happened', () => {
    expect(timeAgo(new Date())).toBe('الآن');
    expect(timeAgo(minutesAgo(5))).toBe('منذ 5 دقائق');
    expect(timeAgo(minutesAgo(120))).toBe('منذ ساعتين');
    expect(timeAgo(minutesAgo(60 * 24))).toBe('منذ يوم');
  });

  it('returns an empty string for missing values', () => {
    expect(new TimeAgoPipe().transform(null)).toBe('');
  });
});
