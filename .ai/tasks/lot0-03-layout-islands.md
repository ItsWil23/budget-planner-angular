## Tâche : Layout racine en « cartes flottantes » — navigation en île (desktop) + tiroir restylé (mobile)
Lot : 0

### Contexte
Les tokens de design et le thème sont actifs (tâches précédentes). Cette tâche restructure `MainLayout` et
`Sidebar` selon la disposition actée dans DESIGN_SYSTEM.md § 2 : pas de châssis applicatif, chaque bloc est une
île opaque. **La topbar (titre, sélecteur de mois, menu compte) est hors périmètre — tâche séparée qui suivra.**
Le fond en mesh gradient est aussi une tâche séparée : pour l'instant, le fond de la page est une simple couleur
plate (`var(--surface-page)`), pas encore un dégradé.

### Ce qu'il faut faire

1. **`src/app/components/layout/main-layout/main-layout.scss`** — desktop (≥ 1024px) :
   - Le conteneur racine du composant (`:host`) passe en `height: 100dvh`, `overflow: hidden`, disposition en
     ligne (nav à gauche, contenu à droite), avec un espace entre les deux (`--space-lg`) pour laisser respirer
     le fond derrière.
   - Le fond du composant (derrière la nav et le contenu) : `background: var(--surface-page);`.
   - Seule la zone de contenu (`.main-content` actuel) défile : `overflow-y: auto`, le reste de la page ne bouge
     pas.
   - Le conteneur de page interne (`.page-container`) garde son `max-width` actuel, mais son padding utilise les
     tokens d'espacement (`--space-xl`/`--space-2xl` selon la taille d'écran) plutôt que les anciens
     `--spacing-*`.

2. **`src/app/components/layout/main-layout/main-layout.scss`** — mobile (< 1024px) :
   - Le seuil de bascule desktop/mobile passe de `768px` à `1024px` partout dans ce fichier (actuellement
     `@media (min-width: 768px)`), pour correspondre au seuil défini dans DESIGN_SYSTEM.md.
   - Le comportement du bouton hamburger et du backdrop reste identique (logique déjà en place dans
     `main-layout.ts`, ne pas y toucher).

3. **`src/app/components/layout/sidebar/sidebar.scss`** :
   - **Desktop** : la sidebar devient une île — `background: var(--surface-card)`, bordure `1px solid
     var(--border)`, `border-radius: var(--radius-lg)`, hauteur pleine (`height: 100%` dans son conteneur flex),
     **aucune ombre**. Elle n'est plus en `position: fixed` sur ce breakpoint (elle doit redevenir un simple
     enfant du flex du layout, comme c'est déjà `position: static` actuellement au-delà de 768px — juste changer
     le seuil à 1024px et appliquer les styles d'île).
   - **Mobile** (tiroir coulissant) : garder le mécanisme actuel (`position: fixed`, `transform: translateX`,
     classe `.open`, backdrop), mais l'habiller aussi en île : au lieu de toucher les bords de l'écran, ajouter
     un petit espacement (`inset` ou `margin`) sur les bords haut/bas/gauche visibles une fois ouverte, avec les
     mêmes `border-radius`/`border`/`background` que la version desktop. Le bord qui reste hors champ pendant
     l'animation (côté gauche, hors écran) peut rester carré.
   - Remplacer les tokens `--color-surface`, `--color-border`, `--color-text`, `--color-surface-hover`,
     `--color-accent-soft`, `--color-accent`, `--color-danger`/`--color-danger-hover`, `--color-text-muted`,
     `--color-text-inverted`, `--radius-sm` par leurs équivalents actuels (déjà définis dans `styles.scss`,
     utilisables tels quels — pas besoin de les redéfinir ici, juste vérifier qu'ils sont bien référencés, pas de
     changement de nom nécessaire puisque le pont de compatibilité existe déjà).
   - **Ne rien changer d'autre au gabarit** (`.sidebar-header`, `.footer` avec le `ThemeSwitch`/utilisateur/
     déconnexion restent en place tels quels pour l'instant — leur déplacement vers une topbar est une tâche
     future, lot 5).

### Fichiers concernés
`src/app/components/layout/main-layout/main-layout.scss`, `src/app/components/layout/sidebar/sidebar.scss`.
Ne touche pas aux fichiers `.ts` ni `.html` de ces deux composants (la structure DOM actuelle suffit, seul le
style change).

### Critères d'acceptation
- `npm test` : aucune régression sur `main-layout.spec.ts` (le test actuel passe déjà, ne pas le casser).
  `sidebar.spec.ts` échoue déjà avant cette tâche pour une raison indépendante (routing non configuré dans le
  test) — ne pas chercher à corriger ça ici.
- `npm start`, fenêtre ≥ 1024px : la sidebar apparaît comme un bloc arrondi à bordure, avec un espace visible
  entre elle et la zone de contenu (qui laisse voir `var(--surface-page)` en dessous). Le contenu défile sans que
  la sidebar bouge.
- Fenêtre < 1024px : le tiroir s'ouvre/se ferme comme avant (bouton hamburger, backdrop), avec l'habillage visuel
  d'île (coins arrondis, bordure) sur les bords visibles.
- Aucune couleur ou taille en dur ajoutée (uniquement les tokens déjà définis dans `styles.scss`).

### Hors périmètre pour cette tâche
- La topbar (titre de page, sélecteur de mois, menu compte) — tâche suivante.
- Le fond en mesh gradient — tâche séparée du lot 0.
- Le déplacement du `ThemeSwitch`/utilisateur/déconnexion hors de la sidebar — lot 5.
- Toute correction des tests déjà en échec avant cette tâche (`sidebar.spec.ts`, `app.spec.ts`, etc.).
- Modification des fichiers `.ts`/`.html` de `MainLayout` ou `Sidebar`.

### Références
DESIGN_SYSTEM.md § 2 (disposition, layout desktop/mobile), § 6 (espacement, rayons, bordures)

### Rappel
Message de commit en anglais, Conventional Commits. Avant de dire que c'est fait : lance `npm test -- --watch=false`
et vérifie visuellement les deux tailles d'écran, pas seulement une capture.
