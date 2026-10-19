import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';

import { Landing } from './landing';

describe('Landing', () => {
  let component: Landing;
  let fixture: ComponentFixture<Landing>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        Landing,
        TranslocoTestingModule.forRoot({
          langs: {
            fr: {
              landing: {
                features: {
                  planning: { title: 'Planification mensuelle' },
                  tracking: { title: 'Suivi quotidien' },
                  summary: { title: 'Synthèse claire' },
                },
              },
            },
          },
          translocoConfig: { availableLangs: ['fr', 'en'], defaultLang: 'fr' },
          preloadLangs: true,
        }),
      ],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(Landing);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the feature cards in order', () => {
    fixture.detectChanges();

    const titles = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('.feature-card h3'),
    ).map(title => title.textContent?.trim());

    expect(titles).toEqual(['Planification mensuelle', 'Suivi quotidien', 'Synthèse claire']);
  });
});
