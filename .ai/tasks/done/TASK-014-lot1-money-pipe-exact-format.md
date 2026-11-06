## Tâche : formatage exact des centimes dans MoneyPipe
Lot : suivi transverse après Lot 1 (`roadmap.md`, suivis décidés après le Lot 1)
Branche après création de la spec : `feat/lot1-money-pipe-exact-format`

### Contexte
`MoneyService.parseEurosInput()` et `toEditableString()` préservent déjà exactement les centimes sûrs saisis et préremplis. `MoneyPipe` convertit encore `amountCents` en euros flottants avec `toEuros()` avant le formatage Intl ; près de `Number.MAX_SAFE_INTEGER`, l'affichage peut perdre un centime malgré un état exact.

Cette tâche corrige uniquement le rendu d'un montant déjà stocké en centimes. La migration des entrées Prévu et Transaction vers le parsing exact et des APIs en centimes sera faite dans deux tâches ultérieures.

### Ce qu'il faut faire
1. Ajouter dans `MoneyService` un formatage monétaire exact à partir des centimes entiers, sans les convertir en nombre flottant en euros.
2. Faire utiliser ce formatage par `MoneyPipe`, tout en conservant le contrat visible actuel : devise et locale courantes, groupement localisé, deux décimales, placement du symbole, signes revenu/dépense et signe moins typographique.
3. Garantir le rendu exact pour toute valeur de centimes dans la plage des entiers sûrs, signée ou non. Refuser les montants fractionnaires ou hors de cette plage avec l'erreur existante `Invalid amount`.
4. Préserver les sorties existantes pour les valeurs usuelles et les locales/cas déjà couverts.
5. Ne pas modifier `MoneyService.toCents()`, ses appelants, les composants/formulaires, `BudgetService`, `TransactionService`, modèles, mocks ou traductions.

### Fichiers concernés
- Modifier : `src/app/services/money.ts`, `src/app/services/money.spec.ts`, `src/app/components/ui/money-pipe/money-pipe.ts`, `src/app/components/ui/money-pipe/money-pipe.spec.ts`.
- Ne pas modifier les flux de saisie Prévu ou Transaction dans cette tâche.
- Aucun nouveau package.

### Tests obligatoires
- Garder tous les tests existants de conversion et de formatage verts.
- Vérifier le formatage EUR `fr-FR` et USD `en-US`, les signes `income`/`expense` et le montant signé sans type.
- Vérifier les valeurs `9007199254740989`, `9007199254740990`, `9007199254740991` et leurs équivalents négatifs dans les locales `fr-FR` et `en-US`, avec les centimes affichés sans perte.
- Vérifier le rejet d'une valeur non entière et d'une valeur non sûre (`Number.MAX_SAFE_INTEGER + 1`).
- `npx tsc -p tsconfig.app.json --noEmit`, `npx tsc -p tsconfig.spec.json --noEmit`, `npx ng test --no-watch` et `npm run build` passent. Aucun lint n'est configuré : ne pas inventer de commande.

### Critères d'acceptation
- `MoneyPipe` ne convertit plus les centimes en euros flottants pour afficher la devise.
- Tous les centimes entiers sûrs s'affichent exactement, y compris à ±`Number.MAX_SAFE_INTEGER`.
- Les sorties habituelles, le placement de devise/locale, les signes et les deux décimales restent conformes aux tests existants.
- Aucun flux de saisie ni contrat de service métier ne change ; les tâches Prévu et Transaction restent explicitement à faire séparément.

### Hors périmètre
- Migration de `TransactionInput` ou du formulaire Transaction vers les centimes exacts : tâche ultérieure.
- Migration de `BudgetService.setPlannedAmount()` et de l'éditeur Prévu vers les centimes exacts : tâche ultérieure.
- Modification de `toCents(number)` ou de l'arrondi historique utilisé par ses appelants existants.
- Solde de clôture budgétée, layout pleine largeur, gestion des récurrences et nettoyage SCSS.

### Références
- `.ai/roadmap.md` § 4, suivis décidés après le Lot 1.
- `.ai/product-vision.md` § 9, § 11 et § 13.
- `src/app/services/money.ts` : `parseEurosInput()`, `toEditableString()`, `toEuros()`.
- `src/app/components/ui/money-pipe/money-pipe.ts` et `money-pipe.spec.ts`.
- `AGENTS.md` : montants en centimes entiers ; conversions centralisées dans les services.