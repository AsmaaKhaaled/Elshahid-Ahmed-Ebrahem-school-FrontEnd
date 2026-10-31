import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PaginationComponent } from './pagination.component';

describe('PaginationComponent', () => {
  let fixture: ComponentFixture<PaginationComponent>;

  function render(page: number, total: number, pageSize = 10): PaginationComponent {
    fixture = TestBed.createComponent(PaginationComponent);
    fixture.componentRef.setInput('page', page);
    fixture.componentRef.setInput('pageSize', pageSize);
    fixture.componentRef.setInput('total', total);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('shows the range and collapses far pages', () => {
    const pagination = render(5, 95);
    expect(fixture.nativeElement.textContent).toContain('41–50');
    expect(pagination.pages()).toEqual([1, null, 4, 5, 6, null, 10]);
  });

  it('emits the requested page only when it exists and differs', () => {
    const pagination = render(1, 25);
    const emitted: number[] = [];
    pagination.pageChange.subscribe(page => emitted.push(page));

    pagination.go(0);
    pagination.go(1);
    pagination.go(2);
    pagination.go(4);
    expect(emitted).toEqual([2]);
  });

  it('renders nothing when there is nothing to page', () => {
    render(1, 0);
    expect(fixture.nativeElement.textContent.trim()).toBe('');
  });
});
