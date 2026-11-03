import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule, NgForm } from '@angular/forms';
import { DateAdapter } from '@angular/material/core';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { DateFieldComponent } from './date-field.component';

@Component({
  standalone: true,
  imports: [DateFieldComponent, FormsModule],
  template: `
    <app-date-field id="bound" label="من تاريخ" [value]="date()" (valueChange)="onPick($event)" />
    <form #form="ngForm">
      <app-date-field id="model" name="day" required [(ngModel)]="model" error="التاريخ مطلوب" />
    </form>
  `
})
class HostComponent {
  readonly date = signal('2026-11-04');
  model = '';
  accept = true;
  picked: string[] = [];

  onPick(value: string): void {
    this.picked.push(value);
    if (this.accept) this.date.set(value);
  }
}

describe('DateFieldComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent], providers: [provideNoopAnimations()] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  function field(id: string): DateFieldComponent {
    return fixture.debugElement.query(el => el.attributes['id'] === id).componentInstance;
  }

  function inputOf(id: string): HTMLInputElement {
    return fixture.nativeElement.querySelector(`#${id} input`);
  }

  it('shows the date with Arabic month names and Latin digits', () => {
    expect(inputOf('bound').value).toBe('4 نوفمبر 2026');
    expect(inputOf('bound').readOnly).toBeTrue();
  });

  it('starts the week on Saturday', () => {
    const adapter = fixture.debugElement.query(el => el.attributes['id'] === 'bound').injector.get(DateAdapter);
    expect(adapter.getFirstDayOfWeek()).toBe(6);
  });

  it('emits the picked day as YYYY-MM-DD, with no time-zone shift', () => {
    field('bound').pick(new Date(2026, 0, 1));
    expect(host.picked).toEqual(['2026-01-01']);
  });

  it('goes back to the page value when the page refuses the date', async () => {
    host.accept = false;
    field('bound').pick(new Date(2026, 0, 1));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(inputOf('bound').value).toBe('4 نوفمبر 2026');
  });

  it('works with ngModel and the form required check', async () => {
    const form = fixture.debugElement.query(el => el.name === 'form').injector.get(NgForm);
    expect(form.invalid).toBeTrue();

    field('model').pick(new Date(2026, 10, 5));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(host.model).toBe('2026-11-05');
    expect(form.valid).toBeTrue();
  });

  it('can be cleared when not required', () => {
    const clear: HTMLButtonElement = fixture.nativeElement.querySelector('#bound button[aria-label="مسح التاريخ"]');
    expect(clear).not.toBeNull();
    clear.click();
    expect(host.picked).toEqual(['']);
    expect(fixture.nativeElement.querySelector('#model button[aria-label="مسح التاريخ"]')).toBeNull();
  });
});
