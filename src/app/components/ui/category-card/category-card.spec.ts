import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Category } from '../../../models/category';

import { CategoryCard } from './category-card';

describe('CategoryCard', () => {
  let component: CategoryCard;
  let fixture: ComponentFixture<CategoryCard>;
  const category: Category = { id: '1', name: 'Alimentation', type: 'expense', color: '#e74c3c' };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CategoryCard],
    }).compileComponents();

    fixture = TestBed.createComponent(CategoryCard);
    component = fixture.componentInstance;
    component.category = category;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
