## Tâche — répartition des catégories du Budget Mensuel sur grand écran
Lot : suivi décidé après le Lot 1 (`roadmap.md` § 4, « Budget Mensuel — grille/CSS »)
Statut : validée le 2026-11-16, implémentée sur `feat/budget-mensuel-grid`.
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

### Suivi de livraison — 2026-11-16
- Implémentation commitée dans `53621f4` (`feat: cap budget category cards on wide screens`).
- Mesures après implémentation : à 1920 et 2560 px, cartes plafonnées à 640 px et groupe centré (marges égales de 140 px et 460 px). À 1024, 1280 et 1600 px, rendu inchangé (cartes de 325 à 620 px). À 375 px, aucun changement ni débordement.
- Thèmes clair et sombre vérifiés à 2560 px.
- Ajustement du 2026-11-17 : plafond ramené de 40rem à 30rem (480 px), groupe toujours centré (marges de 300 px à 1920 px et 620 px à 2560 px).
- Nettoyage SCSS : seule règle morte trouvée, `.manager-placeholder`, supprimée. Les autres sélecteurs servent aux modes `columns` et `balanced`.
- Reliquat : `budget-mensuel.scss` reste au-dessus du budget de 4 kB (7,02 kB au lieu de 7,03 kB) ; ce gain n'a pas été chassé au-delà du nettoyage sans perte de rendu, à traiter dans une tâche dédiée si nécessaire.
- Validations : deux typechecks, 573 tests sur 35 fichiers, build (avertissements SCSS préexistants), `git diff --check`.
