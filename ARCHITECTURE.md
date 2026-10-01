# Architecture — Budget Planner v3

> Contexte technique complet pour l'agent de développement. Décisions produit : [`PRD.md`](./PRD.md).
> Règles visuelles : [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md). Modèle de données : [`.ai/domain-model.md`](./.ai/domain-model.md).
> Dernière mise à jour : 2026-09-23

## System overview

```
Utilisateur
   ↓
Angular 22 (standalone components, signals) — phase A
   ↓
Services Angular typés (CategoryService, TransactionService, BudgetService,
RecurringRuleService, MonthContextService, SettingsService, ThemeService)
   ↓
Phase A : mocks en mémoire (src/app/mocks/)
Phase B : backend HTTP (développé par un tiers, non démarré à ce jour)
```

**Règle non négociable** : un composant n'accède **jamais** directement à un mock. Tout passe par un service. En
phase B, seul l'intérieur du service change ; aucun composant ne doit être modifié pour ce changement.

## Tech stack

| Domaine | Choix |
|---|---|
| Framework | Angular 22, composants standalone uniquement (pas de `NgModule`) |
| État | Signals natifs (`signal`, `computed`, `effect`) — pas de NgRx, pas de store externe |
| Formulaires | Reactive Forms typés (`FormBuilder.nonNullable`) |
| Style | SCSS pur, variables CSS (tokens `DESIGN_SYSTEM.md`) — **pas de Tailwind** |
| i18n | Runtime, bibliothèque à choisir (Transloco pressenti) — pas l'i18n natif Angular (compile un bundle par langue, incompatible avec un sélecteur dans les paramètres) |
| Tests | Vitest (déjà configuré, `npm test`) |
| Lint | **Non configuré à ce jour** — dette technique, ne pas inventer de commande |
| Gestionnaire de paquets | npm |
| Backend (phase B) | Non démarré. Développé par un tiers ; le contrat de données est `.ai/domain-model.md` |
| Déploiement | Non défini à ce jour (v1 est sur Vercel, à titre de référence) |
| PWA | Pas encore configurée — à ajouter (manifest, service worker, icônes) |

## Project structure

```
src/app/
  app.routes.ts       # Route racine (landing, auth) + route pathless MainLayout (children)
  components/
    layout/           # MainLayout, Sidebar (navigation)
    ui/                # Composants réutilisables génériques (Modal, ThemeSwitch, Card, etc.)
  pages/               # Écrans routés : auth, dashboard, budget-mensuel, categories, transactions, settings, landing
  models/              # Interfaces TypeScript — source de vérité du typage (voir .ai/domain-model.md)
  mocks/               # Données en mémoire, phase A uniquement
  services/            # Couche d'accès aux données, seule autorisée à toucher les mocks/HTTP
```

Convention à respecter pour toute nouvelle fonctionnalité : modèle dans `models/`, accès dans `services/`, écran
dans `pages/`, composant réutilisable dans `components/ui/`. Ne pas créer de nouvelle racine de dossier sans
justification.

## Routing actuel

```ts
{ path: '', pathMatch: 'full', component: Landing },
{ path: 'auth/login', component: Auth },
{ path: 'auth/register', component: Auth },
{
  path: '', component: MainLayout, children: [
    { path: 'dashboard', component: Dashboard },
    { path: 'transactions', component: Transactions },
    { path: 'categories', component: Categories },
    { path: 'budget-mensuel', component: BudgetMensuel },
    { path: 'settings', component: Settings },
  ],
},
{ path: '**', redirectTo: '' },
```

Lazy loading (`loadComponent`) à appliquer avant la fin de la phase A — pas encore fait à ce jour.

## Data flow

1. Un composant de page injecte un service (jamais un mock directement).
2. Le service expose des `signal`/`computed` en lecture, et des méthodes de mutation (`add`, `update`, `remove`).
3. Les agrégations (KPI, écarts prévu/réel, totaux par catégorie) sont des `computed()` dérivés des signals de
   données — jamais recalculées ni recopiées dans un état séparé.
4. `MonthContextService` détient le `monthKey` courant (`'YYYY-MM'`) : c'est la source de vérité partagée par tous
   les écrans (équivalent du store Zustand de la v2).
5. Phase B : les méthodes des services passeront de manipulations en mémoire à des appels HTTP. La signature
   publique des services ne doit pas changer.

## Database & storage

Aucune base de données en phase A (mocks en mémoire, non persistés). Phase B : backend et base à définir avec le
tiers développeur, en respectant le contrat de `.ai/domain-model.md` (entités, règles de calcul, montants en
centimes entiers).

## External services

Aucun à ce jour. Prévus en phase B : backend HTTP (tiers), potentiellement OAuth Google pour l'authentification.

## Déploiement

Non défini. À trancher avec le backend en phase B (la v1 utilise Vercel).

## Notes d'évolutivité

- Chaque widget du Dashboard doit être un composant autonome, sans connaissance de sa position — condition pour la
  grille réarrangeable prévue en v3.1 (voir `.ai/product-vision.md` § 14).
- Palette et thème pilotés par attributs (`data-theme`, `data-palette`) sur la racine, jamais par des classes
  dispersées dans les composants.
