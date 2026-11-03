## Tâche : BudgetService — ouverture idempotente d'un mois depuis les règles
Lot : 1 (`roadmap.md` § 4, tâche 4b, seconde moitié de la tâche 4)
Branche : `feat/lot1-budget-service-open-month` (créée depuis `main` à jour après le merge de la tâche 4a)

### Dépendance
Cette tâche suppose que `BudgetService` existe, avec `setPlannedAmount`, `linesForMonth` et `plannedCentsFor`
(TASK-004a). Ne pas la démarrer avant le merge de la 4a.

### Contexte
Ouvrir un mois doit pré-remplir son prévu à partir des règles récurrentes actives, sans jamais écraser ni recréer
ce que l'utilisateur a déjà décidé. C'est le cœur de la définition de fin du Lot 1 (« un mois complet peut être
planifié de bout en bout »).

### Règles retenues (validées 2026-11-03)
- Ouverture **explicite** : `openMonth(monthKey)`, appelée par l'écran. Pas d'ouverture automatique à la lecture.
- **Idempotente** : un mois déjà ouvert (`initialized: true`) n'est plus traité. Un second appel ne change rien.
- Une règle active crée une `BudgetLine` seulement si aucune ligne n'existe pour (`monthKey`, `subcategoryId`).
  Une ligne existante, y compris saisie par l'utilisateur, n'est jamais écrasée.
- Une ligne générée garde `sourceRuleId` = `rule.id`.
- Si plusieurs règles actives et valides ciblent la même sous-catégorie pour le même mois, la première dans l'ordre
  renvoyé par `activeRulesForMonth()` est retenue. Chaque règle suivante pour cette sous-catégorie est ignorée et
  son id est ajouté à `ignoredRuleIds`. `skipped` compte uniquement la première règle valide rencontrant une
  `BudgetLine` préexistante pour cette sous-catégorie.
- Une règle qui pointe vers une sous-catégorie inconnue est ignorée et signalée dans le résultat.
- Une règle dont `categoryId` ne correspond pas à la catégorie de sa sous-catégorie est ignorée et signalée.
- Une règle dont `amountCents` n'est pas un entier strictement positif est ignorée et signalée dans
  `ignoredRuleIds` ; une règle invalide ne doit pas faire échouer l'ouverture du mois.
- Une ligne supprimée par l'utilisateur après ouverture (prévu mis à 0) n'est pas recréée, puisque le mois est déjà ouvert.
- `openingBalanceCents` vaut `0` pour l'instant : le calcul réel du solde est la tâche 6.

### Ce qu'il faut faire
1. Ajouter à `src/app/models/budget-month.ts` l'interface `OpenMonthResult` :
   `monthKey: string`, `created: number`, `skipped: number`, `ignoredRuleIds: string[]`.
   Ne pas modifier `BudgetMonth`.
2. Modifier `src/app/services/budget.ts` :
   - Ajouter `RecurringRuleService` au constructeur, en troisième paramètre :
     `constructor(moneyService, categoryService, recurringRuleService)`.
   - `private readonly _months = signal<BudgetMonth[]>([])`, `readonly months = this._months.asReadonly()`.
   - `openMonth(monthKey: string): OpenMonthResult` :
     - valider `monthKey` (même regex que la 4a, même erreur).
     - si un `BudgetMonth` pour `monthKey` a `initialized: true` : retourner `{ monthKey, created: 0, skipped: 0, ignoredRuleIds: [] }`,
       sans rien modifier.
     - sinon, pour chaque règle de `recurringRuleService.activeRulesForMonth(monthKey)` :
       - sous-catégorie absente de `categoryService.subcategories()` : ajouter `rule.id` à `ignoredRuleIds`.
       - sous-catégorie dont le `categoryId` diffère de `rule.categoryId` : ajouter `rule.id` à `ignoredRuleIds`.
       - si une autre règle valide de cette ouverture a déjà été retenue pour cette sous-catégorie : ajouter
         `rule.id` à `ignoredRuleIds` (la première règle valide dans l'ordre de `activeRulesForMonth()` l'emporte).
       - sinon, si une ligne existait déjà avant cette ouverture pour (`monthKey`, `subcategoryId`) : incrémenter
         `skipped` et marquer cette sous-catégorie comme traitée. Les éventuelles règles suivantes pour cette
         sous-catégorie sont ajoutées à `ignoredRuleIds`.
       - sinon : créer la `BudgetLine` (`id: crypto.randomUUID()`, `monthKey`, `categoryId`, `subcategoryId`,
         `plannedAmountCents: rule.amountCents`, `sourceRuleId: rule.id`), incrémenter `created` et marquer cette
         sous-catégorie comme traitée.
     - ajouter `{ monthKey, openingBalanceCents: 0, openingBalanceOverridden: false, initialized: true }` à `_months`.
     - retourner le résultat.
   - `isMonthOpened(monthKey: string): boolean` : `true` si le mois est `initialized`.
   - Toujours via `update()` avec une nouvelle référence.
3. Modifier `src/app/services/budget.spec.ts` : adapter la construction du service à trois paramètres,
   `new BudgetService(new MoneyService(), new CategoryService(), new RecurringRuleService())`. Les tests de la 4a
   doivent rester verts sans modification de leur logique.

### Tests obligatoires (ajout dans `budget.spec.ts`)
- `openMonth('2026-07')` crée trois lignes : `rule-1` (`sub-1`, 245000), `rule-2` (`sub-2`, 85000), `rule-3` (`sub-3`, 3999).
  `rule-4` (inactive) n'en crée pas. Chaque ligne a le bon `sourceRuleId`.
- `openMonth('2026-10')` crée deux lignes (`rule-1`, `rule-2`) ; `rule-3` est terminée.
- Deux règles actives et valides pour la même sous-catégorie : la première dans l'ordre renvoyé crée la ligne,
  son `sourceRuleId` est conservé et l'id de la suivante apparaît dans `ignoredRuleIds`.
- `openMonth` une seconde fois : `created` et `skipped` valent 0, `lines()` garde les mêmes `id`.
- Ligne saisie avant ouverture (`setPlannedAmount('2026-07', 'sub-2', 900)`), puis `openMonth('2026-07')` : la ligne
  reste à 900 000 centimes, `skipped` vaut 1, et `sourceRuleId` n'est pas ajouté.
- Ligne supprimée après ouverture (`setPlannedAmount('2026-07', 'sub-2', 0)`), puis `openMonth('2026-07')` : pas de recréation.
- `isMonthOpened('2026-07')` est `true` après ouverture, `false` avant.
- Règle à sous-catégorie inconnue : utiliser `vi.spyOn(recurringRuleService, 'activeRulesForMonth')` (Vitest) pour
  renvoyer une règle de test avec `subcategoryId: 'sub-99'`. Elle est dans `ignoredRuleIds`, aucune ligne créée.
- Règle à `categoryId` incohérent avec sa sous-catégorie : même approche, elle est dans `ignoredRuleIds`.
- Règle avec `amountCents` nul, négatif ou fractionnaire : ignorée, id dans `ignoredRuleIds`, aucune ligne créée.
- Mois invalide : erreur `Invalid month key format`.
- Aucun `any`, aucun cast pour construire la règle de test : typer le tableau renvoyé par le spy avec `RecurringRule`.

### Fichiers concernés
- Modifier : `src/app/models/budget-month.ts` (ajout de `OpenMonthResult` uniquement), `src/app/services/budget.ts`,
  `src/app/services/budget.spec.ts`.
- Ne pas modifier : `src/app/services/recurring-rule.ts`, `src/app/mocks/mock-recurring-rules.ts`, les autres services, les pages, les composants.

### Critères d'acceptation
- `openMonth` est idempotent, n'écrase jamais une ligne existante, et ne recrée jamais une ligne supprimée après ouverture.
- Les règles inconnues ou incohérentes sont ignorées et listées dans `ignoredRuleIds`.
- Tous les tests de la 4a et de la 4b sont verts.
- `npx tsc -p tsconfig.app.json --noEmit` et `npx tsc -p tsconfig.spec.json --noEmit` : code 0 (mode strict actif).
- `npm run build` passe. Seul avertissement autorisé : le budget SCSS de `category-card.scss`.
- `npx ng test --no-watch` : tout vert, sortie lue sur disque. Aucun test supprimé.
- Aucun `any`, aucun cast `as`. Aucun composant n'importe un mock.

### Hors périmètre pour cette tâche
- Calcul du solde d'ouverture et report du mois précédent : tâche 6. `openingBalanceCents` reste à `0`.
- Option « reprendre le budget du mois précédent » : hors Lot 1 (`domain-model.md` § 4).
- Réel, statut, totaux, bandeau d'allocation : tâche 5.
- Interface (bouton d'ouverture, page Budget Mensuel) : lot 1, tâches 9 à 13.
- Aucune dépendance npm. Ne pas toucher à `package.json` ni `package-lock.json`.
- Mise à jour de la roadmap : faite par le PM après revue.

### Références
- `.ai/domain-model.md` § 2 (`RecurringRule`, `BudgetMonth`), § 4 (cycle de vie d'un mois : ouverture).
- `AGENTS.md` : services seuls accès aux données, pas de `any`.
- `.ai/roadmap.md` § 4, Lot 1, tâche 4.
