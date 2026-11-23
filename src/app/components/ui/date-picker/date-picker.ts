import {
  Component,
  ElementRef,
  HostListener,
  Injector,
  afterNextRender,
  computed,
  forwardRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import { SettingsService } from '../../../services/settings';
import { TRANSACTION_DATE_PATTERN, todayLocalIsoDate } from '../../../services/transaction';

const DAYS_PER_WEEK = 7;
/** Écart en px entre le champ, le panneau et le bord du conteneur de rognage. */
const PANEL_SPACING = 8;
const CHOICE_COLUMNS = 3;
const YEARS_PER_PAGE = 12;
const MONTHS_PER_YEAR = 12;
const ARROW_STEPS: Readonly<Record<string, { axis: 'x' | 'y'; sign: 1 | -1 }>> = {
  ArrowLeft: { axis: 'x', sign: -1 },
  ArrowRight: { axis: 'x', sign: 1 },
  ArrowUp: { axis: 'y', sign: -1 },
  ArrowDown: { axis: 'y', sign: 1 },
};

type PickerView = 'days' | 'months' | 'years';

interface CivilDate {
  readonly year: number;
  readonly month: number;
  readonly day: number;
}

interface DayCell {
  readonly key: string;
  readonly label: string;
  readonly day: number;
  readonly inMonth: boolean;
  readonly selected: boolean;
  readonly today: boolean;
  readonly active: boolean;
}

interface ChoiceCell {
  readonly key: string;
  readonly label: string;
  readonly selected: boolean;
  readonly active: boolean;
}

/** Lit une date civile AAAA-MM-JJ sans passer par UTC, pour éviter un décalage d'un jour. */
function parseIsoDate(value: string): CivilDate | null {
  if (!TRANSACTION_DATE_PATTERN.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  return { year, month, day };
}

function toIsoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function addDays(isoDate: string, amount: number): string {
  const parts = parseIsoDate(isoDate);
  if (!parts) return isoDate;
  const date = new Date(parts.year, parts.month - 1, parts.day + amount);
  return toIsoDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

interface LocaleWeekInfo {
  readonly firstDay: number;
}

type LocaleWithWeekInfo = Intl.Locale & {
  getWeekInfo?: () => LocaleWeekInfo;
  readonly weekInfo?: LocaleWeekInfo;
};

/** Régions dont la semaine commence le dimanche, utilisées seulement si l'API Intl ne fournit pas l'information. */
const SUNDAY_FIRST_REGIONS: ReadonlySet<string> = new Set(['US', 'CA', 'JP', 'KR', 'TW', 'IL', 'BR', 'MX', 'PH', 'IN']);

/**
 * Premier jour de la semaine (0 = dimanche) selon la locale.
 * Les navigateurs exposent soit `getWeekInfo()`, soit la propriété `weekInfo` selon leur version ;
 * sans l'une ni l'autre, on se rabat sur la région de la locale, puis sur le lundi.
 */
function firstWeekday(locale: string): number {
  const intlLocale = new Intl.Locale(locale) as LocaleWithWeekInfo;
  const info = intlLocale.getWeekInfo?.() ?? intlLocale.weekInfo;
  if (info) return info.firstDay % DAYS_PER_WEEK;
  const region = intlLocale.maximize().region;
  return region && SUNDAY_FIRST_REGIONS.has(region) ? 0 : 1;
}

interface VisibleBounds {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

/** Zone visible du plus proche ancêtre rognant (ex. la modale), bornée par la fenêtre. */
function visibleBounds(element: HTMLElement): VisibleBounds {
  let bounds: VisibleBounds = { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight };
  for (let node = element.parentElement; node; node = node.parentElement) {
    const style = getComputedStyle(node);
    if (style.overflowX !== 'visible' || style.overflowY !== 'visible') {
      const rect = node.getBoundingClientRect();
      const left = rect.left + node.clientLeft;
      const top = rect.top + node.clientTop;
      bounds = { left, top, right: left + node.clientWidth, bottom: top + node.clientHeight };
      break;
    }
  }
  return {
    left: Math.max(bounds.left, 0),
    top: Math.max(bounds.top, 0),
    right: Math.min(bounds.right, window.innerWidth),
    bottom: Math.min(bounds.bottom, window.innerHeight),
  };
}

@Component({
  selector: 'app-date-picker',
  imports: [TranslocoPipe],
  templateUrl: './date-picker.html',
  styleUrl: './date-picker.scss',
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => DatePicker), multi: true }],
})
export class DatePicker implements ControlValueAccessor {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  private readonly settings = inject(SettingsService).settings;
  private readonly trigger = viewChild.required<ElementRef<HTMLButtonElement>>('trigger');

  readonly inputId = input.required<string>();
  readonly invalid = input(false);
  readonly describedBy = input<string | null>(null);

  protected readonly open = signal(false);
  protected readonly view = signal<PickerView>('days');
  protected readonly placeAbove = signal(false);
  /** Décalage horizontal en px pour garder le panneau dans la zone visible. */
  protected readonly panelShift = signal(0);
  /** Largeur de la barre de défilement du panneau quand il est plafonné, pour garder 7 colonnes de 44 px. */
  protected readonly panelScrollbar = signal(0);
  /** Hauteur maximale en px quand le panneau ne tient ni au-dessus ni en dessous ; null sinon. */
  protected readonly panelMaxBlock = signal<number | null>(null);
  protected readonly disabled = signal(false);
  protected readonly selected = signal('');
  protected readonly activeIso = signal(todayLocalIsoDate());
  protected readonly viewYear = signal(new Date().getFullYear());
  protected readonly viewMonth = signal(new Date().getMonth() + 1);

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};
  /** Vrai entre un changement de vue et le retour du focus : le focusout du re-rendu ne doit pas fermer le panneau. */
  private restoringFocus = false;

  protected readonly locale = computed(() => this.settings().locale);
  protected readonly panelId = computed(() => `${this.inputId()}-panel`);
  protected readonly displayText = computed(() => {
    const parts = parseIsoDate(this.selected());
    if (!parts) return '';
    return new Intl.DateTimeFormat(this.locale(), { dateStyle: 'long' }).format(
      new Date(parts.year, parts.month - 1, parts.day),
    );
  });
  protected readonly yearStart = computed(() => Math.floor(this.viewYear() / YEARS_PER_PAGE) * YEARS_PER_PAGE);

  protected readonly weekdayLabels = computed<string[]>(() => {
    const start = firstWeekday(this.locale());
    const formatter = new Intl.DateTimeFormat(this.locale(), { weekday: 'short' });
    // 1er janvier 2023 était un dimanche : le décalage donne le jour de semaine voulu.
    return Array.from({ length: DAYS_PER_WEEK }, (_, index) =>
      formatter.format(new Date(2023, 0, 1 + ((start + index) % DAYS_PER_WEEK))),
    );
  });

  protected readonly titleText = computed(() => {
    switch (this.view()) {
      case 'days':
        return new Intl.DateTimeFormat(this.locale(), { month: 'long', year: 'numeric' }).format(
          new Date(this.viewYear(), this.viewMonth() - 1, 1),
        );
      case 'months':
        return String(this.viewYear());
      case 'years':
        return `${this.yearStart()} – ${this.yearStart() + YEARS_PER_PAGE - 1}`;
    }
  });

  /** Nombre de jours du mois affiché qui précèdent le 1er dans la première semaine de la grille. */
  private readonly leadingDays = computed(() => {
    const firstDay = new Date(this.viewYear(), this.viewMonth() - 1, 1).getDay();
    return (firstDay - firstWeekday(this.locale()) + DAYS_PER_WEEK) % DAYS_PER_WEEK;
  });

  /** Nombre de semaines (4 à 6) nécessaires au mois affiché. */
  protected readonly weekRows = computed(() =>
    Math.ceil((this.leadingDays() + daysInMonth(this.viewYear(), this.viewMonth())) / DAYS_PER_WEEK),
  );

  protected readonly dayCells = computed<DayCell[]>(() => {
    const year = this.viewYear();
    const month = this.viewMonth();
    const start = new Date(year, month - 1, 1 - this.leadingDays());
    const todayKey = todayLocalIsoDate();
    const formatter = new Intl.DateTimeFormat(this.locale(), { dateStyle: 'full' });

    return Array.from({ length: DAYS_PER_WEEK * this.weekRows() }, (_, index) => {
      const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index);
      const key = toIsoDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
      return {
        key,
        label: formatter.format(date),
        day: date.getDate(),
        inMonth: date.getMonth() === month - 1,
        selected: key === this.selected(),
        today: key === todayKey,
        active: key === this.activeIso(),
      };
    });
  });

  protected readonly monthCells = computed<ChoiceCell[]>(() => {
    const year = this.viewYear();
    const selectedKey = this.selected().slice(0, 7);
    const formatter = new Intl.DateTimeFormat(this.locale(), { month: 'short' });
    return Array.from({ length: MONTHS_PER_YEAR }, (_, index) => {
      const month = index + 1;
      const key = `${year}-${String(month).padStart(2, '0')}`;
      return {
        key,
        label: formatter.format(new Date(year, index, 1)),
        selected: key === selectedKey,
        active: month === this.viewMonth(),
      };
    });
  });

  protected readonly yearCells = computed<ChoiceCell[]>(() => {
    const selectedYear = this.selected().slice(0, 4);
    return Array.from({ length: YEARS_PER_PAGE }, (_, index) => {
      const year = String(this.yearStart() + index);
      return { key: year, label: year, selected: year === selectedYear, active: Number(year) === this.viewYear() };
    });
  });

  @HostListener('keydown.escape', ['$event'])
  protected onEscape(event: Event): void {
    if (!this.open()) return;
    event.preventDefault();
    event.stopPropagation();
    this.close(true);
  }

  @HostListener('window:resize')
  protected onResize(): void {
    if (this.open()) this.placeAfterRender();
  }

  @HostListener('document:pointerdown', ['$event.target'])
  protected onDocumentPointerDown(target: EventTarget | null): void {
    if (target instanceof Node && !this.host.nativeElement.contains(target)) this.close(false);
  }

  protected onFocusOut(event: FocusEvent): void {
    if (this.restoringFocus) return;
    const next = event.relatedTarget;
    if (next instanceof Node && this.host.nativeElement.contains(next)) return;
    this.close(false);
  }

  writeValue(value: string | null): void {
    this.selected.set(parseIsoDate(value ?? '') ? (value as string) : '');
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  protected toggle(): void {
    if (this.open()) {
      this.close(true);
      return;
    }
    const base = this.selected() || todayLocalIsoDate();
    this.activeIso.set(base);
    this.showDate(base);
    this.view.set('days');
    this.open.set(true);
    afterNextRender(
      () => {
        this.placeAfterRender();
        this.focusActiveCell();
      },
      { injector: this.injector },
    );
  }

  protected cycleView(): void {
    if (this.view() === 'days') this.view.set('months');
    else if (this.view() === 'months') this.view.set('years');
    this.focusActiveCell();
  }

  protected shift(direction: -1 | 1): void {
    switch (this.view()) {
      case 'days':
        this.shiftMonth(direction);
        break;
      case 'months':
        this.viewYear.update(year => year + direction);
        break;
      case 'years':
        this.viewYear.update(year => year + direction * YEARS_PER_PAGE);
        break;
    }
  }

  protected onGridKeydown(event: KeyboardEvent): void {
    const step = ARROW_STEPS[event.key];
    if (!step) return;
    event.preventDefault();

    const columns = this.view() === 'days' ? DAYS_PER_WEEK : CHOICE_COLUMNS;
    const delta = step.axis === 'x' ? step.sign : step.sign * columns;
    switch (this.view()) {
      case 'days': {
        const next = addDays(this.activeIso(), delta);
        this.activeIso.set(next);
        this.showDate(next);
        break;
      }
      case 'months':
        this.viewMonth.update(month => Math.min(MONTHS_PER_YEAR, Math.max(1, month + delta)));
        break;
      case 'years':
        this.viewYear.update(year => year + delta);
        break;
    }
    this.focusActiveCell();
  }

  protected chooseYear(cell: ChoiceCell): void {
    this.viewYear.set(Number(cell.key));
    this.view.set('months');
    this.focusActiveCell();
  }

  protected chooseMonth(cell: ChoiceCell): void {
    const [year, month] = cell.key.split('-').map(Number);
    const day = Math.min(parseIsoDate(this.activeIso())?.day ?? 1, daysInMonth(year, month));
    this.activeIso.set(toIsoDate(year, month, day));
    this.viewYear.set(year);
    this.viewMonth.set(month);
    this.view.set('days');
    this.focusActiveCell();
  }

  protected chooseDay(cell: DayCell): void {
    this.selected.set(cell.key);
    this.onChange(cell.key);
    this.onTouched();
    this.close(true);
  }

  private shiftMonth(direction: -1 | 1): void {
    const date = new Date(this.viewYear(), this.viewMonth() - 1 + direction, 1);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = Math.min(parseIsoDate(this.activeIso())?.day ?? 1, daysInMonth(year, month));
    this.activeIso.set(toIsoDate(year, month, day));
    this.viewYear.set(year);
    this.viewMonth.set(month);
  }

  private showDate(isoDate: string): void {
    const parts = parseIsoDate(isoDate);
    if (!parts) return;
    this.viewYear.set(parts.year);
    this.viewMonth.set(parts.month);
  }

  /** Une seconde passe après rendu mesure la barre de défilement créée par la hauteur maximale. */
  private placeAfterRender(): void {
    this.placePanel();
    afterNextRender(() => this.placePanel(), { injector: this.injector });
  }

  private placePanel(): void {
    const panel = this.host.nativeElement.querySelector<HTMLElement>('.picker-panel');
    if (!panel) return;
    const anchor = this.trigger().nativeElement.getBoundingClientRect();
    const bounds = visibleBounds(this.host.nativeElement);
    // scrollHeight reste la hauteur du contenu même quand une hauteur maximale est déjà appliquée.
    const height = panel.scrollHeight + panel.offsetHeight - panel.clientHeight;
    // Largeur fractionnaire : offsetWidth/clientWidth sont arrondis et sous-estiment la barre d'un pixel.
    const panelWidth = panel.getBoundingClientRect().width;
    const style = getComputedStyle(panel);
    const frame = ['border-left-width', 'border-right-width', 'padding-left', 'padding-right']
      .reduce((sum, property) => sum + (parseFloat(style.getPropertyValue(property)) || 0), 0);
    const contentWidth = panel.querySelector<HTMLElement>('.picker-header')?.getBoundingClientRect().width ?? panel.clientWidth;
    const scrollbar = Math.max(0, panelWidth - frame - contentWidth);
    const appliedScrollbar = parseFloat(panel.style.getPropertyValue('--picker-scrollbar')) || 0;
    const width = panelWidth - appliedScrollbar + scrollbar;
    this.panelScrollbar.set(scrollbar);

    const desiredLeft = (anchor.left + anchor.right) / 2 - width / 2;
    const maxLeft = bounds.right - PANEL_SPACING - width;
    const left = Math.max(bounds.left + PANEL_SPACING, Math.min(desiredLeft, maxLeft));
    this.panelShift.set(left - desiredLeft);

    const spaceBelow = bounds.bottom - anchor.bottom - PANEL_SPACING;
    const spaceAbove = anchor.top - bounds.top - PANEL_SPACING;
    const fitsBelow = height <= spaceBelow;
    const fitsAbove = height <= spaceAbove;
    const above = !fitsBelow && (fitsAbove || spaceAbove > spaceBelow);
    this.placeAbove.set(above);
    this.panelMaxBlock.set(fitsBelow || fitsAbove ? null : Math.max(0, above ? spaceAbove : spaceBelow));
  }

  private focusActiveCell(): void {
    this.restoringFocus = true;
    afterNextRender(
      () => {
        this.restoringFocus = false;
        this.host.nativeElement.querySelector<HTMLElement>('.picker-panel [tabindex="0"]')?.focus();
      },
      { injector: this.injector },
    );
  }

  private close(restoreFocus: boolean): void {
    if (!this.open()) return;
    this.open.set(false);
    if (restoreFocus) this.trigger().nativeElement.focus();
  }
}
