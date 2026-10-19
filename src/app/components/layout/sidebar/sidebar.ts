import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { ThemeSwitch } from '../../ui/theme-switch/theme-switch';
import { NavItem } from '../../../models/navitem';
import { UserService } from '../../../services/user';

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive, ThemeSwitch, TranslocoPipe],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  readonly isOpen = signal<boolean>(false);
  protected readonly user = inject(UserService).user;

  readonly SIDEBAR_ITEMS: NavItem[] = [
    { labelKey: 'sidebar.nav.dashboard', path: '/dashboard' },
    { labelKey: 'sidebar.nav.transactions', path: '/transactions' },
    { labelKey: 'sidebar.nav.categories', path: '/categories' },
    { labelKey: 'sidebar.nav.budgetMensuel', path: '/budget-mensuel' },
    { labelKey: 'sidebar.nav.settings', path: '/settings' },
  ];

  toggleSidebar(): void {
    this.isOpen.update(isOpen => !isOpen);
  }

  closeSidebar(): void {
    this.isOpen.set(false);
  }
}
