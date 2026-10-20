import { Component, TemplateRef, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter, Routes } from '@angular/router';
import { TranslocoService, TranslocoTestingModule } from '@jsverse/transloco';

import { Topbar } from './topbar';
import { routes as appRoutes } from '../../../app.routes';
import { TopbarActionService } from '../../../services/topbar-action';

@Component({ template: '' })
class StubPage {}

@Component({
  template: '<ng-template #action><button type="button" class="action-button">Ajouter</button></ng-template>',
})
class ActionHost {
  readonly action = viewChild.required<TemplateRef<unknown>>('action');
}

const routes: Routes = [
  { path: 'dashboard', component: StubPage, data: { titleKey: 'dashboard.title', monthScoped: true } },
  {
    path: 'budget-mensuel',
    component: StubPage,
    data: { titleKey: 'budgetMensuel.title', monthScoped: true },
  },
  { path: 'categories', component: StubPage, data: { titleKey: 'categories.title', monthScoped: false } },
  {
    path: 'settings',
    component: StubPage,
    data: { titleKey: 'settings.title', monthScoped: false, topbarHiddenOutsideTablet: true },
  },
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

  it('should embed the month selector on a month-scoped route', async () => {
    await router.navigateByUrl('/dashboard');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-month-selector')).toBeTruthy();
  });

  it('should not embed the month selector on a route that is not month-scoped', async () => {
    await router.navigateByUrl('/categories');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-month-selector')).toBeNull();
    expect(fixture.nativeElement.querySelector('.topbar-end')).toBeTruthy();
  });

  it('should not embed the month selector when the route has no monthScoped flag', async () => {
    await router.navigateByUrl('/no-title');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-month-selector')).toBeNull();
  });

  it('should declare the month scope on the application routes', () => {
    const mainRoutes = appRoutes.find(route => route.children)?.children ?? [];
    const dataOf = (path: string): Record<string, unknown> =>
      mainRoutes.find(route => route.path === path)?.data ?? {};

    expect(dataOf('dashboard')['monthScoped']).toBe(true);
    expect(dataOf('transactions')['monthScoped']).toBe(true);
    expect(dataOf('budget-mensuel')['monthScoped']).toBe(true);
    expect(dataOf('categories')['monthScoped']).toBe(false);
    expect(dataOf('settings')['monthScoped']).toBe(false);
  });

  it('should hide the topbar outside tablet widths on the settings route only', () => {
    const mainRoutes = appRoutes.find(route => route.children)?.children ?? [];
    const flagOf = (path: string): unknown =>
      mainRoutes.find(route => route.path === path)?.data?.['topbarHiddenOutsideTablet'];

    expect(flagOf('settings')).toBe(true);
    expect(flagOf('categories')).toBeUndefined();
    expect(flagOf('dashboard')).toBeUndefined();
  });

  it('should apply the tablet-only class on a route that requests it', async () => {
    await router.navigateByUrl('/settings');
    fixture.detectChanges();

    expect(fixture.nativeElement.classList.contains('topbar-tablet-only')).toBe(true);
  });

  it('should not apply the tablet-only class on other routes', async () => {
    await router.navigateByUrl('/categories');
    fixture.detectChanges();

    expect(fixture.nativeElement.classList.contains('topbar-tablet-only')).toBe(false);
  });

  it('should render the action registered by the page in the topbar, and remove it when unregistered', () => {
    const actionFixture = TestBed.createComponent(ActionHost);
    actionFixture.detectChanges();
    const service = TestBed.inject(TopbarActionService);
    const template = actionFixture.componentInstance.action();

    service.register(template);
    fixture.detectChanges();
    const inTopbar = fixture.nativeElement.querySelectorAll('.topbar-action .action-button');
    expect(inTopbar.length).toBe(1);

    service.unregister(template);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.topbar-action')).toBeNull();
  });
});