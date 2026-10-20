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
              bottomNav: { label: 'Navigation principale', budget: 'Budget' },
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

  it('should open the sidebar from the topbar hamburger', () => {
    const layout: HTMLElement = fixture.nativeElement;
    const sidebar = layout.querySelector('.sidebar');

    expect(sidebar?.classList.contains('open')).toBe(false);
    expect(layout.querySelector('.backdrop')).toBeNull();

    layout.querySelector<HTMLButtonElement>('app-topbar .hamburger')?.click();
    fixture.detectChanges();

    expect(sidebar?.classList.contains('open')).toBe(true);
    expect(layout.querySelector('.backdrop')).not.toBeNull();
  });

  it('should render the bottom navigation bar', () => {
    const layout: HTMLElement = fixture.nativeElement;

    expect(layout.querySelector('app-bottom-nav nav')?.getAttribute('aria-label')).toBe(
      'Navigation principale',
    );
    expect(layout.querySelectorAll('app-bottom-nav .bottom-nav-item').length).toBe(5);
  });
});
