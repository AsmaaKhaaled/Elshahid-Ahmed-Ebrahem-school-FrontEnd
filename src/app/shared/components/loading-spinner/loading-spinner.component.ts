import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './loading-spinner.component.html',
  styleUrl: './loading-spinner.component.css'
})
export class LoadingSpinnerComponent {
  readonly message = input<string>('جاري التحميل...');
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  readonly fullScreen = input<boolean>(false);

  spinnerSizeClass(): string {
    switch (this.size()) {
      case 'sm':
        return 'w-6 h-6 border-2';
      case 'lg':
        return 'w-12 h-12 border-4';
      case 'md':
      default:
        return 'w-9 h-9 border-3';
    }
  }

  containerClasses(): string {
    return this.fullScreen()
      ? 'fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-sm'
      : 'flex items-center justify-center p-6';
  }
}

