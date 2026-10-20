import { Component, EventEmitter, Input, Output, computed, inject } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRouteSnapshot, NavigationEnd, Router } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { filter, map } from 'rxjs';
import { MonthSelector } from '../../ui/month-selector/month-selector';
import { TopbarActionService } from '../../../services/topbar-action';

@Component({
  selector: 'app-topbar',
  imports: [NgTemplateOutlet, TranslocoPipe, MonthSelector],
  templateUrl: './topbar.html',
  styleUrl: './topbar.scss',
  host: {
    '[class.topbar-tablet-only]': 'tabletOnly()',
  },
})
export class Topbar {
  @Input() menuOpen = false;
  @Output() menuToggle = new EventEmitter<void>();

  private readonly router = inject(Router);
  protected readonly topbarAction = inject(TopbarActionService).action;

  private readonly leafData = toSignal(
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      map(() => this.getLeafRoute().data),
    ),
    { initialValue: this.getLeafRoute().data },
  );

  protected readonly titleKey = computed(() => {
    const titleKey: unknown = this.leafData()['titleKey'];
    return typeof titleKey === 'string' ? titleKey : undefined;
  });

  protected readonly showMonthSelector = computed(() => this.leafData()['monthScoped'] === true);

  // Topbar visible uniquement entre 768px et 1023px sur les pages qui le demandent (ex. Paramètres).
  protected readonly tabletOnly = computed(
    () => this.leafData()['topbarHiddenOutsideTablet'] === true,
  );

  private getLeafRoute(): ActivatedRouteSnapshot {
    let route = this.router.routerState.snapshot.root;
    while (route.firstChild) {
      route = route.firstChild;
    }
    return route;
  }
}
