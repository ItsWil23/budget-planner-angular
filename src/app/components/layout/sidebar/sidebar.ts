import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { ThemeSwitch } from '../../ui/theme-switch/theme-switch';
import { UserService } from '../../../services/user';
import { NAV_ITEMS } from '../nav-items';

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive, ThemeSwitch, TranslocoPipe],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  readonly isOpen = signal<boolean>(false);
  protected readonly user = inject(UserService).user;

  readonly SIDEBAR_ITEMS = NAV_ITEMS;

  toggleSidebar(): void {
    this.isOpen.update(isOpen => !isOpen);
  }

  closeSidebar(): void {
    this.isOpen.set(false);
  }
}
