## Tâche : service de transactions — modifier, supprimer, restaurer, type dérivé
Lot : 2 (`roadmap.md` § 5, TASK-026)
Statut : livrée et validée le 2026-11-18 ; PR en attente de fusion
Branche : `feat/lot2-transactions-service` (à créer depuis `main` à jour)

### Contexte
Le service ne sait qu'ajouter une transaction. Le type (revenu ou dépense) est encore saisi par le formulaire, alors qu'il doit être déduit de la catégorie (`domain-model.md` § 2). Il n'existe ni modification ni suppression, et le précontrôle `BudgetService.assertTransactionAddable()` ne couvre que l'ajout : il faut le généraliser pour que modifier, supprimer et restaurer respectent les mêmes garde-fous (sommes réelles et cascade des soldes). Cette tâche est uniquement service : l'interface (édition, confirmation, annulation) est en TASK-027.

Choix du PM, à valider à la revue de spec :
- Le précontrôle reste dans `BudgetService`, car `BudgetService` dépend déjà de `TransactionService` : l'inverse créerait une dépendance circulaire. Le `TransactionService` ne l'appelle donc pas ; la page l'appellera avant la mutation (TASK-027).
- Une restauration (annulation d'une suppression) réinsère la transaction supprimée à son index, avec le même `id` et le même `createdAt`.

### Ce qu'il faut faire
1. **Type dérivé dans le service.** Retirer `type` de `TransactionInput` (`models/transactions.ts`). `TransactionService` reçoit `CategoryService` en plus de `MoneyService` et déduit `type` de `categoryId` à chaque mutation. Catégorie introuvable : `throw new Error('Category not found')`, sans mutation. Sous-catégorie introuvable ou n'appartenant pas à la catégorie : `throw new Error('Subcategory not in category')`, sans mutation. Ces deux vérifications s'appliquent à `add` et `update` ; `restore` ne revérifie pas une transaction déjà validée.
2. **`add(input)`** : comportement inchangé, sauf le type dérivé.
3. **`update(id, input): Transaction`** : remplace la transaction `id` par une nouvelle saisie, en gardant `id` et `createdAt` ; `monthKey` et `type` sont recalculés. Valide la saisie (`assertValidTransactionInput`) avant toute mutation. Transaction introuvable : `throw new Error('Transaction not found')`.
4. **`remove(id): RemovedTransaction`**, où `RemovedTransaction = { transaction: Transaction; index: number }`. Supprime la transaction et renvoie sa valeur et sa position. Introuvable : même erreur que `update`.
5. **`restore(removed: RemovedTransaction): void`** : réinsère `removed.transaction` à `removed.index`. Lève une erreur si une transaction avec le même `id` est déjà présente.
6. **Précontrôle généralisé dans `BudgetService`** : la logique de `assertTransactionAddable` est reprise dans une fonction privée qui reçoit un retrait optionnel (transaction supprimée ou remplacée) et un ajout optionnel. Elle vérifie, en BigInt et sur les clés touchées (sous-catégorie, catégorie, type, mois de l'ancienne et de la nouvelle date), que les totaux réels restent sûrs, puis compare la cascade des soldes avant et après. Publier ces méthodes publiques, toutes synchrones et sans mutation :
   - `assertTransactionAddable(input)` (signature inchangée) ;
   - `assertTransactionUpdatable(id, input)` ;
   - `assertTransactionRemovable(id)` et `assertTransactionRestorable(removed)`.
7. **Formulaire** : `TransactionForm` cesse de déduire `type` (retirer `getCategoryById` et la propriété `type` de l'émission). Son comportement visible ne change pas.
8. **Dépendances** : `new TransactionService(new MoneyService(), new CategoryService())` dans les specs qui l'instancient (`services/transaction.spec.ts`, `services/budget.spec.ts`). Les objets `TransactionInput` des specs perdent `type`.

### Fichiers concernés
- `src/app/models/transactions.ts` (`TransactionInput` sans `type`)
- `src/app/services/transaction.ts` et `transaction.spec.ts` (type dérivé, `update`, `remove`, `restore`)
- `src/app/services/budget.ts` et `budget.spec.ts` (précontrôle généralisé)
- `src/app/components/ui/transaction-form/transaction-form.ts` et `transaction-form.spec.ts` (suppression de la dérivation du type, test d'émission mis à jour)
- `src/app/pages/transactions/transactions.spec.ts` (saisies sans `type`)
- Aucun changement attendu dans les templates, les SCSS, `public/i18n/*.json`, les mocks ni `CategoryService`.

### Critères d'acceptation
- `TransactionInput` ne contient plus `type` ; `add`, `update` et `restore` produisent un `type` égal à celui de la catégorie.
- Une catégorie inconnue lève `Category not found` et ne modifie rien.
- `update` garde `id` et `createdAt`, recalcule `monthKey`, et déplace bien la transaction d'un mois à l'autre quand la date change.
- `remove` puis `restore` redonnent exactement la liste d'origine (même ordre, mêmes champs), et `restore` refuse un `id` déjà présent.
- Une saisie invalide (date, montant) lève l'erreur existante avant toute mutation.
- Une sous-catégorie absente ou qui n'appartient pas à la catégorie lève `Subcategory not in category` pour `add` et `update`, sans mutation. Les fixtures existantes respectent ce lien ; si une fixture ne le respecte pas, elle est corrigée et le fait est signalé dans la PR.
- Précontrôle : une modification ou une suppression qui ferait dépasser `Number.MAX_SAFE_INTEGER` sur un total réel ou un solde propagé lève `TransactionAggregateOverflowError` et ne modifie ni les transactions ni les soldes. Au moins un test couvre ce cas pour `remove` et pour `update`.
- Précontrôle : une modification de catégorie qui change le type met à jour les totaux du bon type dans le calcul (test dédié).
- `assertTransactionAddable` garde son comportement : les tests existants de `budget.spec.ts` restent verts sans modification de leurs assertions.
- `npx ng test --no-watch` vert, `npm run build` vert, `tsc` sur `tsconfig.app.json` et `tsconfig.spec.json` sans erreur, `git diff --check` propre.
- Aucune nouvelle dépendance npm, aucun `any`, aucun `console.log`, aucune donnée financière loguée.
- Lint : non configuré, non exécuté, à signaler dans la PR.

### Hors périmètre pour cette tâche
- Interface : bouton d'édition, dialogue de confirmation, annulation (undo) — TASK-027.
- Orchestration page (précontrôle puis mutation) — TASK-027.
- Formulaire en mode édition et catégorie désactivée sans sous-catégorie — TASK-027 et TASK-028.
- Champ `updatedAt` ou tout autre changement du modèle `Transaction` (non demandé par `domain-model.md`).
- Suppression d'une catégorie utilisée par des transactions (blocage et archivage, lot 4) : `CategoryService.deleteCategory` ne le fait pas encore. Un `update` d'une transaction dont la catégorie a disparu lèvera `Category not found`. Règle : `roadmap.md` § 7 et `domain-model.md` § 2.
- Styling, pagination, tri.

### Références
- `roadmap.md` § 5, Lot 2, TASK-026 et écart du 2026-10-22 sur la dérivation du `type`.
- `domain-model.md` § 2, `Transaction` (`type` déduit de la catégorie, `subcategoryId` obligatoire) et § 3 (agrégats et cascade).
- `product-vision.md` § 13, décision du 2026-11-03 (cascade des soldes, changements de transactions qui recalculent la clôture réelle).
- `AGENTS.md` : règles générales (services, montants en centimes, signals, pas de `any`).

### Suivi de livraison � 2026-11-18
- Commit : 7607d9 (code, 9 fichiers). Archivage sur la m�me branche.
- Validations : 
px ng test --no-watch 35 fichiers, 610 tests verts ; 	sc app et spec sans erreur ; 
pm run build r�ussi (avertissements de budget SCSS pr�existants) ; git diff --check propre. Lint non configur�, non ex�cut�.
- Revue usage : sans objet, aucun changement visuel attendu (service et logique du formulaire uniquement).
- �carts : pages/budget-mensuel/budget-mensuel.spec.ts modifi�, absent de la liste de la spec, n�cessaire car il appelait dd() avec 	ype. udget.spec.ts partage l'instance categoryService. Message de estore sur id existant : Transaction already exists. Une assertion retir�e dans 	ransaction-form.spec.ts (	ype: 'expense'), car le formulaire n'�met plus 	ype.
- Pr�contr�le : le d�passement et la cascade sont couverts pour remove et update ; le changement de type est couvert par un test d�di�.
- Roadmap : statut et num�ro de PR � mettre � jour apr�s fusion.
