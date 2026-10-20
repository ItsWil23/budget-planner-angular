import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { NAV_ITEMS } from '../nav-items';

@Component({
  selector: 'app-bottom-nav',
  imports: [RouterLink, RouterLinkActive, TranslocoPipe],
  templateUrl: './bottom-nav.html',
  styleUrl: './bottom-nav.scss',
})
export class BottomNav {
  protected readonly items = NAV_ITEMS;
}
