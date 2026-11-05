## Tâche : table du Budget Mensuel
Lot : 1 (`roadmap.md` § 4, tâche 11)
Branche après création de la spec : `feat/lot1-budget-monthly-table`

### Contexte
La page Budget Mensuel affiche déjà le bandeau d’allocation. `BudgetService.monthSummary` fournit les agrégats prévus/réels par catégorie et sous-catégorie, les statuts et les taux. Cette tâche ajoute la table de suivi en lecture seule, selon la maquette validée dans `.ai/design/budget-month-layouts.html`.

### Présentation retenue
- **Desktop :** une carte par catégorie, colonnes de même largeur, en-têtes de catégorie visibles pendant le défilement. Les lignes restent compactes et chaque carte présente le total Prévu/Réel de sa catégorie. Ne pas afficher les noms internes des groupes de taille ni leur nombre de lignes.
- Les catégories sont regroupées par nombre de sous-catégories configurées (pas selon les seules lignes ayant un montant ce mois-ci) : petite `0–5`, moyenne `6–10`, grande `11+`.
- Capacité de composition : `18` lignes de sous-catégorie par colonne, hors en-têtes. Empaqueter au plus trois petites catégories ou deux moyennes par colonne, en respectant cette capacité. Si la paire de moyennes ne tient pas, les placer dans des colonnes distinctes. Les catégories grandes occupent chacune une colonne.
- Ordre des colonnes : petites à gauche, moyennes ensuite, grandes à droite. Conserver l’ordre CategoryService à l’intérieur des groupes petites/moyennes ; placer les grandes par nombre de lignes croissant, afin que la plus grande soit tout à droite (ordre stable en cas d’égalité). Ne pas créer de colonne vide.
- Si la largeur disponible ne permet pas de garder des colonnes lisibles, revenir automatiquement à la disposition B (« colonnes équilibrées ») sans défilement horizontal. Le seuil exact dépend du nombre de colonnes et doit être validé à 375px et en desktop.
- **Mobile :** disposition B en une colonne. Cartes repliables avec toutes les cartes ouvertes au premier affichage ; un en-tête `summary` entier active le repli/dépli. Chevron à gauche du nom, totaux Prévu/Réel alignés à droite. Une rangée de raccourcis permet d’atteindre chaque catégorie ; sélectionner une catégorie repliée la rouvre avant le défilement.
- Les raccourcis restent accessibles au toucher (cible ≥ 44×44px), et leur rangée peut défiler horizontalement. Aucun contenu essentiel ne dépend du survol.
- Les états de repli ne sont pas persistés entre navigations/rechargements.

### Retours validés après première revue visuelle
- Le bandeau d’allocation reste dans le flux normal sur desktop et mobile ; il n’est pas sticky. La topbar globale est déjà sticky, et garder le bandeau à l’écran consommerait trop de hauteur sur mobile.
- Sur mobile seulement, rendre la rangée de raccourcis sticky sous la topbar sticky, sans recouvrement. Utiliser un offset cohérent avec les dimensions/tokens de la topbar, pas une valeur arbitraire. Le défilement et l’activation clavier des liens restent possibles.
- La rangée sticky utilise `--surface-card`, comme la topbar, comme fond opaque (pas le fond presque noir de page ni un fond transparent) afin que les lignes et chevrons qui défilent dessous ne transparaissent pas dans les espaces entre liens ; elle reste sous la topbar dans l’ordre de superposition.
- Masquer la scrollbar native décorative de cette rangée dans tous les thèmes, tout en conservant le défilement horizontal tactile/trackpad et l’accès clavier aux liens. Ne pas remplacer le défilement par un contrôle inaccessible.
- Espacement mobile entre cartes : `16px` au total (un seul `--space-lg`). Éviter de cumuler le `gap` de `.balanced` avec une marge de carte équivalente.
- Renforcer la séparation entre l’en-tête de catégorie et ses sous-catégories avec `--surface-app` et une bordure basse `--border`. Garder les montants Prévu/Réel alignés à droite et le chevron à gauche ; aucun ombrage ni couleur décorative.
- Garder pour l’instant le libellé « Réel sans prévu ». Le choix du placeholder d’une ligne sans prévu sera réexaminé à la tâche suivante ; ne pas le modifier ici.
- Les marges horizontales/max-width du conteneur global sont hors de cette tâche. Les réévaluer après validation de TASK-011 dans une tâche de layout transverse, car ce conteneur est partagé par toutes les pages. À 1280px, le plafond actuel de `80rem` ne contraint pas la page Budget ; ne pas passer le contenu bord à bord pour compenser.
- Ne pas modifier le fond/rayon du host de topbar partagé dans cette tâche. Le masquage du contenu derrière ses coins arrondis sera traité à la revue transverse des composants de layout en fin de lot.

### Ce qu’il faut faire
1. Dans `src/app/pages/budget-mensuel/budget-mensuel.ts`, exposer via des signaux/computed les données nécessaires à la vue en joignant `BudgetService.monthSummary()` aux catégories et sous-catégories de `CategoryService`. Ne pas importer de mock dans le composant, ne pas refaire les agrégations et ne pas convertir les montants dans le composant.
2. Dans `budget-mensuel.html`, conserver le bandeau et ajouter les cartes de catégorie, leurs totaux Prévu/Réel et les lignes de sous-catégorie avec prévu, réel et progression. Employer `MoneyPipe` et les réglages courants pour les montants. Afficher les catégories sans sous-catégorie avec un état « à compléter » explicite, sans bouton d’action.
3. Réutiliser `ProgressBar` pour les sous-catégories dont `consumptionRate` et `status` sont définis. Le composant gère déjà le plafonnement de la barre et conserve le pourcentage exact affiché. Si le prévu est absent/nul, afficher le réel mais aucune barre/statut ; distinguer explicitement le réel sans prévu.
4. Implémenter le classement et l’empaquetage des colonnes D comme décrit ci-dessus. L’état réactif des données et de la mise en page doit rester dérivé (`computed`), sans état parallèle non signalé.
5. En mobile, employer une structure native accessible pour les cartes repliables (`details`/`summary` ou équivalent accessible), ouvrir toutes les cartes à l’initialisation et connecter les raccourcis au bon contenu. L’activation d’un raccourci rouvre la carte cible si nécessaire.
6. Ajouter toutes les chaînes UI nécessaires sous `budgetMensuel.table` dans `public/i18n/fr.json` et `public/i18n/en.json` : colonnes, état sans sous-catégorie, réel sans prévu, raccourcis/nom accessible, labels de progression et noms des groupes de taille s’ils sont visibles. Aucun texte visible en dur dans le template.
7. Ajouter/adapter les tests de `budget-mensuel.spec.ts` pour couvrir valeurs, regroupement, réactivité aux changements de données et comportement accessible mobile.

### Fichiers concernés
- Modifier : `src/app/pages/budget-mensuel/budget-mensuel.ts`, `budget-mensuel.html`, `budget-mensuel.scss`, `budget-mensuel.spec.ts`, `public/i18n/fr.json`, `public/i18n/en.json`.
- Ne pas modifier : modèles, services, mocks, `MoneyPipe`, `ProgressBar`, routage, autres pages/composants, `package.json` ou `package-lock.json`.

### Tests obligatoires
- Fixer `MonthContextService` sur un mois déterministe et vérifier que chaque carte et sous-catégorie affiche les montants du `monthSummary` correspondant, formatés par `MoneyPipe` selon le type et les réglages courants.
- Couvrir les statuts `under`, `on-track`, `over`, un taux supérieur à 100 % (barre plafonnée, taux exact visible) et une ligne sans prévu (réel visible, progression absente).
- Tester les frontières de classification : 5 petites, 6 et 10 moyennes, 11 grandes ; une catégorie de 0 sous-catégorie reste visible dans les petites avec son état incomplet.
- Tester l’empaquetage à capacité 18 : 3+5 petites dans une colonne ; 8+8 et 8+10 moyennes dans une colonne ; 10+10 dans deux colonnes ; chaque grande dans sa propre colonne, la plus longue à droite. Vérifier la stabilité de l’ordre des égalités.
- Vérifier que les colonnes gardent leur regroupement par taille sans afficher de titre de groupe ni de compteur de lignes.
- Vérifier les colonnes de largeur égale, l’absence de colonne vide et le retour à B lorsque D ne peut pas conserver une largeur lisible, sans débordement horizontal.
- À 375px, vérifier une seule colonne, cartes ouvertes au premier affichage, clic/touche sur l’en-tête entier pour replier/déplier, chevron à gauche, totaux à droite, espacement unique de 16px, et raccourci qui rejoint et rouvre la carte correspondante.
- Après défilement mobile, vérifier que les raccourcis restent visibles sous la topbar sticky et ne masquent ni le focus ni l’en-tête de la carte ciblée. Le bandeau d’allocation doit défiler normalement.
- Vérifier que la scrollbar de la rangée de raccourcis n’est pas affichée en clair ou en sombre, sans perdre le défilement horizontal ni l’accès clavier.
- Vérifier que l’en-tête de carte se distingue du corps en clair et en sombre par les tokens de surface/bordure.
- Vérifier les libellés accessibles et les traductions FR/EN, y compris les textes transmis à `ProgressBar`.

### Critères d’acceptation
- Le bandeau d’allocation reste présent au-dessus de la table et continue de lire ses seules valeurs depuis `BudgetService.monthSummary`.
- Desktop suit D, avec cartes de largeur égale, groupes dans l’ordre petites → moyennes → grandes, grandes seules à droite et plus grande en dernière position. Les en-têtes restent visibles pendant le défilement.
- Desktop conserve le classement interne mais n’affiche ni le nom des groupes ni le nombre de lignes.
- Mobile suit B en une colonne ; toutes les cartes sont ouvertes au départ, repliables par leur en-tête entier, et accessibles par les raccourcis sticky sous la topbar. Le bandeau d’allocation reste non sticky.
- Les raccourcis n’affichent pas de scrollbar décorative dans les deux thèmes, mais demeurent défilables au toucher/trackpad et navigables au clavier.
- L’écart vertical entre cartes mobiles est de 16px au total ; l’en-tête de carte est perceptiblement distinct des lignes par les tokens existants.
- Prévu et réel sont visibles au niveau catégorie et sous-catégorie ; les montants income ont le signe `+`, les dépenses `−`, les zéros aucun signe. Tous les montants restent des entiers en centimes et passent par `MoneyPipe`.
- Les statuts et progressions proviennent des résumés existants ; aucune formule d’agrégation ou conversion monétaire n’est dupliquée dans le composant.
- Une catégorie sans sous-catégorie est visiblement signalée ; aucune chaîne UI n’est codée en dur et aucun mock n’est importé par le composant.
- Validation visuelle à 375px et desktop, en thèmes clair et sombre, sans chevauchement ni débordement horizontal.
- `npx tsc -p tsconfig.app.json --noEmit`, `npx tsc -p tsconfig.spec.json --noEmit`, `npm run build` et `npx ng test --no-watch` passent. Aucun lint n’est demandé : il n’est pas configuré dans le dépôt.
- Aucun nouveau package, `any`, `$any`, cast `as`, changement d’API publique ou modification hors périmètre.

### Hors périmètre pour cette tâche
- Saisie/modification inline du prévu : TASK-012.
- Solde d’ouverture et ajustement manuel : TASK-013.
- Ouverture automatique du mois, changement des services/modèles/mocks, création ou édition de catégories/sous-catégories.
- Réduction du dépassement de budget SCSS : avertissement accepté pour TASK-011, à reprendre dans une tâche de nettoyage ultérieure.
- Changement des marges ou du max-width du conteneur global ; à revoir après cette tâche dans une tâche de layout transverse.
- Contrôle de choix de disposition dans l’application : D est le desktop retenu, B le mobile ; les sélecteurs de la maquette ne sont pas repris en production.
- Sauvegarde de l’état replié, tri personnalisé, filtres, recherche, export et défilement interne à une carte.

### Références
- `.ai/roadmap.md` § 4, tâche 11.
- `.ai/design/budget-month-layouts.html` : maquette visuellement validée, D desktop et B mobile.
- `src/app/models/budget-summary.ts` et `src/app/services/budget.ts` : contrats `BudgetMonthSummary`, `BudgetCategorySummary` et `BudgetSubcategorySummary`.
- `src/app/components/ui/progress-bar/progress-bar.ts` : entrées obligatoires, taux et statut.
- `.ai/domain-model.md` § 2–3 : prévu au niveau sous-catégorie, agrégats et statut sans prévu.
- `DESIGN_SYSTEM.md` § 2, § 4.1, § 5.3, § 6 et § 8 : îles, signes, nombres tabulaires, tokens, sémantique et accessibilité.
- `AGENTS.md` : signaux, aucun mock dans un composant, i18n FR/EN, montants en centimes, mobile-first.
