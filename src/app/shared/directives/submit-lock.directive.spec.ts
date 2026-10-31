import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule, NgForm } from '@angular/forms';
import { SubmitLockDirective, submitLock } from './submit-lock.directive';

@Component({
  standalone: true,
  imports: [FormsModule, SubmitLockDirective],
  template: `
    <form #form="ngForm" [appSubmitLock]="lock.busy()">
      <input name="name" [(ngModel)]="name" />
      <input name="readonlyField" [(ngModel)]="other" [disabled]="true" />
      <button type="button" (click)="save()">حفظ</button>
    </form>
  `
})
class HostComponent {
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly lock = submitLock({ saving: this.saving, error: this.error });
  readonly emitted: string[] = [];
  name = 'أحمد';
  other = 'ثابت';

  save(): void {
    this.lock.run(() => this.emitted.push(this.name));
  }
}

describe('SubmitLockDirective & submitLock', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  beforeEach(async () => {
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  function form(): NgForm {
    return fixture.debugElement.children[0].injector.get(NgForm);
  }

  it('runs the action only once until it is released', () => {
    host.save();
    host.save();
    host.save();
    expect(host.emitted).toEqual(['أحمد']);
    expect(host.lock.busy()).toBeTrue();

    host.lock.release();
    host.save();
    expect(host.emitted.length).toBe(2);
  });

  it('makes the dialog inert and disables its form controls while locked', () => {
    host.save();
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement.querySelector('form');
    expect(el.hasAttribute('inert')).toBeTrue();
    expect(el.classList).toContain('submit-locked');
    expect(form().controls['name'].disabled).toBeTrue();
  });

  it('unlocks after a failed request and keeps controls that were disabled on purpose', () => {
    host.save();
    host.saving.set(true);
    fixture.detectChanges();

    // The page's request failed
    host.saving.set(false);
    host.error.set('الرقم القومي مسجل بالفعل');
    fixture.detectChanges();

    expect(host.lock.busy()).toBeFalse();
    const el: HTMLElement = fixture.nativeElement.querySelector('form');
    expect(el.hasAttribute('inert')).toBeFalse();
    expect(form().controls['name'].enabled).toBeTrue();
    expect(form().controls['readonlyField'].disabled).toBeTrue();
  });
});
