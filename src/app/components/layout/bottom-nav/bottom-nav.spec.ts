import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter, Routes } from '@angular/router';
import { TranslocoService, TranslocoTestingModule } from '@jsverse/transloco';

import { BottomNav } from './bottom-nav';

@Component({ template: '' })
class StubPage {}

const routes: Routes = [
  { path: 'dashboard', component: StubPage },
  { path: 'transactions', component: StubPage },
  { path: 'categories', component: StubPage },
  { path: 'budget-mensuel', component: StubPage },
  { path: 'settings', component: StubPage },
];

describe('BottomNav', () => {
  let fixture: ComponentFixture<BottomNav>;
  let router: Router;
  let transloco: TranslocoService;

  const links = (): HTMLAnchorElement[] =>
    Array.from<HTMLAnchorElement>(fixture.nativeElement.querySelectorAll('.bottom-nav-item'));
  const labels = (): string[] =>
    links().map(link => link.querySelector('.bottom-nav-label')?.textContent?.trim() ?? '');

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        BottomNav,
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
              },
              bottomNav: { label: 'Navigation principale', budget: 'Budget' },
            },
            en: {
              sidebar: {
                nav: {
                  dashboard: 'Dashboard',
                  transactions: 'Transactions',
                  categories: 'Categories',
                  budgetMensuel: 'Monthly budget',
                  settings: 'Settings',
                },
              },
              bottomNav: { label: 'Main navigation', budget: 'Budget' },
            },
          },
          translocoConfig: { availableLangs: ['fr', 'en'], defaultLang: 'fr' },
          preloadLangs: true,
        }),
      ],
      providers: [provideRouter(routes)],
    }).compileComponents();

    router = TestBed.inject(Router);
    transloco = TestBed.inject(TranslocoService);

    fixture = TestBed.createComponent(BottomNav);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render the bottom navigation in the expected order', () => {
    const hrefs = links().map(link => link.getAttribute('href'));

    expect(hrefs).toEqual(['/dashboard', '/budget-mensuel', '/transactions', '/categories', '/settings']);
  });

  it('should label the navigation landmark with the translated label', () => {
    const nav: HTMLElement = fixture.nativeElement.querySelector('nav');
    expect(nav.getAttribute('aria-label')).toBe('Navigation principale');
  });

  it('should use the short budget label and the sidebar labels in French', () => {
    expect(labels()).toEqual(['Dashboard', 'Budget', 'Transactions', 'Catégories', 'Paramètres']);
  });

  it('should use the English labels when the active language is English', async () => {
    transloco.setActiveLang('en');
    fixture = TestBed.createComponent(BottomNav);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(labels()).toEqual(['Dashboard', 'Budget', 'Transactions', 'Categories', 'Settings']);
    expect(fixture.nativeElement.querySelector('nav').getAttribute('aria-label')).toBe('Main navigation');
  });


  it('should render an icon in every link', () => {
    links().forEach(link => {
      expect(link.querySelector('svg.bottom-nav-icon')).toBeTruthy();
    });
  });

  it('should mark only the link of the active route with aria-current="page"', async () => {
    await router.navigateByUrl('/transactions');
    fixture.detectChanges();

    const current = links().filter(link => link.getAttribute('aria-current') === 'page');
    expect(current.length).toBe(1);
    expect(current[0].getAttribute('href')).toBe('/transactions');
    expect(current[0].classList.contains('active')).toBe(true);
  });
});
