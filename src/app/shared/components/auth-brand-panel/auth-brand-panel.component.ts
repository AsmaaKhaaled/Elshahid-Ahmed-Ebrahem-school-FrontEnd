import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { SCHOOL_INFO } from '../../../core/constants/school.constants';

/** The school identity half of the login pages (students & teachers at /, administration at /admin/login). */
@Component({
  selector: 'app-auth-brand-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './auth-brand-panel.component.html',
  styleUrl: './auth-brand-panel.component.css'
})
export class AuthBrandPanelComponent {
  readonly school = SCHOOL_INFO;
  readonly subtitle = input<string>('أول منصة تعليمية إلكترونية بسلوا بحري');
}
