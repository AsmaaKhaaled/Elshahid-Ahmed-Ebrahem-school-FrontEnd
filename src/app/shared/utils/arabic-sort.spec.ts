import { arabicSortKey, compareArabic } from './arabic-sort';

describe('arabic sort', () => {
  it('folds hamza, taa marbuta and alef maqsura variants', () => {
    expect(arabicSortKey('إبراهيم')).toBe('ابراهيم');
    expect(arabicSortKey('أسامة  مصطفى')).toBe('اسامه مصطفي');
  });

  it('orders names from أ to ي regardless of hamza forms', () => {
    const names = ['ياسر عادل', 'إبراهيم سالم', 'حسن إبراهيم', 'أحمد مصطفى', 'بسمة علي', 'آمال فؤاد'];
    expect([...names].sort(compareArabic)).toEqual(['إبراهيم سالم', 'أحمد مصطفى', 'آمال فؤاد', 'بسمة علي', 'حسن إبراهيم', 'ياسر عادل']);
  });
});
