## Tâche : modèles du Lot 1 (BudgetLine, RecurringRule, BudgetMonth, statut)
Lot : 1 (`roadmap.md` § 4, tâche 1)
Branche : `feat/lot1-budget-models` (déjà créée depuis `main` à jour)

### Contexte
Le Lot 1 (Budget Mensuel) n'a aucun type pour le prévu, les règles récurrentes ni le mois. Cette tâche pose
uniquement les interfaces et la fonction pure de statut, sans service, sans mock, sans composant.

### Points validés (2026-10-23)
1. **`RecurringRule.subcategoryId` obligatoire.** Une règle génère des `BudgetLine`, qui exigent une sous-catégorie.
   `domain-model.md` § 2 mis à jour dans cette branche.
2. **Emplacement de `getBudgetLineStatus`** : `src/app/models/budget-status.ts`.

### Ce qu'il faut faire
1. Créer `src/app/models/budget-line.ts` : interface `BudgetLine` conforme à `domain-model.md` § 2 :
   `id: string`, `monthKey: string`, `categoryId: string`, `subcategoryId: string` (obligatoire),
   `plannedAmountCents: number`, `sourceRuleId?: string`.
2. Créer `src/app/models/recurring-rule.ts` : interface `RecurringRule` conforme à `domain-model.md` § 2 :
   `id: string`, `label: string`, `categoryId: string`, `subcategoryId: string` (obligatoire, voir point 1),
   `amountCents: number`, `dayOfMonth?: number`, `startMonth: string`, `endMonth?: string`, `active: boolean`.
3. Créer `src/app/models/budget-month.ts` : interface `BudgetMonth` conforme à `domain-model.md` § 2 :
   `monthKey: string`, `openingBalanceCents: number`, `openingBalanceOverridden: boolean`, `initialized: boolean`.
4. Créer `src/app/models/budget-status.ts` :
   - `export type BudgetLineStatus = 'under' | 'on-track' | 'over';`
   - `export const BUDGET_STATUS_THRESHOLDS = { onTrackPercent: 80, overPercent: 100 } as const;`
   - `export function getBudgetLineStatus(actualCents: number, plannedCents: number): BudgetLineStatus`
   - Entrées : `actualCents` entier ≥ 0, `plannedCents` entier > 0. Sinon, `throw new Error(...)` (même
     convention que `MonthContextService.validateMonthKey`).
   - Calcul en entiers, sans division flottante :
     - `under` si `actualCents * 100 <= plannedCents * BUDGET_STATUS_THRESHOLDS.onTrackPercent`
     - `over` si `actualCents * 100 > plannedCents * BUDGET_STATUS_THRESHOLDS.overPercent`
     - `on-track` sinon
   - Aucun seuil en dur : uniquement via la constante.
5. Créer `src/app/models/budget-status.spec.ts` (Vitest, à côté du fichier testé, comme `services/money.spec.ts`).
   Cas obligatoires :
   - `getBudgetLineStatus(0, 10000)` → `under`
   - `getBudgetLineStatus(8000, 10000)` → `under` (exactement 80 %)
   - `getBudgetLineStatus(8001, 10000)` → `on-track`
   - `getBudgetLineStatus(10000, 10000)` → `on-track` (exactement 100 %)
   - `getBudgetLineStatus(10001, 10000)` → `over`
   - `getBudgetLineStatus(1, 1)` → `on-track`
   - Levée d'erreur : `plannedCents = 0`, `plannedCents = -1`, `actualCents = -1`, valeur non entière (ex. `10.5`).
6. Ne pas modifier `.ai/roadmap.md` : le PM met à jour le statut de la tâche après revue. Ne créer ni branche ni commit.

### Fichiers concernés
- Créer : `src/app/models/budget-line.ts`, `src/app/models/recurring-rule.ts`, `src/app/models/budget-month.ts`,
  `src/app/models/budget-status.ts`, `src/app/models/budget-status.spec.ts`.
- Modifier : `.ai/domain-model.md` § 2 (`RecurringRule.subcategoryId` obligatoire, validé le 2026-10-23).

### Critères d'acceptation
- Les quatre fichiers de modèle exportent exactement les noms et les champs de la spec ci-dessus.
- Tous les champs monétaires portent le suffixe `Cents` et ne reçoivent que des entiers (vérifié par les tests
  de `budget-status.spec.ts`).
- `getBudgetLineStatus` respecte les seuils de `BUDGET_STATUS_THRESHOLDS`, y compris les bornes exactes (80 % et 100 %).
- Tous les cas obligatoires du point 5 sont présents et verts.
- `npx tsc -p tsconfig.app.json --noEmit` et `npx tsc -p tsconfig.spec.json --noEmit` : code 0 (mode strict actif).
- `npm run build` passe. Seul avertissement autorisé : le budget SCSS connu sur `category-card.scss`.
- `npx ng test --no-watch` : 130 tests existants et les nouveaux verts. Sortie lue sur disque.
- Aucun `any`, aucun cast `as`.
- Aucun fichier existant modifié, hors `.ai/domain-model.md` § 2 (déjà fait dans la branche).

### Hors périmètre pour cette tâche
- Services `BudgetService` et `RecurringRuleService` : tâches 3 et 4.
- Mocks de `BudgetLine`, `RecurringRule`, `BudgetMonth` : tâches 2 et 3.
- Composants, pages, i18n : lot 1, tâches 9 à 13.
- Agrégations (réel, totaux, bandeau d'allocation) : tâche 5.
- Sémantique du statut pour les lignes de revenu : tranchée à la tâche 5, pas ici.
- Lint : non configuré, ne pas en inventer.

### Références
- `.ai/domain-model.md` § 2 (`BudgetLine`, `RecurringRule`, `BudgetMonth`), § 3 (statut d'une ligne, seuils),
  § 5 (montants en centimes entiers).
- `AGENTS.md` : composants standalone, pas de `any`, montants en centimes.
- `ARCHITECTURE.md` : structure `models/`.
- `.ai/roadmap.md` § 4, Lot 1, tâche 1.
