# Modèle de domaine — Budget Planner v3

> Contrat de données de référence. Le front est codé contre ce modèle ; le backend (phase B) devra le respecter.
> Dernière mise à jour : 2026-10-23

---

## 1. Principe central

Le produit repose sur **deux objets distincts qui se comparent** :

```
BUDGET PRÉVU                          BUDGET RÉEL
BudgetLine (par catégorie)    <-->    Transaction (saisies utilisateur)
alimenté semi-auto                    saisi manuellement, jamais généré
par les RecurringRule
```

Règles qui en découlent :

- **Le prévu ne s'exprime jamais en transactions.** Pas de `is_planned` (contrairement à la v2).
- **Le réel n'est jamais stocké comme un total.** Il est **toujours recalculé** depuis les transactions.
  → La colonne `budget_lines.actual_amount` de la v2 est supprimée : une valeur dénormalisée finit toujours par diverger.

## 2. Entités

### `Category` / `Subcategory`

Hiérarchie à deux niveaux exactement, pas de récursivité.

```ts
type CategoryType = 'income' | 'expense';

interface Category {
  id: string;
  name: string;
  type: CategoryType;
  color: string;   // pastille d'identification visuelle
  icon?: string;
  archived?: boolean;  // true si supprimée alors qu'elle portait des transactions ; absent/false sinon
}

interface Subcategory {
  id: string;
  categoryId: string;
  label: string;
  archived?: boolean;
}
```

**Décision** : on conserve deux entités distinctes plutôt que l'auto-référence `parent_id` du schéma v2. Plus explicite, plus simple à typer, et la v2 avait de toute façon les deux mécanismes en parallèle (redondance à ne pas reproduire).

**Épargne et crédits sont des catégories de type `expense`**, pas des types de transaction. Les valeurs `saving` et `credit` du schéma v2 disparaissent.

**Une catégorie peut exister sans sous-catégorie**, mais elle est alors **inutilisable pour la saisie** : le formulaire de transaction exige une sous-catégorie. La contrainte est au niveau du formulaire, pas du modèle. Garde-fous à implémenter, sous peine d'impasse silencieuse :

- **Formulaire de transaction** : une catégorie sans sous-catégorie reste **visible mais désactivée**, avec l'explication et un raccourci pour en créer une. Jamais simplement masquée — l'utilisateur la chercherait en vain.
- **Écran Catégories** : une telle catégorie est signalée comme **incomplète**, pas par un état vide neutre.
- **Création d'une catégorie** : le formulaire **propose** une première sous-catégorie (champ pré-rempli, supprimable). Non obligatoire, mais c'est le chemin par défaut.

> ⚠️ Effet de bord : une catégorie sans sous-catégorie ne peut recevoir **aucun montant prévu** — le prévisionnel
> se saisit au niveau sous-catégorie (voir `BudgetLine` ci-dessous), et il n'existe aucune sous-catégorie à
> laquelle l'attacher. Elle affichera indéfiniment « prévu 0 € / réel 0 € » dans le Budget Mensuel, ce qui
> ressemble à un état vide neutre — à distinguer de son signalement **incomplète** dans l'écran Catégories.

### Suppression et archivage (`Category` / `Subcategory`)

Une catégorie ou sous-catégorie **sans aucune transaction qui la référence** se supprime normalement (comportement
actuel, inchangé). Une catégorie ou sous-catégorie **qui porte au moins une transaction** ne peut pas être
supprimée : la suppression casserait l'affichage de l'historique.

- La suppression est **bloquée**, pas simplement refusée en silence : un message explique pourquoi et propose
  d'**archiver** à la place.
- **Archiver** = `archived: true`. L'entité n'est jamais retirée du tableau en mémoire ; elle disparaît des listes
  de sélection (formulaire de transaction, génération de `BudgetLine`) mais reste résolvable pour l'historique
  (nom, couleur) sur les transactions déjà saisies.
- Pas de case « supprimer quand même » qui détruirait la référence : une fois une transaction attachée, la seule
  option disponible est d'archiver.
- La restauration d'une entité archivée n'est pas exposée dans l'UI v3 (pas de besoin exprimé), mais `archived` est
  un simple booléen, pas une suppression logique irréversible : une évolution future peut l'exposer sans changement
  de modèle.

### `Transaction` — le réel

```ts
interface Transaction {
  id: string;
  monthKey: string;        // 'YYYY-MM', dérivé de date, indexé
  date: string;            // ISO 'YYYY-MM-DD'
  label: string;
  amountCents: number;     // entier, en centimes ; toujours > 0, le signe vient du type
  categoryId: string;
  subcategoryId: string;   // obligatoire
  type: CategoryType;      // dérivé de la catégorie, jamais saisi
  createdAt: string;
}
```

- `type` est **déduit** de la catégorie choisie (déjà implémenté dans le `TransactionForm` actuel).
- `subcategoryId` est **obligatoire** : toute transaction est classée jusqu'au niveau fin. C'est ce qui rend les analyses détaillées possibles et évite la catégorie fourre-tout. Corollaire : le formulaire ne peut pas être validé sans sous-catégorie, donc une catégorie qui n'en possède aucune n'est pas sélectionnable (voir § 2, `Category`).
- Les champs `accountId` et `is_planned` de la v2 sont supprimés.

### `BudgetLine` — le prévu

```ts
interface BudgetLine {
  id: string;
  monthKey: string;
  categoryId: string;       // dénormalisé depuis la sous-catégorie, pratique pour les agrégats
  subcategoryId: string;    // obligatoire : le prévu se saisit toujours au niveau sous-catégorie
  plannedAmountCents: number;   // entier, en centimes ; > 0
  sourceRuleId?: string;   // récurrence à l'origine de la ligne, le cas échéant
}
```

- Une ligne par couple (sous-catégorie, mois). **Unicité à garantir.**
- **Décision corrigée (2026-10-23)** : le prévisionnel se saisit **au niveau sous-catégorie**, comme en v2
  (`budget_lines.subcategory_id` y est déjà la clé de saisie, `category_id` n'étant qu'une dénormalisation
  pratique). Le prévu d'une catégorie est **toujours calculé**, jamais stocké : c'est la somme des `BudgetLine`
  de ses sous-catégories (§ 3). Corrige la décision du 2026-10-22, qui inversait le niveau de saisie.
- Dans le tableau du Budget Mensuel, la ligne de sous-catégorie porte le champ `plannedAmountCents` modifiable ;
  la ligne de catégorie n'affiche qu'un total agrégé en lecture seule (prévu et réel), jamais de saisie directe.
- Corollaire : une catégorie **sans sous-catégorie** ne peut recevoir aucun montant prévu (voir § 2, `Category`).

### `RecurringRule` — l'automatisation du prévu

```ts
interface RecurringRule {
  id: string;
  label: string;
  categoryId: string;
  subcategoryId: string;   // obligatoire : une règle génère des BudgetLine, qui exigent une sous-catégorie
  amountCents: number;
  dayOfMonth?: number;     // indicatif, pour l'affichage des échéances
  startMonth: string;      // 'YYYY-MM'
  endMonth?: string;       // absent = sans fin
  active: boolean;
}
```

Une règle **ne crée jamais de transaction**. Elle pré-remplit les `BudgetLine` à l'ouverture d'un mois. L'utilisateur peut modifier ou supprimer la ligne générée sans toucher à la règle.

### `BudgetMonth` — le contexte

```ts
interface BudgetMonth {
  monthKey: string;              // 'YYYY-MM' — identifiant naturel
  openingBalanceCents: number;   // entier, en centimes ; peut être négatif
  openingBalanceOverridden: boolean;  // true si ajusté à la main
  initialized: boolean;          // true une fois le mois ouvert
}
```

`openingBalanceCents` est **reporté automatiquement** du solde de clôture du mois précédent, et **ajustable
manuellement** en cas d'écart avec la banque. `openingBalanceOverridden` sert à ne pas écraser une correction
utilisateur lors d'un recalcul.

### `UserSettings`

```ts
interface UserSettings {
  theme: 'dark' | 'light' | 'system';   // défaut : 'dark'
  palette: string;                       // identifiant de palette, défaut = couleur de marque (A)
  backgroundSeed: number;                // mesh gradient : nombre aléatoire tiré une fois, puis figé
  language: 'fr' | 'en';                 // défaut : 'fr'
  currency: string;                      // ISO 4217, défaut 'EUR'
  locale: string;                        // formatage nombres/dates, dérivé de language
}
```

`language` pilote les libellés de l'interface (i18n runtime). `locale` pilote le formatage des nombres et des dates (`LOCALE_ID`) — aujourd'hui figé à `fr-FR` dans la configuration de l'application, à rendre dynamique.

`palette` ne modifie **que** l'accent et les teintes du fond. Les couleurs sémantiques (revenu, santé budgétaire, dépassement) sont invariantes.
`backgroundSeed` est tirée au hasard (`crypto.getRandomValues`) au premier lancement puis ne change plus : chaque utilisateur a son propre fond, stable d'une session à l'autre. Elle n'est **jamais dérivée de l'identifiant utilisateur** — l'algorithme de dérivation étant du code front, donc public, le fond deviendrait un identifiant observable.

## 3. Règles de calcul

Toutes les valeurs ci-dessous sont **calculées**, jamais stockées.

```
revenusPrevus     = Σ BudgetLine  où category.type = 'income'
revenusReels      = Σ Transaction où type = 'income'
depensesPrevues   = Σ BudgetLine  où category.type = 'expense'
depensesReelles   = Σ Transaction où type = 'expense'
montantNonAlloue  = revenusPrevus - depensesPrevues     // bandeau d'allocation du Budget Mensuel

soldeClotureReel  = openingBalanceCents + revenusReels  - depensesReelles
soldeCloturePrevu = openingBalanceCents + revenusPrevus - depensesPrevues

resteADepenser    = depensesPrevues - depensesReelles   // « ce qu'il me reste dans mon budget »
disponibleReel    = soldeClotureReel                    // « ce que j'ai réellement en poche »

// Niveau sous-catégorie (BudgetLine) — granularité de saisie
ecartLigne(l)       = reelDeLaLigne(l) - l.plannedAmountCents
tauxConsommation(l) = reelDeLaLigne(l) / l.plannedAmountCents

// Niveau catégorie — toujours agrégé depuis ses sous-catégories, jamais saisi
prevuCategorie(c)   = Σ BudgetLine  où categoryId = c.id
reelCategorie(c)    = Σ Transaction où categoryId = c.id
ecartCategorie(c)   = reelCategorie(c) - prevuCategorie(c)
tauxCategorie(c)    = reelCategorie(c) / prevuCategorie(c)
```

> **Décision** : la v1 appelait « reste à vivre » la formule `revenus - dépenses réelles`, ce qui mélangeait deux notions. On distingue désormais **reste à dépenser** (budget restant) et **disponible réel** (trésorerie).
> **`resteADepenser` est le chiffre héros du Dashboard** — c'est le seul des deux sur lequel l'utilisateur peut encore agir. `disponibleReel` est affiché en indicateur secondaire.

**Statut d'une ligne de budget** (pilote la couleur dans l'UI) :

| Condition | Statut |
|---|---|
| taux ≤ 80 % | `under` — sous le budget |
| 80 % < taux ≤ 100 % | `on-track` — proche de la limite |
| taux > 100 % | `over` — dépassé |

Seuils centralisés dans une constante, jamais en dur dans un composant.

## 4. Cycle de vie d'un mois

```
1. OUVERTURE   openingBalanceCents ← solde de clôture du mois précédent
               BudgetLine ← générées depuis les RecurringRule actives
               (+ option « reprendre le budget du mois précédent »)

2. AJUSTEMENT  l'utilisateur ajoute / modifie / supprime des lignes prévues

3. SUIVI       saisie des transactions réelles ; écarts recalculés en continu

4. CLÔTURE     implicite : le solde de clôture devient l'ouverture du mois suivant
```

Un mois n'est **jamais verrouillé** : l'utilisateur peut corriger un mois passé. Le report se recalcule en cascade, sauf sur les mois dont l'ouverture a été ajustée manuellement.

**Portée de la cascade (décision 2026-10-22)** : au changement d'un mois M, le solde recalculé se propage aux mois
suivants, mois par mois, tant que `openingBalanceOverridden` est `false`. Dès qu'un mois suivant a
`openingBalanceOverridden: true`, la cascade s'arrête à cet endroit : son solde d'ouverture reste la valeur
ajustée à la main, et les mois encore après lui ne sont pas recalculés non plus (ils dépendent de ce solde ajusté,
pas de la chaîne d'origine).

## 5. Conventions techniques

| Sujet | Règle |
|---|---|
| **Identifiants** | `string` UUID. Phase A : `crypto.randomUUID()`. |
| **Montants** | **Entiers, en centimes.** `amount: 1234` signifie 12,34 €. Les flottants binaires ne représentent pas exactement 0,1 : `0.1 + 0.2` vaut `0.30000000000000004`. Sur un budget qui additionne des dizaines de lignes puis compare deux totaux, cela produit des écarts fantômes et des taux à 100,0000001 % classés « dépassé ». Les entiers sont exacts. Conversion euros ↔ centimes dans les services, en entrée et en sortie ; affichage via un formateur centralisé. |
| **Signe** | Les montants sont toujours positifs. Le sens vient de `type`. |
| **Dates** | ISO `YYYY-MM-DD` en `string`. Pas d'objet `Date` dans le modèle. |
| **Mois** | `monthKey` au format `'YYYY-MM'`. Triable lexicographiquement, utilisable comme clé. |
| **Immutabilité** | Aucune mutation en place. Les signals sont mis à jour via `update()` avec une nouvelle référence. |
| **Nullabilité** | `undefined` pour l'absence de valeur, pas `null`. |

## 6. Couche d'accès aux données

**Règle non négociable : aucun composant n'accède directement aux mocks.**

```
Composant  →  Service Angular typé  →  [ phase A : mocks en mémoire ]
                                       [ phase B : HTTP vers le backend ]
```

Services prévus : `CategoryService`, `TransactionService`, `BudgetService`, `RecurringRuleService`, `MonthContextService`, `SettingsService`, `ThemeService`.
- `MonthContextService` détient le `monthKey` courant sous forme de signal — c'est la source de vérité partagée par tous les écrans (l'équivalent du store Zustand de la v2).
- Les agrégations (KPI, écarts, totaux par catégorie) sont exposées en `computed()` dérivés des signals de données, **jamais recopiées dans un état**.
- En phase B, seul l'intérieur des services change. Aucun composant ne doit être modifié.

## 7. Écarts assumés avec le schéma v2

| v2 | v3 | Raison |
|---|---|---|
| `accounts` + `solde_initial` | `BudgetMonth.openingBalanceCents` | Multi-comptes hors périmètre ; le solde mensuel suffit |
| `transactions.is_planned` | supprimé | Le prévu s'exprime en `BudgetLine` |
| `transactions.type` à 4 valeurs | 2 valeurs | Épargne et crédits sont des catégories de dépense |
| `budget_lines.actual_amount` | supprimé | Toujours recalculé depuis les transactions |
| `categories.parent_id` **et** table `subcategories` | `Category` + `Subcategory` | Redondance supprimée |
| `user_settings.fine_planning_enabled` | supprimé | Pas de mode avancé |
| `budget_month.id` (UUID) | `monthKey` (`'YYYY-MM'`) | Identifiant naturel, pas de jointure inutile |
| `transactions.subcategory_id` nullable | **obligatoire** | Toute transaction est classée au niveau fin |
| montants en `numeric` décimal | entiers en centimes | Exactitude des additions et des comparaisons |
| — | `user_settings.language` | Interface bilingue FR / EN |

## 8. Questions ouvertes

- Les libellés de catégories sont saisis par l'utilisateur, donc non traduisibles. Que deviennent les catégories par défaut proposées à l'inscription quand l'utilisateur change de langue ?

> Résolues le 2026-10-22 : suppression/archivage d'une catégorie ou sous-catégorie portant des transactions (§ 2),
> formule du montant non alloué (§ 3), portée de la cascade du solde d'ouverture (§ 4). Granularité du
> prévisionnel tranchée le 2026-10-23 : saisie au niveau sous-catégorie, catégorie toujours agrégée (§ 2,
> `BudgetLine` ; corrige l'inverse écrit par erreur le 2026-10-22).
