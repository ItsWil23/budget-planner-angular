## Tâche — menu contextuel des actions d'une règle récurrente
Lot : suivi du gestionnaire de règles (`roadmap.md` § 5, « Interface de gestion des RecurringRule »)
Statut : proposée le 2026-11-17, en attente de validation
Branche : `feat/row-action-menu`

### Contexte
TASK-020 a livré les actions (Modifier, Désactiver, Réactiver) dans la zone dépliée de chaque règle, au lieu du menu contextuel prévu par la spec initiale et la décision produit du 2026-11-06 (`product-vision.md`). L'écart a été validé à l'usage, mais la roadmap et la spec de TASK-020 disent encore « menu ». Cette tâche aligne le comportement sur ce qui était prévu, sans toucher aux services.

### Décisions à valider
1. **Déclencheur** : un bouton « ⋯ » de 44 × 44 px par ligne, à droite, distinct du bouton de dépliage. Il ne peut pas être imbriqué dans le bouton de dépliage (contenu interactif imbriqué).
2. **Contenu du menu** : « Modifier » (absent pour une règle terminée), puis « Désactiver » ou « Réactiver » selon l'état. Les items sont des `menuitem` natifs (boutons).
3. **Historique** : le dépliage de la ligne reste pour l'historique des versions (un seul à la fois), sans boutons d'action dans la zone dépliée.
4. **Ouverture** : au clic ou au toucher. Un seul menu ouvert à la fois.
5. **Fermeture** : Échap, clic ou toucher en dehors, Tab qui sort du menu, ou choix d'une action. Le focus revient au bouton « ⋯ », sauf après « Modifier » où il va sur le formulaire.
6. **Clavier** : Entrée ou Espace ouvre le menu et place le focus sur le premier item ; flèches haut et bas pour naviguer, Début et Fin pour aller au premier et au dernier item.
7. **Pas de dialogue imbriqué** : le menu est un panneau positionné sous le bouton, dans le dialogue existant. Il ne doit pas être coupé par le défilement du dialogue.

### Ce qu'il faut faire
1. Dans `recurring-rule-manager.html`, séparer le bouton de dépliage de la ligne du bouton « ⋯ ». Retirer les boutons d'action de la zone dépliée et ne garder que l'historique.
2. Dans `recurring-rule-manager.ts`, gérer l'état du menu ouvert (une série à la fois), la fermeture (Échap, extérieur, Tab) et la restitution du focus. Réutiliser `setRuleActive`, `startEdit`, `canEdit` et `shouldActivate` sans les dupliquer.
3. Dans `recurring-rule-manager.scss`, positionner le bouton et le panneau avec les tokens existants (44 px de cible tactile, bordures, rayon). Pas d'ombre. La colonne du nom reste tronquée par ellipse.
4. Compléter `public/i18n/fr.json` et `en.json` si un libellé manque (les libellés existants « Actions pour {{name}} », « Modifier », « Désactiver », « Réactiver » sont réutilisés).
5. Adapter `recurring-rule-manager.spec.ts` : ouvrir le menu avant de cliquer sur une action, et tester le clavier.

### Fichiers concernés
- `src/app/components/ui/recurring-rule-manager/recurring-rule-manager.html`
- `src/app/components/ui/recurring-rule-manager/recurring-rule-manager.ts`
- `src/app/components/ui/recurring-rule-manager/recurring-rule-manager.scss`
- `src/app/components/ui/recurring-rule-manager/recurring-rule-manager.spec.ts`
- `public/i18n/fr.json`, `public/i18n/en.json` (seulement si un libellé manque)

### Critères d'acceptation
- Chaque règle a un bouton « ⋯ » accessible au clavier et au toucher, d'au moins 44 px.
- Le menu propose exactement les actions valides pour l'état de la règle ; une règle terminée n'affiche pas « Modifier ».
- Un seul menu est ouvert à la fois ; Échap, clic extérieur et Tab le ferment ; le focus revient au bouton « ⋯ » (sauf après « Modifier »).
- Clavier complet : ouverture, navigation par flèches, Début et Fin, sélection.
- Les actions produisent les mêmes mutations qu'avant (services versionnés, choix de synchronisation inchangé).
- Aucun débordement horizontal à 375 px ni en desktop ; le nom reste tronqué par ellipse.
- Tests du gestionnaire verts ; tests complets, build et `git diff --check` verts.

### Hors périmètre
- Suppression définitive d'une règle.
- Changement du versionnage, de la synchronisation ou des services.
- Changement du dialogue, du formulaire de création ou de la liste hors des lignes.

### Références
- `product-vision.md`, décision du 2026-11-06 (actions de ligne regroupées dans un menu contextuel).
- `.ai/tasks/done/TASK-020-recurring-rule-management-dialog.md` (écart d'implémentation à corriger).
