## Tâche : RecurringRuleService (lecture seule) et mocks des règles récurrentes
Lot : 1 (`roadmap.md` § 4, tâche 3)
Branche : `feat/lot1-recurring-rule-service` (à créer depuis `main` à jour, par l'utilisateur)

### Contexte
Le modèle `RecurringRule` existe (tâche 1), mais aucune règle n'est lue ni mockée. La tâche 4 (`BudgetService`)
générera les `BudgetLine` d'un mois à partir des règles actives. Cette tâche ne fait que lire les règles et
renvoyer celles qui sont actives pour un mois donné.

### Point validé (2026-11-03)
- **`endMonth` inclusif.** Une règle avec `endMonth: '2026-09'` est active en septembre 2026 et ne l'est plus à partir
  d'octobre. Confirmé par l'utilisateur ; `domain-model.md` § 2 n'en parle pas, à compléter lors de la prochaine mise à jour du document.

### Ce qu'il faut faire
1. Créer `src/app/mocks/mock-recurring-rules.ts` : `export const MOCK_RECURRING_RULES: RecurringRule[]` avec
   quatre règles. Les `categoryId` et `subcategoryId` doivent exister dans `mock-categories.ts`.
   - `rule-1` : `label: 'Salaire mensuel'`, `categoryId: 'cat-1'`, `subcategoryId: 'sub-1'`, `amountCents: 245000`,
     `dayOfMonth: 1`, `startMonth: '2026-07'`, `active: true`.
   - `rule-2` : `label: 'Loyer appartement'`, `categoryId: 'cat-2'`, `subcategoryId: 'sub-2'`, `amountCents: 85000`,
     `dayOfMonth: 2`, `startMonth: '2026-07'`, `active: true`.
   - `rule-3` : `label: 'Facture internet fibre'`, `categoryId: 'cat-2'`, `subcategoryId: 'sub-3'`, `amountCents: 3999`,
     `dayOfMonth: 5`, `startMonth: '2026-07'`, `endMonth: '2026-09'`, `active: true`. Règle terminée.
   - `rule-4` : `label: 'Électricité désactivée'`, `categoryId: 'cat-2'`, `subcategoryId: 'sub-4'`, `amountCents: 1000`,
     `startMonth: '2026-07'`, `active: false`. Règle désactivée.
   - Libellés en français, comme les autres mocks (décision validée).
2. Créer `src/app/services/recurring-rule.ts` : `RecurringRuleService`, `@Injectable({ providedIn: 'root' })`,
   constructeur sans argument.
   - `private readonly _rules = signal<RecurringRule[]>(MOCK_RECURRING_RULES)`.
   - `readonly rules = this._rules.asReadonly()`.
   - `activeRulesForMonth(monthKey: string): RecurringRule[]` :
     - valider `monthKey` avec la regex `^\d{4}-(0[1-9]|1[0-2])$`. Sinon `throw new Error('Invalid month key format')`,
       même convention que `MonthContextService`.
     - retourner les règles telles que `active === true`, `startMonth <= monthKey`, et (`endMonth` absent ou
       `monthKey <= endMonth`). Les mois sont des chaînes `YYYY-MM`, la comparaison lexicographique suffit.
     - retourner un nouveau tableau (`filter`), jamais une référence interne.
   - Aucune méthode de mutation. Pas de dépendance à un autre service.
3. Créer `src/app/services/recurring-rule.spec.ts` (Vitest, à côté du service, comme `transaction.spec.ts`).

### Tests obligatoires (`recurring-rule.spec.ts`)
- `rules()` expose les quatre mocks, dans l'ordre `rule-1` à `rule-4`.
- `activeRulesForMonth('2026-07')` renvoie `rule-1`, `rule-2`, `rule-3`.
- `activeRulesForMonth('2026-09')` renvoie `rule-1`, `rule-2`, `rule-3` (fin incluse).
- `activeRulesForMonth('2026-10')` renvoie `rule-1`, `rule-2` (`rule-3` terminée).
- `activeRulesForMonth('2026-06')` renvoie un tableau vide (avant `startMonth`).
- Pour chaque mois de `2026-06` à `2026-12` : `rule-4` n'apparaît jamais (règle inactive).
- `monthKey` invalide (`'2026-13'`, `'2026-7'`, `''`) : erreur `Invalid month key format`.
- Modifier le tableau renvoyé par `activeRulesForMonth()` ne modifie pas `rules()`.
- Tous les `amountCents` des mocks sont des entiers (`Number.isInteger`).

### Fichiers concernés
- Créer : `src/app/mocks/mock-recurring-rules.ts`, `src/app/services/recurring-rule.ts`,
  `src/app/services/recurring-rule.spec.ts`.
- Ne pas modifier le code existant. Ne pas modifier `models/recurring-rule.ts` (tâche 1 terminée).

### Critères d'acceptation
- Les trois fichiers existent et respectent les noms et les champs de la spec.
- `activeRulesForMonth` respecte les règles `active`, `startMonth` et `endMonth` (inclusif).
- Tous les tests obligatoires sont présents et verts.
- `npx tsc -p tsconfig.app.json --noEmit` et `npx tsc -p tsconfig.spec.json --noEmit` : code 0 (mode strict actif).
- `npm run build` passe. Seul avertissement autorisé : le budget SCSS de `category-card.scss`.
- `npx ng test --no-watch` : tout vert, sortie lue sur disque. Le nombre de tests augmente ; aucun test supprimé.
- Aucun `any`, aucun cast `as`. Aucun composant n'importe un mock.

### Hors périmètre pour cette tâche
- Génération des `BudgetLine` et ouverture d'un mois : tâche 4.
- Ajout, modification ou suppression de règles : pas d'interface de gestion dans cette tâche. Emplacement de
  l'interface à trancher plus tard (`roadmap.md` § 5).
- Montants variables (ex. électricité) : non modélisés, `amountCents` est fixe.
- Modifications de `models/`, des services existants, des pages ou des composants.
- Dépendances npm : aucune. Ne pas toucher à `package.json` ni `package-lock.json`.
- Mise à jour de la roadmap : faite par le PM après revue.

### Références
- `.ai/domain-model.md` § 2 (`RecurringRule`), § 4 (ouverture d'un mois), § 5 (`monthKey` triable).
- `AGENTS.md` : services seuls accès aux mocks, pas de `any`.
- `ARCHITECTURE.md` : convention `models/`, `services/`, `mocks/`.
- `.ai/roadmap.md` § 4, Lot 1, tâche 3.
