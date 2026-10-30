import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { HonorKind } from './honor-roll.model';

/** Round honor-roll photo; falls back to the name's first letter. Size it from the host (e.g. class="w-16 h-16"). */
@Component({
  selector: 'app-honor-avatar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block shrink-0 rounded-full overflow-hidden' },
  templateUrl: './honor-avatar.component.html',
  styleUrl: './honor-avatar.component.css'
})
export class HonorAvatarComponent {
  readonly name = input.required<string>();
  readonly photoUrl = input('');
  readonly kind = input<HonorKind>('TEACHER');

  readonly initial = computed(() => this.name().trim().slice(0, 1) || '؟');
}
