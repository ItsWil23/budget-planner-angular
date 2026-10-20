import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { filter, map } from 'rxjs';
import { MonthSelector } from '../../ui/month-selector/month-selector';

@Component({
  selector: 'app-topbar',
  imports: [TranslocoPipe, MonthSelector],
  templateUrl: './topbar.html',
  styleUrl: './topbar.scss',
})
export class Topbar {
  @Input() menuOpen = false;
  @Output() menuToggle = new EventEmitter<void>();

  private readonly router = inject(Router);

  protected readonly titleKey = toSignal(
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      map(() => this.getLeafTitleKey()),
    ),
    { initialValue: this.getLeafTitleKey() },
  );

  private getLeafTitleKey(): string | undefined {
    let route = this.router.routerState.snapshot.root;
    while (route.firstChild) {
      route = route.firstChild;
    }
    const titleKey: unknown = route.data['titleKey'];
    return typeof titleKey === 'string' ? titleKey : undefined;
  }
}
