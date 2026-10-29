import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function passwordMatchValidator(
  passwordControlName: string = 'newPassword',
  confirmPasswordControlName: string = 'confirmPassword'
): ValidatorFn {
  return (formGroup: AbstractControl): ValidationErrors | null => {
    const password = formGroup.get(passwordControlName);
    const confirmPassword = formGroup.get(confirmPasswordControlName);

    if (!password || !confirmPassword) {
      return null;
    }

    if (confirmPassword.errors && !confirmPassword.errors['passwordMismatch']) {
      // Return if another validator has already found an error on the confirmPassword field
      return null;
    }

    if (password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    } else {
      if (confirmPassword.errors?.['passwordMismatch']) {
        const { passwordMismatch, ...remainingErrors } = confirmPassword.errors;
        confirmPassword.setErrors(Object.keys(remainingErrors).length ? remainingErrors : null);
      }
      return null;
    }
  };
}

