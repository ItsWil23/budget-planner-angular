## Tâche : BudgetService — report et ajustement du solde d'ouverture
Lot : 1 (`roadmap.md` § 4, tâche 6)
Branche : `feat/lot1-opening-balance` (créée depuis `main` à jour)

### Contexte
Les tâches 4a/4b gèrent les lignes prévues et l'ouverture d'un mois ; la tâche 5 calcule les réels. Cette tâche
complète `BudgetMonth.openingBalanceCents` : report du solde de clôture réel, ajustement manuel et retour au calcul
automatique. Elle ne contient pas d'interface.

### Décisions retenues (validées 2026-11-03)
- Le mois M reçoit la **clôture réelle** du mois calendaire précédent M-1, si M-1 est initialisé.
- Si le mois calendaire précédent n'est pas initialisé, l'ouverture de M vaut `0` centime. Ne pas initialiser
  automatiquement des mois antérieurs.
- L'ouverture ajustée manuellement reste fixe lorsque des mois antérieurs sont corrigés. Le recalcul reprend après
  ce mois à partir de sa clôture réelle, jusqu'au prochain mois ajusté.
- Une ouverture manuelle peut être négative (découvert) ; la valeur saisie est un entier en centimes.
- L'utilisateur peut effacer l'ajustement et revenir au calcul automatique.
- L'ajout, la modification ou la suppression d'une transaction dans un mois antérieur recalcule les ouvertures
  automatiques des mois suivants. Les changements de `BudgetLine` ne modifient pas une clôture réelle ni son report.
  Le calcul est réactif au signal des transactions.

### Mise à jour documentaire à faire par le PM sur cette branche
- `.ai/domain-model.md` § 4 : remplacer la portée actuelle de la cascade par la règle validée ci-dessus,
  notamment : un mois ajusté est une borne fixe, mais le report reprend depuis sa clôture réelle après cette borne.
- `.ai/product-vision.md` § 13 : consigner cette précision, et la règle selon laquelle le premier mois ouvert sans
  mois précédent initialisé a une ouverture de 0.
- L'IA dev ne modifie pas ces fichiers.

### Ce qu'il faut faire
1. Modifier `src/app/models/budget-summary.ts` : ajouter à `BudgetMonthSummary` :
   - `openingBalanceCents: number` — ouverture du mois courant ;
   - `actualClosingBalanceCents: number` — `openingBalanceCents + revenusRéels - dépensesRéelles`.
2. Modifier `src/app/services/budget.ts` :
   - Conserver `BudgetMonth` comme seule source pour savoir quels mois sont initialisés et lesquels sont ajustés.
     `BudgetMonth.openingBalanceCents` contient la valeur manuelle quand `openingBalanceOverridden` vaut `true`.
    - Conserver `_months` comme état des mois initialisés et de leurs overrides ; exposer `months` en lecture seule
    comme `computed<BudgetMonth[]>`, avec les mois initialisés triés par `monthKey` et l'ouverture automatique
    recalculée pour chaque mois sans override. La valeur de `openingBalanceCents` stockée dans `_months` est la
    source de vérité uniquement quand `openingBalanceOverridden` vaut `true`.
   - Modifier `openMonth(monthKey)` : pour un nouveau mois, initialiser `openingBalanceCents` à la clôture réelle
     de M-1 si M-1 est initialisé ; sinon `0`. Préserver l'idempotence d'un mois déjà initialisé et tous les
     comportements des tâches 4a/4b.
   - Ajouter `setOpeningBalanceOverride(monthKey: string, openingBalanceCents: number): BudgetMonth` :
     - valider le mois ; exiger que le mois soit déjà initialisé, sinon `throw new Error('Budget month not initialized')` ;
     - accepter tout entier signé (y compris valeur négative) ; refuser une valeur non entière par
       `throw new Error('Invalid opening balance')` ;
     - enregistrer la valeur et mettre `openingBalanceOverridden: true`.
   - Ajouter `clearOpeningBalanceOverride(monthKey: string): BudgetMonth` : exiger un mois initialisé ; remettre
     `openingBalanceOverridden: false` et rétablir l'ouverture automatique selon M-1, ou `0` si M-1 n'est pas initialisé.
   - Ajouter `openingBalanceCentsFor(monthKey: string): number` et `actualClosingBalanceCentsFor(monthKey: string): number`
     pour les calculs des ouvertures suivantes et les assertions de tests. Les méthodes valident `monthKey` et ne
     modifient pas l'état. Pour un mois non initialisé, `openingBalanceCentsFor` renvoie le report automatique
     calculable (clôture réelle du précédent s'il est initialisé, sinon 0), sans initialiser le mois.
     `actualClosingBalanceCentsFor` applique cette ouverture calculée au net réel des transactions du mois, et ne
     crée pas non plus de `BudgetMonth`.
   - Le solde de clôture réel est calculé depuis **toutes** les transactions du mois (filtrées par `monthKey` et
     `type`), pas depuis les catégories, afin qu'une transaction reste dans la trésorerie même si sa catégorie
     n'est plus résoluble :
     `openingBalanceCents + sum(income.amountCents) - sum(expense.amountCents)`.
   - Pour chaque mois initialisé M sans override : ouverture = clôture réelle du mois calendaire M-1 si M-1 est
     initialisé, sinon 0. Ne jamais chercher le mois initialisé le plus récent en sautant un mois calendaire absent.
     Parcourir les mois initialisés par ordre `monthKey` pour dériver `months`. Un mois avec
     `openingBalanceOverridden: true` conserve son ouverture stockée ; son solde de clôture réel devient la base du
     mois calendaire suivant. Réappliquer la même règle jusqu'au prochain override, y compris avec plusieurs
     overrides et des mois manquants.
   - Les corrections des transactions d'un mois recalculent sa clôture réelle, puis les ouvertures automatiques en
     aval. Une modification de `BudgetLine` ne change pas une clôture réelle ni son report.
   - Ajouter `openingBalanceCents` et `actualClosingBalanceCents` à `monthSummary`, calculés à partir des signaux.
     Ne stocker aucun solde de clôture.
3. Modifier `src/app/services/budget.spec.ts` : garder tous les tests de 4a/4b/5 et ajouter les tests ci-dessous.

### Tests obligatoires (ajout dans `budget.spec.ts`)
- Ouvrir juillet 2026 sans juin initialisé : `openingBalanceCents === 0`.
- Ouvrir juillet puis août 2026 : avec les mocks, juillet clôture à `160000` centimes (245000 revenu - 85000 dépense),
  et l'ouverture d'août vaut `160000`.
- Une modification du prévu seule ne change pas la clôture réelle.
- Une nouvelle transaction réelle ajoutée à juillet recalcule la clôture de juillet et l'ouverture automatique d'août.
- Ajustement manuel d'août à `-5000` : conserve exactement `-5000`, `openingBalanceOverridden === true`, et met à jour
  la clôture réelle d'août selon ses transactions.
- Après cet ajustement d'août, septembre prend la clôture réelle d'août. Si juillet change, l'ouverture manuelle
  d'août reste inchangée, mais septembre et les mois automatiques après septembre se recalculent à partir de la
  clôture d'août.
- Avec deux overrides (août et octobre), une modification de juillet laisse l'ouverture d'août et celle d'octobre
  inchangées ; septembre recalcule depuis la clôture réelle d'août et novembre repart depuis la clôture réelle
  d'octobre.
- `clearOpeningBalanceOverride('2026-08')` remet août en automatique depuis la clôture réelle de juillet et
  recalcule les mois suivants.
- Un mois non initialisé ne peut pas être ajusté ni remis en automatique : erreur `Budget month not initialized`.
- Valeur manuelle négative acceptée ; valeur `1.5` refusée avec `Invalid opening balance` et l'état reste inchangé.
- Ouvrir juillet puis septembre sans août : ouverture de septembre `0`, même si juillet est initialisé.
  Ouvrir ensuite août recalcule la chaîne : août prend la clôture de juillet et septembre celle d'août.
- `monthSummary().openingBalanceCents` et `actualClosingBalanceCents` correspondent aux méthodes du service et sont
  réactifs au changement du mois, aux ouvertures et aux transactions.
- Lire `actualClosingBalanceCentsFor` pour un mois non initialisé renvoie `openingBalanceCentsFor(monthKey)` plus
  le net réel des transactions du mois, sans initialiser le mois ni modifier `months()`.
- Aucun test existant supprimé.

### Fichiers concernés
- Modifier : `src/app/models/budget-summary.ts`, `src/app/services/budget.ts`, `src/app/services/budget.spec.ts`.
- PM seulement : `.ai/domain-model.md` § 4 et `.ai/product-vision.md` § 13 (voir la section documentaire ci-dessus).
- Ne pas modifier : mocks, `TransactionService`, `CategoryService`, `RecurringRuleService`, pages ou composants.

### Critères d'acceptation
- `openMonth()` reporte la clôture réelle du mois immédiatement précédent seulement s'il est initialisé ; sinon 0.
- L'ajustement manuel accepte les centimes signés, met le flag d'override, et peut être effacé pour reprendre le report automatique.
- Les ouvertures automatiques et clôtures réelles se recalculent réactivement ; une ouverture manuelle reste fixe,
  puis le report reprend depuis la clôture réelle de ce mois.
- `monthSummary` expose les soldes d'ouverture et de clôture réelle sans dupliquer de l'état calculé.
- Tests 4a, 4b, 5 existants et nouveaux tests 6 verts ; aucun test supprimé.
- `npx tsc -p tsconfig.app.json --noEmit` et `npx tsc -p tsconfig.spec.json --noEmit` : code 0 (mode strict actif).
- `npm run build` passe. Seul avertissement autorisé : le budget SCSS connu de `category-card.scss`.
- `npx ng test --no-watch` : tout vert, sortie lue sur disque.
- Aucun `any`, aucun cast `as`. Aucun composant n'importe un mock.

### Hors périmètre pour cette tâche
- Édition/suppression de transactions, UI du Budget Mensuel et saisie visuelle du solde : lots 2 et 1, tâches UI 9 à 13.
- Solde de clôture prévisionnel et Dashboard : pas de nouveau champ de résumé dans cette tâche.
- Édition de catégories ou sous-catégories : lot 4.
- Dépendances npm : aucune. Ne pas toucher à `package.json` ni `package-lock.json`.
- Mise à jour de la roadmap : faite par le PM après revue, sur la branche. Les changements à `domain-model.md` et
  `product-vision.md` listés plus haut sont faits par le PM avant le démarrage du développement.

### Références
- `.ai/domain-model.md` § 2 (`BudgetMonth`), § 3 (clôtures réelle/prévue), § 4 (report et cascade), § 5 (centimes entiers).
- `AGENTS.md` : montants en centimes, signals, pas de `any`.
- `ARCHITECTURE.md` : services et calculs dérivés en `computed`.
- `.ai/roadmap.md` § 4, Lot 1, tâche 6.
