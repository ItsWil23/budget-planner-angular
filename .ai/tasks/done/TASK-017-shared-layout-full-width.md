## Tâche : conteneur partagé pleine largeur avec limites locales
Lot : suivi transverse après Lot 1 (`roadmap.md`, suivis décidés après le Lot 1)
Branche après création de la spec : `feat/shared-layout-full-width`

### Contexte
`MainLayout` affiche une topbar qui occupe toute la largeur disponible, mais `.page-container` limite le contenu routé à `80rem`. À 2400px de viewport, le contenu de page est ainsi recentré sur 1280px alors que la zone sous la topbar dispose d'environ 2056px. La topbar n'est pas enfant de `.page-container` et ne doit pas être modifiée.

### Décisions retenues
- Les pages sous `MainLayout` utilisent toute la largeur disponible dans la zone de contenu, comme la topbar.
- L'aération vient du padding et du gap du layout, pas d'un plafond global qui recentre toutes les pages.
- Les contenus qui nécessitent une mesure plus courte définissent une limite localement, dans leur composant/page, sans réduire la largeur disponible des autres pages.
- Ne pas modifier le fond, les dimensions ou le comportement sticky de la topbar, ni le layout des pages publiques hors `MainLayout`.

### Ce qu'il faut faire
1. Retirer le plafond global de largeur de `.page-container` dans `src/app/components/layout/main-layout/main-layout.scss` et lui faire occuper la largeur disponible de `.main-content`, sans introduire de nouveau débordement horizontal.
2. Vérifier les pages sous `MainLayout` (Budget Mensuel, Transactions, Catégories, Dashboard et Paramètres) et ajouter une contrainte locale uniquement aux blocs dont la lisibilité exige une largeur maximale. Ne pas réintroduire de plafond global ou de marge de centrage partagée.
3. Garder la topbar inchangée et alignée sur la largeur disponible actuelle.
4. Ajouter ou adapter des tests de layout seulement si une logique testable est introduite ; ne pas créer de tests DOM fragiles pour des valeurs purement visuelles.

### Fichiers concernés
- Modifier : `src/app/components/layout/main-layout/main-layout.scss`.
- Modifier les styles de pages/composants uniquement si la vérification visuelle démontre qu'un bloc précis devient illisible à pleine largeur ; dans ce cas, documenter brièvement la raison du plafond local.
- Ne pas modifier le routage, les services, modèles, mocks, templates, tokens globaux ni ajouter de dépendance.

### Vérifications visuelles obligatoires
- Comparer les pages sous `MainLayout` à 1280px et 2400px : le contenu routé occupe la largeur disponible, sans rester centré dans un cadre étroit et sans étirer excessivement les textes/formulaires.
- Vérifier aussi 375px et 1024px pour confirmer le padding, l'absence de nouveau débordement et la transition mobile/tablette/desktop. Le débordement préexistant du tableau Transactions à 375px est documenté au Lot 2 et ne doit pas être corrigé dans cette tâche.
- Contrôler au minimum Budget Mensuel, Transactions, Catégories et Paramètres, en thèmes clair et sombre. La topbar doit garder la même géométrie qu'avant.
- Tester le build et toutes les validations décrites ci-dessous ; consigner les pages/résolutions vérifiées et toute limite.

### Critères d'acceptation
- À 2400px, `.page-container` utilise la largeur intérieure disponible du contenu au lieu d'être plafonné à 80rem.
- À 1280px et moins, aucune page ne perd son comportement responsive existant et le changement de conteneur n'introduit aucun nouveau débordement. Le débordement existant du tableau Transactions à 375px reste un suivi du Lot 2.
- Les blocs de lecture étroits, s'il y en a, sont limités localement ; les tables/grilles de page peuvent utiliser l'espace partagé.
- La topbar, la navigation et les pages hors `MainLayout` ne sont pas modifiées.
- `git diff --check`, les deux typechecks, `npx ng test --no-watch` et `npm run build` passent. Aucun lint n'est configuré : ne pas inventer de commande.
- Aucun nouveau package, `any`, `$any`, cast `as`, changement d'API ou import de mock dans un composant.

### Hors périmètre
- Nouvelle rangée de synthèse du Budget Mensuel et KPI de clôture budgétée : tâche séparée.
- Nombre/largeur des colonnes de catégorie, troncation des noms sous 340px et nettoyage du budget SCSS : tâches séparées.
- Filtrage Transactions par mois sélectionné : Lot 2.
- Gestion des récurrences, formulaires, widgets Dashboard et pages publiques.

### Références
- `.ai/roadmap.md` § 4, TASK-017 et § 5, Lot 2.
- `.ai/product-vision.md` § 9, § 11 et § 13 : rôle des pages et décision de largeur partagée.
- `src/app/components/layout/main-layout/main-layout.html` et `main-layout.scss`.
- `.ai/tasks/done/TASK-011-lot1-budget-monthly-table.md` : plafond global antérieurement différé, à remplacer par des limites locales si besoin.
- `DESIGN_SYSTEM.md` § 2 ; `AGENTS.md` : responsive, tokens et structure du layout.
