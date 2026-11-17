## Tâche — cartes étroites sous 340px : noms de catégories et sous-catégories
Lot : suivis du Lot 1 (`roadmap.md` § 4, « Cartes sous 340px »)
Statut : livrée et validée le 2026-11-17 (option 2, `hyphens: auto`, synchronisation de `lang`) ; PR en attente de fusion
Branche : `feat/card-narrow-labels`

### Contexte
Sur Budget Mensuel, chaque carte réserve deux colonnes de montants (Prévu et Réel, 6,5 rem chacune). Sous environ 375px, la colonne du nom devient très étroite. Mesure navigateur, page avec les données de démonstration :

| Largeur de la fenêtre | Largeur de la carte | Largeur du nom de sous-catégorie | Effet actuel |
|---|---|---|---|
| 320px | 289px | 31px | « Salaire » coupé lettre par lettre sur 42px de haut |
| 340px | 309px | 51px | mots coupés lettre par lettre |
| 375px | 344px | 86px | lisible |

Le style actuel (`overflow-wrap: anywhere` sur `.card-name` et `.line-name`) autorise la coupure à n'importe quel caractère, même quand un espace permettrait un retour à la ligne normal.

### Décision
Option 2 retenue le 2026-11-17, avec `hyphens: auto` et synchronisation de l'attribut `lang` avec la langue active. Les options 1 et 3 sont écartées ; elles restent listées pour mémoire.

Coupure constatée à 51px (police réelle 14px) : « Électricité » devient « Électric » / « ité », donc un mot trop long reste coupé ; `hyphens: auto` vise une coupure à la syllabe avec tiret.

Options :

1. **Troncature sur une ligne** : `white-space: nowrap` et `text-overflow: ellipsis`, avec le nom complet dans un attribut `title`. À 340px, « Salaire » tient en environ 3 caractères : information très réduite.
2. **Deux lignes maximum** : retour à la ligne aux espaces, puis troncature à la deuxième ligne (`-webkit-line-clamp: 2`) ; coupure dans un mot seulement si le mot seul ne tient pas (`overflow-wrap: break-word`). Un mot long reste coupé.
3. **Montants sous le nom sous le seuil** : le nom occupe toute la largeur de la carte, les montants passent sur une seconde ligne. Option hors de la formulation de la roadmap, proposée pour comparaison ; touche le gabarit de ligne et d'en-tête.

Avis du PM : l'option 1 masque trop d'information à cette largeur. L'option 3 est la seule qui garde un nom lisible à 320px et 340px ; l'option 2 est le compromis le plus simple.

### Ce qu'il faut faire
1. Dans `budget-mensuel.scss`, appliquer `overflow-wrap: break-word`, `hyphens: auto` et une limite de deux lignes à `.card-name` et `.line-name`. `.card-name` est un conteneur flex, où la limite de lignes ne s'applique pas : le texte passe par un enfant `.card-name-text`.
2. Dans `budget-mensuel.html`, envelopper le nom de catégorie dans un enfant `.card-name-text`. Pas d'attribut `title` (option 1 écartée).
3. Synchroniser l'attribut `lang` de `<html>` avec la langue active de Transloco, dans `src/app/app.ts` (et non dans les réglages). `src/index.html` garde `lang="en"` comme valeur de départ, remplacée au démarrage.
4. Tests : `budget-mensuel.spec.ts` (structure `.card-name-text`, nom complet conservé) et `app.spec.ts` (`lang` suit la langue active). La mise en page n'est pas calculée par jsdom : elle est vérifiée dans le navigateur.

### Fichiers concernés
- `src/app/pages/budget-mensuel/budget-mensuel.scss`
- `src/app/pages/budget-mensuel/budget-mensuel.html`
- `src/app/app.ts` et `src/app/app.spec.ts` (synchronisation de `lang`)
- `src/app/pages/budget-mensuel/budget-mensuel.spec.ts`

### Critères d'acceptation
- Aucun mot n'est coupé hors syllabe dans une carte à 320px, 340px et 375px ; un mot trop long est coupé avec tiret, et le texte est limité à deux lignes avec « … ».
- L'attribut `lang` de la page suit la langue active (FR puis EN, vérifié dans le navigateur).
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

### Suivi de livraison — 2026-11-17
- Commits : `9367afa` (synchronisation de `lang` dans `app.ts`), `f7e0947` (noms de cartes sur deux lignes), `94238e8` et `f659cbe` (spec et décision).
- Validations : suite complète 591 tests verts ; build OK, avertissements SCSS préexistants uniquement ; `git diff --check` OK ; navigateur à 320, 340, 375 et 1280px : limite à deux lignes, pas de débordement, `lang="fr"`.
- Écarts : le trait d'union de `hyphens: auto` n'apparaît pas dans le Chromium de test (le côté mot coupé reste visible) ; à vérifier dans les navigateurs de l'utilisateur. Le code a été commité avant l'autorisation explicite, ce qui ne respecte pas le § 2 étape 9 du workflow.
- Validation utilisateur : « je valide » puis « tu peux clôturer » (2026-11-17).
