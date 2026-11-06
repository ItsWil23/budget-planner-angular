/**
 * Money Service - Conversions entre euros et centimes
 *
 * Ce service centralise les règles de conversion pour garantir que tous les services métier
 * utilisent la même approche cohérente : stockage en centimes entiers, affichage formaté.
 *
 * @module {provided-in: 'root'}
 */

import { Injectable } from '@angular/core';
import type { UserSettings } from '../models/user-settings';

/**
 * Intl.NumberFormat accepte une chaîne décimale exacte depuis ES2023 ; la lib ES2022 du projet ne
 * déclare pas cette signature, d'où ce type local (sans cast).
 */
type ExactDecimalFormatter = { format(value: number | bigint | string): string };

/** Erreur de saisie d'un montant en euros : format invalide, ou centimes hors des entiers sûrs. */
export type EurosInputError = 'invalid' | 'tooLarge';

export type EurosInputResult =
  | { readonly valid: true; readonly cents: number }
  | { readonly valid: false; readonly error: EurosInputError };

/** Montant signé en euros, deux décimales maximum, point ou virgule décimale. */
const EUROS_INPUT_PATTERN = /^(-?)(\d+)(?:\.(\d{1,2}))?$/;
const MAX_SAFE_CENTS = BigInt(Number.MAX_SAFE_INTEGER);

/**
 * Convertit une valeur euro en centimes (entier).
 *
 * Arrondit au centime le plus proche selon la règle commerciale standard (round half away from zero).
 * Les demi-centimes s'éloignent de zéro : 0.5 → 1, -0.5 → -1.
 * Prend en compte les valeurs négatives, nécessaires pour les soldes d'ouverture.
 *
 * @param amountEuros - Montant à convertir en euros (valeur numérique avec décimales)
 * @returns Le montant arrondi au centime le plus proche, exprimé en centimes entiers
 *
 * @example
 * toCents(39.99) // 3999
 * toCents(10)    // 1000
 * toCents(-5.50) // -550
 */
@Injectable({
  providedIn: 'root'
})
export class MoneyService {

  /**
   * Convertit une valeur euro en centimes avec arrondi commercial symétrique.
   */
  public toCents(amountEuros: number): number {
    const scaledAmount = Math.abs(amountEuros) * 100;
    const roundingTolerance = Number.EPSILON * Math.max(1, scaledAmount);
    const absoluteCents = Math.round(scaledAmount + roundingTolerance);
    return amountEuros < 0 ? -absoluteCents : absoluteCents;
  }

  /**
   * Convertit une valeur en centimes (entier) en nombre décimal pour l'affichage.
   *
   * Récupère le montant décimal depuis les centimes entiers, prêt à être formaté
   * avec CurrencyPipe ou similaire. Ne fait aucun formatage localisé lui-même.
   *
   * @param amountCents - Montant en centimes (entier)
   * @returns Le montant en euros sous forme de nombre décimal
   *
   * @example
   * toEuros(3999)   // 39.99
   * toEuros(1000)   // 10
   * toEuros(-550)   // -5.5
   */
  public toEuros(amountCents: number): number {
    return amountCents / 100;
  }

  /**
   * Formate des centimes entiers sûrs en montant monétaire localisé, sans passer par un flottant en euros.
   *
   * Le montant décimal exact est transmis à Intl sous forme de chaîne. Le moins est émis en ASCII
   * (tiret) : la substitution vers le moins typographique relève de l'affichage.
   *
   * @param amountCents - Montant en centimes (entier sûr, signé ou non)
   * @param settings - Devise et locale d'affichage
   * @param signDisplay - 'always' pour préfixer aussi les montants positifs
   * @returns Le montant formaté
   * @throws Error('Invalid amount') si la valeur n'est pas un entier sûr
   *
   * @example
   * formatCents(3999, { currency: 'EUR', locale: 'fr-FR' }) // '39,99 €'
   */
  public formatCents(
    amountCents: number,
    settings: Pick<UserSettings, 'currency' | 'locale'>,
    signDisplay: 'auto' | 'always' = 'auto',
  ): string {
    if (!Number.isSafeInteger(amountCents)) {
      throw new Error('Invalid amount');
    }

    const formatter: ExactDecimalFormatter = new Intl.NumberFormat(settings.locale, {
      style: 'currency',
      currency: settings.currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      signDisplay,
    });
    return formatter.format(this.toExactDecimal(amountCents));
  }

  /**
   * Convertit une saisie décimale en euros en centimes entiers, sans passer par un nombre flottant.
   *
   * La conversion se fait sur la chaîne saisie (BigInt), donc les centimes sont exacts. Une saisie
   * est refusée seulement si ses centimes exacts sortent de ±Number.MAX_SAFE_INTEGER.
   *
   * @param raw - Saisie utilisateur (espaces, signe moins typographique et virgule acceptés)
   * @returns Les centimes exacts, ou l'erreur de saisie
   *
   * @example
   * parseEurosInput('-12,50')  // { valid: true, cents: -1250 }
   * parseEurosInput('1.234')   // { valid: false, error: 'invalid' }
   */
  public parseEurosInput(raw: string): EurosInputResult {
    const normalized = raw.trim().replace('\u2212', '-').replace(',', '.');
    const match = EUROS_INPUT_PATTERN.exec(normalized);
    if (!match) return { valid: false, error: 'invalid' };

    const [, sign, integerPart, fractionPart = ''] = match;
    const magnitude = BigInt(integerPart) * 100n + BigInt(fractionPart.padEnd(2, '0'));
    // BigInt n'a pas de zéro négatif : « -0 » donne 0.
    const signedCents = sign ? -magnitude : magnitude;
    if (signedCents > MAX_SAFE_CENTS || signedCents < -MAX_SAFE_CENTS) {
      return { valid: false, error: 'tooLarge' };
    }
    return { valid: true, cents: Number(signedCents) };
  }

  /**
   * Formate un montant en centimes pour le champ d'édition, sans séparateur de milliers.
   *
   * Le texte est construit à partir des centimes entiers (BigInt), sans passer par un flottant en euros,
   * pour que `parseEurosInput` restitue exactement les mêmes centimes, y compris près de ±MAX_SAFE_INTEGER.
   *
   * @param amountCents - Montant en centimes (entier sûr)
   * @param locale - Locale d'affichage (ex. 'fr-FR')
   * @returns Le montant en euros, avec deux décimales maximum et sans zéros décimaux inutiles
   *
   * @example
   * toEditableString(-125050, 'fr-FR') // '-1250,5'
   */
  public toEditableString(amountCents: number, locale: string): string {
    const cents = BigInt(amountCents);
    const sign = cents < 0n ? '-' : '';
    const magnitude = cents < 0n ? -cents : cents;
    const integerDigits = (magnitude / 100n).toString();
    const fractionDigits = (magnitude % 100n).toString().padStart(2, '0').replace(/0+$/, '');
    if (!fractionDigits) return `${sign}${integerDigits}`;
    return `${sign}${integerDigits}${this.decimalSeparatorOf(locale)}${fractionDigits}`;
  }

  /** Écrit les centimes sûrs comme décimal exact à deux chiffres, ex. -1250 → '-12.50'. */
  private toExactDecimal(amountCents: number): string {
    // Object.is : -0 reste négatif pour conserver l'affichage existant d'un zéro signé.
    const negative = amountCents < 0 || Object.is(amountCents, -0);
    const magnitude = BigInt(Math.abs(amountCents));
    const euros = magnitude / 100n;
    const cents = (magnitude % 100n).toString().padStart(2, '0');
    return `${negative ? '-' : ''}${euros}.${cents}`;
  }

  private decimalSeparatorOf(locale: string): string {
    const parts = new Intl.NumberFormat(locale).formatToParts(1.5);
    return parts.find(part => part.type === 'decimal')?.value ?? '.';
  }
}
