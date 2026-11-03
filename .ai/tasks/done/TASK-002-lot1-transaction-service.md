## Tâche : TransactionService — monthKey, sélection par mois, état en centimes, mocks multi-mois
Lot : 1 (`roadmap.md` § 4, tâche 2 — regroupe les points 2a, 2b et 2c, validés en une seule tâche le 2026-10-28)
Branche : `feat/lot1-transaction-service` (à créer depuis `main` à jour, par l'utilisateur)

### Contexte
`TransactionService` ne porte ni `monthKey` ni `createdAt`, alors que `domain-model.md` § 2 les prévoit. Il ne sait
donc pas sélectionner les transactions d'un mois, ce que le Budget Mensuel (lot 1, tâche 5) doit pouvoir faire.
L'état mélange aussi `amountEuros` et `amountCents` (revue A5), et le formulaire génère l'`id` (A4, partie `id`).
Les mocks sont tous datés d'août 2026, ce qui rend le mois courant vide.

### Décisions validées (2026-10-28)
- Une seule tâche, sans découpage.
- Le service génère l'`id` à l'ajout. Le formulaire ne le génère plus.
- Le service calcule `monthKey` (depuis `date`) et `createdAt` à l'ajout.
- L'état ne stocke que `amountCents`. `amountEuros` n'existe que dans la vue `TransactionPresentation`.
- Mocks étalés sur `2026-07` à `2026-12`.

### Ce qu'il faut faire
1. `src/app/models/transactions.ts` :
   - `Transaction` : ajouter `monthKey: string` (`'YYYY-MM'`) et `createdAt: string` (ISO complet), conformes à
     `domain-model.md` § 2. Garder les champs existants.
   - `TransactionInput` : `Omit<Transaction, 'id' | 'monthKey' | 'amountCents' | 'createdAt'> & { amountEuros: number }`.
     Il ne porte plus `id`, `monthKey` ni `createdAt`.
   - `TransactionPresentation` : inchangé dans sa définition.
2. `src/app/services/transaction.ts` :
   - `add(input: TransactionInput): Transaction` :
     - valider `input.date` au format `YYYY-MM-DD` (regex). Sinon `throw new Error('Invalid date format')`,
       même convention que `MonthContextService`.
     - convertir `amountEuros` en centimes via `MoneyService.toCents`. Si le résultat est `<= 0`, lever une erreur.
     - générer `id` avec `crypto.randomUUID()`.
     - `monthKey = input.date.slice(0, 7)`.
     - `createdAt = new Date().toISOString()`.
     - ajouter à `_transactions` via `update()` avec une nouvelle référence (comportement actuel conservé).
     - retourner la `Transaction` créée.
   - `transactions` (signal en lecture seule) : inchangé. Il ne contient plus de `amountEuros`.
   - `presentationTransactions` : inchangé dans son comportement, il renvoie toutes les transactions avec
     `amountEuros`.
   - Ajouter `transactionsForMonth(monthKey: string): TransactionPresentation[]` : filtre
     `presentationTransactions()` sur `monthKey`. Il lit le signal, donc il reste réactif dans un template.
   - Le constructeur ne change pas (`MoneyService` seul). Pas de dépendance à `MonthContextService`.
3. `src/app/mocks/mock-transactions.ts` :
   - Conserver les 9 transactions existantes : `id`, `label`, `categoryId`, `subcategoryId`, `amountCents`, `type`
     inchangés, et leur ordre inchangé (`tx-1` à `tx-9`).
   - Reporter leurs `date` dans `2026-07` à `2026-12`.
   - Ajouter `monthKey` (= `date.slice(0, 7)`) et `createdAt` (ISO complet) à chaque entrée.
   - Ajouter des transactions (ids `tx-10` et suivants) pour que chaque mois de `2026-07` à `2026-12` ait au moins
     une transaction `income` et une transaction `expense`. Maximum 40 entrées au total.
   - Libellés en français, comme aujourd'hui (décision validée).
4. `src/app/components/ui/transaction-form/transaction-form.ts` :
   - Supprimer `id: crypto.randomUUID()` du payload. Le reste du payload ne change pas, y compris `type`, qui reste
     dérivé dans le formulaire (voir hors périmètre).
5. `src/app/pages/transactions/transactions.ts` : aucun changement attendu. `add()` retourne désormais une valeur
   ignorée par la page, ce qui compile.

### Fichiers concernés
- Modifier : `src/app/models/transactions.ts`, `src/app/services/transaction.ts`,
  `src/app/services/transaction.spec.ts`, `src/app/mocks/mock-transactions.ts`,
  `src/app/components/ui/transaction-form/transaction-form.ts`.
- Modifier si nécessaire : `src/app/components/ui/transaction-form/transaction-form.spec.ts` (le test ne vérifie
  que `amountEuros` : ne le modifier que si ce test échoue).
- Ne pas modifier : `src/app/pages/transactions/transactions.ts`, les templates, les autres services.

### Tests à mettre à jour ou à ajouter (`transaction.spec.ts`)
- Adapter les tests existants : `add()` reçoit une entrée sans `id`. Le test « initial state » compare le nombre
  de transactions à `MOCK_TRANSACTIONS.length` au lieu du nombre `9` figé. Les assertions sur `tx-1`, `tx-10`,
  `tx-11` et `tx-12` sont remplacées par des assertions sur les `id` générés (format UUID) et sur le nombre.
- Ajouter, au minimum :
  - `add()` renvoie une `Transaction` dont `monthKey` vaut `date.slice(0, 7)` et dont `createdAt` est une date ISO valide.
  - `add()` ne stocke pas `amountEuros` : l'objet de `transactions()` n'a pas cette propriété.
  - date au mauvais format : erreur.
  - `amountEuros` nul ou négatif : erreur.
  - `transactionsForMonth('2026-10')` ne renvoie que les transactions de ce mois.
  - pour chaque mois de `2026-07` à `2026-12` : au moins une `income` et une `expense` dans les mocks.
  - pour toutes les transactions des mocks : `monthKey === date.slice(0, 7)`.
  - `presentationTransactions()` renvoie toutes les transactions, `amountEuros` inclus.

### Critères d'acceptation
- `src/app/models/transactions.ts` expose `monthKey` et `createdAt` ; `TransactionInput` n'a plus `id`.
- `TransactionService.add()` génère `id`, `monthKey` et `createdAt`, et rejette une date mal formée ou un montant `<= 0`.
- L'état (`transactions()`) ne contient que `amountCents`.
- `transactionsForMonth()` filtre correctement.
- Les mocks couvrent `2026-07` à `2026-12`, avec au moins un revenu et une dépense par mois, et `monthKey` cohérent
  avec `date`.
- `transaction-form.ts` ne génère plus d'`id`.
- `npx tsc -p tsconfig.app.json --noEmit` et `npx tsc -p tsconfig.spec.json --noEmit` : code 0 (mode strict actif).
- `npm run build` passe. Seul avertissement autorisé : le budget SCSS de `category-card.scss`.
- `npx ng test --no-watch` : tout vert. Sortie lue sur disque. Le dev agent indique le nombre de tests, les tests
  modifiés et les tests ajoutés ; aucun test supprimé sans justification écrite.
- Aucun `any`, aucun cast `as` ajouté.
- Aucun composant n'importe un mock. Les services restent les seuls accès aux mocks.

### Hors périmètre pour cette tâche
- Génération de `type` dans le formulaire (reste dans le composant) : lot 2 (A4, partie `type`).
- Date par défaut calculée en UTC via `toISOString()` (A2) : lot 2.
- Minimum du formulaire `Validators.min(0.1)` (A3) : lot 2.
- Liste des transactions filtrée par le mois sélectionné (A11, câblage UI) : lot 2. Ne pas modifier
  `TransactionList` ni la page Transactions.
- Édition et suppression de transaction : lot 2.
- Tout changement du Budget Mensuel, de `BudgetService` ou de `RecurringRuleService` : lot 1, tâches 3 et suivantes.
- Aucune dépendance npm ajoutée. Ne pas toucher à `package.json` ni à `package-lock.json`.
- Mise à jour de la roadmap : faite par le PM après revue.

### Références
- `.ai/domain-model.md` § 2 (`Transaction`), § 5 (montants en centimes, dates ISO, `monthKey`, immutabilité).
- `AGENTS.md` : services seuls accès aux mocks, montants en centimes, pas de `any`.
- `ARCHITECTURE.md` : couche service, convention `models/`, `services/`, `mocks/`.
- `.ai/roadmap.md` § 4, Lot 1, tâche 2 ; revue du 2026-10-22, points A2, A3, A4, A5, A11.
