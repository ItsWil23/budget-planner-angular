import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter, Routes } from '@angular/router';
import { TranslocoService, TranslocoTestingModule } from '@jsverse/transloco';

import { Topbar } from './topbar';

@Component({ template: '' })
class StubPage {}

const routes: Routes = [
  { path: 'dashboard', component: StubPage, data: { titleKey: 'dashboard.title' } },
  { path: 'budget-mensuel', component: StubPage, data: { titleKey: 'budgetMensuel.title' } },
  { path: 'no-title', component: StubPage },
];

describe('Topbar', () => {
  let component: Topbar;
  let fixture: ComponentFixture<Topbar>;
  let router: Router;
  let transloco: TranslocoService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        Topbar,
        TranslocoTestingModule.forRoot({
          langs: {
            fr: {
              topbar: { menu: 'Menu' },
              dashboard: { title: 'Dashboard' },
              budgetMensuel: { title: 'Budget Mensuel' },
              monthSelector: { previous: 'Mois précédent', next: 'Mois suivant', today: "Aujourd'hui" },
            },
            en: {
              topbar: { menu: 'Menu' },
              dashboard: { title: 'Dashboard' },
              budgetMensuel: { title: 'Monthly budget' },
              monthSelector: { previous: 'Previous month', next: 'Next month', today: 'Today' },
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

    fixture = TestBed.createComponent(Topbar);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should emit menuToggle when the hamburger is clicked', () => {
    let emitted = 0;
    component.menuToggle.subscribe(() => emitted++);

    const hamburger: HTMLButtonElement = fixture.nativeElement.querySelector('.hamburger');
    hamburger.click();

    expect(emitted).toBe(1);
  });

  it('should reflect menuOpen with the hidden class on the hamburger', () => {
    const hamburger: HTMLElement = fixture.nativeElement.querySelector('.hamburger');
    expect(hamburger.classList.contains('hidden')).toBe(false);

    fixture.componentRef.setInput('menuOpen', true);
    fixture.detectChanges();
    expect(hamburger.classList.contains('hidden')).toBe(true);

    fixture.componentRef.setInput('menuOpen', false);
    fixture.detectChanges();
    expect(hamburger.classList.contains('hidden')).toBe(false);
  });

  it('should expose the translated menu label on the hamburger', () => {
    const hamburger: HTMLElement = fixture.nativeElement.querySelector('.hamburger');
    expect(hamburger.getAttribute('aria-label')).toBe('Menu');
  });

  it('should reflect menuOpen in aria-expanded on the hamburger', () => {
    const hamburger: HTMLElement = fixture.nativeElement.querySelector('.hamburger');
    expect(hamburger.getAttribute('aria-expanded')).toBe('false');

    fixture.componentRef.setInput('menuOpen', true);
    fixture.detectChanges();
    expect(hamburger.getAttribute('aria-expanded')).toBe('true');
  });

  it('should render the title of the active route', async () => {
    await router.navigateByUrl('/dashboard');
    fixture.detectChanges();

    const title: HTMLElement = fixture.nativeElement.querySelector('.topbar-title');
    expect(title.textContent?.trim()).toBe('Dashboard');
  });

  it('should update the title when the route changes', async () => {
    await router.navigateByUrl('/dashboard');
    fixture.detectChanges();
    await router.navigateByUrl('/budget-mensuel');
    fixture.detectChanges();

    const title: HTMLElement = fixture.nativeElement.querySelector('.topbar-title');
    expect(title.textContent?.trim()).toBe('Budget Mensuel');
  });

  it('should render the title in the active language', async () => {
    transloco.setActiveLang('en');
    await router.navigateByUrl('/budget-mensuel');
    fixture.detectChanges();

    const title: HTMLElement = fixture.nativeElement.querySelector('.topbar-title');
    expect(title.textContent?.trim()).toBe('Monthly budget');
  });

  it('should render an empty title when the route has no titleKey', async () => {
    await router.navigateByUrl('/no-title');
    fixture.detectChanges();

    const title: HTMLElement = fixture.nativeElement.querySelector('.topbar-title');
    expect(title.textContent?.trim()).toBe('');
  });

  it('should embed the month selector', () => {
    expect(fixture.nativeElement.querySelector('app-month-selector')).toBeTruthy();
  });
});
