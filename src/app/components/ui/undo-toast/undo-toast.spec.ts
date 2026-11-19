import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { UndoToast } from './undo-toast';

describe('UndoToast', () => {
  let fixture: ComponentFixture<UndoToast>;

  beforeEach(async () => {
    vi.useFakeTimers();
    await TestBed.configureTestingModule({ imports: [UndoToast] }).compileComponents();
    fixture = TestBed.createComponent(UndoToast);
    fixture.componentRef.setInput('message', 'Transaction supprimée.');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function actionButton(): HTMLButtonElement | null {
    return fixture.nativeElement.querySelector('[data-action="undo-toast-action"]');
  }

  it('expose le message dans un conteneur role="status"', () => {
    fixture.detectChanges();

    const status: HTMLElement | null = fixture.nativeElement.querySelector('[role="status"]');
    expect(status?.textContent?.trim()).toBe('Transaction supprimée.');
  });

  it('n’affiche aucun bouton sans libellé d’action', () => {
    fixture.detectChanges();

    expect(actionButton()).toBeNull();
  });

  it('émet action au clic sur le bouton d’annulation', () => {
    fixture.componentRef.setInput('actionLabel', 'Annuler la suppression');
    fixture.detectChanges();
    const actions: void[] = [];
    fixture.componentInstance.action.subscribe(() => actions.push(undefined));

    actionButton()?.click();

    expect(actions).toHaveLength(1);
  });

  it('émet expired après la durée configurée, et pas avant', () => {
    fixture.componentRef.setInput('durationMs', 10_000);
    fixture.detectChanges();
    const expired = vi.fn();
    fixture.componentInstance.expired.subscribe(expired);

    vi.advanceTimersByTime(9_999);
    expect(expired).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(expired).toHaveBeenCalledTimes(1);
  });

  it('n’émet plus expired une fois détruite', () => {
    fixture.detectChanges();
    const expired = vi.fn();
    fixture.componentInstance.expired.subscribe(expired);

    fixture.destroy();
    vi.advanceTimersByTime(10_000);

    expect(expired).not.toHaveBeenCalled();
  });

  it('masque la barre de progression aux lecteurs d’écran, hors du message annoncé', () => {
    fixture.detectChanges();

    const bar: HTMLElement | null = fixture.nativeElement.querySelector('.progress');
    const status: HTMLElement | null = fixture.nativeElement.querySelector('[role="status"]');
    expect(bar?.getAttribute('aria-hidden')).toBe('true');
    expect(status?.contains(bar)).toBe(true);
    expect(status?.textContent?.trim()).toBe('Transaction supprimée.');
  });

  it('cale l’animation de la barre sur la durée configurée', () => {
    fixture.componentRef.setInput('durationMs', 4_000);
    fixture.detectChanges();

    const bar: HTMLElement | null = fixture.nativeElement.querySelector('.progress');
    expect(bar?.style.animationDuration).toBe('4000ms');
  });
});
