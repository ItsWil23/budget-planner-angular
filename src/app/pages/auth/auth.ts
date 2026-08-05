import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
@Component({
  selector: 'app-auth',
  imports: [
    RouterLink,
  ],
  templateUrl: './auth.html',
  styleUrl: './auth.scss',
})
export class Auth {
  private readonly route = inject(ActivatedRoute);
  protected readonly mode = signal<'login' | 'register'>('login');
  protected readonly mockState = signal<'idle' | 'error' | 'success'>('idle');

  constructor() {
    const segment = this.route.snapshot.url[this.route.snapshot.url.length - 1]?.path;
    this.mode.set(segment === 'register' ? 'register' : 'login');
  }
}
