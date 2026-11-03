## Tâche : tokens sémantiques du thème clair et validation de `--color-warn`
Lot : 1 (`roadmap.md` § 4, tâche 8)
Branche : `feat/lot1-light-semantic-colors` (créée depuis `main` à jour)

### Contexte
Les valeurs claires des tokens sémantiques et `--color-warn` ont été validées par l'utilisateur dans
`.ai/design/palettes.html` le 2026-11-03 et sont documentées dans `DESIGN_SYSTEM.md` § 4.3 et
`.ai/product-vision.md` § 13. Il reste à appliquer les tokens clairs à l'application et vérifier le rendu réel.

### Valeurs validées
- Clair :
  - `--color-income: #15803d`
  - `--color-ok: #15803d`
  - `--color-ok-soft: rgba(21, 128, 61, 0.12)`
  - `--color-over: #c93c37`
  - `--color-over-soft: rgba(201, 60, 55, 0.10)`
  - `--color-warn: #946000`
  - `--color-warn-soft: rgba(148, 96, 0, 0.10)`
- Sombre : conserver les valeurs actuelles, dont `--color-warn: #e8c56b`.
- Ces tokens sont sémantiques et ne changent pas selon `data-palette`.
- Contraste calculé contre `--surface-card: #ffffff` : income 5.02:1, over 5.02:1, warn 5.34:1.

### Ce qu'il faut faire
1. Dans `src/styles.scss`, appliquer les sept valeurs sémantiques claires dans `[data-theme='light']`. Ne pas
   modifier les valeurs sombres existantes ni définir ces tokens dans des blocs de palette.
2. Garder `.ai/design/palettes.html` comme aperçu local des états `under`, `on-track` et `over` en thèmes clair
   et sombre, avec les pastilles incluant `warn`. Le fichier contient déjà le prototype visuel validé ; ne pas
   remplacer son contenu ni toucher aux autres maquettes.
3. Vérifier visuellement le thème clair et sombre dans l'application : le revenu doit être lisible dans la liste
   Transactions et garder la même sémantique; les tokens `ok`, `warn`, `over` doivent être corrects dans la
   prévisualisation de progression. Pas de changement de layout ni de composant dans cette tâche.

### Modifications documentaires déjà faites par le PM sur cette branche
- `DESIGN_SYSTEM.md` § 4.3 contient les valeurs sombres et claires, le contraste calculé et la validation visuelle
  de `--color-warn`.
- `.ai/product-vision.md` § 13 consigne les valeurs sémantiques claires validées.
- `.ai/roadmap.md` référence désormais la tâche 7 à la PR #44. L'IA dev ne modifie aucun de ces trois documents.

### Fichiers concernés
- Modifier par l'IA dev : `src/styles.scss` uniquement.
- Documents et maquette déjà modifiés par le PM : `DESIGN_SYSTEM.md` § 4.3, `.ai/product-vision.md` § 13,
  `.ai/roadmap.md`, `.ai/design/palettes.html` (aperçu des trois états).
- Ne pas modifier : modèles, services, tests applicatifs, pages, composants, `package.json`, `package-lock.json`.

### Critères d'acceptation
- En thème clair, les sept tokens sémantiques ont exactement les valeurs validées ci-dessus.
- En thème sombre, toutes les valeurs sémantiques existantes sont inchangées.
- Aucune valeur sémantique ne varie selon `data-palette`.
- Le thème clair est vérifié sur l'application (notamment le revenu dans Transactions) et le thème sombre reste cohérent.
- `.ai/design/palettes.html` présente déjà les trois états `under`, `on-track` et `over` pour les thèmes clair et sombre ; `warn` est identifiable dans sa rangée de pastilles.
- `DESIGN_SYSTEM.md` § 4.3 et `.ai/product-vision.md` § 13 consignent déjà les valeurs et la décision ; l'IA dev ne modifie pas ces fichiers.
- `npx tsc -p tsconfig.app.json --noEmit` et `npx tsc -p tsconfig.spec.json --noEmit` : code 0.
- `npm run build` passe. Seul avertissement autorisé : le budget SCSS connu de `category-card.scss`.
- `npx ng test --no-watch` : tout vert, aucun test supprimé.
- Aucun `any`, `$any` ou cast `as` ajouté. Aucune dépendance ajoutée.

### Hors périmètre pour cette tâche
- Composant `ui/progress-bar` : tâche 9.
- Modification des couleurs sémantiques sombres, des palettes, des couleurs catégorielles ou de l'accent.
- Ajout des classes d'état à une page applicative : la progression n'est pas encore implémentée.
- Traductions, formatage monétaire, `LOCALE_ID` dynamique.

### Références
- `DESIGN_SYSTEM.md` § 4.1 (sémantique revenu/dépense/santé budgétaire), § 4.2 (luminance), § 4.3 (tokens), § 7 (états).
- `.ai/domain-model.md` § 3 (seuils des statuts).
- `AGENTS.md` : tokens sémantiques, mobile-first et pas de texte dur dans les templates.
- `.ai/roadmap.md` § 4, Lot 1, tâche 8.
