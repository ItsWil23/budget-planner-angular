import { Component, Output, EventEmitter } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';


@Component({
  selector: 'app-modal',
  imports: [TranslocoPipe],
  templateUrl: './modal.html',
  styleUrl: './modal.scss',
})
export class Modal {
  @Output() closed = new EventEmitter<void>();
}
