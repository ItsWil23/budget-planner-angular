# Roadmap — Budget Planner v3

> Plan de livraison. Chaque lot se découpe en tâches assez petites pour un modèle local 7B (voir `AGENTS.md` § before
> you start) : une tâche = un composant, un service, ou une correction ciblée, jamais un lot entier d'un coup.
> Chaque tâche se termine par une Pull Request relue avant fusion.
> Dernière mise à jour : 2026-10-01

## 1. Pourquoi cet ordre

L'ordre de **construction** suit `PRD.md` (Budget Mensuel → Transactions → Dashboard → Catégories → Paramètres),
mais un lot 0 s'intercale avant : le nouveau design system (cartes flottantes, mesh gradient, palettes, typographie,
i18n) restructure des fondations que les écrans déjà construits en phase A (landing, layout, auth, catégories,
transactions) ne respectent pas encore. Continuer sans ce lot ferait cohabiter deux styles visuels dans la même
application.

## 2. Vue d'ensemble

| Lot | Contenu | Statut |
|---|---|---|
| 0 | Fondations design + données + services | À faire — bloquant |
| 1 | Budget Mensuel | À faire — écran cœur |
| 2 | Transactions — finalisation | Partiellement fait (v3 phase A) |
| 3 | Dashboard | À faire |
| 4 | Catégories — reprise | Fait en phase A, à corriger |
| 5 | Paramètres | À faire |
| 6 | Auth & Landing — restyle | Fait en phase A, à restyler |
| 7 | PWA & transverse | À faire |

## 3. Lot 0 — Fondations (bloquant, à faire en premier)

### Design
- [x] **Tokens SCSS remplacés par les variables de `DESIGN_SYSTEM.md`** (`data-theme`, `data-palette`, échelle de
  luminance, palette terracotta, pont de compatibilité temporaire). Fait le 2026-09-28 (`src/styles.scss`).
  Reste à faire dans la foulée : poser `data-theme`/`data-palette` sur `<html>` (`theme.ts`, `index.html`) pour que
  les tokens prennent effet visuellement — sans ça, les écrans restent non stylés (comportement attendu).
- Police Plus Jakarta Sans auto-hébergée + police de secours ajustée en métriques (`DESIGN_SYSTEM.md` § 5.1).
- Mesh gradient de fond : génération bornée, graine aléatoire stockée, jamais dérivée de l'identité. La logique 01a
  est implémentée et validée le 2026-10-01 (`Background`, PRNG mulberry32, validation de graine et gestion des erreurs
  de stockage). Persistance provisoire dans `localStorage` (clé `budget-planner.background-seed`) jusqu'à son transfert
  à `SettingsService` via `UserSettings.backgroundSeed`, puis suppression de cette persistance locale. Branchement
  visuel 01b implémenté et rendu validé le 2026-10-05 (thèmes clair/sombre, stabilité après rechargement).
- Layout racine : disposition « cartes flottantes », navigation en île pleine hauteur, `100dvh` desktop /
  défilement + tiroir mobile, topbar (titre, sélecteur de mois, menu compte).

### Données & services
- Interfaces mises à jour selon `.ai/domain-model.md` : `Transaction.subcategoryId` obligatoire, `BudgetLine`,
  `RecurringRule`, `BudgetMonth`, `UserSettings` étendu (`palette`, `backgroundSeed`, `language`).
- Montants convertis en entiers (centimes) dans les mocks et les modèles.
- Squelettes de services : `MonthContextService`, `BudgetService`, `RecurringRuleService`, `SettingsService` —
  `CategoryService`/`TransactionService` déjà amorcés à adapter.
- Bibliothèque i18n runtime installée (Transloco pressenti) + extraction des chaînes déjà écrites en dur (landing,
  auth, catégories, transactions).

**Definition of done** : un écran vide (ex. squelette de page) affiche déjà le bon fond, la bonne typographie, la
bonne navigation, et bascule thème/palette/langue depuis un état global fonctionnel.

## 4. Lot 1 — Budget Mensuel (écran cœur)

- Tables catégorie → sous-catégories, saisie du prévu (`BudgetLine.plannedAmount`), réel agrégé en regard.
- Bandeau d'allocation : revenus prévus, dépenses prévues, montant non encore alloué.
- Barre de progression prévu/réel par ligne, statut `under` / `on-track` / `over` (seuils `domain-model.md` § 3).
- Ouverture d'un mois : génération semi-automatique des lignes depuis les `RecurringRule` actives.
- Solde d'ouverture reporté automatiquement du mois précédent, ajustable manuellement
  (`BudgetMonth.openingBalanceOverridden`).

**Definition of done** : un mois complet peut être planifié de bout en bout, sans dépendre du Dashboard.

## 5. Lot 2 — Transactions (finalisation)

Déjà fait en phase A : liste, modal, formulaire d'ajout, filtrage catégorie/sous-catégorie. Reste à faire :

- Sous-catégorie obligatoire dans le formulaire ; catégorie sans sous-catégorie visible mais désactivée, avec
  raccourci pour en créer une (`domain-model.md` § 2).
- Édition et suppression d'une transaction existante (`readOnly` déjà prévu dans `TransactionList`).
- Styling SCSS selon le nouveau design system (pas encore fait).
- Interface de gestion des `RecurringRule` — **emplacement à trancher** : sous-écran de Transactions, ou accessible
  depuis Budget Mensuel ? à décider avant de commencer cette tâche.
- Pagination et tri : non bloquants pour la definition of done du produit, à faire si le temps le permet.

## 6. Lot 3 — Dashboard

- En-tête fixe : chiffre héros « reste à dépenser » + « disponible réel » en secondaire.
- Cartes KPI (revenus/dépenses du mois).
- Donut de répartition par catégorie (nécessite la palette catégorielle du lot 4).
- Résumé prévu vs réel (renvoie vers Budget Mensuel pour le détail par ligne).
- Dernières transactions (liste courte).

**Contrainte transverse** : chaque bloc est un composant autonome, sans connaissance de sa position — condition
posée dès la v3 pour permettre la grille réarrangeable de la v3.1 (`product-vision.md` § 14).

## 7. Lot 4 — Catégories (reprise)

- Catégorie sans sous-catégorie signalée comme **incomplète**, pas un état vide neutre (`domain-model.md` § 2).
- Sous-catégorie proposée par défaut à la création d'une catégorie (champ pré-rempli, supprimable).
- Palette catégorielle à produire : 8 à 10 teintes distinctes, contraste vérifié sur `--surface-card` dans les deux
  thèmes (`DESIGN_SYSTEM.md` § 4.5 — actuellement seulement 3 couleurs de maquette).
- Restyle selon le nouveau design system (îles, tokens).

## 8. Lot 5 — Paramètres

- Thème (sombre / clair / système), palette (5 options), langue (FR/EN), devise (affichage seul).
- Réinitialisation des données (mock).
- Menu compte dans la topbar : accès aux paramètres + déconnexion (composant accessible : Échap, piège de focus).

## 9. Lot 6 — Auth & Landing (restyle)

Fonctionnellement déjà faits en phase A. Restent : adaptation au nouveau design system, i18n des textes en dur,
et pour la landing — pattern hero + aperçu produit (amélioration déjà notée comme différée dans le journal
`.ai/refonte-angular.md`, à reprendre maintenant que le Dashboard va exister).

## 10. Lot 7 — PWA & transverse

- Manifest, icônes, service worker minimal.
- Lazy loading des routes (`loadComponent`).
- Vérification accessibilité : contrastes, focus visible, cibles tactiles ≥ 44px, `prefers-reduced-motion`.
- Vérification mobile-first sur tous les écrans (aucune fonction dépendante du survol seul).

## 11. Backlog de parité v2 → v3

État des fonctionnalités de la v2 (référence fonctionnelle gelée) face à la v3. « Abandonné » = décision actée dans
`product-vision.md` § 6, pas un oubli.

| Fonctionnalité v2 | Statut v3 |
|---|---|
| Dashboard : revenus / charges prévues / dépenses réelles / solde / reste à vivre | À refaire (lot 3), formules revues (`domain-model.md` § 3) |
| Dashboard : répartition par catégorie | À refaire (lot 3) |
| Dashboard : 5 dernières dépenses | À refaire (lot 3) |
| Sélecteur de mois synchronisé sur toute l'app | À refaire (lot 0, `MonthContextService`) |
| Page Budget mensuel / Overview | À refaire, restructurée (lot 1) — la version v2 « n'est pas bien réussie » (saisie sans retour visuel) |
| Table `budget_lines` (prévu/réel) | Reprise avec révision : `actual_amount` supprimé, toujours recalculé (`domain-model.md` § 1 et § 7) |
| Mode simple / mode avancé (planification fine) | ❌ Abandonné — un seul parcours |
| Transactions prévisionnelles (`is_planned`) | ❌ Abandonné — remplacé par `BudgetLine` |
| Comptes (`accounts`, solde initial) | ❌ Abandonné — remplacé par `BudgetMonth.openingBalance` |
| Catégories/sous-catégories personnalisées | Repris (lot 4), invariant sous-catégorie obligatoire ajouté |
| Transactions : saisie réelle, catégorisation | Repris (lot 2) |
| Paramètres : switch planification fine | ❌ Abandonné avec le mode avancé |
| Mode sombre | Repris et étendu (5 palettes au lieu d'un thème unique) |
| Dépenses récurrentes automatiques | Nouveau en v3 (lot 1/2, `RecurringRule`) — absent de la v2 |
| Graphiques interactifs prévu vs réel | Repris (lot 3), forme revue (barres + donut) |
| Export CSV | Non traité — jamais implémenté en v2, hors périmètre v3 |
| Support multilingue | Nouveau en v3 (lot 0) — la v2 ne l'avait pas |

## 12. Hors périmètre (rappel)

Multi-comptes, mode avancé, import CSV, agrégation bancaire, budget partagé, application native, multi-devise,
constructeur de graphiques sur mesure, navigation personnalisable. Détail et justification :
`.ai/product-vision.md` § 6 et § 14.

## 13. État des lieux au 2026-09-23

- Fait (phase A, style ancien à reprendre) : landing, layout + navigation, auth, catégories (CRUD hiérarchique),
  sidebar responsive.
- En cours : Transactions (liste + modal + formulaire d'ajout fonctionnels ; édition/suppression, styling,
  récurrences restants).
- Pas commencé : Budget Mensuel, Dashboard, Paramètres, PWA.
- Infrastructure IA dev : Aider puis Continue abandonnés après échecs répétés (voir `.ai/workflow.md` § 1) ;
  Claude Code (extension VS Code + Ollama, `qwen3-coder:14b`) utilisé depuis le 2026-09-28, première tâche
  réussie du premier coup. Fichiers `PRD.md` / `ARCHITECTURE.md` / `DESIGN_SYSTEM.md` / `AGENTS.md` / `CLAUDE.md`
  en place.
