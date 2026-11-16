## Tâche — versionner les règles récurrentes et synchroniser le prévu
Statut : validée le 2026-11-16
Ordre : première de deux tâches dépendantes
Branche après validation : `feat/recurring-rule-versioning-sync`

### Intention
Permettre au service de créer et modifier des règles récurrentes sans réécrire leur historique, puis de synchroniser au choix les mois déjà préparés. Les lignes modifiées manuellement et celles effacées à zéro restent sous le contrôle de l'utilisateur.

### Approches
- Modifier une règle en place : écarté, car cela change rétroactivement la règle historique et ne permet pas de choisir le mois d'effet.
- Versionner chaque règle : retenu. Chaque version possède un identifiant propre; les versions d'une même règle partagent un identifiant de série. Une nouvelle version commence le mois système suivant.

### Décisions
- Le mois d'effet est calculé à partir du mois système, indépendamment de `MonthContextService.monthKey`. La nouvelle version commence au mois système suivant et l'ancienne version reste valide jusqu'au mois système courant inclus.
- Le service expose le mois système et/ou le mois suivant par une API testable de `MonthContextService`; éviter de recalculer la date système dans les composants.
- Création, modification, désactivation et réactivation produisent des versions datées. La désactivation n'efface pas les versions précédentes. Une mise à jour répétée d'une version qui ne commencera que le mois prochain peut la remplacer sans créer plusieurs versions futures sans effet.
- La synchronisation cible tous les mois déjà préparés concernés par la série, y compris les mois passés. Sans synchronisation, les mois préparés restent inchangés et la nouvelle version s'applique au mois d'effet pour les préparations ultérieures.
- À la création d'une nouvelle série, aucune synchronisation rétroactive n'est proposée : la règle s'applique uniquement aux mois préparés à partir de son mois d'effet.
- Une ligne générée est rattachée à l'identifiant de version dans `BudgetLine.sourceRuleId`. Une modification manuelle la détache de la règle : la synchronisation ne peut alors ni la remplacer ni la supprimer.
- Effacer à zéro une ligne liée à une règle conserve une suppression explicite par mois, série et sous-catégorie. La synchronisation et une préparation ultérieure ne recréent pas cette ligne. Une saisie manuelle positive annule cette suppression et crée une ligne indépendante.
- La synchronisation ne touche qu'aux `BudgetMonth` initialisés. Les lignes manuelles sans `sourceRuleId` ne sont jamais modifiées. Les lignes générées des versions modifiées/désactivées sont mises à jour/retirées selon le choix de synchronisation.
- Toute mutation multi-mois est prévalidée avec les garde-fous d'agrégats sûrs existants et appliquée atomiquement. En cas d'échec, règles, lignes et suppressions restent inchangées.
- Les règles gardent les catégories/sous-catégories obligatoires, `amountCents` entier positif, `dayOfMonth` optionnel et les bornes inclusives `startMonth`/`endMonth`. Une règle n'émet jamais de transaction.

### Périmètre
- Faire évoluer `RecurringRule` pour distinguer série et version, et ajouter le modèle minimal de suppression d'une occurrence préparée.
- Ajouter les mutations typées dans `RecurringRuleService`.
- Ajouter au service de mois une API testable pour calculer le prochain mois système.
- Faire évoluer `BudgetService` pour détacher les lignes modifiées manuellement, enregistrer les suppressions à zéro, synchroniser les mois préparés et respecter les exceptions.
- Conserver les mocks comme données de phase A. Pas de backend, routage ou dépendance npm.
- Aucune interface dans cette tâche; elle sera réalisée dans TASK-020 après fusion.

### Tests obligatoires
- Les versions d'une série sont actives dans les bons mois, avec bornes inclusives et historique conservé lors des changements, désactivations et réactivations.
- Le mois d'effet dépend du mois système et pas du mois sélectionné; tester le passage décembre/janvier.
- La synchronisation ajoute/met à jour/supprime seulement les lignes générées attendues dans tous les mois préparés concernés, y compris historiques.
- Les lignes manuellement ajustées et supprimées à zéro restent absentes ou inchangées lors d'une synchronisation et d'une préparation répétée.
- Une saisie positive après suppression à zéro retire l'exception et reste indépendante de la règle.
- Les lignes manuelles existantes ne sont ni remplacées ni supprimées; une ligne unique par mois/sous-catégorie est conservée.
- Un dépassement d'agrégat pendant une synchronisation ne mute aucune règle, ligne ou exception.
- `npx tsc -p tsconfig.app.json --noEmit`, `npx tsc -p tsconfig.spec.json --noEmit`, `npx ng test --no-watch`, `npm run build` et `git diff --check` passent.

### Hors périmètre
- Dialogue ou liste de gestion des règles (TASK-020).
- Transactions réelles ou génération de transactions planifiées.
- Synchronisation de mois non préparés.
- Persistance backend ou gestion des récurrences à montant variable.

### Critères d'acceptation
- L'historique n'est pas réécrit; une modification prend effet le mois système suivant.
- Le résultat de synchronisation est atomique et ne perd aucun ajustement manuel ou effacement à zéro.
- La préparation idempotente respecte les exceptions de récurrence.
- Les règles et mutations restent accessibles via des services typés, sans accès aux mocks depuis un composant.