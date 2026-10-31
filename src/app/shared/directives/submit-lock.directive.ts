import { AbstractControl, ControlContainer } from '@angular/forms';
import { Directive, Signal, computed, contentChildren, effect, inject, input, signal, untracked } from '@angular/core';

/**
 * Locks a dialog while its save / delete is in flight: nothing inside can be clicked, typed in
 * or submitted again, and the form controls inside are shown disabled.
 * Put it on the dialog panel: <form [appSubmitLock]="lock.busy()"> or <div [appSubmitLock]="...">.
 */
@Directive({
  selector: '[appSubmitLock]',
  standalone: true,
  host: {
    '[attr.inert]': 'locked() ? "" : null',
    '[attr.aria-busy]': 'locked() || null',
    '[class.submit-locked]': 'locked()'
  }
})
export class SubmitLockDirective {
  readonly locked = input(false, { alias: 'appSubmitLock' });

  // The host itself may be the <form>, or the forms may be inside it
  private readonly ownForm = inject(ControlContainer, { optional: true, self: true });
  private readonly innerForms = contentChildren(ControlContainer, { descendants: true });

  // Only the controls this directive disabled are re-enabled afterwards
  private disabledByLock: AbstractControl[] = [];

  constructor() {
    effect(() => {
      const locked = this.locked();
      const forms = [this.ownForm, ...this.innerForms()].filter(form => !!form?.control);
      untracked(() => (locked ? this.disable(forms) : this.enable()));
    });
  }

  private disable(forms: (ControlContainer | null)[]): void {
    for (const form of forms) {
      const root = form!.control!;
      const controls = 'controls' in root ? Object.values(root.controls as Record<string, AbstractControl>) : [root];
      for (const control of controls) {
        if (control.enabled && !this.disabledByLock.includes(control)) {
          control.disable({ emitEvent: false });
          this.disabledByLock.push(control);
        }
      }
    }
  }

  private enable(): void {
    this.disabledByLock.forEach(control => control.enable({ emitEvent: false }));
    this.disabledByLock = [];
  }
}

/**
 * Submit state for a dialog: locks as soon as the dialog emits its action, so a second click
 * sends nothing. The page closes the dialog on success.
 * When the page saves asynchronously, pass its `saving` / `error` inputs: a failed request
 * (saving goes back to false, or an error arrives) unlocks the dialog so the user can retry.
 */
export function submitLock(options: { saving?: Signal<boolean>; error?: Signal<string | null> } = {}) {
  const submitted = signal(false);
  let wasSaving = false;

  effect(() => {
    const saving = options.saving?.() ?? false;
    const error = options.error?.() ?? null;
    untracked(() => {
      if ((wasSaving && !saving) || error) {
        submitted.set(false);
      }
      wasSaving = saving;
    });
  });

  const busy = computed(() => submitted() || (options.saving?.() ?? false));

  return {
    busy,
    /** Runs the action once; ignored while a previous one is still in flight. */
    run(action: () => void): void {
      if (busy()) return;
      submitted.set(true);
      action();
    },
    /** For dialogs that handle their own request: unlock after a failure. */
    release(): void {
      submitted.set(false);
    }
  };
}
