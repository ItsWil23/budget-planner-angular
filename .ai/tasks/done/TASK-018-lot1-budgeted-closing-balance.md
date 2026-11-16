## Tâche : afficher le solde de clôture budgétée du mois
Lot : suivi transverse après Lot 1 (`roadmap.md`, suivis décidés après le Lot 1)
Branche après création de la spec : `feat/lot1-budgeted-closing-balance`

### Contexte
La synthèse du Budget Mensuel expose le solde d'ouverture, les revenus prévus, les dépenses prévues et le montant non alloué. L'utilisateur veut aussi voir le solde de fin de mois visé par ce budget. Ce KPI est le résultat du plan mensuel, pas une projection calculée au rythme des transactions.

### Décisions retenues
- Solde de clôture budgétée = solde d'ouverture du mois + revenus prévus − dépenses prévues.
- Cette valeur est mensuelle ; aucune métrique agrégée par catégorie/sous-catégorie et aucune projection dynamique des dépenses restantes n'est ajoutée.
- Utiliser deux îles sœurs sans cartes imbriquées : une île « Préparation du mois » à gauche et une île « Équation du mois » à droite.
- L'équation est toujours rendue et reste à la même position. Elle présente `Solde d'ouverture + Revenus prévus − Dépenses prévues = Clôture budgétée` ; le montant non alloué est une information secondaire dans la même île, car il correspond à `revenus prévus − dépenses prévues`.
- Garder un emplacement de préparation stable dans les deux états. Non préparé : état, aide courte, montant indicatif si utile et bouton « Préparer le mois ». Préparé : état automatique/manuel et actions Ajuster/Revenir au calcul automatique. La valeur d'ouverture n'est affichée qu'une fois, dans l'équation.
- **Desktop :** île de préparation compacte à gauche, environ 280–320px comme cible initiale ; équation à droite avec le reste de la largeur. L'équation peut réorganiser ses termes dans sa propre île aux largeurs intermédiaires, mais sa position reste fixe lors du changement de mois. Plafonner localement la largeur de l'équation sur très grands écrans pour garder les termes lisibles.
- **Mobile :** placer l'emplacement de préparation au-dessus de l'équation et préserver son encombrement entre les états préparé/non préparé afin que l'équation ne se déplace pas verticalement. L'équation utilise la largeur disponible et peut se disposer sur plusieurs rangées, sans débordement horizontal.
- Si le résultat exact sort de ±`Number.MAX_SAFE_INTEGER` centimes, ne pas l'arrondir : fournir un état indisponible localisé au lieu de passer une valeur non sûre à `MoneyPipe`.

### Ce qu'il faut faire
1. Ajouter `budgetedClosingBalanceCents: number | null` à `BudgetMonthSummary`.
2. Dans `BudgetService.monthSummary`, calculer l'ouverture + revenus prévus − dépenses prévues en `BigInt`, puis convertir en `number` uniquement si le résultat est dans la plage sûre. `null` signifie que la clôture budgétée ne peut pas être affichée exactement.
3. Dans `budget-mensuel.html`, remplacer la rangée de cinq cartes par l'île de préparation et l'île d'équation. Présenter ouverture, revenus prévus, dépenses prévues et clôture budgétée avec des opérateurs lisibles ; présenter non-alloué comme valeur secondaire. Ne pas dupliquer le montant d'ouverture.
4. Ajouter `budgetMensuel.budgetedClosingBalance` et l'état localisé « Indisponible » si la valeur est `null`.
5. Recomposer `OpeningBalance` comme île de préparation à emplacement stable, sans changer sa logique métier : contenu adapté à l'état préparé/non préparé.
6. Adapter `budget-mensuel.scss` à deux îles : rail de préparation compact à gauche, équation à droite sur desktop ; empilement mobile avec encombrement stable. Garder les limites de lecture locales et ne pas modifier la grille des catégories.
7. Ajouter les chaînes FR/EN et les tests service/UI ciblés.

### Fichiers concernés
- Modifier : `src/app/models/budget-summary.ts`, `src/app/services/budget.ts`, `src/app/services/budget.spec.ts`, `src/app/pages/budget-mensuel/budget-mensuel.html`, `budget-mensuel.scss`, `budget-mensuel.spec.ts`, `src/app/components/ui/opening-balance/opening-balance.html`, `opening-balance.scss`, `public/i18n/fr.json`, `public/i18n/en.json`.
- Modifier `opening-balance.ts` uniquement si nécessaire pour la présentation/accessibilité ; ne pas changer les contrats ou règles métier du solde.
- Ne pas modifier les transactions, modèles de transaction, mocks, `MoneyService`, `MoneyPipe`, routage, layout partagé ni autres pages.
- Aucun nouveau package.

### Tests obligatoires
- Service : vérifier la formule avec ouverture non nulle, revenus/dépenses prévus, résultat positif, nul et négatif.
- Vérifier que les modifications de prévu et le changement de mois mettent à jour le KPI par les signaux existants.
- Vérifier qu'un résultat sûr s'affiche via `MoneyPipe` avec le signe/locale attendus.
- Vérifier que le dépassement de la plage sûre produit `null` et l'état localisé indisponible, sans erreur `MoneyPipe`.
- Vérifier FR/EN, les noms accessibles des deux îles et des termes de l'équation, ainsi que l'absence de KPI au niveau catégorie/sous-catégorie.
- Vérifier visuellement à 375px, 1080px, 1280px, 1700px et 2400px, clair et sombre. L'équation doit garder le même x/y lorsque le mois passe de préparé à non préparé.
- Vérifier dans les états non préparé, automatique, manuel, édition et préparation refusée que le slot de préparation conserve sa position et que l'équation ne se déplace pas. Une alerte peut augmenter la hauteur du slot, jamais déplacer l'équation.
- À 2400px, vérifier que le rail de préparation reste compact et l'équation lisible ; aux largeurs intermédiaires, vérifier le repli interne de l'équation ; à 375px, vérifier l'empilement stable, l'accessibilité et l'absence de débordement.
- Vérifier que le montant d'ouverture n'apparaît qu'une fois, que le montant non alloué est secondaire et que les actions sont accessibles.
- `npx tsc -p tsconfig.app.json --noEmit`, `npx tsc -p tsconfig.spec.json --noEmit`, `npx ng test --no-watch` et `npm run build` passent. Aucun lint n'est configuré : ne pas inventer de commande.

### Critères d'acceptation
- Le KPI suit exactement la formule budgétée et ne dépend pas des transactions réelles.
- La clôture est calculée dans le service comme donnée dérivée et demeure exacte dans la plage sûre.
- Une valeur hors plage sûre est signalée comme indisponible ; aucun arrondi ou plafond métier n'est introduit.
- L'interface contient une île de préparation à gauche et une île d'équation fixe à droite sur desktop ; elles s'empilent sur mobile tout en conservant la position verticale de l'équation d'un état à l'autre.
- L'île d'ouverture ne répète pas la valeur d'ouverture affichée dans l'équation ; elle contient l'état, l'aide utile et les commandes adaptées au mois.
- L'équation montre ouverture, revenus prévus, dépenses prévues et clôture budgétée ; le montant non alloué reste secondaire. Ses termes sont lisibles aux résolutions testées.
- Montants, signes, actions existantes et calcul du montant non alloué restent inchangés ; aucune logique métier du solde d'ouverture n'est modifiée.
- Aucune métrique par catégorie/sous-catégorie, projection dynamique, donnée mutable dupliquée ou nouvelle dépendance n'est ajoutée.

### Hors périmètre
- Projection dynamique de fin de mois selon le rythme des transactions ou dépenses restantes.
- Métriques réelles du mois, graphiques et indicateurs du Dashboard.
- Refactor de la grille de catégories, débordement de table Transactions, nettoyage SCSS, gestion des récurrences et formulaire Transactions.

### Suivi de livraison — 2026-11-16
- Implémentation commitée dans `5214149` (`feat: add budgeted closing balance summary`).
- PR #55 vers `main` mergée le 2026-11-16 (`fa5a934`).
- Validations réussies : deux typechecks, 512 tests sur 33 fichiers, build et `git diff --check`. Le build conserve deux avertissements de budget SCSS.
- Contrôle visuel des corrections finales effectué en thème sombre, de 320px à 2400px, avec états automatique, manuel, édition et annulation. Le thème clair et les états non préparé/préparation refusée n'ont pas été vérifiés intégralement.

### Références
- `.ai/product-vision.md` § 9 et § 13 : rôle du Budget Mensuel et KPI de clôture budgétée retenu.
- `.ai/roadmap.md` § 4, TASK-018.
- `.ai/domain-model.md` § 3–4 : montants, ouverture et clôture réelle distincte.
- `src/app/models/budget-summary.ts`, `src/app/services/budget.ts` : `BudgetMonthSummary`, `monthSummary`.
- `src/app/components/ui/money-pipe/money-pipe.ts` : formatage exact depuis les centimes.
- `DESIGN_SYSTEM.md` § 2, § 4.1, § 5.3 ; `AGENTS.md` : responsive, centimes entiers, i18n et accessibilité.
