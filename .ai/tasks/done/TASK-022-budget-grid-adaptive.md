## Tâche — grille adaptative des catégories selon la largeur
Lot : suivi Budget Mensuel (`roadmap.md` § 4, grille/CSS)
Statut : validée le 2026-11-17, implémentée sur `feat/budget-grid-adaptive`.
Branche : `feat/budget-grid-adaptive`. Implémentation après le merge de la PR #61 (TASK-021), une tâche en revue à la fois.

### Contexte
Mesures du 2026-11-17 avec le regroupement actuel :
- 10 catégories (5 colonnes de regroupement) : grille groupée seulement à 2560 px ; à 1920 px, bascule en colonnes équilibrées.
- 22 catégories : colonnes équilibrées à toutes les largeurs desktop, groupes perdus.

La décision produit du 2026-11-06 (`product-vision.md`) demande que les cartes s'adaptent au nombre de colonnes offert par la largeur, en gardant les groupes petite / moyenne / grande.

### Règles
1. **Colonnes possibles** : `N_max = min(5, floor((W + 16) / 336))`, avec W la largeur du conteneur desktop, 336 = 320 px minimum par colonne + espace de 16 px. Si `N_max < 2`, colonnes équilibrées.
2. **Groupes** : petites (ordre d'entrée), moyennes (ordre d'entrée), grandes (lignes croissantes). Un groupe ne se mélange jamais avec un autre dans une même colonne.
3. **Grandes** : chacune occupe une colonne et n'est jamais fusionnée.
4. **Bascule** : si `L + [petites présentes] + [moyennes présentes] > N_max` (L = nombre de grandes), toute la grille passe en colonnes équilibrées.
5. **Réduction** : on part du regroupement actuel (`buildCategoryColumns`). Tant qu'il y a plus de `N_max` colonnes, on fusionne deux colonnes adjacentes de même groupe (petites ou moyennes), en choisissant la paire dont la somme de lignes est la plus petite. Les limites de 3 petites, 2 moyennes et 18 lignes deviennent des cibles : une fusion peut les dépasser.
6. **Pas de division** : le nombre de colonnes ne dépasse jamais `N_max` et ne monte pas artificiellement quand la largeur augmente (« jusqu'à 5 »).
7. **Mobile** (sous 1024 px) : inchangé, colonnes équilibrées.

### Interprétations à confirmer
- « Le nombre de colonnes s'adapte à la largeur » est réalisé par fusion de colonnes, sans division.
- Les limites 3 / 2 / 18 ne sont relâchées que par fusion.

### Ce qu'il faut faire
1. Ajouter dans `budget-mensuel.ts` une fonction pure qui, à partir des catégories et de `N_max`, retourne soit des colonnes groupées, soit le mode équilibré. Elle réutilise `buildCategoryColumns`.
2. Calculer `N_max` à partir de `hostWidth` dans le `computed` de disposition, en desktop seulement.
3. Adapter `--column-count` au nombre effectif de colonnes. Le SCSS garde `minmax(0, var(--card-max))` avec `--card-max: 30rem`.
4. Tests unitaires : fusions de même groupe uniquement, grandes non fusionnées, nombre de colonnes ≤ `N_max`, ordre conservé, bascule dans les cas `L > N_max` et `N_max < 2`.
5. Vérification navigateur à 1024, 1280, 1600, 1920 et 2560 px avec 4, 10 et 22 catégories, en thème clair et sombre. Restaurer les mocks après les tests.

### Fichiers concernés
- `src/app/pages/budget-mensuel/budget-mensuel.ts`
- `src/app/pages/budget-mensuel/budget-mensuel.scss` (si nécessaire)
- `src/app/pages/budget-mensuel/budget-mensuel.spec.ts`

### Critères d'acceptation
- À chaque largeur desktop, le nombre de colonnes est ≤ `min(5, N_max)` et diminue quand la largeur diminue.
- En mode colonnes, groupes et ordre sont conservés et aucune colonne n'est vide.
- La bascule en colonnes équilibrées n'a lieu que si la condition 4 est vraie.
- Aucun débordement horizontal ; cartes ≤ 30rem.
- Tests du projet verts ; avertissements SCSS non augmentés.

### Hors périmètre
- Division de colonnes pour remplir la largeur.
- Mobile.
- Menu des règles récurrentes (TASK-023).
- Noms de catégorie sous 340 px.

### Références
- `product-vision.md`, décision du 2026-11-06 (cartes adaptées à la largeur, groupes conservés).
- `.ai/tasks/done/TASK-011-lot1-budget-monthly-table.md` (capacité, groupes, ordre, bascule).
- `.ai/tasks/done/TASK-021-budget-mensuel-grille.md` (plafond de carte à 30rem).

### Suivi de livraison — 2026-11-17
- Implémentation commitée dans `361ec25` (`feat: adapt budget category columns to available width`), sur `feat/budget-grid-adaptive`.
- PR vers `main` ouverte, en attente de fusion.
- Règles appliquées : nombre de colonnes selon la largeur (cinq au maximum), fusion des colonnes adjacentes de même groupe, grandes catégories jamais fusionnées, bascule en colonnes équilibrées si les grandes et les groupes présents ne tiennent pas.
- Validations : deux typechecks, 580 tests, build (avertissements SCSS préexistants), `git diff --check`. Vérification navigateur : 4 catégories de base (2 colonnes, cartes à 480 px centrées), 10 catégories (équilibrées à 1024 à 1600 px, 4 colonnes à 1920 px, 5 à 2560 px), 22 catégories (équilibrées partout). Rendu validé par l'utilisateur.
- Lint non configuré, non exécuté.
