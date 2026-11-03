## Tâche : bandeau d'allocation du Budget Mensuel (lecture seule)
Lot : 1 (`roadmap.md` § 4, tâche 10)
Branche : `feat/lot1-allocation-banner` (créée depuis `main` à jour)

### Contexte
La page Budget Mensuel est encore un stub. `BudgetService.monthSummary` fournit déjà les montants prévus et le
montant non alloué du mois sélectionné, et `MoneyPipe` les formate selon la devise/locale. Cette tâche affiche
ces valeurs dans un bandeau de lecture seule ; la table et la saisie restent pour les tâches 11/12.

### Présentation retenue
- Une seule île pleine largeur, pas de cartes imbriquées : trois métriques sans cadre séparé.
- Ordre : revenus prévus, dépenses prévues, montant non alloué.
- Mobile-first : trois lignes empilées par défaut ; à partir de `min-width: 768px`, trois colonnes sur une ligne.
- En desktop, chaque métrique est centrée dans sa colonne de largeur égale ; sur mobile, garder le libellé à gauche
   et la valeur à droite.
- `--surface-card`, `--border`, `--radius-lg`, `--space-*`, `--text-caption` et `--num-emphasis` uniquement.
- Montants tabulaires (`font-variant-numeric: tabular-nums`).
- Revenu positif avec `+` (`MoneyPipe`, type `income`), dépense positive avec `−` (type `expense`), montant non alloué
  signé selon sa valeur sans type. Pour un montant income/expense égal à zéro, appeler `MoneyPipe` sans type afin
  d'afficher `0,00 €` sans signe.
- Le montant non alloué peut être négatif ; ne pas le plafonner, le cacher ni le forcer à 0.
- En l'absence de BudgetLine, afficher les zéros formatés normalement. Le bandeau reste présent et ne déclenche pas
  automatiquement l'ouverture d'un mois ; les valeurs prévues nulles s'affichent sans signe.
- Tous les libellés visibles passent par Transloco FR/EN.

### Ce qu'il faut faire
1. Modifier `src/app/pages/budget-mensuel/budget-mensuel.ts` :
   - injecter `BudgetService` et exposer `monthSummary` au template ;
   - injecter `SettingsService` et exposer son signal `settings` au template ;
   - importer `TranslocoPipe` et `MoneyPipe`.
2. Modifier `src/app/pages/budget-mensuel/budget-mensuel.html` :
   - remplacer le template vide par une section sémantique `section` avec un intitulé accessible/localisé ;
   - afficher les trois valeurs de `monthSummary()` via `MoneyPipe` et les réglages actuels de `SettingsService` ;
   - revenu : `incomePlannedCents` avec type `income` seulement s'il est > 0, sinon sans type ; dépense :
     `expensePlannedCents` avec type `expense` seulement si elle est > 0, sinon sans type ; montant non alloué :
     `unallocatedCents` sans type.
3. Modifier `src/app/pages/budget-mensuel/budget-mensuel.scss` : styles mobiles d'abord, puis media query
   `min-width: 768px` pour disposer les trois métriques en colonnes. Aucun token brut : utiliser les tokens ci-dessus.
4. Ajouter les clés d'i18n dans `public/i18n/fr.json` et `public/i18n/en.json` sous `budgetMensuel.allocation`, pour
   le nom accessible du bandeau et les trois libellés. Utiliser des libellés courts, sans concaténation de chaînes.
   Valeurs validées : `income: "Revenus prévus" / "Planned income"`,
   `expense: "Dépenses prévues" / "Planned expenses"`,
   `unallocated: "Montant non alloué" / "Unallocated amount"`.
5. Modifier `src/app/pages/budget-mensuel/budget-mensuel.spec.ts` : garder `should create`, ajouter les providers ou
   modules de test nécessaires (Transloco testing et services réels en mémoire), puis couvrir les valeurs, les signes,
   les libellés et les deux dispositions si le test DOM le permet sans test de screenshot.

### Fichiers concernés
- Modifier : `src/app/pages/budget-mensuel/budget-mensuel.ts`, `budget-mensuel.html`, `budget-mensuel.scss`,
  `budget-mensuel.spec.ts`, `public/i18n/fr.json`, `public/i18n/en.json`.
- Ne pas modifier : modèles, services, mocks, `MoneyPipe`, `src/styles.scss`, routes, autres pages/composants,
  `package.json`, `package-lock.json`.

### Tests obligatoires
- Fixer `MonthContextService` sur juillet 2026, définir un prévu revenu de `300000` cents et un prévu dépense de
   `100000` cents. Vérifier les trois montants rendus en comparant leur texte à
   `MoneyPipe.transform(amountCents, settings, type)` (ne pas coder en dur les espaces Unicode localisés).
- Montant non alloué positif `200000` cents : format sans signe `+`.
- Montant non alloué négatif : le signe `−` reste affiché et la valeur ne devient pas 0.
- Sans `BudgetLine` : les trois montants valent zéro et s'affichent sans signe.
- Changer SettingsService vers `currency: 'USD'`, `locale: 'en-US'` met à jour les trois valeurs après détection de changements.
- Libellés français et anglais présents via Transloco, aucun texte de contenu codé en dur dans le template.

### Critères d'acceptation
- Le bandeau est une seule île, sans cartes imbriquées, et reste lisible sur mobile et desktop ; vérification visuelle
   sur la page en largeurs 375px et desktop, thèmes clair et sombre.
- Les trois montants proviennent uniquement de `BudgetService.monthSummary`, sans calcul ni conversion dans le composant.
- Le formatage passe par `MoneyPipe` et les réglages courants ; le signe correspond à la nature income/expense.
- Les libellés sont localisés en FR/EN ; aucune chaîne UI en dur n'est ajoutée au template.
- Aucun bouton de modification ou ouverture de mois : bandeau strictement en lecture seule.
- `npx tsc -p tsconfig.app.json --noEmit` et `npx tsc -p tsconfig.spec.json --noEmit` : code 0.
- `npm run build` passe. Seul avertissement autorisé : le budget SCSS connu de `category-card.scss`.
- `npx ng test --no-watch` : tout vert, sortie lue sur disque, aucun test supprimé.
- Aucun `any`, `$any`, cast `as` ou dépendance ajoutés. Aucun composant n'importe un mock.

### Hors périmètre pour cette tâche
- Table catégorie → sous-catégories : tâche 11.
- Barres de progression : tâche 9 (composant livré, pas encore intégré).
- Saisie inline du prévu : tâche 12.
- Solde d'ouverture : le bandeau n'affiche pas l'ouverture ni la clôture (tâche 13 / tâche 6).
- Refonte de la page ou ajout d'une navigation/action.
- Mise à jour de la roadmap : faite par le PM après revue.

### Références
- `.ai/domain-model.md` § 3 (`revenusPrevus`, `depensesPrevues`, `montantNonAlloue`) et § 6 (agrégations calculées).
- `DESIGN_SYSTEM.md` § 2 (îles), § 5.3 (montants tabulaires), § 6 (tokens), § 8 (sémantique et accessibilité).
- `AGENTS.md` : aucun mock dans les composants, signaux, i18n, mobile-first.
- `.ai/roadmap.md` § 4, Lot 1, tâche 10.
