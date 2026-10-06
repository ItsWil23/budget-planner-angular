import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Categories } from './categories';
import { CategoryCard } from '../../components/ui/category-card/category-card';

describe('Categories', () => {
  let component: Categories;
  let fixture: ComponentFixture<Categories>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Categories, CategoryCard],
    }).compileComponents();

    fixture = TestBed.createComponent(Categories);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render categories from service', async () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    // Vérifier que les cartes de catégories sont rendues (4 catégories initiales)
    const cardElements = compiled.querySelectorAll('app-category-card');
    expect(cardElements.length).toBe(4);
  });

  it('should render subcategories for charges fixes category', async () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    // La catégorie "Charges fixes" (cat-2) devrait avoir 3 sous-catégories rendues
    expect(compiled.textContent).toContain('Loyer');
    expect(compiled.textContent).toContain('Internet');
    expect(compiled.textContent).toContain('Électricité');
  });
});
