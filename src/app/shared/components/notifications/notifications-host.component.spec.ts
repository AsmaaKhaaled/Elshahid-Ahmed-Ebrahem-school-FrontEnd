import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConfirmService } from '../../../core/notifications/confirm.service';
import { ToastService } from '../../../core/notifications/toast.service';
import { NotificationsHostComponent } from './notifications-host.component';

describe('NotificationsHostComponent', () => {
  let fixture: ComponentFixture<NotificationsHostComponent>;
  const text = () => (fixture.nativeElement as HTMLElement).textContent ?? '';
  const button = (label: string) =>
    [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')].find(b => b.textContent?.trim() === label)!;

  beforeEach(() => {
    fixture = TestBed.createComponent(NotificationsHostComponent);
    fixture.detectChanges();
  });

  it('shows a toast once, even when the same message comes twice, and closes it', () => {
    const toasts = TestBed.inject(ToastService);
    toasts.error('تعذر الاتصال بالخادم.');
    toasts.error('تعذر الاتصال بالخادم.');
    fixture.detectChanges();
    expect(toasts.toasts().length).toBe(1);
    expect(text()).toContain('تعذر الاتصال بالخادم.');

    toasts.dismiss(toasts.toasts()[0].id);
    fixture.detectChanges();
    expect(text()).not.toContain('تعذر الاتصال بالخادم.');
  });

  it('answers the confirmation with the button the user clicks', async () => {
    const confirm = TestBed.inject(ConfirmService);

    const leave = confirm.ask({ title: 'توجد درجات لم يتم حفظها بعد', confirmText: 'المتابعة دون حفظ', cancelText: 'العودة للحفظ' });
    fixture.detectChanges();
    expect(text()).toContain('توجد درجات لم يتم حفظها بعد');
    button('العودة للحفظ').click();
    expect(await leave).toBeFalse();

    const leaveAgain = confirm.ask({ title: 'توجد درجات لم يتم حفظها بعد', confirmText: 'المتابعة دون حفظ' });
    fixture.detectChanges();
    button('المتابعة دون حفظ').click();
    expect(await leaveAgain).toBeTrue();
    fixture.detectChanges();
    expect(text()).not.toContain('توجد درجات لم يتم حفظها بعد');
  });
});
