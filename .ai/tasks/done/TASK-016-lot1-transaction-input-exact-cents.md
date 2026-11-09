## Tâche : saisie exacte des transactions en centimes
Lot : suivi transverse après Lot 1 (`roadmap.md`, suivis décidés après le Lot 1)
Branche après création de la spec : `feat/lot1-transaction-input-exact-cents`

### Contexte
`TransactionForm` stocke actuellement la saisie sous forme de `number` en euros, et `TransactionService.add()` la reconvertit avec `MoneyService.toCents()`. Cette conversion flottante peut altérer la valeur saisie près des limites sûres. Les montants persistés sont déjà des centimes entiers, et `MoneyPipe` sait les formater exactement.

TASK-016 migre l'entrée Transaction jusqu'au stockage en centimes et garantit que les agrégats réels affichés ou propagés restent représentables. Les modifications/annulations sont gérées par TASK-015 et les garde-fous des lignes prévues par `BudgetService`.

### Décisions retenues
- Le formulaire accepte les montants strictement positifs, à partir de `0.01 €`, avec au plus deux décimales. Virgule et point sont acceptés ; un chiffre avant le séparateur est obligatoire (`0.5` valide, `.5` invalide).
- Zéro, `-0`, montants négatifs, vide, formats invalides et valeurs non sûres sont refusés ; aucun transactionnel négatif n'est créé.
- Le montant quitte le formulaire comme `amountCents` entier sûr ; ni le formulaire ni `TransactionService` ne le reconvertissent depuis un `number` en euros.
- `TransactionPresentation.amountEuros` reste disponible comme champ dérivé de présentation pour préserver le contrat existant ; tout rendu monétaire continue de s'appuyer sur `amountCents` et `MoneyPipe`.
- Les sommes réelles visibles et le solde de clôture réel utilisé dans la cascade doivent rester des centimes sûrs. Une transaction qui ferait dépasser cette capacité est refusée avant mutation ; aucune limite métier inférieure n'est ajoutée.

### Ce qu'il faut faire
1. Dans `models/transactions.ts`, remplacer `TransactionInput.amountEuros` par `amountCents: number`. Garder `Transaction` inchangé et conserver `TransactionPresentation.amountEuros` comme valeur dérivée existante.
2. Dans `TransactionForm`, remplacer le contrôle numérique flottant par un champ texte accessible (`inputmode="decimal"`, `enterkeyhint="done"`) contenant la chaîne saisie. Parser avec `MoneyService.parseEurosInput()`, refuser zéro/négatif et émettre les centimes exacts positifs. Le message de validation reste localisé et le formulaire ne se vide pas en cas d'erreur.
3. Ajouter ou adapter les erreurs localisées sous `transactionForm` : format/montant positif invalide, montant hors plage sûre et agrégat réel dépassé. Rendre les erreurs accessibles (`aria-invalid`, association descriptive et `role="alert"`).
4. Dans `TransactionService.add()`, accepter `amountCents`, valider `Number.isSafeInteger(amountCents) && amountCents > 0`, stocker ce montant sans appeler `toCents()`, et conserver la validation de date, la génération d'`id`, `monthKey` et `createdAt`.
5. Ajouter à `BudgetService` un précontrôle synchrone sans mutation pour l'ajout d'une transaction candidate. Il utilise `BigInt` pour vérifier avant écriture les sommes réelles mensuelles par sous-catégorie, catégorie et type, puis simule la cascade des soldes réels sur les mois initialisés et vérifie les ouvertures/clôtures dérivées. Lever une erreur typée `TransactionAggregateOverflowError` si un montant affiché ou propagé dépasserait la plage sûre.
6. Dans `Transactions`, appeler ce précontrôle immédiatement avant `TransactionService.add()`, sans `await` entre les deux. En cas de `TransactionAggregateOverflowError`, conserver la modale et les valeurs du formulaire, transmettre l'état d'erreur au formulaire et afficher le message agrégé localisé. En cas de succès, ajouter la transaction et fermer la modale comme aujourd'hui.
7. Le formulaire ne réinitialise pas lui-même ses champs après l'émission : le parent ferme la modale après succès (ce qui détruit le formulaire), et la garde ouverte après un refus agrégé. Effacer l'erreur agrégée dès que l'utilisateur modifie un champ.
8. Adapter les appelants/tests existants de `TransactionInput`. Ne pas supprimer le champ dérivé `amountEuros` de `TransactionPresentation` ni changer le rendu de la liste.

### Fichiers concernés
- Modifier : `src/app/models/transactions.ts`, `src/app/components/ui/transaction-form/transaction-form.ts`, `transaction-form.html`, `transaction-form.spec.ts`, `src/app/services/transaction.ts`, `transaction.spec.ts`, `src/app/services/budget.ts`, `budget.spec.ts`, `src/app/pages/transactions/transactions.ts`, `transactions.spec.ts`, `transactions.html`, `public/i18n/fr.json`, `public/i18n/en.json`.
- Aucun mock, style, autre page/composant, package ou lockfile ne doit être modifié.
- Ne pas ajouter de service pour contourner le lien entre prévalidation et écriture. Si le précontrôle synchrone puis `add()` ne peut pas garantir l'atomicité avec le contrat existant, arrêter et demander avant de modifier l'architecture.

### Tests obligatoires
- `TransactionForm` : virgule/point donnent les centimes exacts ; accepter `0.01` et une saisie sûre aux limites ; rejeter vide, zéro, `-0`, négatif, `.5`, plus de deux décimales, saisie non numérique et valeur hors plage sans émission ni vidage du formulaire ; messages FR/EN et accessibilité.
- `TransactionService.add()` : reçoit des centimes, les stocke sans conversion, accepte les entiers positifs sûrs, rejette zéro/négatif/non entier/non sûr et conserve les contrats date/id/monthKey/createdAt.
- Prévalidation réelle : accepter une transaction quand tous les agrégats restent sûrs ; refuser les dépassements des totaux réels par sous-catégorie, catégorie, mois et des clôtures/ouvertures propagées, sans mutation du signal transactions.
- `Transactions` : appeler le précontrôle avant `add`; si refus, modale ouverte, brouillon conservé, message localisé et aucune transaction ajoutée ; si succès, ajout puis fermeture.
- Préserver le calcul `presentationTransactions.amountEuros` et tous les tests d'affichage actuels de `TransactionList`.
- Vérifier les messages FR/EN et que l'erreur agrégée disparaît à la première modification du formulaire.
- `npx tsc -p tsconfig.app.json --noEmit`, `npx tsc -p tsconfig.spec.json --noEmit`, `npx ng test --no-watch` et `npm run build` passent. Aucun lint n'est configuré : ne pas inventer de commande.

### Critères d'acceptation
- Aucun montant saisi dans le formulaire Transaction ne passe par un `number` en euros avant le stockage.
- `TransactionInput` porte des centimes exacts ; `TransactionService` valide et stocke directement ces centimes.
- Les agrégats réels et soldes propagés restent sûrs ou l'ajout est refusé avant mutation avec message localisé.
- Le formulaire conserve ses valeurs en cas de refus, puis la modale se ferme après succès.
- Le comportement de la modale, les champs non-monétaires et le rendu courant des transactions restent inchangés.

### Hors périmètre
- Édition/suppression des transactions et filtrage de la liste par mois : reste du Lot 2.
- Modification de `MoneyService.toCents()` et de ses appelants hors transaction.
- Mocks de transactions, `TransactionList` visuel, styling du formulaire et changements CSS.
- Fonctionnalités Dashboard, solde de clôture budgétée et autres métriques.

### Références
- `.ai/roadmap.md` § 4, TASK-016 et Lot 2.
- `.ai/tasks/done/TASK-002-lot1-transaction-service.md` : date, identifiant, mois et contrat du service.
- `src/app/models/transactions.ts` : `TransactionInput`, `TransactionPresentation`.
- `src/app/components/ui/transaction-form/transaction-form.ts` et `transaction-form.html`.
- `src/app/services/money.ts` : `parseEurosInput()`.
- `src/app/services/transaction.ts`, `src/app/services/budget.ts` : stockage réel et agrégats/cascade.
- `AGENTS.md` : centimes entiers, validation client et services comme accès aux données.
