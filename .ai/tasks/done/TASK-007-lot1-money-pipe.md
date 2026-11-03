## Tâche : formateur monétaire centralisé et usage dans la liste des transactions
Lot : 1 (`roadmap.md` § 4, tâche 7)
Branche : `feat/lot1-money-pipe` (créée depuis `main` à jour)

### Contexte
La liste des transactions utilise actuellement `CurrencyPipe` avec `EUR` et `fr-FR` codés en dur. Le produit doit
formater les montants selon `UserSettings.currency` et `UserSettings.locale`, et porter le signe du revenu/de la
dépense conformément à `DESIGN_SYSTEM.md` § 4.1. Cette tâche crée un pipe central et le branche sur cette liste,
sans refonte visuelle.

### Décisions et conventions
- Le pipe reçoit des entiers en centimes et utilise `MoneyService.toEuros()` pour le formatage.
- Le pipe est pur et reçoit le `UserSettings` courant en argument : le signal expose un nouvel objet à chaque
  `updateSettings()`, ce qui invalide le pipe sans `pure: false`.
- Avec `type === 'income'`, afficher un signe positif (`+`). Avec `type === 'expense'`, afficher un signe négatif
  (`−`). La nature de dépense n'implique aucune couleur d'alerte.
- Sans `type`, préserver le signe numérique du montant (notamment les soldes d'ouverture négatifs) sans ajouter
  de `+` aux valeurs positives.
- Toujours afficher deux chiffres après le séparateur décimal, cohérent avec le stockage en centimes et le format
  courant de la liste des transactions.
- Aucun taux de change ni conversion de devise : `currency` ne sert qu'au formatage.

### Ce qu'il faut faire
1. Modifier `src/app/models/transactions.ts` : remplacer l'alias `TransactionPresentation` qui omet
   `amountCents` par `Transaction & { amountEuros: number }`. Le `amountCents` présent dans l'objet calculé par
   `TransactionService` reste ainsi typé et disponible pour le pipe. Garder `TransactionInput` inchangé.
2. Créer `src/app/components/ui/money-pipe/money-pipe.ts` :
   - pipe standalone nommé `money` ; conserver le comportement pur par défaut.
   - `transform(amountCents: number, settings: Pick<UserSettings, 'currency' | 'locale'>, type?: CategoryType): string`.
   - Rejeter `amountCents` non entier avec `throw new Error('Invalid amount')`.
   - Si `type === 'income'`, formater `Math.abs(amountCents)` avec signe toujours visible ; si `type === 'expense'`,
     formater `-Math.abs(amountCents)` avec signe toujours visible ; si `type` est absent, formater le montant signé
     tel quel avec le signe négatif natif uniquement.
   - Utiliser `Intl.NumberFormat(settings.locale, { style: 'currency', currency: settings.currency,
     minimumFractionDigits: 2, maximumFractionDigits: 2, signDisplay: type ? 'always' : 'auto' })`.
   - Appeler `MoneyService.toEuros()` pour convertir le montant à formater.
3. Créer `src/app/components/ui/money-pipe/money-pipe.spec.ts` : tests de revenu positif signé `+`, dépense signée
   `−`, solde négatif sans type (négatif conservé), format français EUR et anglais USD, et rejet d'un montant
   fractionnaire en centimes.
4. Modifier `src/app/components/ui/transaction-list/transaction-list.ts` : retirer `CurrencyPipe`, importer
   `MoneyPipe`, injecter `SettingsService` et exposer son signal `settings` au template.
5. Modifier `src/app/components/ui/transaction-list/transaction-list.html` : remplacer le `CurrencyPipe` codé en dur
   par `{{ tx.amountCents | money: settings() : tx.type }}`.
6. Modifier `src/app/components/ui/transaction-list/transaction-list.spec.ts` : ajouter une transaction income et
   une expense avec leurs catégories/sous-catégories de test, vérifier que les deux montants affichent `€` et que
   l'un a un signe `+` et l'autre un signe négatif. Modifier `SettingsService` en `currency: 'USD'`, `locale:
   'en-US'`, déclencher la détection de changements et vérifier que le pipe réagit aux nouveaux réglages.
   Conserver les tests existants.

### Tests obligatoires
- `MoneyPipe` :
  - EUR `fr-FR` avec `type: 'income'` : signe positif, symbole `€`, exactement deux décimales.
  - EUR `fr-FR` avec `type: 'expense'` : signe négatif, symbole `€`, exactement deux décimales.
  - montant signé négatif sans type : signe négatif conservé ; montant positif sans type n'a pas de signe `+`.
  - USD `en-US` : symbole `$`, groupement et point décimal conformes à `Intl.NumberFormat`.
  - cents non entiers : erreur `Invalid amount`.
- `TransactionList` : les transactions income/expense utilisent le pipe ; le changement des réglages dans
  `SettingsService` reflète le nouveau symbole et la nouvelle locale après détection de changements.

### Fichiers concernés
- Créer : `src/app/components/ui/money-pipe/money-pipe.ts`,
  `src/app/components/ui/money-pipe/money-pipe.spec.ts`.
- Modifier : `src/app/models/transactions.ts`, `src/app/components/ui/transaction-list/transaction-list.ts`,
  `src/app/components/ui/transaction-list/transaction-list.html`,
  `src/app/components/ui/transaction-list/transaction-list.spec.ts`.
- Ne pas modifier : mocks, services métier, `app.config.ts`, `package.json`, `package-lock.json`.

### Critères d'acceptation
- Aucun code monétaire `EUR` ou locale `fr-FR` n'est codé en dur dans le template `transaction-list.html`.
- Le pipe utilise `SettingsService` via l'objet settings courant fourni en argument, et se met à jour après changement
  de devise ou locale.
- Le signe reflète le type income/expense ; les montants négatifs sans type gardent leur signe.
- Aucune conversion centimes/euros n'est ajoutée au composant : elle reste dans `MoneyService`.
- Tous les tests existants sont conservés ; nouveaux tests du pipe et de la liste verts.
- `npx tsc -p tsconfig.app.json --noEmit` et `npx tsc -p tsconfig.spec.json --noEmit` : code 0 (mode strict actif).
- `npm run build` passe. Seul avertissement autorisé : le budget SCSS connu de `category-card.scss`.
- `npx ng test --no-watch` : tout vert, sortie lue sur disque, aucun test supprimé.
- Aucun `any`, `$any` ou cast `as` ajouté. Aucun composant n'importe un mock.

### Hors périmètre pour cette tâche
- Application du pipe aux futurs écrans Budget Mensuel ou Dashboard : ils n'existent pas encore.
- Le réglage dynamique de `LOCALE_ID` global, les formats de dates et le changement de langue : tâche Paramètres (Lot 5).
- Modification des couleurs `--color-income` / `--text-primary` ou de la palette : aucun changement visuel dans cette tâche.
- Validation visuelle de `--color-warn` : à faire avant la barre de progression, tâche 8.
- Mise à jour de la roadmap : faite par le PM après revue.

### Références
- `DESIGN_SYSTEM.md` § 4.1 (signes +/− et nature revenu/dépense), § 5.3 (nombres tabulaires).
- `.ai/domain-model.md` § 5 (`amountCents`, valeurs entières) et `UserSettings.currency` / `locale`.
- `AGENTS.md` : montants en centimes, aucune chaîne technique codée en dur en dehors du domaine concerné.
- `ARCHITECTURE.md` : composants réutilisables sous `components/ui/`.
- `.ai/roadmap.md` § 4, Lot 1, tâche 7.
