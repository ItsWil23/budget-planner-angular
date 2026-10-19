import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ThemeSwitch } from '../../ui/theme-switch/theme-switch';
import { NavItem } from '../../../models/navitem';
import { UserService } from '../../../services/user';

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive, ThemeSwitch],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  readonly isOpen = signal<boolean>(false);
  protected readonly user = inject(UserService).user;

  readonly SIDEBAR_ITEMS: NavItem[] = [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Transactions', path: '/transactions' },
    { label: 'Categories', path: '/categories' },
    { label: 'Budget Mensuel', path: '/budget-mensuel' },
    { label: 'Settings', path: '/settings' },
  ];

  toggleSidebar(): void {
    this.isOpen.update(isOpen => !isOpen);
  }

  closeSidebar(): void {
    this.isOpen.set(false);
  }
}
