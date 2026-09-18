import { Component, Output, EventEmitter } from '@angular/core';


@Component({
  selector: 'app-modal',
  imports: [],
  templateUrl: './modal.html',
  styleUrl: './modal.scss',
})
export class Modal {
  @Output() closed = new EventEmitter<void>();
}
