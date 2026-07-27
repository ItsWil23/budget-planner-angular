# Journal de refonte Angular — budget-planner

## Phase actuelle
Phase 1 terminée (cartographie validée le 2026-07-22). Prochaine phase : prérequis + socle du projet.

## Stratégie de refonte (décision utilisateur, 2026-07-22)
- **Phase A — Frontend statique** : reconstruire tous les écrans avec des données mockées typées (fichiers de mocks + interfaces calquées sur le modèle réel). Objectif : valider/améliorer le visuel.
- **Phase B — Dynamique** : services, signals partagés, récupération de données (Supabase), formulaires fonctionnels.
- Règle : jamais de données en dur dans les templates → mocks typés séparés pour faciliter la phase B.

## Cartographie (validée)
- Routes : / (landing page), /auth, /dashboard, /transactions, /budget-mensuel, /categories, /accounts, /settings
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

## Compétences acquises
- Bases Angular (cours OpenClassrooms « Débutez avec Angular »)

## Compétences à travailler (prérequis immédiats — priorités phase A)
- [ ] SCSS : variables CSS, Flexbox, Grid, nesting, dark mode, media queries
- [x] TypeScript de base (interfaces, types) — pour les mocks typés
- [x] Standalone components, control flow @if/@for (reste : @Input à pratiquer)
- [ ] (Phase B) Signals, services injectables, reactive forms, RxJS minimal

## Workflow Git (à suivre par le mentor à chaque étape)
- Stratégie : GitHub Flow — `main` toujours stable, une branche `feat/...` par implémentation, merge dans `main` après validation en revue. (`dev` abandonné tant qu'il n'y a pas de déploiement — à reconsidérer en phase déploiement.)
- Le mentor indique les moments opportuns de commit/push/merge + suggère le message ; l'utilisateur tape lui-même les commandes.
- Commit = état cohérent qui compile, une unité logique par commit.
- Messages : anglais, Conventional Commits (feat/fix/style/refactor/chore/docs).
- Push : fin de session + avant merge. Merge dans main : après validation mentor.

## Blocages
- (aucun)

## Prochaine étape
Poser le socle : structure de dossiers, design tokens SCSS à partir du tailwind.config.js, puis premier écran (landing page).

## Notes pédagogiques
- Compris (avec aide) : MonthSelector = service + signal car source de vérité unique partagée entre écrans (équivalent du store Zustand).
