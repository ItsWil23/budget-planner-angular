import { Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ThemeSwitch } from '../../ui/theme-switch/theme-switch';
import { NavItem } from '../../../models/navitem';
import { User } from '../../../models/user';
import { MOCK_USER } from '../../../mocks/mock-user';

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive, ThemeSwitch],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  readonly isOpen = signal<boolean>(false);

  readonly SIDEBAR_ITEMS: NavItem[] = [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Transactions', path: '/transactions' },
    { label: 'Categories', path: '/categories' },
    { label: 'Budget Mensuel', path: '/budget-mensuel' },
    { label: 'Settings', path: '/settings' },
  ];

  user: User = MOCK_USER;

  toggleSidebar(): void {
    this.isOpen.update(isOpen => !isOpen);
  }

  closeSidebar(): void {
    this.isOpen.set(false);
  }
}
