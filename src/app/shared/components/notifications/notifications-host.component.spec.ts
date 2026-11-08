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

    const leave = confirm.ask({ title: 'فيه درجات لسه ما اتحفظتش', confirmText: 'كمّل من غير حفظ', cancelText: 'ارجع احفظها' });
    fixture.detectChanges();
    expect(text()).toContain('فيه درجات لسه ما اتحفظتش');
    button('ارجع احفظها').click();
    expect(await leave).toBeFalse();

    const leaveAgain = confirm.ask({ title: 'فيه درجات لسه ما اتحفظتش', confirmText: 'كمّل من غير حفظ' });
    fixture.detectChanges();
    button('كمّل من غير حفظ').click();
    expect(await leaveAgain).toBeTrue();
    fixture.detectChanges();
    expect(text()).not.toContain('فيه درجات لسه ما اتحفظتش');
  });
});
