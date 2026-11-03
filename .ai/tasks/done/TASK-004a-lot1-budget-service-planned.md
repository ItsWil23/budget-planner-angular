## Tâche : BudgetService — état des lignes prévues et saisie du prévu
Lot : 1 (`roadmap.md` § 4, tâche 4a, première moitié de la tâche 4)
Branche : `feat/lot1-budget-service-planned` (à créer depuis `main` à jour, par l'utilisateur)

### Contexte
Le Budget Mensuel a besoin d'un service qui porte les `BudgetLine` (le prévu) et permet de saisir le montant prévu
d'une sous-catégorie pour un mois. Cette tâche ne génère rien automatiquement : l'ouverture d'un mois est la
tâche 4b.

### Règles retenues (validées 2026-11-03)
- Une `BudgetLine` par couple (`monthKey`, `subcategoryId`). Pas de doublon.
- Le prévu se saisit au niveau sous-catégorie. Le prévu d'une catégorie n'est jamais stocké.
- Saisir `0` supprime la ligne de ce mois-là. L'absence de ligne vaut `0`.
- Un montant négatif, non fini, ou qui ne donne pas un entier de centimes est refusé.
- La conversion euros vers centimes se fait uniquement dans le service (`MoneyService.toCents`).
- L'état initial est vide. Aucun mock de `BudgetLine`.

### Ce qu'il faut faire
1. Créer `src/app/services/budget.ts` : `BudgetService`, `@Injectable({ providedIn: 'root' })`.
   - Constructeur : `constructor(private readonly moneyService: MoneyService, private readonly categoryService: CategoryService)`.
   - `private readonly _lines = signal<BudgetLine[]>([])`, `readonly lines = this._lines.asReadonly()`.
   - `setPlannedAmount(monthKey: string, subcategoryId: string, amountEuros: number): BudgetLine | null` :
     - valider `monthKey` avec la regex `^\d{4}-(0[1-9]|1[0-2])$`. Sinon `throw new Error('Invalid month key format')`.
     - retrouver la sous-catégorie dans `categoryService.subcategories()`. Absente : `throw new Error('Unknown subcategory')`.
       Le `categoryId` de la ligne est celui de cette sous-catégorie.
     - `const cents = moneyService.toCents(amountEuros)`. Si `!Number.isInteger(cents)` ou `cents < 0` : `throw new Error('Invalid amount')`.
     - si `cents === 0` : retirer la ligne existante de (`monthKey`, `subcategoryId`) si elle existe, puis retourner `null`.
     - sinon : si une ligne existe pour (`monthKey`, `subcategoryId`), la remplacer par une nouvelle référence avec le
       nouveau `plannedAmountCents` (même `id`, même `sourceRuleId` éventuel). Sinon, en créer une :
       `id: crypto.randomUUID()`, `monthKey`, `categoryId`, `subcategoryId`, `plannedAmountCents: cents`.
     - retourner la ligne résultante.
   - `linesForMonth(monthKey: string): BudgetLine[]` : lignes du mois, nouveau tableau. Même validation du mois.
   - `plannedCentsFor(monthKey: string, subcategoryId: string): number` : `plannedAmountCents` de la ligne, ou `0` si absente.
   - Toujours via `update()` avec une nouvelle référence. Pas de mutation en place.
2. Créer `src/app/services/budget.spec.ts` (Vitest, à côté du service). Construire le service avec
   `new BudgetService(new MoneyService(), new CategoryService())`.

### Tests obligatoires (`budget.spec.ts`)
- `lines()` est vide au départ.
- `setPlannedAmount('2026-10', 'sub-2', 850)` crée une ligne : `plannedAmountCents` 85000, `categoryId` `cat-2`, `subcategoryId` `sub-2`.
- Conversion : `setPlannedAmount('2026-10', 'sub-3', 12.34)` donne `plannedAmountCents` 1234.
- Unicité : deux `setPlannedAmount` sur (`2026-10`, `sub-2`) ne donnent qu'une seule ligne, avec la dernière valeur.
- Même sous-catégorie, mois différents : deux lignes distinctes.
- `setPlannedAmount(..., 0)` retire la ligne existante et renvoie `null` ; `plannedCentsFor` renvoie `0`.
- `setPlannedAmount(..., 0)` sur une ligne absente : aucune erreur, renvoie `null`.
- Erreurs : montant `-1`, `NaN`, `Infinity` ; sous-catégorie inconnue `'sub-99'` ; mois `'2026-13'`.
- `linesForMonth('2026-10')` ne renvoie que les lignes de ce mois.
- Modifier le tableau renvoyé par `linesForMonth()` ne modifie pas `lines()`.

### Fichiers concernés
- Créer : `src/app/services/budget.ts`, `src/app/services/budget.spec.ts`.
- Ne pas modifier : `models/budget-line.ts`, `models/budget-status.ts`, les services existants, les pages, les composants.
- Ne pas créer de mock de `BudgetLine`.

### Critères d'acceptation
- `BudgetService` respecte les règles ci-dessus, y compris l'unicité et la suppression à 0.
- Tous les tests obligatoires sont présents et verts.
- `npx tsc -p tsconfig.app.json --noEmit` et `npx tsc -p tsconfig.spec.json --noEmit` : code 0 (mode strict actif).
- `npm run build` passe. Seul avertissement autorisé : le budget SCSS de `category-card.scss`.
- `npx ng test --no-watch` : tout vert, sortie lue sur disque. Aucun test supprimé.
- Aucun `any`, aucun cast `as`. Aucun composant n'importe un mock.

### Hors périmètre pour cette tâche
- Ouverture d'un mois depuis les règles, `BudgetMonth` et idempotence : tâche 4b.
- Réel par sous-catégorie, statut, totaux, bandeau d'allocation : tâche 5.
- Solde d'ouverture : tâche 6.
- Gestion des sous-catégories archivées : lot 4.
- Interface (page Budget Mensuel) : lot 1, tâches 9 à 13.
- Aucune dépendance npm. Ne pas toucher à `package.json` ni `package-lock.json`.
- Mise à jour de la roadmap : faite par le PM après revue.

### Références
- `.ai/domain-model.md` § 2 (`BudgetLine`, règle d'unicité), § 5 (montants en centimes, immutabilité).
- `AGENTS.md` : services seuls accès aux données, montants en centimes, pas de `any`.
- `ARCHITECTURE.md` : convention `services/`.
- `.ai/roadmap.md` § 4, Lot 1, tâche 4.
