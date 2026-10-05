import { Component, viewChild, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Sidebar } from '../sidebar/sidebar';
import { Background } from '../../../services/background';

@Component({
  selector: 'app-main-layout',
  imports: [RouterOutlet, Sidebar],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.scss',
  host: {
  '[style.--mesh-background]': 'mesh',
},
})
export class MainLayout {
  protected readonly sidebar = viewChild.required(Sidebar);
  private readonly backgroundService = inject(Background);

  readonly mesh = this.backgroundService.background;
}
