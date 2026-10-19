import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'app-topbar',
  imports: [TranslocoPipe],
  templateUrl: './topbar.html',
  styleUrl: './topbar.scss',
})
export class Topbar {
  @Input() menuOpen = false;
  @Output() menuToggle = new EventEmitter<void>();
}
