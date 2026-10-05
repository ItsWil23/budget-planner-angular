# Design system — Budget Planner v3

> Spécification exploitable pour l'implémentation. Toute valeur ici découle d'une décision tracée dans
> [`.ai/product-vision.md`](./.ai/product-vision.md) § 11. Aucune couleur, taille ou espacement ne doit être écrit
> en dur dans un composant : tout passe par les tokens de ce document.
> Exploration visuelle : [`.ai/design/palettes.html`](./.ai/design/palettes.html), [`.ai/design/fonts.html`](./.ai/design/fonts.html).
> Dernière mise à jour : 2026-10-05

---

## 1. Principe directeur

**Composants → tokens sémantiques → valeurs.** Un composant ne référence jamais une couleur ou une taille brute,
toujours un rôle (`--color-accent`, `--text-title`, `--space-md`). Changer de palette, de thème ou de langue ne doit
jamais nécessiter de toucher un composant.

**Échelle fixe, usage sémantique.** Les échelles ci-dessous (couleur, typographie, espacement) sont volontairement
courtes. Un composant pioche dans l'échelle existante ; on n'ajoute une valeur que si aucun rôle existant ne convient,
et jamais pour un seul composant isolé.

## 2. Disposition — « cartes flottantes »

Pas de châssis applicatif. Le fond en mesh gradient est le fond de page et traverse toute l'interface. Chaque bloc —
navigation, barre supérieure, chaque carte — est une **île opaque**, séparée des autres par de l'espace. Appliqué à
toutes les pages, y compris Budget Mensuel (une île peut contenir une table entière).

```
┌─ page (fond mesh gradient, ne défile jamais sur desktop) ───────────────┐
│ ┌──────────┐  ┌────────────────────────────────────────────────────┐   │
│ │          │  │ topbar (île) : titre · sélecteur de mois · compte  │   │
│ │  nav     │  ├────────────────────────────────────────────────────┤   │
│ │  (île,   │  │ hero (île, fixe, non réarrangeable)                │   │
│ │  pleine  │  ├────────────────────────────────────────────────────┤   │
│ │  hauteur)│  │ grille de contenu (îles, défilement interne)       │   │
│ │          │  │  ...                                               │   │
│ └──────────┘  └────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────┘
```

### Layout desktop (≥ 1024px)

- Racine applicative en `height: 100dvh`, `overflow: hidden`.
- Navigation : île pleine hauteur, fixe, icône + libellé (jamais un rail d'icônes seules).
- Topbar : île fixe en haut de la colonne de contenu, **toujours visible** (elle ne défile jamais avec le contenu).
- Zone de contenu sous la topbar (hero + reste) : `overflow-y: auto`, seule cette zone défile.
- Le fond ne bouge donc jamais — c'est l'effet recherché, cohérent avec les références retenues.

### Layout mobile / tablette (< 1024px)

- Défilement de page classique (pas de `100dvh` contraint).
- Navigation en tiroir (drawer), déclenchée par un bouton hamburger dans la topbar. Le fond du tiroir ouvert est
  assombri par `--overlay-scrim` (§ 4.6).
- Topbar mobile : `hamburger | sélecteur de mois | avatar`. **Sticky** (`position: sticky; top: 0`) : elle reste
  visible pendant le défilement de page, donc le hamburger reste toujours accessible.
- La topbar sticky est opaque (`--surface-card`) ; le défilement passe sous elle sans transparence.
- Chaque fonction doit être accessible au doigt (cible tactile ≥ 44×44px), aucune ne dépend du survol.

### Cas de l'en-tête du Dashboard

Le chiffre héros (`hero`) est **fixe, jamais réarrangeable**, même en v3.1 quand le reste du Dashboard devient une
grille de widgets. Sert de repère constant.

## 3. Fond — mesh gradient organique

Plusieurs taches colorées très diffuses, tailles et positions variées, réparties sur tout le fond (pas seulement
aux coins).

### Génération

```ts
interface MeshBlob {
  x: number; // position en % (peut légèrement déborder : -10 à 110)
  y: number; // idem
  w: number; // largeur du dégradé radial en % (bornes : 20–62)
  h: number; // hauteur en %                    (bornes : 18–64)
}
```

- 6 à 8 taches par composition.
- Couleurs = les `hues` de la palette active (3 à 4 teintes définies par palette, voir § 4).
- Position/taille tirées via un générateur pseudo-aléatoire **borné** par les plages ci-dessus — jamais de tache
  pouvant couvrir tout l'écran ou disparaître à une taille nulle.
- CSS : une pile de `radial-gradient(w% h% at x% y%, hue 0%, transparent 64%)` sur un pseudo-élément `::before` en
  arrière-plan de la racine applicative, `inset: -10%` pour dépasser légèrement les bords.
- **Aucun flou** (`backdrop-filter` ou `filter: blur()`) — la diffusion vient uniquement du `transparent` en fin de
  dégradé. Coût de performance nul.

### Graine — stabilité et confidentialité

- Un **nombre aléatoire** (`crypto.getRandomValues`) est tiré **une seule fois**, au premier lancement, puis stocké
  dans `UserSettings.backgroundSeed`. La composition ne change plus ensuite : stable d'une session à l'autre.
- **Jamais dérivée de l'identifiant utilisateur.** L'algorithme de génération étant du code front, donc public, une
  graine déterministe à partir de l'identifiant rendrait le fond corrélable entre captures d'écran — un identifiant
  observable involontaire. Principe de minimisation : une donnée ne sert qu'à ce pour quoi elle est collectée.
- Jamais de nouveau tirage au chargement de page : l'interface doit rester visuellement constante.

### Piste écartée (documentée, pas fermée)

Semer la composition par le `monthKey` affiché plutôt que par utilisateur, pour donner un repère sensoriel au
changement de mois. Voir `product-vision.md` § 14 — à reconsidérer une fois le produit stabilisé.

## 4. Couleur

### 4.1 Trois axes indépendants, jamais mélangés

| Axe | Exprime | Traitement |
|---|---|---|
| **Nature** | revenu / dépense | Revenu = `--color-income`, signé « + ». Dépense = `--text-primary` (couleur de texte par défaut), signée « − ». **Aucun token `expense`.** |
| **Santé budgétaire** | sous le budget / proche / dépassé | Seul axe qui emploie vert / ambre / rouge : `--color-ok`, `--color-warn`, `--color-over` |
| **Identité de catégorie** | quelle catégorie | Palette catégorielle (`Category.color`), pastilles et graphiques uniquement |

Les signes `+` / `−` ne sont pas décoratifs : ils garantissent que l'information n'est jamais portée par la couleur
seule (WCAG 1.4.1). Une dépense n'est pas une mauvaise nouvelle — payer son loyer dans l'enveloppe prévue est une
réussite.

### 4.2 Échelle de luminance fixe (garantit le contraste par construction)

Chaque palette respecte les mêmes marches de luminance ; seules la teinte et la saturation varient. Le contraste ne
dépend que de la luminance : **aucune validation palette par palette n'est nécessaire**, seul l'accent est à
vérifier (jamais utilisé pour du texte long).

| Rôle | Luminance visée (sombre) | Luminance visée (clair) |
|---|---|---|
| `--surface-page` (fond de la scène, derrière le mesh) | ≈ 3–4 % | ≈ 92–95 % |
| `--surface-app` (fond sous les îles) | ≈ 6–8 % | ≈ 97–99 % |
| `--surface-card` (îles : nav, topbar, hero, cartes) | ≈ 10–12 % | 100 % (blanc pur) |
| `--border` (hairline 1px) | ≈ 17–19 % | ≈ 90–92 % |
| `--text-muted` (labels, dates) | ≈ 58–62 % | ≈ 40–44 % |
| `--text-primary` | ≈ 90–93 % | ≈ 8–10 % |

Règle de séparation : `--surface-card` est toujours nettement plus clair (sombre) ou plus contrasté (clair) que
`--surface-app`, complété par la hairline `--border`. **Aucune ombre portée dans les deux thèmes** — la profondeur
vient exclusivement de la luminance et de la bordure.

### 4.3 Couleurs sémantiques — invariantes, quelle que soit la palette

```css
--color-income:      #7dd3a0;  /* clair : #15803d */
--color-ok:          #7dd3a0;  /* clair : #15803d */
--color-ok-soft:      rgba(125,211,160,.14);
--color-over:        #f17c7c;  /* clair : #c93c37 */
--color-over-soft:    rgba(241,124,124,.15);
--color-warn:        #e8c56b;  /* à valider visuellement — statut « on-track » 80–100 % */
--color-warn-soft:    rgba(232,197,107,.14);
```

> `--color-warn` n'a pas encore été testé sur maquette — à valider avant implémentation du composant barre de
> progression (statut `on-track`, voir `domain-model.md` § 3).

### 4.4 Palettes — choix utilisateur

Une palette par défaut (couleur de marque) + 4 alternatives, sélectionnables dans les paramètres
(`UserSettings.palette`). Retenues après comparatif visuel ([`palettes.html`](./.ai/design/palettes.html)) :

| Identifiant | Nom | Rôle | Registre |
|---|---|---|---|
| `terracotta` | A — Terracotta | **Par défaut, couleur de marque** | Chaleureux, humain, sans connotation de luxe |
| `linen` | G — Lin & graphite | Alternative | Accent quasi neutre, intemporel |
| `gold` | C — Or sobre | Alternative | Le plus premium |
| `midnight` | E — Bleu nuit & cyan | Alternative | Calme, lisible, registre financier |
| `aurora` | H — Aurore | Alternative | Le plus spectaculaire |

Écartées : **D — Teal** (accent confondable avec `--color-income`), **B — Violet** (redondante avec Aurore),
**F — Corail** (accent trop proche de `--color-over`).

**Valeurs exactes** (extraites du comparatif, à reprendre telles quelles) :

```css
/* ===== terracotta (défaut — marque) ===== */
[data-theme='dark'][data-palette='terracotta'] {
  --surface-page: #0a0809; --surface-app: #0f0e10; --surface-card: #1b181b; --border: #2f2a2e;
  --text-primary: #eae7e8; --text-muted: #94898d;
  --color-accent: #e8926b; --color-accent-soft: rgba(232,146,107,.15);
  --mesh-hue-1: rgba(232,146,107,.22); --mesh-hue-2: rgba(124,92,190,.18); --mesh-hue-3: rgba(216,150,96,.13);
}
[data-theme='light'][data-palette='terracotta'] {
  --surface-page: #f0eaea; --color-accent: #c2562a; --color-accent-soft: rgba(194,86,42,.10);
  --mesh-hue-1: rgba(232,146,107,.40); --mesh-hue-2: rgba(150,120,210,.30); --mesh-hue-3: rgba(230,180,130,.22);
}

/* ===== linen ===== */
[data-theme='dark'][data-palette='linen'] {
  --surface-page: #09090a; --surface-app: #0f0f10; --surface-card: #1b1b1d; --border: #2e2e30;
  --text-primary: #ebeae8; --text-muted: #8d8c88;
  --color-accent: #ded3c0; --color-accent-soft: rgba(222,211,192,.12);
  --mesh-hue-1: rgba(210,190,160,.15); --mesh-hue-2: rgba(110,120,150,.17); --mesh-hue-3: rgba(160,150,170,.10);
}
[data-theme='light'][data-palette='linen'] {
  --surface-page: #f1efec; --color-accent: #7e6f52; --color-accent-soft: rgba(126,111,82,.10);
  --mesh-hue-1: rgba(215,196,166,.42); --mesh-hue-2: rgba(140,150,180,.26); --mesh-hue-3: rgba(180,170,190,.18);
}

/* ===== gold ===== */
[data-theme='dark'][data-palette='gold'] {
  --surface-page: #08080a; --surface-app: #0e0e10; --surface-card: #1a1a1d; --border: #2c2c2e;
  --text-primary: #eae9e7; --text-muted: #8e8c88;
  --color-accent: #e5b567; --color-accent-soft: rgba(229,181,103,.15);
  --mesh-hue-1: rgba(229,181,103,.18); --mesh-hue-2: rgba(96,96,140,.17); --mesh-hue-3: rgba(180,140,90,.11);
}
[data-theme='light'][data-palette='gold'] {
  --surface-page: #f1eee7; --color-accent: #9a6c16; --color-accent-soft: rgba(154,108,22,.10);
  --mesh-hue-1: rgba(229,181,103,.40); --mesh-hue-2: rgba(150,150,190,.26); --mesh-hue-3: rgba(200,170,120,.20);
}

/* ===== midnight ===== */
[data-theme='dark'][data-palette='midnight'] {
  --surface-page: #050a11; --surface-app: #0b1119; --surface-card: #162029; --border: #273545;
  --text-primary: #e4ecf3; --text-muted: #82949f;
  --color-accent: #6bc5e8; --color-accent-soft: rgba(107,197,232,.15);
  --mesh-hue-1: rgba(72,166,224,.26); --mesh-hue-2: rgba(86,108,220,.20); --mesh-hue-3: rgba(64,190,196,.15);
}
[data-theme='light'][data-palette='midnight'] {
  --surface-page: #e9f0f7; --color-accent: #17749f; --color-accent-soft: rgba(23,116,159,.10);
  --mesh-hue-1: rgba(100,180,235,.40); --mesh-hue-2: rgba(120,140,235,.28); --mesh-hue-3: rgba(90,200,205,.22);
}

/* ===== aurora ===== */
[data-theme='dark'][data-palette='aurora'] {
  --surface-page: #07060d; --surface-app: #0d0c14; --surface-card: #191823; --border: #2d2b3a;
  --text-primary: #e9e7f1; --text-muted: #8b889c;
  --color-accent: #9ab0f5; --color-accent-soft: rgba(154,176,245,.16);
  --mesh-hue-1: rgba(150,110,235,.28); --mesh-hue-2: rgba(226,120,180,.20);
  --mesh-hue-3: rgba(70,180,210,.18); --mesh-hue-4: rgba(120,140,245,.15);
}
[data-theme='light'][data-palette='aurora'] {
  --surface-page: #eeeaf7; --color-accent: #5a5fd0; --color-accent-soft: rgba(90,95,208,.10);
  --mesh-hue-1: rgba(165,130,240,.38); --mesh-hue-2: rgba(240,150,200,.30);
  --mesh-hue-3: rgba(110,200,225,.28); --mesh-hue-4: rgba(140,160,250,.20);
}

/* ===== neutres communs au thème clair (toutes palettes) ===== */
[data-theme='light'] {
  --surface-app: #fbfbfd; --surface-card: #ffffff; --border: #e7e7ee;
  --text-primary: #15151c; --text-muted: #6a6a78;
}
```

Règles non négociables :

- Les couleurs sémantiques (§ 4.3) ne changent **jamais** avec la palette.
- L'accent d'une palette ne doit **jamais** être confondable avec `--color-income` ni `--color-over` — critère qui a
  éliminé D et F.
- Aucune couleur en dur dans un composant : uniquement via ces tokens.

### 4.5 Palette catégorielle

Couleurs distinctes pour les pastilles de catégorie et les graphiques (donut, légendes), indépendantes de la palette
d'interface. Valeurs provisoires (maquette) : `#7aa2f7`, `#e0af68`, `#bb9af7` — **liste à étendre** (8–10 teintes)
avant l'implémentation de l'écran Catégories, garantissant un contraste suffisant sur `--surface-card` dans les deux
thèmes.

### 4.6 Overlay (voile derrière tiroir et modale)

```css
--overlay-scrim: rgba(0, 0, 0, 0.6);   /* thème clair : rgba(0, 0, 0, 0.4) */
```

- Neutre et **invariant selon la palette** : seul le thème (sombre / clair) le fait varier.
- Utilisé uniquement pour le voile qui assombrit la page derrière un élément superposé : backdrop du tiroir de
  navigation mobile et overlay de la modale. Jamais comme fond d'île, jamais pour simuler une ombre.
- Aucun flou associé (§ 3) ; la séparation avec l'élément superposé reste assurée par `--border` et la luminance.
- Valeurs de départ, à valider visuellement dans les deux thèmes lors de la tâche topbar.

## 5. Typographie

**Famille unique : Plus Jakarta Sans**, graisses 400 / 500 / 600. Choisie après comparatif sur maquette
([`fonts.html`](./.ai/design/fonts.html)) — meilleur compromis chaleureux/premium parmi 8 candidates.

### 5.1 Chargement — éliminer le décalage visuel (FOUT)

1. **Auto-hébergement** du fichier `.woff2`, jamais de CDN tiers (performance + RGPD : pas d'appel à un domaine
   externe).
2. `font-display: swap` — le texte s'affiche immédiatement dans la police de secours, jamais invisible.
3. **Police de secours ajustée en métriques** : `size-adjust`, `ascent-override`, `descent-override` calculés sur la
   pile système de repli pour qu'elle occupe exactement la même largeur que Plus Jakarta Sans. Aucun texte ne se
   déplace au moment du remplacement (même principe que `next/font`, à reproduire via `@font-face` manuel en
   Angular).

```css
@font-face {
  font-family: 'Plus Jakarta Sans';
  src: url('/assets/fonts/plus-jakarta-sans.woff2') format('woff2');
  font-weight: 400 600;
  font-display: swap;
}
@font-face {
  font-family: 'Plus Jakarta Sans Fallback';
  size-adjust: 105%;         /* valeurs indicatives — à calibrer avec un outil de métriques (ex. Fontaine) */
  ascent-override: 90%;
  src: local('Arial');
}
--font-body: 'Plus Jakarta Sans', 'Plus Jakarta Sans Fallback', system-ui, sans-serif;
```

### 5.2 Échelle sémantique — texte

| Token | Taille | Graisse | Usage |
|---|---|---|---|
| `--text-label` | 11px | 500, `letter-spacing: .09em`, majuscules | Labels de section (« REVENUS DU MOIS ») |
| `--text-caption` | 12px | 400 | Texte secondaire, dates, ratios, sous-titres de carte |
| `--text-body` | 14px | 400 | Corps par défaut : nav, cellules de table, contenu de formulaire |
| `--text-emphasis` | 15px | 600 | Titres de carte, titre de la topbar |
| `--text-heading` | 20px | 600 | Titres de section/page (usage rare — la topbar suffit la plupart du temps) |

### 5.3 Échelle sémantique — chiffres (toujours `font-variant-numeric: tabular-nums`)

| Token | Taille | Graisse | Usage |
|---|---|---|---|
| `--num-caption` | 12px | 400 | Ratios (« 320 / 400 € »), pourcentages en pastille |
| `--num-body` | 14px | 500 | Montants dans une liste (transactions) |
| `--num-emphasis` | 19px | 500 | Montants de carte KPI |
| `--num-hero` | 42px | **400** (jamais gras) | Chiffre héros du Dashboard uniquement |

Règle : les chiffres tabulaires garantissent l'alignement en colonne quel que soit le contenu — indispensable dans
un produit qui compare sans cesse deux totaux.

### 5.4 Discipline d'extension

Ces deux échelles (9 tailles au total) couvrent tous les écrans identifiés à ce jour. Un nouveau rôle ne s'ajoute que
si aucun token existant ne convient — jamais une taille en dur pour un seul composant.

## 6. Espacement, rayons, bordures

```css
--space-xs:  4px;
--space-sm:  8px;
--space-md:  12px;
--space-lg:  16px;
--space-xl:  20px;
--space-2xl: 28px;
--space-3xl: 40px;

--radius-sm:   9px;    /* boutons, items de nav, pastilles */
--radius-md:   14px;   /* cartes de contenu */
--radius-lg:   18px;   /* nav, topbar, hero */
--radius-full: 999px;  /* pilules, avatar, pastilles de statut */

--border-width: 1px;   /* hairline — unique moyen de séparation avec la luminance, jamais d'ombre */
```

Gaps entre îles : `--space-lg` (16px) en desktop, `--space-md` (12px) en mobile. L'aération prime sur la
compression — le défilement n'est pas un problème à éviter.

## 7. États

| État | Règle |
|---|---|
| **Survol (desktop)** | N'ouvre jamais l'accès à une fonction. **Enrichit** uniquement ce qui est déjà lisible/actionnable : infobulle sur libellé tronqué, infobulle sur segment de graphique, léger soulèvement de carte (`translateY(-1px)`, pas d'ombre ajoutée). Chaque enrichissement a un équivalent tactile (tap). |
| **Focus clavier** | Toujours visible, jamais supprimé (`outline` personnalisé autorisé, `outline: none` sans remplacement interdit). Contour en `--color-accent`, épaisseur 2px, offset 2px. |
| **Désactivé** | Opacité ~45 %, `cursor: not-allowed`, jamais simplement masqué (ex. catégorie sans sous-catégorie dans le formulaire de transaction — visible, désactivée, avec explication). |
| **Chargement** | Squelettes (`skeleton`) sur les îles de contenu, jamais de spinner plein écran qui bloque la disposition. |
| **Vide** | Message contextuel + action proposée (ex. « Aucune transaction ce mois — Ajouter »), jamais une carte simplement absente. |
| **Erreur** | Message inline au plus près du champ concerné ; jamais uniquement une couleur (§ 4.1). |
| **Incomplet** (catégorie sans sous-catégorie) | Signalé explicitement dans l'écran Catégories, pas un état vide neutre — voir `domain-model.md` § 2. |

## 8. Accessibilité — cibles concrètes

- **Contraste** : ≥ 4.5:1 pour le texte courant, ≥ 3:1 pour le texte large (≥ 24px ou 19px gras) et les éléments
  d'interface. Garanti par construction grâce à l'échelle de luminance (§ 4.2) ; seul l'accent est à vérifier au cas
  par cas.
- **Cible tactile** : ≥ 44×44px sur tout élément interactif en dessous de 1024px.
- **Information jamais portée par la couleur seule** (WCAG 1.4.1) : signes `+`/`−`, icônes, texte — toujours en plus
  de la couleur.
- **Navigation clavier complète** : tout ce qui est cliquable est atteignable au clavier, dans un ordre logique.
- **`prefers-reduced-motion`** : toutes les transitions (§ 9) sont désactivées ou réduites à une simple apparition
  si l'utilisateur l'a demandé au niveau système.
- **Sémantique HTML** : listes réelles pour les `@for`, `<label for>` + `<input id>` sur tout champ, boutons
  natifs pour les actions (pas de `<div>` cliquable).

## 9. Mouvement

```css
--duration-fast: 120ms;   /* survol, focus */
--duration-base: 200ms;   /* ouverture de modale, tiroir de navigation */
--duration-slow: 320ms;   /* transitions de page, slide de sidebar mobile */
--ease-standard: cubic-bezier(.2, 0, 0, 1);
```

Toujours désactivé/réduit sous `prefers-reduced-motion: reduce`.

## 10. Composants de base — règles transverses

| Composant | Règle spécifique |
|---|---|
| **Carte (île)** | `--surface-card`, `--border`, `--radius-md` ou `--radius-lg`. Jamais d'ombre. |
| **Bouton primaire** | Fond `--color-accent`, texte contrastant garanti par palette. `--radius-sm`. |
| **Bouton secondaire** | Bordure `--border`, fond transparent, texte `--text-primary`. |
| **Champ de formulaire** | `font: inherit`, `margin: 0` avant tout dimensionnement en `em` (piège déjà rencontré). Label toujours visible, jamais uniquement un placeholder. |
| **Table** (Budget Mensuel, Transactions) | Une seule île contenante ; les lignes ne sont pas elles-mêmes des îles séparées (sinon la page devient interminable — décision `product-vision.md` § 9). |
| **Modale** | Contenu projeté détruit/recréé à l'ouverture (déjà acquis en phase A). Fermeture : bouton ×, backdrop, touche Échap. Piège de focus obligatoire. Voile : `--overlay-scrim` (§ 4.6). |
| **Menu de compte** (avatar, topbar) | Un vrai composant accessible : Échap pour fermer, piège de focus, navigation clavier — jamais un `<div>` conditionnel simple. |
| **Barre de progression prévu/réel** | Couleur pilotée par le statut (§ 4.3 / `domain-model.md` § 3 : `under` / `on-track` / `over`), jamais par la catégorie. |
| **Pastille de catégorie** | Couleur de `Category.color` (palette catégorielle, § 4.5), jamais une couleur sémantique. |

## 11. Icônes

Traits fins (style *line icons*, ex. Lucide/Feather), `stroke-width` cohérent, tailles `16px` (inline avec texte
14px) et `20px` (navigation, boutons). Couleur héritée (`currentColor`), jamais de couleur figée dans le SVG.

## 12. Ce que ce document ne couvre pas encore

- Palette catégorielle complète (8–10 teintes) — à produire avant la reprise de l'écran Catégories.
- `--color-warn` non validé visuellement.
- Composants avancés du Dashboard v3.1 (catalogue de widgets, drag & drop) — hors périmètre tant que le Dashboard
  fixe n'est pas livré.
- Design de la landing page (hors application connectée) — patterns déjà actés dans le journal `refonte-angular.md`
  (bandes pleine largeur + `.container` 72rem + paragraphes 65ch), à harmoniser avec ce design system.

> Contexte produit complet : [`.ai/product-vision.md`](./.ai/product-vision.md) · Modèle de données : [`.ai/domain-model.md`](./.ai/domain-model.md)
