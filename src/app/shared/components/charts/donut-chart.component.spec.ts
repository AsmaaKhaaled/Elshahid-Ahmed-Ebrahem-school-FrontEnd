import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DonutChartComponent } from './donut-chart.component';

describe('DonutChartComponent', () => {
  let fixture: ComponentFixture<DonutChartComponent>;

  function render(items: { label: string; value: number }[]): DonutChartComponent {
    fixture = TestBed.createComponent(DonutChartComponent);
    fixture.componentRef.setInput('items', items);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('skips empty items and keeps each item’s color by its position', () => {
    const chart = render([{ label: 'أ', value: 3 }, { label: 'ب', value: 0 }, { label: 'ج', value: 1 }]);
    expect(chart.segments().map(s => s.label)).toEqual(['أ', 'ج']);
    expect(chart.segments().map(s => s.percent)).toEqual([75, 25]);
    expect(chart.total()).toBe(4);
  });

  it('folds anything past eight items into "أخرى"', () => {
    const items = Array.from({ length: 10 }, (_, i) => ({ label: `مادة ${i + 1}`, value: 1 }));
    const chart = render(items);
    expect(chart.segments().length).toBe(8);
    expect(chart.segments().at(-1)).toEqual(jasmine.objectContaining({ label: 'أخرى', value: 3 }));
  });

  it('shows an empty message when there is nothing to chart', () => {
    render([{ label: 'أ', value: 0 }]);
    expect(fixture.nativeElement.textContent).toContain('لا توجد بيانات');
    expect(fixture.nativeElement.querySelector('svg')).toBeNull();
  });
});
