import { TestBed } from '@angular/core/testing';
import { TranslocoService, TranslocoTestingModule } from '@jsverse/transloco';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        App,
        TranslocoTestingModule.forRoot({
          langs: { fr: {}, en: {} },
          translocoConfig: { availableLangs: ['fr', 'en'], defaultLang: 'fr' },
          preloadLangs: true,
        }),
      ],
    }).compileComponents();
  });

  it('sets the document language from the active Transloco language', () => {
    const transloco = TestBed.inject(TranslocoService);
    transloco.setActiveLang('fr');
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    expect(document.documentElement.lang).toBe('fr');

    transloco.setActiveLang('en');
    fixture.detectChanges();
    expect(document.documentElement.lang).toBe('en');
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render router-outlet', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('router-outlet')).toBeTruthy();
  });
});
