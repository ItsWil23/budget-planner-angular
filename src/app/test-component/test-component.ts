import { Component } from '@angular/core';
import { MOCK_TRANSACTIONS } from '../mocks/mock-transactions';
import { Transaction } from '../models/transactions';

@Component({
  selector: 'app-test-component',
  imports: [],
  templateUrl: './test-component.html',
  styleUrl: './test-component.scss',
})
export class TestComponent {
  transactions: Transaction[] = MOCK_TRANSACTIONS;
}
