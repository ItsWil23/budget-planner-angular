# Journal de refonte Angular — budget-planner

## Phase actuelle
Phase A (frontend statique) en cours. Écrans 1 (landing), 2 (layout + navigation), 3 (auth) et 4 (categories) terminés et mergés dans main.

## Stratégie de refonte (décision utilisateur, 2026-07-22)
- **Phase A — Frontend statique** : reconstruire tous les écrans avec des données mockées typées (fichiers de mocks + interfaces calquées sur le modèle réel). Objectif : valider/améliorer le visuel.
- **Phase B — Dynamique** : services, signals partagés, récupération de données (Supabase), formulaires fonctionnels.
- Règle : jamais de données en dur dans les templates → mocks typés séparés pour faciliter la phase B.

## Cartographie (validée)
- Routes : / (landing page), /auth/login, /auth/register, /dashboard, /transactions, /budget-mensuel, /categories, /accounts, /settings
- Transverse : Sidebar/Navigation, MonthSelector (état global), ThemeSwitch (dark mode), modales
- Modèle : Account, Category→Subcategory, Transaction, BudgetMonth→BudgetLines
- Agrégations côté Supabase (RPC) : get_budget_aggregation, get_dashboard_aggregation, get_real_expenses, get_category_aggregation, get_recent_expenses
- État global Zustand → à remplacer par services Angular + signals
- Pas d'autres fonctionnalités cachées (drag & drop etc. hors périmètre pour l'instant)

## Ordre de construction retenu (par dépendances)
1. Landing (/) — statique
2. Layout + navigation (Sidebar, routes, dark mode)
3. Auth
4. Accounts (CRUD simple)
5. Categories (CRUD hiérarchique)
6. Transactions
7. Budget mensuel
8. Dashboard (agrège tout → en dernier)
9. Settings (indépendant)

## Étapes validées
- 2026-07-22 : Cartographie de l'existant (écrans, routes, modèle de données, état global)
- 2026-07-27 : Exercice prérequis validé (interface + mocks typés, @for/track, @if/@else) dans test-component
- 2026-07-27 : Structure de dossiers décidée : pages/ (écrans routés), components/ (réutilisables, subdiviser ui/+layout/ plus tard), models/ (interfaces), mocks/ (données phase A), services/ (phase B). Journal déplacé dans ce repo (source de vérité unique).
- 2026-07-27 : Workflow Git acté (GitHub Flow, dev abandonné). Design tokens écrits par le mentor (exception acceptée : design system ≠ apprentissage Angular) dans styles.scss — à valider visuellement par l'utilisateur.
- 2026-07-27 : Design tokens validés (test .dark OK), commités et pushés. Accès navigateur aux pages protégées de l'ancien site OK (utilisateur connecté).
- 2026-07-27 : Écran 1 landing page terminé et mergé dans main (feat/landing-page). Revue visuelle faite : pattern container + 65ch, cartes améliorées, transitions corrigées (sur état de base, pas :hover).
- 2026-08-05 : Écran 2 layout + navigation terminé et mergé dans main (feat/layout-navigation). Contenu : routes squelettes (layout route pathless + children + wildcard), MainLayout (sidebar + main + router-outlet), Sidebar (nav sémantique, routerLink/routerLinkActive), Theme service (premier signal + effect + DOCUMENT), ThemeSwitch animé adapté d'Uiverse. Page /accounts volontairement reportée.
- 2026-08-05 : Écran 3 auth terminé et mergé dans main (feat/auth). Deux routes (/auth/login, /auth/register) avec un seul composant + signal mode alimenté par ActivatedRoute. Formulaire statique (phase A) avec labels corrects, autocomplete, bouton OAuth placeholder désactivé. Zones de message mockées (signal mockState). Liens de bascule plutôt qu'onglets (décision UX). Correction boutons landing page (routerLink) + reset box-sizing global.
- 2026-08-05 : Écran 4 categories terminé et mergé dans main (feat/categories). CRUD hiérarchique Category→Subcategory. Composant CategoryCard réutilisable avec @Input (category, subcategories) + @Output (editCategory, deleteCategory, addSubcategory, editSubcategory, deleteSubcategory). Page Categories orchestratrice avec signals (categories, subcategories) et filtrage. Édition inline (catégories + sous-catégories). Icônes SVG (gris pour edit, rouge pour delete — convention UX moderne). Grille responsive 3 colonnes (auto-fill minmax). Gestion état vide ("Aucune sous-catégorie"). Premier composant avec communication parent-enfant.

## Décisions design (phase A)
- Accent unique emerald (abandon du duo blue/emerald de l'ancien code) — à valider sur la nav.
- Tokens sémantiques financiers séparés : --color-income / --color-expense (≠ accent/danger).
- Dark mode par classe .dark sur <html> ; seuls couleurs + ombres redéfinies (jamais radius/spacing).
- Signature visuelle conservée : arrondis généreux, ombres douces, palette slate.
- Amélioration différée (fin phase A) : aperçu produit avec données fictives dans le hero de la landing (pattern « hero + product preview ») — attendre que le dashboard existe.
- Landing : pattern « bandes pleine largeur + .container interne (max-width 72rem) + paragraphes 65ch ». Cartes features améliorées vs original (surface + ombre + hover lift) → base du futur composant Card.
- Auth : inscription simplifiée (email + double mot de passe uniquement, pas de nom/prénom/date de naissance — décision RGPD/YAGNI). OAuth Google prévu (bouton désactivé en phase A, connexion Supabase en phase B). Lien de bascule login/register plutôt qu'onglets (action principale mise en avant).

## Compétences acquises
- Bases Angular (cours OpenClassrooms « Débutez avec Angular »)

## Compétences à travailler (prérequis immédiats — priorités phase A)
- [ ] SCSS : variables CSS, Flexbox, Grid, nesting, dark mode, media queries
- [x] TypeScript de base (interfaces, types) — pou
- [x] @Input/@Output + EventEmitter (communication parent-enfant
- [x] Standalone components, control flow @if/@for (reste : @Input à pratiquer)
- [x] Routing : routes enfants, layout route pathless, pathMatch, wildcard, routerLink/routerLinkActive, paramètres de route
- [x] Premier signal + effect + inject(DOCUMENT) (service Theme)
- [x] ActivatedRoute : lecture de segments d'URL (snapshot.url)
- [ ] (Phase B) Signals avancés (computed), reactive forms, RxJS minimal
- [ ] Lazy loading des routes (loadComponent) — à appliquer en fin de phase A

## Workflow Git (à suivre par le mentor à chaque étape)
- Stratégie : GitHub Flow — `main` toujours stable, une branche `feat/...` par implémentation, merge dans `main` après validation en revue. (`dev` abandonné tant qu'il n'y a pas de déploiement — à reconsidérer en phase déploiement.)
- Le mentor indique les moments opportuns de commit/push/merge + suggère le message ; l'utilisateur tape lui-même les commandes.
- Commit = état cohérent qui compile, une unité logique par commit.
- Messages : anglais, Conventional Commits (feat/fix/style/refactor/chore/docs).
- Push : fin de session + avant merge. Merge dans main : après validation mentor.

## Blocages
- (aucun)

## Pro5 : Transactions (liste avec filtres + formulaire CRUD). Compétences nouvelles : formulaires plus complexes (plusieurs champs, sélection catégorie/sous-catégorie liées), filtrage de données, formatage de dates/montants
Écran 4 : Categories (CRUD hiérarchique). Compétences nouvelles : @Input/@Output, gestion d'une structure parent/enfant (Category→Subcategory), formulaires avec relations, affichage hiérarchique.

En attente : Accounts (reporté, nécessite discussion sur la structure des données et l'intégration avec Transactions).

## Notes pédagogiques
- Compris (avec aide) : MonthSelector = service + signal car source de vérité unique partagée entre écrans (équivalent du store Zustand).
- Acquis : grid auto-fit/minmax (trouvé seul, mieux que la consigne), tokens, nesting SCSS, encapsulation des styles composant.
- À surveiller : tendance YAGNI (propriétés CSS « au cas où » — footer relative conservé malgré avertissement) ; confusion initiale aération verticale vs largeur de ligne (résolu avec pattern container + 65ch).
- Acquis écran 2 : layout route pathless vs condition sur l'URL, routerLinkActiveOptions exact, `.update()` vs `.set()` sur un signal, `protected readonly` pour tout ce que le template consomme, services jamais dans `imports:` d'un composant.
- Erreurs répétées à surveiller : sémantique HTML dans les boucles (@for sur le conteneur au lieu de l'item, texte hors du <a>), classes CSS du template et du SCSS qui divergent, transitions sans durée, `gap` sur un élément non-flex, styles par défaut des listes/inputs non neutralisés.
- Pièges rencontrés (mentor) : encapsulation Angular ajoute un attribut par compound selector → les spécificités égales d'un CSS externe sont rompues (combinateur `~` l'emporte sur `:nth-child`) ; les contrôles de formulaire n'héritent ni de `font-size` ni d'une marge nulle → `font: inherit; margin: 0` requis avant tout dimensionnement en `em`.
- Décision design : ThemeSwitch dans le footer de la sidebar plutôt qu'en position fixed bas-droite (slot réservé à l'action principale).
- Acquis écran 3 : ActivatedRoute.snapshot.url pour lire le segment de route, pattern lien de bascule vs onglets (UX moderne), <label for> + <input id> + autocomplete + name (accessibilité formulaires), box-sizing: border-box requis en global pour éviter débordement des inputs à width: 100%.
- Décisions auth : email + double password seulement (pas de nom/prénom/date de naissance), OAuth Google en phase B, zones de message avec signal mockState pour tests visuels.
