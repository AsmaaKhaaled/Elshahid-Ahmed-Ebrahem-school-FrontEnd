import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule, NgForm } from '@angular/forms';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { TimeFieldComponent } from './time-field.component';

@Component({
  standalone: true,
  imports: [TimeFieldComponent, FormsModule],
  template: `
    <app-time-field id="bound" ariaLabel="وقت الحضور" [value]="time()" [disabled]="off()" (valueChange)="onPick($event)" />
    <form #form="ngForm">
      <app-time-field id="model" name="start" required [(ngModel)]="model" error="الوقت مطلوب" />
    </form>
  `
})
class HostComponent {
  readonly time = signal('07:30');
  readonly off = signal(false);
  model = '';
  accept = true;
  picked: string[] = [];

  onPick(value: string): void {
    this.picked.push(value);
    if (this.accept) this.time.set(value);
  }
}

describe('TimeFieldComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent], providers: [provideNoopAnimations()] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  function field(id: string): TimeFieldComponent {
    return fixture.debugElement.query(el => el.attributes['id'] === id).componentInstance;
  }

  function inputOf(id: string): HTMLInputElement {
    return fixture.nativeElement.querySelector(`#${id} input`);
  }

  function at(hours: number, minutes: number): Date {
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  }

  it('shows the time in Arabic with Latin digits, read-only', () => {
    expect(inputOf('bound').value).toBe('7:30 ص');
    expect(inputOf('bound').readOnly).toBeTrue();
  });

  it('emits the picked time as HH:mm', () => {
    field('bound').pick(at(14, 5));
    expect(host.picked).toEqual(['14:05']);
  });

  it('goes back to the page value when the page refuses the time', async () => {
    host.accept = false;
    field('bound').pick(at(9, 0));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(inputOf('bound').value).toBe('7:30 ص');
  });

  it('can be switched off by the page', () => {
    host.off.set(true);
    fixture.detectChanges();
    expect(inputOf('bound').disabled).toBeTrue();
  });

  it('works with ngModel and the form required check', async () => {
    const form = fixture.debugElement.query(el => el.name === 'form').injector.get(NgForm);
    expect(form.invalid).toBeTrue();

    field('model').pick(at(8, 15));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(host.model).toBe('08:15');
    expect(form.valid).toBeTrue();
  });
});
