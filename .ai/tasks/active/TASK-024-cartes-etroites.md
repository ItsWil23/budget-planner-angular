## Tâche — cartes étroites sous 340px : noms de catégories et sous-catégories
Lot : suivis du Lot 1 (`roadmap.md` § 4, « Cartes sous 340px »)
Statut : proposée le 2026-11-17, en attente d'un choix d'affichage puis de validation
Branche : `feat/card-narrow-labels`

### Contexte
Sur Budget Mensuel, chaque carte réserve deux colonnes de montants (Prévu et Réel, 6,5 rem chacune). Sous environ 375px, la colonne du nom devient très étroite. Mesure navigateur, page avec les données de démonstration :

| Largeur de la fenêtre | Largeur de la carte | Largeur du nom de sous-catégorie | Effet actuel |
|---|---|---|---|
| 320px | 289px | 31px | « Salaire » coupé lettre par lettre sur 42px de haut |
| 340px | 309px | 51px | mots coupés lettre par lettre |
| 375px | 344px | 86px | lisible |

Le style actuel (`overflow-wrap: anywhere` sur `.card-name` et `.line-name`) autorise la coupure à n'importe quel caractère, même quand un espace permettrait un retour à la ligne normal.

### Décision à valider
Choisir le comportement des noms étroits :

1. **Troncature sur une ligne** : `white-space: nowrap` et `text-overflow: ellipsis`, avec le nom complet dans un attribut `title`. À 340px, « Salaire » tient en environ 3 caractères : information très réduite.
2. **Deux lignes maximum** : retour à la ligne aux espaces, puis troncature à la deuxième ligne (`-webkit-line-clamp: 2`) ; coupure dans un mot seulement si le mot seul ne tient pas (`overflow-wrap: break-word`). Un mot long reste coupé.
3. **Montants sous le nom sous le seuil** : le nom occupe toute la largeur de la carte, les montants passent sur une seconde ligne. Option hors de la formulation de la roadmap, proposée pour comparaison ; touche le gabarit de ligne et d'en-tête.

Avis du PM : l'option 1 masque trop d'information à cette largeur. L'option 3 est la seule qui garde un nom lisible à 320px et 340px ; l'option 2 est le compromis le plus simple.

### Ce qu'il faut faire (après choix)
1. Appliquer le comportement choisi à `.card-name` et `.line-name` dans `budget-mensuel.scss`, uniquement sous le seuil choisi. Écrire le style de base d'abord, puis la règle conditionnelle (mobile-first) avec `@container budget-card` ; seuil fixé après mesure.
2. Option 1 uniquement : ajouter `[title]` avec le nom complet dans `budget-mensuel.html`.
3. Option 3 uniquement : réorganiser le gabarit de ligne et d'en-tête dans `budget-mensuel.html` sous le seuil, sans changer le rendu au-dessus.
4. Ajouter dans `budget-mensuel.spec.ts` les vérifications de gabarit propres au choix (présence de `title`, ou classe/structure). La mise en page n'est pas calculée par jsdom : elle est vérifiée dans le navigateur.

### Fichiers concernés
- `src/app/pages/budget-mensuel/budget-mensuel.scss`
- `src/app/pages/budget-mensuel/budget-mensuel.html` (option 1 et option 3)
- `src/app/pages/budget-mensuel/budget-mensuel.spec.ts`

### Critères d'acceptation
- Aucun mot n'est coupé lettre par lettre dans une carte à 320px, 340px et 375px.
- Un nom long (sous-catégorie ajoutée temporairement via les mocks, puis restaurée avec `git checkout`) se comporte selon le choix retenu.
- Au-dessus du seuil, le rendu est identique à la version actuelle (mesures comparées avant et après).
- Aucun débordement horizontal à 320px, 340px et 375px.
- Montants toujours en `tabular-nums` ; aucune dépense colorée en rouge par défaut (inchangé).
- Vérifié en thème clair et sombre, en mobile et en desktop.
- Tests `budget-mensuel` verts ; suite complète, build et `git diff --check` verts.

### Hors périmètre
- Validation sur appareil réel (reportée, `roadmap.md` § 4).
- Colonnes de montants au-dessus du seuil, grille et largeur des cartes (TASK-021 et TASK-022).
- Composant `category-card` (page Catégories), non concerné par Budget Mensuel.
- Services, modèles, mocks et logique de données.
- Autres noms tronqués hors cartes (dialogue de règles, déjà traité par TASK-020 et TASK-023).

### Références
- `roadmap.md` § 4, « Cartes sous 340px ».
- `AGENTS.md` : mobile-first réel, valeurs de design issues des tokens.
- `DESIGN_SYSTEM.md` : tokens de texte (`--text-body`, `--text-emphasis`) et d'espacement.
