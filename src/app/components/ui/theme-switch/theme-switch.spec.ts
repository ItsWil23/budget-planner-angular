import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';

import { ThemeSwitch } from './theme-switch';

describe('ThemeSwitch', () => {
  let component: ThemeSwitch;
  let fixture: ComponentFixture<ThemeSwitch>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        ThemeSwitch,
        TranslocoTestingModule.forRoot({
          langs: {
            fr: { themeSwitch: { ariaLabel: 'Basculer le thème sombre' } },
          },
          translocoConfig: { availableLangs: ['fr', 'en'], defaultLang: 'fr' },
          preloadLangs: true,
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ThemeSwitch);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the translated accessible name', () => {
    const toggle: HTMLInputElement = fixture.nativeElement.querySelector('[role="switch"]');

    expect(toggle.getAttribute('aria-label')).toBe('Basculer le thème sombre');
  });
});
