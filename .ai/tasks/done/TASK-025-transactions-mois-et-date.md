## Tâche : liste des transactions par mois et date par défaut locale
Lot : 2 (`roadmap.md` § 5, TASK-025)
Statut : livrée et validée le 2026-11-18 ; PR en attente de fusion
Branche : `feat/lot2-transactions-month` (à créer depuis `main` à jour)

### Contexte
La route Transactions est `monthScoped: true` et le sélecteur de mois de la topbar pilote `MonthContextService`, mais la liste affiche les transactions de tous les mois. Le formulaire calcule sa date par défaut avec `toISOString()` (UTC) : dans les fuseaux UTC+, entre minuit et l'heure du fuseau, il propose la veille (ex. Paris à 00h30).

Décisions du 2026-11-18 (`product-vision.md` § 13) : la date par défaut est toujours la date du jour, en heure locale, quel que soit le mois sélectionné ; après un ajout, le mois affiché bascule sur le mois de la transaction ajoutée.

### Ce qu'il faut faire
1. Dans `services/transaction.ts`, exporter une fonction pure `todayLocalIsoDate(): string` qui renvoie la date du jour en heure locale au format `AAAA-MM-JJ`, à côté de `TRANSACTION_DATE_PATTERN`.
2. Dans `TransactionForm`, initialiser le champ `date` avec `todayLocalIsoDate()` à la place de `new Date().toISOString().substring(0, 10)`.
3. Dans `pages/transactions/transactions.ts`, la liste n'affiche que les transactions du mois de `MonthContextService.monthKey()`, via `TransactionService.transactionsForMonth()` dans un `computed`. Le nom de la propriété liée au template (`transactions`) ne change pas.
4. La liste se met à jour quand le mois change depuis la topbar, sans recharger la page.
5. Dans `Transactions.onTransactionSubmit()`, après `add()`, appeler `MonthContextService.setMonth()` avec le `monthKey` de la transaction ajoutée. Le formulaire et `TransactionService` ne sont pas concernés.

### Fichiers concernés
- `src/app/services/transaction.ts` et `src/app/services/transaction.spec.ts` (fonction `todayLocalIsoDate`)
- `src/app/components/ui/transaction-form/transaction-form.ts` et `transaction-form.spec.ts` (date par défaut)
- `src/app/pages/transactions/transactions.ts` et `transactions.spec.ts` (filtre par mois)
- Aucun changement attendu dans les templates, les SCSS, `public/i18n/*.json`, les mocks, ni `MonthContextService`.

### Critères d'acceptation
- La liste n'affiche que les transactions dont `monthKey` égale le mois sélectionné ; une transaction d'un autre mois n'apparaît pas.
- Changer de mois avec le sélecteur de la topbar met la liste à jour.
- Après l'ajout d'une transaction dans un autre mois que celui affiché, le mois affiché bascule sur celui de la transaction, et la transaction apparaît dans la liste.
- À l'ouverture du formulaire, le champ `date` vaut la date du jour en heure locale, même quand un autre mois est sélectionné.
- Le test de date construit une date locale (ex. `new Date(2026, 10, 18, 0, 30)` avec `vi.setSystemTime`) et attend `2026-11-18`. Il passe quel que soit le fuseau horaire de la machine.
- Le formulaire n'utilise plus `toISOString()` pour la date.
- `TransactionService.add()` et `assertTransactionAddable()` sont inchangés ; leurs tests existants restent verts.
- `npx ng test --no-watch` vert (tests existants et nouveaux), `npm run build` vert, `git diff --check` vert.
- Aucune nouvelle dépendance npm, aucun `any`, aucun `console.log`.
- Lint : non configuré, non exécuté, à signaler comme tel dans la PR.

### Hors périmètre pour cette tâche
- Édition, suppression, dérivation du `type` depuis le formulaire, précontrôle (TASK-026, TASK-027).
- Sous-catégorie désactivée et lien vers la page Catégories (TASK-028).
- Styling et débordement de la table à 375px (TASK-029).
- Pagination et tri (TASK-030).
- Routes, topbar, `MonthContextService`, modèles et mocks.

### Références
- `roadmap.md` § 5, Lot 2, TASK-025 et écarts de revue du 2026-10-22.
- `product-vision.md` § 13, décision du 2026-11-18 (date par défaut).
- `domain-model.md` § 2, `Transaction` (`monthKey` dérivé de `date`).
- `AGENTS.md`, règles générales (services, montants en centimes, signals, pas de `any`).

### Suivi de livraison — 2026-11-18
- Commits : `fccbd1b` (code), `3ebbedf` (docs : roadmap, décisions, spec), `d747643` (commandes slash, séparé). Archivage sur la même branche.
- Validations : `npx ng test --no-watch` 35 fichiers, 597 tests verts ; `npm run build` réussi (avertissements de budget SCSS préexistants) ; `tsc` app et spec sans erreur ; `git diff --check` propre ; tests de date verts avec `TZ=Pacific/Kiritimati`. Lint non configuré, non exécuté.
- Revue usage : rendu validé par l'utilisateur sur mobile et desktop. Thèmes clair et sombre non précisés, à confirmer.
- Écarts : aucun écart de périmètre. Bascule du mois après ajout ajoutée à la spec avant implémentation (`product-vision.md` § 13, 2026-11-18).
- Roadmap : statut et numéro de PR à mettre à jour après fusion.
