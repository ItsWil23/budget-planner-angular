import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';

import { TransactionList } from './transaction-list';

describe('TransactionList', () => {
  let component: TransactionList;
  let fixture: ComponentFixture<TransactionList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        TransactionList,
        TranslocoTestingModule.forRoot({
          langs: {
            fr: {
              transactionList: {
                headers: { label: 'Libellé' },
                empty: 'Aucune transaction pour le moment.',
              },
            },
          },
          translocoConfig: { availableLangs: ['fr', 'en'], defaultLang: 'fr' },
          preloadLangs: true,
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TransactionList);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the French label header', () => {
    fixture.detectChanges();
    const headers: NodeListOf<HTMLTableCellElement> = fixture.nativeElement.querySelectorAll('th');
    expect(headers[0].textContent?.trim()).toBe('Libellé');
  });

  it('should render the empty state message in a full-width row', () => {
    fixture.detectChanges();
    const emptyCell: HTMLTableCellElement | null = fixture.nativeElement.querySelector(
      'tbody td[colspan="5"]',
    );
    expect(emptyCell?.textContent?.trim()).toBe('Aucune transaction pour le moment.');
  });
});
