## Tâche : modifier une transaction depuis la liste
Lot : 2 (`roadmap.md` § 5, TASK-027b, après TASK-027a)
Statut : à implémenter
Branche : `feat/lot2-transactions-edit-delete` (branche commune à TASK-027a, 027b et 027c ; une seule PR à la fin)

### Contexte
La liste des transactions n'offre pas encore d'édition. Le service sait déjà modifier (`TransactionService.update()`, TASK-026) et le précontrôle existe (`BudgetService.assertTransactionUpdatable()`). Le composant de menu « ⋯ » est prêt (`app-row-menu`, TASK-027a). Il manque le point d'entrée dans la liste, le mode édition du formulaire et l'orchestration dans la page.

Choix du PM :
- Le formulaire existant sert aussi à l'édition (pas de second formulaire) : une entrée optionnelle `transaction` le fait basculer en mode édition.
- Après une modification, le mois affiché bascule sur le mois de la transaction, comme pour un ajout (TASK-025). Cette règle est un choix du PM, à signaler si elle ne convient pas.

### Ce qu'il faut faire
1. **Liste** (`transaction-list`) : pour chaque ligne, quand `readOnly` est faux, afficher `<app-row-menu>` dans la dernière cellule. Libellé d'accessibilité : `transactionList.actions` avec le nom de la transaction. `menuKey` = `id` de la transaction, `triggerAction` = `row-actions-<id>`. Un item `role="menuitem"` `data-action="edit-<id>"` libellé `transactionList.edit`, qui émet `editTransaction` avec la transaction. L'output existe déjà ; le menu ne doit apparaître que si la liste est modifiable.
2. **Styles des items** : copier dans `transaction-list.scss` le bloc `app-row-menu [role='menuitem']` (et son `:hover`) de `recurring-rule-manager.scss`, comme convenu en TASK-027a. Aucune autre règle visuelle nouvelle.
3. **Formulaire** (`transaction-form`) : nouvelle entrée `@Input() transaction: Transaction | null = null`.
   - Quand `transaction` n'est pas nul, pré-remplir libellé, catégorie, sous-catégorie, date et montant. Le pré-remplissage se fait dans `ngOnInit` (les entrées ne sont pas disponibles dans le constructeur). Le montant vient de `MoneyService.toEditableString(amountCents, locale)`, avec la locale de `SettingsService`.
   - Ordre du pré-remplissage : catégorie d'abord, puis sous-catégorie. Le changement de catégorie réinitialise la sous-catégorie (comportement existant) ; la sous-catégorie doit donc être fixée après.
   - Libellé du bouton : `transactionForm.save` en édition, `transactionForm.submit` en ajout.
   - Émission inchangée : un `TransactionInput` sans `type`.
4. **Page** (`pages/transactions`) :
   - Signal `editingId` (`string | null`). Une fonction `openEdit(id)` ouvre la modale en mode édition ; `openModal()` continue d'ouvrir un ajout (`editingId` à `null`).
   - Titre de la modale : `transactions.editTitle` en édition, `transactions.newButton` en ajout.
   - À l'envoi : si `editingId` est renseigné, appeler `budgetService.assertTransactionUpdatable(id, input)` puis `transactionService.update(id, input)`. Sinon, le chemin d'ajout actuel.
   - Dépassement (`TransactionAggregateOverflowError`) : même gestion qu'à l'ajout (message, modale ouverte, brouillon conservé).
   - Après une modification réussie : fermer la modale et basculer `MonthContextService` sur `updated.monthKey`.
   - Annuler ou fermer la modale : réinitialise `editingId`, sans mutation.
5. **Focus** : après enregistrement ou annulation, le focus revient au déclencheur du menu de la ligne éditée, si la ligne existe encore. Vérifier le comportement de `Modal` ; si `Modal` ne le gère pas, le faire ici sans modifier `Modal`.
6. **i18n** : ajouter dans `public/i18n/fr.json` et `en.json` les clés `transactionList.actions`, `transactionList.edit`, `transactionForm.save`, `transactions.editTitle`. Aucune chaîne en dur.

### Fichiers concernés
- `src/app/components/ui/transaction-list/transaction-list.ts`, `.html`, `.scss`, `transaction-list.spec.ts`
- `src/app/components/ui/transaction-form/transaction-form.ts`, `.html`, `transaction-form.spec.ts`
- `src/app/pages/transactions/transactions.ts`, `transactions.spec.ts` (et `transactions.html` si le titre de modale y est lié)
- `public/i18n/fr.json`, `public/i18n/en.json`

### Critères d'acceptation
- Chaque ligne a un menu « ⋯ » ; l'item « Modifier » ouvre la modale titrée « Modifier la transaction » (texte traduit), pré-remplie avec les valeurs exactes de la transaction.
- Montant pré-rempli exact : par exemple 1 234,05 € pour 123405 centimes, et 0,01 € pour 1 centime. Vérifié par test.
- Enregistrer une modification appelle `assertTransactionUpdatable` puis `update`. L'`id` et le `createdAt` sont conservés. La liste se met à jour sans rechargement.
- Un dépassement agrégé pendant la modification affiche le message, garde la modale ouverte avec le brouillon, et ne modifie ni la transaction ni les soldes.
- Annuler ne modifie rien (test : la liste est identique à l'ouverture).
- Changer de catégorie en édition réinitialise la sous-catégorie, et la nouvelle sous-catégorie peut être choisie.
- Modifier la date vers un autre mois bascule le mois affiché sur ce mois, et la transaction apparaît dans la liste.
- Une liste en lecture seule n'affiche aucun menu.
- Aucune chaîne en dur dans les templates ; les clés existent en français et en anglais.
- Aucun style nouveau hors du bloc des items copié. Mobile-first : cible tactile de 44 px sur les items, comme dans les règles.
- Les tests passent et couvrent : pré-remplissage, édition réussie, dépassement à l'édition, annulation, changement de catégorie, bascule de mois, absence de menu en lecture seule.
- `npx ng test --no-watch` vert, `npm run build` vert, `tsc` sur `tsconfig.app.json` et `tsconfig.spec.json` sans erreur, `git diff --check` propre.
- Aucune nouvelle dépendance npm, aucun `any`, aucun `console.log`.
- Lint : non configuré, non exécuté, à signaler dans la PR.

### Hors périmètre pour cette tâche
- Suppression et annulation après suppression : TASK-027c.
- Modifier le composant `app-row-menu` ou le modèle `Transaction`.
- Styles de la table, débordement à 375 px : TASK-029.
- Liste d'une sous-catégorie désactivée sans sous-catégorie : TASK-028.
- Pagination et tri : TASK-030.

### Références
- `roadmap.md` § 5, Lot 2, TASK-027 (027b).
- `product-vision.md` § 13, décisions du 2026-11-18 (bascule du mois après ajout, extension retenue ici pour la modification).
- `domain-model.md` § 2, `Transaction` (`type` déduit de la catégorie, sous-catégorie obligatoire).
- `AGENTS.md` : composants standalone, signals, montants en centimes, textes via Transloco, pas de `any`.
