import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';

import { Sidebar } from './sidebar';

describe('Sidebar', () => {
  let component: Sidebar;
  let fixture: ComponentFixture<Sidebar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        Sidebar,
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
                closeMenu: 'Fermer le menu',
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

    fixture = TestBed.createComponent(Sidebar);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the user name and translated dashboard label', () => {
    const sidebar: HTMLElement = fixture.nativeElement;

    expect(sidebar.querySelector('.user-name')?.textContent?.trim()).toBe('John Doe');
    expect(sidebar.querySelector('.user')?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
      'Connecté en tant que: John Doe',
    );
    expect(sidebar.querySelector('.sidebar-item')?.textContent?.trim()).toBe('Dashboard');
  });

  it('should label the close button with the translated close menu text', () => {
    const closeButton: HTMLButtonElement = fixture.nativeElement.querySelector('.close-button');
    expect(closeButton.getAttribute('aria-label')).toBe('Fermer le menu');
  });
});
