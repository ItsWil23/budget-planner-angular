import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';

import { MainLayout } from './main-layout';

describe('MainLayout', () => {
  let component: MainLayout;
  let fixture: ComponentFixture<MainLayout>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        MainLayout,
        TranslocoTestingModule.forRoot({
          langs: {
            fr: {
              sidebar: {
                nav: {
                  dashboard: 'Dashboard',
                  transactions: 'Transactions',
                  categories: 'Catégories',
                  budgetMensuel: 'Budget Mensuel',
                  settings: 'Paramètres',
                },
                loggedInAs: 'Connecté en tant que:',
                logout: 'Déconnecter',
              },
              themeSwitch: { ariaLabel: 'Basculer le thème sombre' },
            },
          },
          translocoConfig: { availableLangs: ['fr', 'en'], defaultLang: 'fr' },
          preloadLangs: true,
        }),
      ],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(MainLayout);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
