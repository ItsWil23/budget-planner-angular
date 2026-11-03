## Tâche : BudgetService — réel, statuts et agrégats du mois
Lot : 1 (`roadmap.md` § 4, tâche 5)
Branche : `feat/lot1-budget-service-actuals-and-totals` (à créer depuis `main` à jour, par l'utilisateur)

### Contexte
Les tâches 4a et 4b fournissent les lignes prévues et l'ouverture d'un mois. Cette tâche dérive les montants réels
des transactions, calcule les écarts et statuts aux niveaux sous-catégorie et catégorie, et expose les trois
valeurs du bandeau d'allocation. Aucun total réel ne doit être stocké.

### Décisions retenues (validées 2026-11-03)
- Le statut `under` / `on-track` / `over` s'applique aussi aux revenus : il mesure l'avancement vers le montant prévu,
  sans connotation de bon ou mauvais résultat ni décision de couleur UI.
- Une sous-catégorie avec réel mais sans prévu reste visible dans le résumé avec prévu `0`, réel calculé,
  `consumptionRate: undefined` et `status: undefined`.
- Même règle quand le total prévu d'une catégorie vaut `0` : réel et écart restent calculés, taux et statut sont
  `undefined`.
- `varianceCents = actualAmountCents - plannedAmountCents`.
- Le montant non alloué peut être négatif : `incomePlannedCents - expensePlannedCents`.

### Ce qu'il faut faire
1. Créer `src/app/models/budget-summary.ts` avec les interfaces suivantes :
   - `BudgetSubcategorySummary` :
     `categoryId: string`, `subcategoryId: string`, `categoryType: CategoryType`,
     `plannedAmountCents: number`, `actualAmountCents: number`, `varianceCents: number`,
     `consumptionRate: number | undefined`, `status: BudgetLineStatus | undefined`.
   - `BudgetCategorySummary` :
     `categoryId: string`, `categoryType: CategoryType`,
     `plannedAmountCents: number`, `actualAmountCents: number`, `varianceCents: number`,
     `consumptionRate: number | undefined`, `status: BudgetLineStatus | undefined`,
     `subcategories: BudgetSubcategorySummary[]`.
   - `BudgetMonthSummary` :
     `monthKey: string`, `categories: BudgetCategorySummary[]`, `incomePlannedCents: number`,
     `expensePlannedCents: number`, `unallocatedCents: number`.
2. Modifier `src/app/services/budget.ts` :
   - Injecter `TransactionService` et `MonthContextService` après les dépendances existantes du constructeur.
   - Exposer `readonly monthSummary = computed<BudgetMonthSummary>(...)`, dérivé des signaux lus dans le calcul :
     `MonthContextService.monthKey`, `BudgetService._lines`, `TransactionService.transactions`,
     `CategoryService.categories` et `CategoryService.subcategories`.
   - Le résumé contient toutes les catégories et toutes leurs sous-catégories connues, dans l'ordre des signaux du
     `CategoryService`, y compris celles dont prévu et réel valent tous deux `0`.
   - Pour chaque sous-catégorie, sommer les `Transaction.amountCents` du mois qui correspondent au couple
     (`categoryId`, `subcategoryId`). Pour chaque catégorie, sommer les transactions du mois dont `categoryId`
     correspond à cette catégorie. Toutes les transactions, revenus comme dépenses, contribuent positivement à
     leur somme respective.
   - Le prévu d'une sous-catégorie vient de sa `BudgetLine` du mois, ou vaut `0` si elle n'en a pas. Le prévu
     catégorie est la somme des `BudgetLine` du mois pour cette catégorie. Il n'existe aucun total prévu stocké
     séparément.
   - Calculer `varianceCents = actualAmountCents - plannedAmountCents` pour sous-catégorie et catégorie.
   - Si le prévu est `> 0`, calculer `consumptionRate = actualAmountCents / plannedAmountCents` (ratio, pas
     pourcentage) et `status = getBudgetLineStatus(actualAmountCents, plannedAmountCents)`. Appliquer cette même
     règle aux catégories de type `income` et `expense`.
   - Si le prévu vaut `0`, mettre `consumptionRate` et `status` à `undefined`, même si le réel est positif.
   - `incomePlannedCents` = somme des prévus catégorie dont `categoryType === 'income'`.
   - `expensePlannedCents` = somme des prévus catégorie dont `categoryType === 'expense'`.
   - `unallocatedCents = incomePlannedCents - expensePlannedCents`.
   - Ne pas ajouter de signal d'état dérivé ni de total stocké. Les agrégations doivent être calculées uniquement
     dans le `computed`.
3. Modifier `src/app/services/budget.spec.ts` pour construire les dépendances partagées :
   `new BudgetService(new MoneyService(), categoryService, recurringRuleService, transactionService, monthContext)`.
   Garder tous les tests existants de 4a et 4b sans changement de logique.

### Tests obligatoires (ajout dans `budget.spec.ts`)
- En juillet 2026, vérifier que les mocks donnent au résumé un réel revenu de `245000` centimes pour `sub-1`,
  un réel dépense de `85000` centimes pour `sub-2`, et des totaux catégorie cohérents.
- Ajouter un prévu pour une sous-catégorie sans transaction : le réel vaut `0`, l'écart vaut `-planned`,
  le taux vaut `0` et le statut `under`.
- Sous-catégorie avec transactions mais aucun prévu (ex. `sub-3` en août 2026) : elle est présente,
  `plannedAmountCents === 0`, le réel vaut `3999`, l'écart vaut `3999`, `consumptionRate` et `status` valent
  `undefined`.
- Catégorie dont le prévu total vaut `0` mais qui porte du réel : réel et écart agrégés, taux et statut `undefined`.
- Catégorie de type `income` avec un prévu positif : vérifier le ratio et le statut à l'aide de
  `getBudgetLineStatus` (ex. le salaire de juillet, réel `245000`, prévu `200000`, statut `over`).
- Statuts sur un revenu et une dépense respectant les mêmes bornes déjà définies : au minimum `under`, `on-track`
  et `over` sont observés via les résumés ; aucune nouvelle constante de seuil.
- Pour une catégorie avec plusieurs sous-catégories, les montants prévus, réels et l'écart de la catégorie sont
  la somme/agrégat cohérent de ses sous-catégories.
- Bandeau : vérifier les totaux de prévus `incomePlannedCents`, `expensePlannedCents` et
  `unallocatedCents = incomePlannedCents - expensePlannedCents`, y compris un résultat négatif.
- `monthSummary` se met à jour quand `MonthContextService.setMonth()` change le mois et quand les signaux des
  transactions ou lignes prévues changent.
- `cat-4` (aucune sous-catégorie) reste présent avec liste vide et totaux nuls.

### Fichiers concernés
- Créer : `src/app/models/budget-summary.ts`.
- Modifier : `src/app/services/budget.ts`, `src/app/services/budget.spec.ts`.
- Ne pas modifier : mocks, `TransactionService`, `CategoryService`, `RecurringRuleService`, les pages et composants.

### Critères d'acceptation
- `monthSummary` est réactif et dérivé des signaux ; aucun total réel ou total catégorie n'est recopié dans un état.
- Les totaux réels sont toujours calculés depuis `Transaction.amountCents`, filtrés par `monthKey`.
- Prévu, réel, écart, ratio, statut et bandeau respectent les formules et décisions ci-dessus.
- Les statuts utilisent `getBudgetLineStatus` et ses seuils centralisés ; les mêmes seuils s'appliquent aux revenus.
- Tous les tests existants de 4a et 4b restent verts ; aucun test supprimé.
- `npx tsc -p tsconfig.app.json --noEmit` et `npx tsc -p tsconfig.spec.json --noEmit` : code 0 (mode strict actif).
- `npm run build` passe. Seul avertissement autorisé : le budget SCSS connu de `category-card.scss`.
- `npx ng test --no-watch` : tout vert, sortie lue sur disque.
- Aucun `any`, aucun cast `as`. Aucun composant n'importe un mock.

### Hors périmètre pour cette tâche
- Saisie ou modification de prévu, ouverture idempotente : tâches 4a et 4b, déjà terminées.
- Solde d'ouverture, report en cascade, `openingBalanceCents` : tâche 6.
- Interface du bandeau, table ou barres de progression : tâches 9 à 13.
- Validation visuelle de `--color-warn` et composant de barre : tâche 8 et composant `ui/progress-bar`.
- Aucune dépendance npm. Ne pas toucher à `package.json` ni `package-lock.json`.
- Mise à jour de la roadmap : faite par le PM après revue.

### Références
- `.ai/domain-model.md` § 3 (formules d'agrégation, écarts, ratios, statuts et seuils), § 6 (agrégations en `computed`).
- `.ai/roadmap.md` § 4, Lot 1, tâche 5.
- `AGENTS.md` : montants en centimes, signals, aucun composant ne lit un mock.
- `ARCHITECTURE.md` : couche services et modèles.
