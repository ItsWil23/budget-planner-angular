## Tâche : catégorie sans sous-catégorie dans le formulaire de transaction
Lot : 2 (`roadmap.md` § 5, TASK-028, après TASK-027)
Statut : implémentée et validée le 2026-11-19 ; PR en attente
Branche : `feat/lot2-disabled-transaction-categories`

### Suivi de livraison — 2026-11-19
- Commit applicatif : `0611235` (`feat: disable transaction categories without subcategories`).
- Validations : 656 tests ; build réussi ; `tsc` app et spec sans erreur ; JSON FR/EN valides ; `git diff --check` propre. Lint non configuré.
- Revue navigateur : aide et lien vérifiés à 375 px et 1280 px ; pas de débordement horizontal ; l'option et le nom de la catégorie sont bien désactivés et affichés.
- Avertissements de build : budget du bundle initial (515.06 kB) et budgets SCSS ; aucun fichier SCSS modifié n'est signalé.

### Contexte
Le formulaire de transaction exige une catégorie et une sous-catégorie. Une catégorie peut cependant exister sans sous-catégorie. La décision produit du 2026-11-18 (`product-vision.md` § 13) demande que ces catégories restent visibles mais désactivées dans le formulaire, avec une explication et un lien vers la page Catégories pour en créer une. Aucun mini-dialogue ne doit être ajouté dans la modale.

`TransactionForm` reçoit déjà `formCategories` et `formSubcategories` ; le formulaire présente d'abord la catégorie. La route `/categories` existe et permet de gérer les sous-catégories.

### Décisions validées le 2026-11-19
- Une catégorie est désactivée dans la liste si aucune sous-catégorie ne référence son `id` dans `formSubcategories`. Son nom reste affiché sans libellé ajouté.
- Si au moins une catégorie est désactivée, afficher sous le sélecteur une aide qui nomme toutes les catégories concernées, puis le lien « Créer une sous-catégorie dans Catégories » vers `/categories`. Les noms, saisis par l'utilisateur, sont insérés tels quels et séparés par des virgules ; seule la phrase d'aide est traduite. L'aide et le lien sont masqués si toutes les catégories sont sélectionnables.
- Le lien utilise la navigation Angular normale ; aucun dialogue imbriqué ni persistance du brouillon n'est ajouté. En suivant le lien, la modale courante est quittée et son brouillon n'est pas conservé. Décision PM du 2026-11-19 : comportement accepté provisoirement, à réexaminer avec la refonte de la page Catégories.

### Ce qu'il faut faire
1. **Catégories** (`transaction-form`) : conserver toutes les catégories reçues dans le sélecteur. Désactiver l'option d'une catégorie sans sous-catégorie ; laisser les autres options sélectionnables. Le sélecteur de sous-catégorie et les validateurs existants restent inchangés.
2. **Explication et raccourci** : quand au moins une option est désactivée, afficher sous le sélecteur de catégorie une aide qui nomme les catégories indisponibles (`{{categoryNames}}`) et un lien accessible vers `/categories`. Utiliser `RouterLink` dans le composant standalone. Le lien doit rester accessible au clavier et au toucher, sans dépendre du survol ; respecter la taille tactile minimale existante.
3. **i18n** : ajouter des clés Transloco dans `transactionForm` pour la phrase d'aide (avec interpolation `categoryNames`) et le libellé du lien, en français et en anglais. Les noms de catégories (et, plus généralement, les noms de catégories/sous-catégories saisis par l'utilisateur) ne sont pas traduits ni transformés. Aucune chaîne visible en dur.
4. **Tests** (`transaction-form.spec.ts`) : couvrir l'option désactivée pour une catégorie sans enfant, la sélection possible d'une catégorie avec sous-catégorie, l'affichage conditionnel de l'aide, les noms exacts des catégories sans enfant, et la destination du lien. Vérifier qu'un formulaire avec une catégorie sélectionnable peut toujours émettre une transaction valide.

### Fichiers concernés
- Modifiés : `src/app/components/ui/transaction-form/transaction-form.ts`, `transaction-form.html`, `transaction-form.spec.ts`
- Modifiés : `public/i18n/fr.json`, `public/i18n/en.json`
- `transaction-form.scss` contient les styles de l'aide et du lien, uniquement avec des tokens existants ; aucune valeur visuelle brute.

### Critères d'acceptation
- Toutes les catégories restent présentes dans le menu, dans leur ordre actuel.
- Une catégorie avec zéro sous-catégorie est visible et impossible à sélectionner ; une catégorie qui a au moins une sous-catégorie reste sélectionnable.
- L'aide énumère exactement, sans traduction ni transformation, les noms de toutes les catégories sans sous-catégorie ; le lien apparaît lorsqu'il y en a au moins une, et l'aide comme le lien disparaissent sinon.
- Le lien navigue vers `/categories`, sans ouvrir de mini-dialogue.
- La catégorie et la sous-catégorie restent obligatoires ; l'ajout d'une transaction valide avec une catégorie sélectionnable fonctionne comme avant.
- Les libellés de l'aide et du lien sont traduits en FR/EN ; aucune chaîne visible en dur.
- Aucun accès direct aux mocks, aucune modification de modèle/service, aucune nouvelle dépendance npm, aucun `any` ni `console.log`.
- Vérification visuelle de l'aide et du lien à 375 px et 1280 px ; pas de débordement ni de chevauchement.
- `npx ng test --no-watch`, `npm run build`, `tsc` sur `tsconfig.app.json` et `tsconfig.spec.json`, puis `git diff --check` passent. Lint non configuré, non exécuté.

### Hors périmètre
- Signalement d'une catégorie incomplète dans l'écran Catégories (Lot 4).
- Création ou édition d'une catégorie/sous-catégorie depuis le formulaire de transaction.
- Conservation du brouillon de transaction pendant la navigation vers Catégories.
- Modification des règles métier du service ou du modèle.

### Références
- `roadmap.md` § 5, TASK-028.
- `product-vision.md` § 13, décision du 2026-11-18 : catégorie sans sous-catégorie visible et désactivée, avec lien vers Catégories, sans mini-dialogue.
- `domain-model.md` § 2 : toute transaction exige une sous-catégorie ; une catégorie sans sous-catégorie reste inutilisable en saisie.
- `AGENTS.md` : i18n, composants standalone, mobile-first et cibles tactiles.
