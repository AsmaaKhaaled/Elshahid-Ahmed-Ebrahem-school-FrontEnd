import { Provider } from '@angular/core';
import { MAT_FORM_FIELD_DEFAULT_OPTIONS, MatFormFieldDefaultOptions } from '@angular/material/form-field';
import { MAT_SELECT_CONFIG, MatSelectConfig } from '@angular/material/select';

const formFieldDefaults: MatFormFieldDefaultOptions = {
  appearance: 'outline',
  subscriptSizing: 'dynamic',
  floatLabel: 'auto'
};

const selectDefaults: MatSelectConfig = {
  overlayPanelClass: 'app-select-panel',
  disableOptionCentering: true,
  hideSingleSelectionIndicator: true
};

/**
 * Unified look for every Material form field / dropdown in the system.
 * Provided by the (lazy-loaded) layout components rather than app.config,
 * so Angular Material stays out of the initial bundle (login page loads faster).
 */
export function provideMaterialDefaults(): Provider[] {
  return [
    { provide: MAT_FORM_FIELD_DEFAULT_OPTIONS, useValue: formFieldDefaults },
    { provide: MAT_SELECT_CONFIG, useValue: selectDefaults }
  ];
}
