## Tâche : supprimer une transaction avec confirmation et annulation
Lot : 2 (`roadmap.md` § 5, TASK-027c, dernière étape de TASK-027)
Statut : livrée et validée le 2026-11-19 ; PR en attente avec 027a et 027b
Branche : `feat/lot2-transactions-edit-delete` (branche commune à TASK-027a, 027b et 027c ; une seule PR à la fin)

### Contexte
Le service sait supprimer et restaurer (`TransactionService.remove()` et `restore()`, TASK-026), et le précontrôle existe (`BudgetService.assertTransactionRemovable()` et `assertTransactionRestorable()`). Le menu de ligne accepte déjà des entrées (TASK-027a, 027b). L'output `deleteTransaction` existe dans `TransactionList` mais n'est relié à rien.

Décisions du 2026-11-18 (`product-vision.md` § 13) : suppression avec confirmation, annulation possible ; durée de l'annulation de 10 secondes (`roadmap.md` § 5).

Choix du PM, validés à la revue du 2026-11-19 :
- La confirmation est une `Modal` dans la page, comme le formulaire (pas de dialogue dans la liste).
- La notification d'annulation est un nouveau composant léger `app-undo-toast` : aucun composant de notification n'existe dans le projet.
- Une seule annulation est possible à la fois. Une nouvelle suppression remplace la précédente, qui devient définitive.
- Le focus n'est pas déplacé automatiquement pendant la confirmation : le message est annoncé (`role="status"`), et le bouton « Annuler la suppression » reste accessible au clavier.

### Ce qu'il faut faire
1. **Liste** (`transaction-list`) : ajouter, dans le menu de ligne, un item « Supprimer » (`role="menuitem"`, `data-action="delete-<id>"`, libellé `transactionList.delete`). Il émet `deleteTransaction` avec l'`id`. Même règle que « Modifier » : menu absent en lecture seule.
2. **Confirmation** (page `transactions`) : `deleteTransaction` ouvre une `Modal` avec le titre `transactions.deleteTitle`, le texte `transactions.deleteMessage` (avec le libellé de la transaction) et deux boutons, « Supprimer » (`transactions.deleteConfirm`) et « Annuler » (`transactions.deleteCancel`). Le bouton de suppression utilise le token `--color-danger` pour son texte uniquement. Échap et × ferment la confirmation sans rien modifier.
3. **Suppression** : à la confirmation, appeler `budgetService.assertTransactionRemovable(id)` puis `transactionService.remove(id)`. Garder le `RemovedTransaction` renvoyé. Si le précontrôle lève `TransactionAggregateOverflowError`, fermer la confirmation, ne rien supprimer, et afficher `transactions.deleteRefused` dans la notification.
4. **Annulation** : après une suppression réussie, afficher `app-undo-toast` avec le message `transactions.deleted` (libellé de la transaction) et le bouton `transactions.undo`. À l'activation : `assertTransactionRestorable(removed)` puis `transactionService.restore(removed)`. Si le précontrôle échoue, afficher le message de refus dans la notification et ne rien restaurer, mais conserver l'annulation et son bouton jusqu'à l'expiration initiale ; le délai ne redémarre pas et une nouvelle tentative reste possible.
5. **Composant `app-undo-toast`** (`components/ui/undo-toast/`) : entrées `message`, `actionLabel`, `durationMs` (10 000 par défaut). Sorties `action` et `expired`. Le compte à rebours est dans le composant (`setTimeout`, nettoyé à la destruction). Le conteneur porte `role="status"`. Le bouton est focusable. Pas de bouton de fermeture séparé.
6. **Position** : la notification est fixée en bas, au-dessus de la barre de navigation basse sur mobile (`app-bottom-nav`, fixe en bas sous 768 px, hauteur `--size-bottom-nav`, décalage `--space-md` et `env(safe-area-inset-bottom)`). Elle ne doit jamais recouvrir la barre.
7. **Focus** : après une suppression, placer le focus sur le bouton « Annuler la suppression ». Quand la notification disparaît (délai ou annulation), si le focus était sur ce bouton, le ramener sur « Nouvelle transaction ».
8. **i18n** : ajouter dans `public/i18n/fr.json` et `en.json` les clés `transactionList.delete`, `transactions.deleteTitle`, `transactions.deleteMessage`, `transactions.deleteConfirm`, `transactions.deleteCancel`, `transactions.deleted`, `transactions.undo`, `transactions.deleteRefused`. Aucune chaîne en dur.
9. **Une seule annulation** : une nouvelle suppression remplace l'annulation en cours. Le délai est remis à zéro pour la nouvelle transaction.
10. **Navigation** : si l'utilisateur quitte la page avant la fin du délai, la suppression reste définitive et la notification disparaît sans restauration.
11. **Message de confirmation** : `transactions.deleteMessage` ne mentionne pas la durée de l'annulation. Il ne contient que la suppression du libellé concerné. La durée reste une constante unique (`UNDO_TOAST_DURATION_MS`) utilisée par le composant ; aucun texte ne la reprend.
12. **Indicateur de temps** : une barre fine dans la bordure basse du toast se vide de droite à gauche pendant `durationMs` (`transform: scaleX` de 1 à 0, `transform-origin` à gauche, durée égale au délai). La barre est décorative : `aria-hidden="true"`, le message reste annoncé une seule fois par `role="status"`. Une nouvelle suppression remet la barre à pleine largeur. En mouvement réduit (`prefers-reduced-motion`), la barre reste visible sans transition ; le délai est inchangé. Aucun chiffre n'est affiché. Couleur : token existant (`--color-accent`), sans ombre.

### Limite acceptée à la revue — 2026-11-19
- Si une nouvelle suppression est refusée par le précontrôle alors qu'une annulation précédente est en attente, le message de refus remplace la notification et rend cette suppression précédente définitive. Ce cas requiert un dépassement de capacité numérique des agrégats, très improbable avec des montants usuels. Conserver l'annulation tout en signalant le refus d'une autre transaction demanderait une notification distincte ; ce comportement est accepté hors du périmètre de TASK-027c.
### Fichiers concernés
+ Créés : `src/app/components/ui/undo-toast/undo-toast.ts`, `undo-toast.html`, `undo-toast.scss`, `undo-toast.spec.ts`, `src/app/i18n.spec.ts`
- Modifiés : `src/app/components/ui/transaction-list/transaction-list.ts`, `.html`, `transaction-list.spec.ts`
- Modifiés : `src/app/pages/transactions/transactions.ts`, `transactions.html`, `transactions.spec.ts`
- Modifiés : `public/i18n/fr.json`, `public/i18n/en.json`

### Critères d'acceptation
- Le menu de chaque ligne propose « Supprimer ». Pas de menu en lecture seule.
- Supprimer ouvre la confirmation. Annuler la confirmation, la fermer avec Échap ou avec × ne modifie rien (test : la liste est identique).
- Confirmer supprime la transaction, la liste se met à jour, et la notification apparaît avec le libellé de la transaction.
- Annuler dans les 10 secondes restaure la transaction à son index d'origine : la liste est identique à celle d'avant la suppression (test).
- Après 10 secondes, la notification disparaît et la suppression est définitive (test avec horloge simulée).
- Deux suppressions successives : la seconde remplace la notification ; la première ne peut plus être annulée (test).
- Un dépassement du précontrôle de suppression ne supprime rien et affiche le message de refus ; un échec de restauration ne restaure rien, affiche le refus, conserve le bouton d'annulation et laisse expirer le délai initial sans le redémarrer (tests).
- La notification est dans un conteneur `role="status"`, le bouton est atteignable au clavier ; après expiration avec le focus sur le bouton d'annulation, le focus revient à « Nouvelle transaction » (test).
- Sur mobile, la notification ne recouvre pas la barre de navigation basse (vérifié à la revue usage à 375 px).
- Le message de confirmation de suppression ne mentionne pas la durée de l'annulation.
- La barre de temps se vide de droite à gauche sur la durée exacte du délai, repart à pleine largeur à chaque nouvelle suppression, et est masquée des lecteurs d'écran.
- Aucune chaîne en dur ; les clés existent en français et en anglais.
- Les tests passent et couvrent : confirmation annulée, suppression, annulation dans le délai, expiration, remplacement, refus de précontrôle, focus, absence de menu en lecture seule.
- `npx ng test --no-watch` vert, `npm run build` vert, `tsc` sur `tsconfig.app.json` et `tsconfig.spec.json` sans erreur, `git diff --check` propre.
- Aucune nouvelle dépendance npm, aucun `any`, aucun `console.log`.
- Lint : non configuré, non exécuté, à signaler dans la PR.

### Hors périmètre pour cette tâche
- Restauration après changement de page ou après rechargement.
- Annulation multiple (pile d'annulations).
- Modifier le service `TransactionService`, `BudgetService` ou le modèle `Transaction`.
- Styles de la table et débordement à 375 px : TASK-029.
- Tri, pagination : TASK-030.

### Références
- `roadmap.md` § 5, Lot 2, TASK-027 (027c).
- `product-vision.md` § 13, décision du 2026-11-18 (confirmation et annulation) ; durée de 10 secondes dans `roadmap.md` § 5.
- `DESIGN_SYSTEM.md` : tokens de couleur (`--color-danger`), d'espacement et de taille ; aucune ombre portée.

### Suivi de livraison — 2026-11-19
- Commit applicatif : `c5d94bf` (`feat: add transaction deletion with undo`). Même branche que 027a et 027b ; PR unique à créer une fois TASK-027 terminée.
- Validations : 652 tests ; build réussi ; `tsc` app et spec sans erreur ; JSON FR/EN valides ; `git diff --check` propre. Lint non configuré.
- Revue navigateur à 375 px : toast visible au-dessus de la navigation basse, bouton d'annulation visible ; suppression annulée après le contrôle.
- Limite acceptée ci-dessus : le refus d'une nouvelle suppression peut remplacer une annulation précédente en attente.
