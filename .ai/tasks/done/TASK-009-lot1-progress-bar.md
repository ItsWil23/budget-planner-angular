## Tâche : composant UI `ProgressBar`
Lot : 1 (`roadmap.md` § 4, tâche 9)
Branche : `feat/lot1-progress-bar` (à créer depuis `main` à jour, par l'utilisateur)

### Contexte
La tâche 5 calcule déjà `consumptionRate` et `status` à partir du prévu et du réel. Cette tâche crée le composant
visuel réutilisable qui représente cette progression ; la page Budget Mensuel l'utilisera plus tard (tâche 11).

### Présentation retenue (validée en discussion le 2026-11-03)
- La longueur du remplissage représente le taux de consommation, plafonnée visuellement à 100 %.
- Afficher le pourcentage exact à côté de la barre, y compris au-delà de 100 % (ex. barre pleine et `143 %`).
- Couleur du remplissage selon `under` / `on-track` / `over`, via `--color-ok`, `--color-warn`, `--color-over`.
- Pas de badge ni de libellé de statut visible. Le statut est fourni dans `aria-valuetext` pour l'accessibilité.
- Quand le prévu vaut 0, `consumptionRate` et `status` sont `undefined` : le parent n'instancie pas le composant ; il affiche séparément le réel non budgété.
- Le prototype `.ai/design/palettes.html` montre déjà les trois états dans les thèmes clair et sombre et a été visuellement validé.
- Épaisseur validée depuis la maquette : 6px. Ajouter un token partagé `--size-progress-track: 6px` plutôt qu'une dimension en dur.

### Ce qu'il faut faire
1. Ajouter `--size-progress-track: 6px` à la section Dimensions / taquets de `src/styles.scss` (`:root`). Ne pas modifier
   les couleurs sémantiques ni les blocs de thème/palette.
2. Créer `src/app/components/ui/progress-bar/progress-bar.ts`, standalone, selector `app-progress-bar` :
   - Inputs requis : `consumptionRate: number`, `status: BudgetLineStatus`, `ariaLabel: string`,
     `ariaValueText: string`.
   - Le parent n'instancie le composant que si `consumptionRate` et `status` sont définis.
   - Pourcentage visible : formatter `consumptionRate` avec `Intl.NumberFormat(settings.locale, { style: 'percent',
     maximumFractionDigits: 0 })`, où `settings` vient du signal de `SettingsService` afin que le label suive le locale.
   - Largeur visuelle : `Math.min(Math.max(consumptionRate, 0), 1) * 100`; remplissage plafonné à 100 %.
   - Valeur accessible numérique : pourcentage arrondi plafonné dans `[0, 100]`.
   - Utiliser un élément avec `role="progressbar"`, `aria-valuemin="0"`, `aria-valuemax="100"`,
     `aria-valuenow` plafonné, `aria-label` reçu en input et `aria-valuetext` reçu en input. `aria-valuetext`
     contient le pourcentage réel et le statut localisé (ex. « 143 % consommé, dépassé »), fourni par le parent.
   - Pas de texte de statut visible ; le texte visible est le pourcentage exact formaté.
   - Classes d'état sur le remplissage selon `status`: `under`, `on-track`, `over`.
3. Créer `src/app/components/ui/progress-bar/progress-bar.html` et `progress-bar.scss`.
   - Utiliser `--size-progress-track` pour la hauteur, `--border` ou `--surface-app` pour le rail, les couleurs
     sémantiques pour le remplissage et `--radius-full` pour les extrémités.
   - Pour le pourcentage, utiliser `--num-caption`, `font-variant-numeric: tabular-nums`, et `--text-muted`.
   - Aucun `px`, couleur, rayon ou taille brut dans le SCSS du composant ; tous les tokens doivent exister.
   - Le contraste et la distinction ne dépendent pas de la palette catégorielle.
4. Créer `src/app/components/ui/progress-bar/progress-bar.spec.ts` (Vitest) : test DOM des trois états,
   du clamp visuel, du pourcentage exact, des attributs ARIA et du changement de locale dans `SettingsService`.
   Conserver la préférence de test du repo : `fixture.componentRef.setInput()` pour les inputs.
5. PM : ajouter `--size-progress-track: 6px` et son rôle dans `DESIGN_SYSTEM.md` § 6. Retirer de § 12 la mention
   historique disant que `--color-warn` n'est pas validé. Mettre à jour la date en-tête.
6. PM : mettre à jour `.ai/roadmap.md` pour TASK-007 (PR #44) et TASK-008 (PR #45) fusionnées ; marquer TASK-009
   comme terminée après revue. L'IA dev ne modifie aucun document `.ai/` ni `DESIGN_SYSTEM.md`.

### Fichiers concernés
- IA dev, créer : `src/app/components/ui/progress-bar/progress-bar.ts`, `progress-bar.html`, `progress-bar.scss`,
  `progress-bar.spec.ts`.
- IA dev, modifier : `src/styles.scss` (token unique).
- PM, modifier sur la branche : `DESIGN_SYSTEM.md` § 6 et § 12, `.ai/roadmap.md` après revue.
- Ne pas modifier : modèles de budget, services, pages, composants existants, `package.json`, `package-lock.json`,
  `.ai/product-vision.md`, `.ai/domain-model.md`.

### Tests obligatoires
- Taux `0.62`, statut `under` : label visible égal au format `Intl.NumberFormat('fr-FR', { style: 'percent', maximumFractionDigits: 0 })` de `0.62`, largeur `62 %`, classe under, ARIA `now=62`.
- Taux `0.89`, statut `on-track` : label égal au même formatage de `0.89`, largeur `89 %`, classe on-track.
- Taux `1.43`, statut `over` : label égal au même formatage de `1.43`, largeur `100 %`, ARIA `now=100` et `aria-valuetext` communique le taux réel et le statut.
- `aria-label` et `aria-valuetext` sont appliqués au rôle progressbar.
- Le label de pourcentage réagit à `SettingsService.updateSettings({ locale: 'en-US' })`.
- Aucun badge/texte de statut visible dans le DOM ; il reste annoncé via `aria-valuetext`.

### Critères d'acceptation
- Le remplissage reflète `consumptionRate`, plafonné à 100 %, et le pourcentage visible n'est jamais plafonné.
- Le statut est visuellement codé par les tokens sémantiques, sans badge visible, et accessible via `aria-valuetext`.
- Les taux/statuts undefined sont traités par le parent (aucun composant de barre instancié), conformément à la tâche 5.
- Le token `--size-progress-track` est défini et documenté ; aucun style brut non-tokenisé dans le composant.
- `npx tsc -p tsconfig.app.json --noEmit` et `npx tsc -p tsconfig.spec.json --noEmit` : code 0.
- `npm run build` passe. Seul avertissement autorisé : le budget SCSS connu de `category-card.scss`.
- `npx ng test --no-watch` : tout vert, sortie lue sur disque, aucun test supprimé.
- Aucun `any`, `$any`, cast `as` ou dépendance ajoutés.

### Hors périmètre pour cette tâche
- Intégrer le composant à la page Budget Mensuel (tâche 11).
- Ajouter un libellé de statut visible ou modifier les couleurs approuvées.
- Construire le bandeau ou la table ; aucun consommateur applicatif dans cette tâche.
- Remplacer le `<div>` d'aperçu existant dans `.ai/design/palettes.html` par le composant Angular.
- Déplacer le composant ailleurs que `components/ui/`.

### Références
- `DESIGN_SYSTEM.md` § 4.1 (sémantique), § 4.3 (tokens), § 5.3 (chiffres tabulaires), § 6 (dimensions/rayons), § 7 (accessibilité).
- `.ai/domain-model.md` § 3 (seuils et statut), `.ai/roadmap.md` § 4 tâche 9.
- `AGENTS.md` : standalone, tokens seulement, mobile-first, texte non codé en dur, pas de `any`.
- `.ai/design/palettes.html` : maquette des trois états déjà validée visuellement.
