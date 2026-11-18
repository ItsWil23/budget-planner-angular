## Tâche : extraire le menu « ⋯ » de ligne en composant partagé
Lot : 2 (`roadmap.md` § 5, TASK-027a, prérequis de TASK-027b et TASK-027c)
Statut : à implémenter
Branche : `feat/lot2-row-menu` (à créer depuis `main` à jour)

### Contexte
Le menu « ⋯ » par ligne de TASK-023 (règles récurrentes) est codé directement dans `recurring-rule-manager` : bouton déclencheur, panneau `role="menu"`, placement au-dessus ou en dessous selon la place disponible, navigation clavier (flèches, Début, Fin, Échap, Tab) et fermeture au clic extérieur. Les transactions (TASK-027b et TASK-027c) ont besoin du même menu. `AGENTS.md` demande de réutiliser un composant existant plutôt que de dupliquer : cette tâche le sort de `recurring-rule-manager` dans `components/ui/row-menu`, sans changer ni le comportement ni l'apparence.

Choix du PM (décidé le 2026-11-18 : extraction d'abord) :
- Le composant ne connaît pas le domaine. Il reçoit un libellé d'accessibilité et une clé de données, et projette les éléments `role="menuitem"` fournis par le parent. Les actions restent dans le parent.
- Le style du menu passe avec le composant, et les classes CSS actuelles sont conservées pour ne pas changer le rendu.

### Ce qu'il faut faire
1. Créer `src/app/components/ui/row-menu/` (`row-menu.ts`, `row-menu.html`, `row-menu.scss`, `row-menu.spec.ts`), composant standalone avec signals.
2. Déplacer dans `row-menu.ts` la logique d'ouverture, de placement, de clavier et de fermeture de `recurring-rule-manager`, sans changement de comportement.
3. Entrées du composant : libellé d'accessibilité du déclencheur, clé de données (`data-menu-trigger`), et `data-action` du déclencheur. Le contenu projeté contient les `button role="menuitem"`.
4. Remplacer dans `recurring-rule-manager.html` le bloc `rule-menu-wrap` par `<app-row-menu>`. Les actions Modifier et Activer/Désactiver restent dans le parent et conservent leurs `data-action`.
5. Déplacer les règles CSS du menu de `recurring-rule-manager.scss` vers `row-menu.scss`. Utiliser uniquement les tokens de `DESIGN_SYSTEM.md`, comme aujourd'hui.
6. Supprimer de `recurring-rule-manager.ts` le code devenu inutile.

### Fichiers concernés
- Créés : `src/app/components/ui/row-menu/row-menu.ts`, `row-menu.html`, `row-menu.scss`, `row-menu.spec.ts`
- Modifiés : `src/app/components/ui/recurring-rule-manager/recurring-rule-manager.ts`, `.html`, `.scss`
- `recurring-rule-manager.spec.ts` : en principe inchangé. Si un sélecteur doit bouger, le signaler dans la PR.

### Critères d'acceptation
- Tous les tests de `recurring-rule-manager.spec.ts` passent sans modifier leurs assertions.
- Les tests de `row-menu.spec.ts` couvrent : ouverture et fermeture au clic, fermeture au clic extérieur, Échap qui ramène le focus sur le déclencheur, flèches, Début, Fin, Tab qui ferme le menu, et ouverture au clavier qui place le focus sur le premier élément.
- Le DOM rendu ne change pas, hors l'élément hôte `app-row-menu` : mêmes classes, mêmes `data-action`, `data-menu-trigger`, `role` et libellés `aria-label`.
- Aucun changement visuel : à 375px et à 1280px, en thème clair et sombre, le menu d'une règle est identique à l'avant (vérifié à la revue usage).
- Le menu ne dépend d'aucun service métier : pas d'import de `RecurringRuleService`, `BudgetService` ou `TransactionService` dans `row-menu`.
- Aucune chaîne en dur dans le template : libellés passés par le parent via Transloco.
- `npx ng test --no-watch` vert, `npm run build` vert, `tsc` sur `tsconfig.app.json` et `tsconfig.spec.json` sans erreur, `git diff --check` propre.
- Aucune nouvelle dépendance npm, aucun `any`, aucun `console.log`.
- Lint : non configuré, non exécuté, à signaler dans la PR.

### Hors périmètre pour cette tâche
- Toute modification de comportement de la gestion des règles (création, édition, versions, synchronisation).
- Le menu des transactions : TASK-027b et TASK-027c.
- Modifier les clés i18n existantes.
- Changer l'apparence du menu (y compris les tokens) : tout changement visuel est une tâche à part.

### Références
- `roadmap.md` § 5, Lot 2, TASK-027 (découpé en 027a, 027b, 027c le 2026-11-18) et § 4, TASK-023 (menu contextuel des actions d'une règle).
- `product-vision.md` § 13, décision du 2026-11-06 (actions de ligne regroupées dans un menu contextuel).
- `DESIGN_SYSTEM.md` : tokens de couleur, d'espacement et de rayon ; aucune ombre portée.
- `AGENTS.md` : réutiliser avant de créer ; mobile-first ; aucune fonction dépendante du survol.
