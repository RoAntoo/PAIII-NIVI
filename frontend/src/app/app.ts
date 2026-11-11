import { Component, inject } from '@angular/core';
import { AuthService } from './core/auth/auth.service';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { IonApp, IonHeader, IonToolbar, IonContent } from '@ionic/angular';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLinkActive, RouterLink, IonApp, IonHeader, IonToolbar, IonContent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  readonly auth = inject(AuthService);
}
