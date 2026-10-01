## Tâche : Fondations des tokens de design — activation (theme.ts + index.html)
Lot : 0

### Contexte
`src/styles.scss` définit déjà les tokens sous les sélecteurs `[data-theme='dark']` / `[data-theme='light']`
combinés à `[data-palette='terracotta']` (tâche précédente, validée). Ils sont actuellement inertes : rien ne pose
ces attributs sur `<html>`. Cette tâche active visuellement le design system.

### Ce qu'il faut faire

1. `src/app/services/theme.ts` :
   - Remplacer `this.document.documentElement.classList.toggle('dark', themeMode === 'dark');` par la pose d'un
     attribut : `this.document.documentElement.setAttribute('data-theme', themeMode);`
   - Changer la valeur initiale du signal `_themeMode` de `'light'` à `'dark'` (décision produit actée :
     thème sombre par défaut).
   - Ne rien changer d'autre : le nom du signal (`theme`), la méthode `toggleTheme()` et son comportement
     (bascule light/dark) restent identiques.

2. `src/app/services/theme.spec.ts` :
   - Le fichier actuel ne contient qu'un test « should be created ». Ajouter deux tests :
     - Après création du service, `document.documentElement.getAttribute('data-theme')` vaut `'dark'` (valeur
       par défaut).
     - Après un appel à `toggleTheme()`, l'attribut passe à `'light'`, puis à nouveau à `'dark'` après un second
       appel.
   - Ne pas laisser de test qui vérifie encore une classList `.dark` — ce mécanisme n'existe plus.

3. `src/index.html` :
   - Ajouter l'attribut `data-palette="terracotta"` sur la balise `<html>` existante (statique pour cette tâche —
     le sélecteur de palette dynamique dans les paramètres est une tâche du lot 5, pas de celle-ci).
   - Ne touche à rien d'autre dans ce fichier (les balises de police Google Fonts actuelles restent en l'état,
     c'est une tâche séparée du lot 0).

### Fichiers concernés
`src/app/services/theme.ts`, `src/app/services/theme.spec.ts`, `src/index.html`

### Critères d'acceptation
- `npm test` passe, avec les deux nouveaux tests verts.
- `npm start` : `<html>` porte `data-theme="dark"` et `data-palette="terracotta"` au chargement (vérifiable dans
  les DevTools), plus aucune classe `.dark` nulle part.
- Le bouton de bascule de thème (`ThemeSwitch`) fait toujours passer l'interface de sombre à clair et vice versa.
- Les couleurs définies dans `styles.scss` (fond, cartes, texte, accent terracotta) s'appliquent maintenant
  visuellement sur tous les écrans existants, dans les deux thèmes.

### Hors périmètre pour cette tâche
- Le sélecteur de palette (5 options) et son stockage dans les paramètres — lot 5.
- Le remplacement de la police par Plus Jakarta Sans (les balises Google Fonts actuelles restent) — tâche séparée
  du lot 0.
- La disposition en cartes flottantes / navigation en île / topbar — tâche suivante du lot 0.
- Toute modification de composant au-delà des 3 fichiers listés.

### Références
DESIGN_SYSTEM.md § 2 (disposition), § 4.4 (palettes) · product-vision.md § 12 (thème sombre par défaut)

### Rappel de convention
Message de commit en anglais, format Conventional Commits (ex. `feat(theme): apply data-theme/data-palette
attributes instead of dark class`).
