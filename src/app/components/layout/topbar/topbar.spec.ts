import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';

import { Topbar } from './topbar';

describe('Topbar', () => {
  let component: Topbar;
  let fixture: ComponentFixture<Topbar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        Topbar,
        TranslocoTestingModule.forRoot({
          langs: { fr: { topbar: { menu: 'Menu' } } },
          translocoConfig: { availableLangs: ['fr', 'en'], defaultLang: 'fr' },
          preloadLangs: true,
        }),
      ],
    }).compileComponents();

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
});
