import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { Category, Subcategory } from '../../../models/category';
import type { TransactionInput } from '../../../models/transactions';

import { TransactionForm } from './transaction-form';

describe('TransactionForm', () => {
  let component: TransactionForm;
  let fixture: ComponentFixture<TransactionForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TransactionForm],
    }).compileComponents();

    fixture = TestBed.createComponent(TransactionForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should emit the entered amount in euros without converting it', () => {
    const categories: Category[] = [
      { id: 'cat-1', name: 'Alimentation', type: 'expense', color: '#000000' },
    ];
    const subcategories: Subcategory[] = [
      { id: 'sub-1', name: 'Courses', categoryId: 'cat-1', icon: 'basket' },
    ];
    const emittedTransactions: TransactionInput[] = [];

    fixture.componentRef.setInput('formCategories', categories);
    fixture.componentRef.setInput('formSubcategories', subcategories);
    component.transactionSubmit.subscribe((transaction: TransactionInput) =>
      emittedTransactions.push(transaction),
    );
    component.newTransactionForm.setValue({
      categoryId: 'cat-1',
      subcategoryId: 'sub-1',
      label: 'Courses',
      amountEuros: 1.23,
      date: '2026-10-09',
    });
    fixture.detectChanges();
    fixture.nativeElement.querySelector('form').dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );

    expect(emittedTransactions).toHaveLength(1);
    expect(emittedTransactions[0].amountEuros).toBe(1.23);
  });
});
