import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';

import { Modal } from './modal';

describe('Modal', () => {
  let component: Modal;
  let fixture: ComponentFixture<Modal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        Modal,
        TranslocoTestingModule.forRoot({
          langs: {
            fr: {
              modal: { close: 'Fermer' },
            },
          },
          translocoConfig: { availableLangs: ['fr', 'en'], defaultLang: 'fr' },
          preloadLangs: true,
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Modal);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the French close button title', () => {
    fixture.detectChanges();
    const closeButton: HTMLButtonElement = fixture.nativeElement.querySelector('.close-btn');
    expect(closeButton.getAttribute('title')).toBe('Fermer');
  });
});
