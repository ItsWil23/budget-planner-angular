/**
 * Money Service - Conversions entre euros et centimes
 *
 * Ce service centralise les règles de conversion pour garantir que tous les services métier
 * utilisent la même approche cohérente : stockage en centimes entiers, affichage formaté.
 *
 * @module {provided-in: 'root'}
 */

import { Injectable } from '@angular/core';

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
}
