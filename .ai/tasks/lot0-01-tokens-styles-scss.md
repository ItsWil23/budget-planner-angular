## Tâche : Fondations des tokens de design — styles.scss uniquement
Lot : 0

### Contexte
Le design system (DESIGN_SYSTEM.md, déjà en lecture) définit une nouvelle structure de tokens qui remplace les
tokens emerald/slate actuels de `src/styles.scss`. Cette tâche ne touche QUE ce fichier.

### Ce qu'il faut faire

1. Remplacer entièrement le bloc de tokens actuel (`:root { ... }` et `.dark { ... }`) par la structure suivante,
   basée sur des attributs plutôt que des classes :

   - Sélecteurs `[data-theme='dark']` et `[data-theme='light']`, combinés à `[data-palette='terracotta']`
     (une seule palette pour cette tâche).
   - Couleurs sémantiques invariantes (mêmes valeurs dans toutes les palettes, donc pas besoin de les répéter par
     palette) :
     ```css
     --color-income: #7dd3a0;        /* clair : #15803d */
     --color-ok: #7dd3a0;            /* clair : #15803d */
     --color-ok-soft: rgba(125,211,160,.14);
     --color-over: #f17c7c;          /* clair : #c93c37 */
     --color-over-soft: rgba(241,124,124,.15);
     --color-warn: #e8c56b;
     --color-warn-soft: rgba(232,197,107,.14);
     ```
   - Valeurs exactes de la palette terracotta (à reprendre telles quelles) :
     ```css
     [data-theme='dark'][data-palette='terracotta'] {
       --surface-page: #0a0809; --surface-app: #0f0e10; --surface-card: #1b181b; --border: #2f2a2e;
       --text-primary: #eae7e8; --text-muted: #94898d;
       --color-accent: #e8926b; --color-accent-soft: rgba(232,146,107,.15);
     }
     [data-theme='light'][data-palette='terracotta'] {
       --surface-page: #f0eaea; --surface-app: #fbfbfd; --surface-card: #ffffff; --border: #e7e7ee;
       --text-primary: #15151c; --text-muted: #6a6a78;
       --color-accent: #c2562a; --color-accent-soft: rgba(194,86,42,.10);
     }
     ```
   - Échelle d'espacement, rayons, durées (mêmes valeurs dans les deux thèmes) :
     ```css
     --space-xs: 4px; --space-sm: 8px; --space-md: 12px; --space-lg: 16px;
     --space-xl: 20px; --space-2xl: 28px; --space-3xl: 40px;
     --radius-sm: 9px; --radius-md: 14px; --radius-lg: 18px; --radius-full: 999px;
     --border-width: 1px;
     --duration-fast: 120ms; --duration-base: 200ms; --duration-slow: 320ms;
     --ease-standard: cubic-bezier(.2, 0, 0, 1);
     ```
   - Tokens typographiques (taille + graisse) :
     ```css
     --text-label: 500 11px/1.3 var(--font-body); letter-spacing: .09em;
     --text-caption: 400 12px/1.4 var(--font-body);
     --text-body: 400 14px/1.5 var(--font-body);
     --text-emphasis: 600 15px/1.4 var(--font-body);
     --text-heading: 600 20px/1.3 var(--font-body);
     --num-caption: 400 12px/1.4 var(--font-body);
     --num-body: 500 14px/1.4 var(--font-body);
     --num-emphasis: 500 19px/1.3 var(--font-body);
     --num-hero: 400 42px/1 var(--font-body);
     ```
     (`--font-body` n'existe pas encore, garder la pile système actuelle en valeur de repli le temps que la police
     Plus Jakarta Sans soit ajoutée dans une tâche séparée : `--font-body: ui-sans-serif, system-ui, sans-serif;`)

2. **Pont de compatibilité temporaire**, dans le même fichier, sous un commentaire
   `/* Pont temporaire — anciens noms de tokens encore utilisés dans les composants existants.
   À supprimer au fur et à mesure du restyle écran par écran (roadmap lots 2/4/6). */` :
   redéfinir chaque ancien token ci-dessous comme un alias vers son équivalent le plus proche parmi les nouveaux
   tokens définis au point 1 :

   `--color-bg` → `--surface-app`
   `--color-surface` → `--surface-card`
   `--color-surface-hover` → une couleur légèrement plus claire que `--surface-card` (mélange avec le blanc/noir)
   `--color-border` → `--border`
   `--color-text` → `--text-primary`
   `--color-text-muted` → `--text-muted`
   `--color-text-inverted` → blanc en thème sombre, `--surface-page` en thème clair
   `--color-accent`, `--color-accent-hover`, `--color-accent-soft` → `--color-accent` (garder une variante hover
   légèrement plus foncée/claire selon le thème)
   `--color-expense` → `--text-primary` (une dépense n'est plus rouge par défaut, voir DESIGN_SYSTEM.md § 4.1)
   `--color-danger`, `--color-danger-hover`, `--color-danger-soft` → `--color-over`, une variante plus foncée,
   `--color-over-soft`
   `--color-action-edit`, `--color-action-edit-hover`, `--color-action-edit-surface` → `--color-accent` et ses
   variantes
   `--shadow-card`, `--shadow-elevated`, `--shadow-md` → `none` (aucune ombre dans le nouveau design system)
   `--spacing-xs` → `--space-xs`, `--spacing-sm` → `--space-sm`, `--spacing-md` → `--space-md`,
   `--spacing-lg` → `--space-lg`, `--spacing-lm` → `--space-xl`, `--spacing-xl` → `--space-2xl`
   `--font1` → `--num-hero` (taille seule, ex. `42px`), `--font2` → `--text-heading` (taille seule, `20px`),
   `--font4` → `--text-emphasis` (taille seule), `--font5` → `--text-caption` (taille seule)

   Ainsi que ces tokens utilisés dans le code mais introuvables actuellement (défaut latent à corriger) :
   `--color-text-primary` → `--text-primary`
   `--color-text-secondary` → `--text-muted`
   `--color-surface-secondary` → `--surface-app`
   `--color-surface-tertiary` → une couleur encore un cran plus claire que `--surface-app`
   `--color-income-surface` → `--color-ok-soft`

3. Ne pas modifier `--radius-sm/md/lg/full` par rapport à ce qui existe déjà si les valeurs actuelles sont proches
   de celles du point 1 — sinon les remplacer par les nouvelles.

### Fichiers concernés
`src/styles.scss` uniquement. Ne touche à aucun autre fichier.

### Critères d'acceptation
- Le fichier compile (`npm start` ne doit montrer aucune erreur SCSS).
- `<html>` peut recevoir `data-theme="dark"` et `data-palette="terracotta"` et afficher les bonnes couleurs (même
  si ces attributs ne sont pas encore posés par le code — ce sera fait dans une tâche séparée sur `theme.ts`).
- Aucun ancien nom de token utilisé dans les autres fichiers `.scss` du projet n'est laissé sans définition.

### Hors périmètre pour cette tâche
- Ne touche pas à `theme.ts`, `theme.spec.ts`, ni `index.html` — tâches séparées.
- Ne migre aucun fichier `.scss` de composant vers les nouveaux noms de tokens.
- N'ajoute pas les 4 autres palettes (seule « terracotta » est nécessaire ici).
- N'ajoute pas la police Plus Jakarta Sans (garde la pile système en valeur de `--font-body`).
