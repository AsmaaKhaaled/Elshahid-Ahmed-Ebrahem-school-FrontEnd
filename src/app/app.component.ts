import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NotificationsHostComponent } from './shared/components/notifications/notifications-host.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NotificationsHostComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'school-management-frontend';
}
