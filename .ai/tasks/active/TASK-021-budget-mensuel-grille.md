## Tâche — répartition des catégories du Budget Mensuel sur grand écran
Lot : suivi décidé après le Lot 1 (`roadmap.md` § 4, « Budget Mensuel — grille/CSS »)
Statut : proposée le 2026-11-16, en attente de validation
Branche : `feat/budget-mensuel-grid`

### Contexte
Mesure du 2026-11-16 avec quatre catégories : deux colonnes à toutes les largeurs desktop (1024, 1280, 1600, 1920 et 2560 px). Le nombre de colonnes vient du regroupement par taille (`buildCategoryColumns`), pas de la largeur disponible. À 2560 px, chaque carte fait 1100 px de large et s'étire excessivement.

### Décisions validées
- Le regroupement reste inchangé : mêmes groupes, même ordre, même nombre de colonnes.
- Sur grand écran, chaque carte est plafonnée à 40rem (640 px) et le groupe de colonnes est centré.

### Ce qu'il faut faire
1. Plafonner la largeur des cartes en desktop à 40rem, via un token local dans `:host` (même convention que `--kpi-group-max`) ; centrer le groupe de colonnes.
2. Ne pas modifier `buildCategoryColumns` ni son ordre de sortie.
3. Nettoyer le SCSS par suppressions mesurées : repérer les règles mortes ou redondantes entre le mode `columns` (grille) et le mode `balanced` (colonnes CSS). Supprimer par étapes, en vérifiant le rendu après chaque étape.
4. Réduire les avertissements de budget SCSS de `budget-mensuel.scss` et `category-card.scss` si la suppression le permet ; sinon documenter le reliquat dans la PR.

### Fichiers concernés
- `src/app/pages/budget-mensuel/budget-mensuel.scss` (principal)
- `src/app/pages/budget-mensuel/budget-mensuel.html` seulement si une classe doit être ajoutée
- `src/app/components/ui/category-card/category-card.scss` seulement pour le budget SCSS
- `src/app/pages/budget-mensuel/budget-mensuel.spec.ts` si un test de disposition est ajouté

### Critères d'acceptation
- À 1024, 1280, 1600, 1920 et 2560 px : aucune carte de catégorie ne dépasse 40rem (640 px), et le groupe est centré.
- Aucun débordement horizontal à 375 px ni aux largeurs ci-dessus.
- Les tests existants de `buildCategoryColumns` et de la disposition passent sans modification de leur intention.
- Rendu vérifié en thème clair et sombre, avant/après suppression.
- Les avertissements de budget SCSS ne sont pas augmentés.

### Hors périmètre
- Noms de catégorie sous 340px (suivi distinct).
- Filtre mensuel des transactions (Lot 2).
- Changement de l'algorithme de regroupement.
- Changement de la disposition mobile (sous 1024px) au-delà de la suppression de règles mortes.

### Références
- `roadmap.md` § 4, « Suivis décidés après le Lot 1 ».
- `DESIGN_SYSTEM.md` : tokens d'espacement et de taille.
- `AGENTS.md` : mobile first, pas de valeur brute dans les composants (token local documenté dans `:host`, comme `--kpi-group-max`).
