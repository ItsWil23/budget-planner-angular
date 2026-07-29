import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BudgetMensuel } from './budget-mensuel';

describe('BudgetMensuel', () => {
  let component: BudgetMensuel;
  let fixture: ComponentFixture<BudgetMensuel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BudgetMensuel],
    }).compileComponents();

    fixture = TestBed.createComponent(BudgetMensuel);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
