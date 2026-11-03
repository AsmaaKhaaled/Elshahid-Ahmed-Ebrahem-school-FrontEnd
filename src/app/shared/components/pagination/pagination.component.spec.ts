import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSelect } from '@angular/material/select';
import { By } from '@angular/platform-browser';
import { PaginationComponent } from './pagination.component';

describe('PaginationComponent', () => {
  let fixture: ComponentFixture<PaginationComponent>;

  const SIZES = [15, 20, 50, 100];

  function render(page: number, total: number, pageSize = 10, pageSizeOptions: number[] = []): PaginationComponent {
    fixture = TestBed.createComponent(PaginationComponent);
    fixture.componentRef.setInput('page', page);
    fixture.componentRef.setInput('pageSize', pageSize);
    fixture.componentRef.setInput('total', total);
    fixture.componentRef.setInput('pageSizeOptions', pageSizeOptions);
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

  it('has no size selector unless sizes are given', () => {
    render(1, 25);
    expect(fixture.nativeElement.querySelector('mat-select')).toBeNull();
  });

  it('keeps the size selector when everything fits on one page', () => {
    render(1, 30, 50, SIZES);
    const select = fixture.debugElement.query(By.directive(MatSelect));
    expect(select).not.toBeNull();
    expect(select.componentInstance.value).toBe(50);
    expect(fixture.nativeElement.textContent).not.toContain('التالي');
  });

  it('emits a new size only when it is offered and differs', () => {
    const pagination = render(1, 30, 15, SIZES);
    const emitted: number[] = [];
    pagination.pageSizeChange.subscribe(size => emitted.push(size));

    pagination.changeSize('15');
    pagination.changeSize('33');
    pagination.changeSize('50');
    expect(emitted).toEqual([50]);
  });

  it('disables the size selector while loading', () => {
    render(1, 30, 15, SIZES);
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('mat-select').getAttribute('aria-disabled')).toBe('true');
  });
});
