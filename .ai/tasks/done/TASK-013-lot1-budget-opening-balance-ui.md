## Tâche : préparation du mois et solde d'ouverture dans Budget Mensuel
Lot : 1 (`roadmap.md` § 4, tâche 13)
Branche après création de la spec : `feat/lot1-budget-opening-balance-ui`

### Contexte
`BudgetService` sait déjà ouvrir un mois de façon idempotente, proposer les `BudgetLine` des récurrences actives, calculer/report le solde d'ouverture et gérer un override manuel. La page Budget Mensuel n'expose pas encore ces actions. La sélection d'un mois via `MonthContextService` reste une navigation : elle ne doit pas ouvrir le mois.

### Présentation et interaction retenues
- **Desktop :** présenter les deux îles sur une même rangée avant la table : île « Solde d'ouverture » à gauche, bandeau d'allocation à droite. Garder deux îles indépendantes, sans carte imbriquée. À 1280px, répartir l'espace de manière asymétrique pour garder les trois métriques d'allocation lisibles ; si la largeur disponible ne permet pas de garder les deux blocs lisibles, les empiler plutôt que comprimer leurs valeurs.
- **Mobile :** empiler le bandeau d'allocation d'abord, puis le solde d'ouverture. Ne pas placer les deux blocs côte à côte à 375px.
- Conserver l'ordre et les trois métriques existantes du bandeau d'allocation ; ne pas refondre son contenu dans cette tâche.
- **Mois non préparé :** afficher un état clair « Mois non préparé » et l'ouverture automatique calculable à titre indicatif (`monthSummary().openingBalanceCents`). Ajouter l'action explicite **« Préparer le mois »** ; aide concise : « Initialise le mois et propose vos récurrences. » Aucun mois ne s'ouvre au changement du sélecteur.
- Au clic, appeler `BudgetService.openMonth(monthKey)`. Cette méthode est idempotente : elle crée le `BudgetMonth` et ajoute les `BudgetLine` récurrentes manquantes, sans créer de transaction. Ne pas initialiser automatiquement les mois précédents absents.
- **Mois préparé :** afficher le solde d'ouverture courant via `MoneyPipe` sans type income/expense, et un état explicite « Automatique » ou « Ajusté manuellement » selon `BudgetMonth.openingBalanceOverridden`.
- Une action **« Ajuster »** active un champ inline, en reprenant le comportement familier de TASK-012 : valeur actuelle préremplie, Entrée enregistre, Échap et perte de focus annulent sans mutation. Le champ accepte les montants signés, y compris les négatifs, avec au plus deux décimales.
- Pour la saisie, utiliser un contrôle numérique approprié aux euros signés (`step="0.01"`, sans `min` positif). Convertir par `MoneyService.toCents()` avant d'appeler `BudgetService.setOpeningBalanceOverride(monthKey, openingBalanceCents)` ; ne pas multiplier par 100 dans le composant. Si le clavier mobile ne permet pas le signe négatif ou la touche de validation, le constater et choisir un contrôle accessible adapté, sans supprimer la prise en charge du découvert.
- Un zéro saisi manuellement est un override valide et distinct du mode automatique. N'utiliser ni champ vide ni bouton « effacer » pour remettre le solde à zéro.
- Quand le solde est ajusté, afficher **« Revenir au calcul automatique »**. Cette action appelle `clearOpeningBalanceOverride(monthKey)` ; elle rétablit le report calculé depuis le mois précédent, ou zéro si celui-ci n'est pas initialisé.
- Aucun solde de clôture n'est affiché dans cette tâche. Les récurrences proposées restent des prévus et ne créent jamais de transaction.
- Tous les libellés, états, messages de validation et noms accessibles sont localisés FR/EN. Aucun texte visible en dur dans un template.

### Ce qu'il faut faire
1. Dans `budget-mensuel.ts`, exposer via `computed` l'état initialisé du mois courant (`BudgetService.isMonthOpened(monthKey)`), son solde d'ouverture courant et son état automatique/override. Garder `MonthContextService.monthKey` comme source de vérité.
2. Dans `budget-mensuel.html`, disposer le bandeau d'allocation et le composant `OpeningBalance` existant dans la rangée desktop décrite ci-dessus ; garder le bandeau puis l'ouverture en pile sur mobile. Afficher l'action de préparation uniquement pour un mois non initialisé ; afficher l'ajustement et, le cas échéant, le retour automatique uniquement pour un mois préparé.
3. L'action « Préparer le mois » appelle `openMonth()` explicitement et met à jour la vue via les signaux existants. Ne pas appeler `openMonth()` dans un `effect`, à la navigation ou au chargement du composant.
4. Gérer l'édition inline : valider une valeur finie à au plus deux décimales, convertir avec `MoneyService.toCents()`, puis appeler `setOpeningBalanceOverride()`. Les valeurs négatives et zéro sont valides. Une entrée vide, non numérique ou de précision supérieure au centime est refusée/localisée ; aucune valeur n'est créée dans ce cas. Échap/blur annulent.
5. Le bouton « Revenir au calcul automatique » appelle `clearOpeningBalanceOverride()`. Après changement de mois, la section doit refléter l'état et le solde du mois sélectionné sans état dupliqué.
6. Ajouter les clés d'i18n nécessaires sous `budgetMensuel.openingBalance` dans les traductions FR et EN.
7. Ajouter les tests UI ciblés à `budget-mensuel.spec.ts`. Ne pas modifier les tests ou le code des services sauf si une anomalie bloquante est démontrée ; dans ce cas, arrêter et demander avant d'élargir la tâche.
8. Réutiliser `src/app/components/ui/opening-balance/OpeningBalance` déjà livré par cette tâche ; ne pas le réextraire ni refondre son contenu interne.

### Fichiers concernés
- Modifier : `src/app/pages/budget-mensuel/budget-mensuel.ts`, `budget-mensuel.html`, `budget-mensuel.scss`, `budget-mensuel.spec.ts`, `public/i18n/fr.json`, `public/i18n/en.json`.
- Ne pas modifier : modèles, services, mocks, `MoneyService`, `MoneyPipe`, `MonthContextService`, `RecurringRuleService`, routage, autres pages/composants, `package.json` ou `package-lock.json`.

### Tests obligatoires
- Fixer `MonthContextService` sur un mois non préparé et vérifier que l'affichage ne l'ouvre pas automatiquement ; l'action « Préparer le mois » est présente.
- Vérifier que le changement du mois sélectionné ne déclenche pas `openMonth()`.
- Cliquer « Préparer le mois » et vérifier que `openMonth()` est appelé une fois, que le mois devient initialisé et que les lignes récurrentes manquantes apparaissent dans le résumé. Vérifier également l'état sans récurrence active.
- Vérifier que l'ouverture indicative est le report calculé par le service, zéro si le mois précédent n'est pas initialisé, sans écriture d'état avant préparation.
- Après préparation, vérifier l'état Automatique et le montant d'ouverture formaté par `MoneyPipe`.
- Ajuster avec un montant positif, négatif et zéro ; vérifier les centimes envoyés au service, le formatage visible, et que zéro saisi manuellement garde `openingBalanceOverridden === true`.
- Vérifier qu'entrée vide/non numérique ou supérieure à deux décimales ne modifie pas le service et affiche une erreur localisée.
- Échap/blur annulent l'édition sans appeler `setOpeningBalanceOverride()`.
- Vérifier que « Revenir au calcul automatique » appelle `clearOpeningBalanceOverride()`, enlève l'état override et affiche le report recalculé.
- Vérifier qu'un changement du mois sélectionné met à jour l'état affiché, que les actions sont conditionnelles à l'initialisation, et que tous les libellés/contrôles sont accessibles et FR/EN.
- Vérifier visuellement à 1280px que les deux îles partagent une rangée, ouverture à gauche/allocation à droite, avec les trois métriques d'allocation lisibles ; à 375px vérifier qu'elles s'empilent, allocation puis ouverture. Si la largeur intermédiaire ne suffit pas, les îles s'empilent sans débordement.
- Tester au clavier et visuellement à 375px et desktop, thèmes clair et sombre ; le champ signé doit rester utilisable au clavier mobile et au bureau.

### Critères d'acceptation
- Le sélecteur de mois seul n'initialise jamais un mois et ne génère pas de lignes récurrentes.
- Sur desktop suffisamment large (vérifié à 1280px), le solde d'ouverture se trouve à gauche du bandeau d'allocation sur la même rangée ; en mobile, le bandeau reste au-dessus du solde d'ouverture. Si les deux îles ne restent pas lisibles à une largeur intermédiaire, elles s'empilent.
- Le contenu interne et les trois métriques du bandeau d'allocation restent inchangés ; aucune nouvelle métrique n'est ajoutée à cette tâche.
- Un mois non préparé propose une action explicite qui appelle `BudgetService.openMonth()` ; l'ouverture est idempotente et les récurrences n'ajoutent que des `BudgetLine`, jamais des transactions.
- Après préparation, le solde d'ouverture reflète le report automatique du mois précédent ou zéro s'il n'est pas initialisé. Les valeurs sont toujours des centimes entiers dans le service.
- Un override manuel signé (négatif, zéro ou positif) s'affiche correctement, est signalé comme manuel et peut être effacé pour revenir au calcul automatique.
- L'édition inline ne sauvegarde qu'avec Entrée ; Échap/blur annulent. La conversion passe par `MoneyService`, le formatage par `MoneyPipe`, les chaînes par Transloco.
- Aucune clôture réelle/prévue ni nouvelle logique métier n'est recalculée dans le composant.
- `npx tsc -p tsconfig.app.json --noEmit`, `npx tsc -p tsconfig.spec.json --noEmit`, `npm run build` et `npx ng test --no-watch` passent. Aucun lint n'est demandé : il n'est pas configuré dans le dépôt. Les avertissements SCSS acceptés des tâches précédentes peuvent subsister ; ne pas élargir cette tâche en refactor CSS.
- Aucun nouveau package, `any`, `$any`, cast `as`, changement d'API publique ou import de mock dans le composant.

### Hors périmètre pour cette tâche
- Modification du report/cascade de solde, de l'idempotence de `openMonth()` ou de l'algorithme de génération des récurrences (TASK-006 et tâches 4a/4b déjà validées).
- Affichage du solde de clôture, calcul du Dashboard, catégories, transactions, backend/persistance.
- Initialisation automatique à la navigation, création automatique de mois antérieurs, override d'un mois non préparé.
- Ajout du solde de clôture prévue ou d'autres métriques de synthèse ; leur pertinence et leur placement seront étudiés séparément après validation de TASK-013.
- Refonte du contenu du bandeau d'allocation, du sélecteur global de mois, des cards/table, du layout global ou des styles de la topbar.

### Références
- `.ai/roadmap.md` § 4, Lot 1, tâche 13.
- `.ai/product-vision.md` § 9 et § 13 : rôle du Budget Mensuel et préparation explicite du mois.
- `.ai/domain-model.md` § 3–4 : `BudgetMonth`, report et cascade des soldes.
- `src/app/services/budget.ts` : `openMonth()`, `isMonthOpened()`, `monthSummary`, `setOpeningBalanceOverride()` et `clearOpeningBalanceOverride()`.
- `src/app/services/money.ts`, `src/app/components/ui/money-pipe/money-pipe.ts` : conversion et formatage.
- `DESIGN_SYSTEM.md` § 2, § 4.1, § 5.3, § 6 et § 8 ; `AGENTS.md` : signaux, i18n, centimes entiers, accessibilité et mobile-first.
