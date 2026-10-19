import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { Category } from '../../../models/category';

import { CategoryCard } from './category-card';

describe('CategoryCard', () => {
  let component: CategoryCard;
  let fixture: ComponentFixture<CategoryCard>;
  const category: Category = { id: '1', name: 'Alimentation', type: 'expense', color: '#e74c3c' };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        CategoryCard,
        TranslocoTestingModule.forRoot({
          langs: {
            fr: {
              categoryCard: { emptySubcategories: 'Aucune sous-catégorie' },
            },
          },
          translocoConfig: { availableLangs: ['fr', 'en'], defaultLang: 'fr' },
          preloadLangs: true,
        }),
      ],
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

  it('should render the French empty state when there is no subcategory', () => {
    const emptyState: HTMLElement = fixture.nativeElement.querySelector('.empty-state');
    expect(emptyState.textContent?.trim()).toBe('Aucune sous-catégorie');
  });
});
