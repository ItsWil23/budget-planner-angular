## Tâche : saisie exacte du prévu en centimes
Lot : suivi transverse après Lot 1 (`roadmap.md`, suivis décidés après le Lot 1)
Branche après création de la spec : `feat/lot1-planned-input-exact-cents`

### Contexte
`MoneyService.parseEurosInput()` convertit déjà une chaîne décimale directement en centimes exacts. L'éditeur inline du Budget Mensuel convertit encore son brouillon en `number` euros (`parsePlannedDraft()`), puis `BudgetService.setPlannedAmount()` reconvertit ce nombre en centimes via `toCents()`. Cette double conversion peut perdre la valeur saisie près des limites sûres.

Cette tâche migre uniquement l'entrée du prévu vers le flux exact. TASK-014 a déjà corrigé le formatage de `MoneyPipe`; la saisie des transactions reste pour TASK-016.

### Décisions retenues
- Le champ vide validé par Entrée continue de supprimer le prévu ; le zéro saisi manuellement a le même effet pour le prévu, contrairement au solde d'ouverture.
- Les valeurs valides sont des décimaux non négatifs, avec au plus deux chiffres après le séparateur. La virgule et le point restent acceptés. Une partie entière doit précéder le séparateur (`0.5` valide, `.5` invalide).
- Les montants valides sont représentés et transmis aux services comme centimes entiers sûrs. Aucun plafond métier supplémentaire n'est ajouté.
- Les sommes dérivées affichées par `MoneyPipe` doivent également rester des entiers sûrs. Si une mutation rendrait non sûr le total prévu de la catégorie ou le total prévu mensuel revenu/dépense, elle est refusée avant d'altérer les lignes. Cette garde est une contrainte de représentation numérique, pas un plafond métier arbitraire.
- Toute mutation de `BudgetLine`, y compris les lignes proposées par `openMonth()`, doit respecter la même garde d'agrégat.
- Une erreur de saisie individuelle et un refus d'agrégat ont des messages localisés distincts. Le refus d'agrégat ne doit pas laisser croire que la valeur saisie dépasse à elle seule la limite.
- Les erreurs conservent le parcours UI existant : message localisé, champ ouvert, aucune mutation.

### Ce qu'il faut faire
1. Supprimer la conversion en euros flottants de l'éditeur Prévu : le composant interprète la saisie avec `MoneyService.parseEurosInput()` et transmet les centimes au `BudgetService`.
2. Faire accepter à `BudgetService.setPlannedAmount()` un montant entier en centimes plutôt que des euros. Valider `Number.isSafeInteger(amountCents)` et `amountCents >= 0` avant mutation. Construire les lignes candidates puis vérifier que le total prévu résultant de la catégorie et les totaux prévus mensuels revenus/dépenses restent des entiers sûrs. Refuser avant mutation si l'un de ces agrégats dépasserait la plage sûre. Zéro continue de supprimer la `BudgetLine` ; un montant positif crée ou met à jour la ligne.
3. Supprimer ou simplifier `parsePlannedDraft()` sans dupliquer la validation décimale de `MoneyService`. Traiter la chaîne vide comme zéro uniquement pour conserver la suppression existante.
4. Adapter tous les appelants et tests existants de `setPlannedAmount()` aux centimes. Le service reste l'unique propriétaire de la mutation et des agrégats.
5. Dans `BudgetService.openMonth()`, construire toutes les lignes récurrentes candidates, les combiner aux lignes déjà présentes et vérifier les agrégats prévus de chaque catégorie et du mois avant toute écriture dans `_lines` ou `_months`. Un `PlannedAggregateOverflowError` ne doit laisser ni ligne générée ni mois initialisé. Les règles individuelles invalides ou hors plage sûre sont rejetées selon le contrat existant de `ignoredRuleIds` ; des montants individuels sûrs dont la somme dépasse la plage déclenchent le garde-fou d'agrégat.
6. Gérer les deux contextes UI du `PlannedAggregateOverflowError` sans exception non gérée : l'édition inline garde le champ ouvert et affiche un message d'agrégat distinct ; « Préparer le mois » garde le mois non initialisé et affiche un message localisé expliquant que les récurrences dépasseraient la capacité de calcul exacte.
7. Ajouter les clés i18n distinctes nécessaires pour le refus d'agrégat dans l'éditeur et dans la préparation du mois. Réutiliser la classe d'alerte existante ; ne pas modifier le style visuel.
8. Conserver le parcours : Entrée valide, Escape/blur annulent, la croix supprime immédiatement, la cellule vide/zéro revient à « Non renseigné ».

### Fichiers concernés
- Modifier : `src/app/services/budget.ts`, `src/app/services/budget.spec.ts`, `src/app/pages/budget-mensuel/budget-mensuel.ts`, `src/app/pages/budget-mensuel/budget-mensuel.html`, `src/app/pages/budget-mensuel/budget-mensuel.spec.ts`, `src/app/components/ui/opening-balance/opening-balance.ts`, `src/app/components/ui/opening-balance/opening-balance.html`, `public/i18n/fr.json`, `public/i18n/en.json`.
- Ne pas modifier le modèle `BudgetLine`, `TransactionService`, le formulaire de transaction, les mocks, les styles, ou le contrat de `MoneyPipe`.
- Aucun nouveau package.

### Tests obligatoires
- Vérifier que la saisie `12,34` et `12.34` transmet `1234` centimes et que le résumé affiche le montant attendu.
- Vérifier que `0.01` transmet 1 centime et reste valide.
- Vérifier que vide et zéro suppriment la ligne comme avant.
- Vérifier qu'un négatif, un format invalide, plus de deux décimales, `.5` et un montant supérieur à `Number.MAX_SAFE_INTEGER` en centimes sont refusés sans mutation et avec message localisé.
- Vérifier une valeur exacte au voisinage de `Number.MAX_SAFE_INTEGER` centimes, par exemple `90071992547409.91`, et que le montant visible se relit sans perte.
- Dans `BudgetService`, poser une ligne à `Number.MAX_SAFE_INTEGER` centimes puis tenter d'ajouter un centime à une autre sous-catégorie de la même catégorie : vérifier le rejet et l'absence de mutation.
- Vérifier qu'une somme mensuelle prévue en revenus ou en dépenses qui dépasserait `Number.MAX_SAFE_INTEGER` est refusée avant mutation, même si chaque ligne candidate est individuellement sûre.
- Dans `openMonth()`, injecter des règles actives individuellement sûres mais dont la somme dépasse la limite ; vérifier l'erreur typée et l'atomicité : aucune ligne n'est générée, aucun `BudgetMonth` n'est créé. Vérifier également qu'une règle individuelle non sûre suit le traitement prévu pour une règle invalide.
- Depuis l'éditeur UI, vérifier que le refus d'agrégat garde le champ ouvert, affiche le message dédié et ne fait pas planter le rendu.
- Depuis l'action « Préparer le mois », vérifier qu'un refus d'agrégat affiche le message dédié, garde le mois non préparé et n'émet aucune erreur console.
- Adapter et conserver les tests de `BudgetService` pour création, mise à jour, suppression à zéro, rejet négatif/non entier/hors plage, mois/sous-catégorie invalide et recalcul des résumés.
- Conserver les tests de clavier, focus, annulation et réinitialisation de TASK-012.
- `npx tsc -p tsconfig.app.json --noEmit`, `npx tsc -p tsconfig.spec.json --noEmit`, `npx ng test --no-watch` et `npm run build` passent. Aucun lint n'est configuré : ne pas inventer de commande.

### Critères d'acceptation
- Aucun montant saisi dans l'éditeur Prévu ne passe par un `number` en euros avant d'être stocké.
- `BudgetService.setPlannedAmount()` ne reçoit et ne convertit que des centimes entiers sûrs ; les agrégats prévus affichés restent sûrs après chaque mutation et un dépassement est refusé sans altérer l'état.
- `BudgetService.openMonth()` applique la même garantie avant toute mutation et ne peut pas créer un mois partiellement ouvert.
- Les erreurs de saisie de montant, de dépassement d'agrégat en édition et de dépassement durant la préparation sont localisées et distinctes.
- Les comportements et rendus courants de TASK-012 restent identiques ; les montants extrêmes acceptés sont exacts.
- Aucun flux de transaction n'est modifié ; celui-ci reste explicitement reporté à TASK-016.

### Hors périmètre
- Formulaire et `TransactionService` : TASK-016.
- Changement de `MoneyService.toCents()` ou correction de ses appelants hors prévu.
- Protection contre le dépassement des agrégats de transactions réelles : à traiter avec la migration exacte des entrées Transaction dans TASK-016.
- Solde de clôture budgétée, gestion des récurrences, layout plein écran et refactor CSS.

### Références
- `.ai/roadmap.md` § 4, TASK-015.
- `.ai/tasks/done/TASK-012-lot1-budget-planned-inline-input.md` : comportements UX à préserver.
- `src/app/services/money.ts` : `parseEurosInput()`.
- `src/app/services/budget.ts` : `setPlannedAmount()` et `monthSummary`.
- `src/app/pages/budget-mensuel/budget-mensuel.ts` : `parsePlannedDraft()` et `savePlanned()`.
- `AGENTS.md` : montants en centimes entiers et conversions côté services.
