import { Component, signal } from '@angular/core';
import { TestComponent } from './test-component/test-component';

@Component({
  selector: 'app-root',
  imports: [
    TestComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('budget-planner-angular');
}
