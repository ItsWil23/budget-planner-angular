## Tâche : saisie inline du prévu par sous-catégorie
Lot : 1 (`roadmap.md` § 4, tâche 12)
Branche après création de la spec : `feat/lot1-budget-planned-input`

### Contexte
La table du Budget Mensuel (TASK-011) affiche le prévu en lecture seule. Cette tâche permet de saisir ou modifier le prévu directement dans la cellule de chaque sous-catégorie. `BudgetService.setPlannedAmount(monthKey, subcategoryId, amountEuros)` convertit déjà les euros en centimes, crée ou met à jour une ligne positive et supprime la ligne pour un montant nul.

### Présentation et interaction retenues
- Le prévu se modifie uniquement au niveau sous-catégorie ; les totaux de catégorie restent dérivés de `BudgetService.monthSummary` et ne sont jamais modifiables.
- En affichage, une sous-catégorie sans `BudgetLine` (prévu absent ou nul) montre « Non renseigné » dans la cellule Prévu. Utiliser une traduction anglaise courte (« Not set »). Les totaux agrégés de catégorie continuent d’afficher leur zéro formaté normalement.
- L’activation de la cellule Prévu ouvre un champ numérique inline accessible au clavier et au toucher. Le champ démarre vide si aucun prévu n’existe, sinon contient le montant actuel.
- **Entrée** enregistre. **Échap** annule et restaure le montant précédemment enregistré. Une perte de focus n’enregistre pas ; elle annule aussi l’édition et restaure la valeur précédente.
- Un champ vide ou une valeur `0` validée par Entrée supprime le prévu en appelant `setPlannedAmount` avec `0`; la cellule revient à « Non renseigné ».
- Toute valeur positive doit être d’au moins `0.01 €` et avoir au plus deux décimales. La valeur minimale est `0.01`, jamais `0.1`. Une valeur négative ou un montant positif inférieur à un centime est refusé avec un message localisé ; l’édition reste ouverte et la valeur n’est pas enregistrée.
- Ne pas ajouter de bouton Enregistrer : Entrée est l’unique action de validation. Échap est l’unique action explicite d’annulation ; blur annule sans sauvegarder.
- La cellule éditable doit être activable par clavier, nommée de façon accessible et conserver un focus visible. Après validation/annulation, rendre le focus à la cellule d’origine.
- Réutiliser les tokens SCSS, `MoneyPipe`, `SettingsService` et l’i18n existants. N’afficher aucun texte UI en dur.

### Retours validés après revue visuelle
- **Progression des revenus :** appliquer la couleur selon le sens favorable de la catégorie, pour toutes les sous-catégories income, sans changer le taux ni le statut métier : `under` devient visuellement défavorable (rouge), `on-track` reste ambre, `over` devient visuellement favorable (vert). Le pourcentage reste `réel / prévu` et les seuils du service ne changent pas. Ne pas ajouter de progression agrégée dans l’en-tête de catégorie ; les barres des sous-catégories suffisent.
- **Signes dans les cards Budget :** afficher les dépenses prévues et réelles en valeurs positives, sans `−`. Conserver le signe `+` pour les revenus. Cette exception s’applique uniquement aux cards du Budget Mensuel ; le bandeau d’allocation et les transactions gardent leurs signes actuels. Ne pas colorer une dépense en rouge par défaut.
- **Tracks communs :** aligner l’en-tête de catégorie et les lignes sur des tracks stables : nom/sous-catégorie, Prévu, Réel, progression. Desktop : nom, montants et barre sur une rangée ; la progression occupe la dernière colonne à droite. Les totaux Prévu/Réel de catégorie s’alignent sous les deux colonnes de montants ; la dernière cellule de l’en-tête reste vide (pas de barre agrégée). Mobile : nom, Prévu et Réel sur une rangée, progression dessous. Les libellés de colonnes restent dans l’en-tête de card et ne se répètent pas dans chaque ligne.
- **Espacement en trois colonnes :** avec deux grandes catégories et une colonne de petites, les colonnes égales réduisent la piste flexible du nom ; l’espace perçu entre le nom et les montants doit diminuer. Vérifier ce cas à la largeur desktop cible. Les noms peuvent se renvoyer à la ligne, mais doivent rester lisibles et les montants ne doivent pas déborder.
- **Alignement du signe monétaire :** le bord droit du montant Prévu de chaque ligne doit s’aligner sur le bord droit du Prévu de l’en-tête de card, signe `€` inclus. La mesure actuelle trouve ~8,8 px de décalage vers la gauche, correspondant au padding droit du bouton `.planned-button`. Corriger le padding inline-end ou l’alignement sans réduire la cible du bouton.
- **Affordance d’édition :** le bouton Prévu présente au repos une bordure et/ou surface très subtile avec les tokens existants, sans ombre ; hover peut enrichir l’indice mais ne le remplace pas. Le focus clavier reste nettement visible.
- **Champ en mode édition :** `.planned-input` est sans bordure, fond, rayon ou décoration au repos ; garder seulement un anneau `:focus-visible` bien visible au clavier. Le texte et la croix doivent sembler appartenir à un même champ.
- **Réinitialisation par la croix :** ajouter une croix/bouton icône uniquement en édition. Son activation supprime immédiatement le prévu enregistré via `setPlannedAmount(..., 0)` et ferme l’édition ; ce geste explicite de réinitialisation ne doit pas être annulé par un Échap ou blur ultérieur. Sans activation de la croix, Échap et blur annulent toujours le brouillon ordinaire. Entrée valide un montant saisi ; vide/zéro validé par Entrée supprime également le prévu. Nom accessible localisé.
- **Croix intégrée au champ :** garder un vrai bouton accessible, mais le positionner à l’intérieur de la zone visuelle du champ, à son extrémité droite ; pas de bouton séparé côte à côte, ni de bordure/fond propre autour de la croix. Réserver son espace dans le champ pour que le texte saisi ne passe pas dessous. Conserver une cible tactile/focus ≥ 44×44px et l’action immédiate de réinitialisation décrite ci-dessus.
- **Clavier iOS :** conserver `inputmode="decimal"` et `enterkeyhint="done"`. Vérifier sur Safari iOS que « Terminé » déclenche l’enregistrement Entrée. Si un appareil iOS n’est pas disponible, le signaler dans le compte rendu ; ne pas ajouter un deuxième mécanisme de sauvegarde sans validation produit.
- **Typographie :** garder les tokens actuels pendant cette itération ; réévaluer seulement après la mise en ligne des cellules, qui devrait déjà réduire la hauteur visuelle.
- **Cellule au repos :** le fond plein `--surface-app` du bouton Prévu paraît trop fort dans la card sombre. Utiliser un fond transparent et une bordure très subtile permanente, en gardant un focus visible distinct. « Non renseigné » doit tenir sur une seule ligne ; réduire seulement ce libellé avec un token typographique plus petit et `white-space: nowrap`, ou ajuster sa piste sans décaler Prévu/Réel.
- **Ligne desktop :** à 1280px avec le layout en deux colonnes, nom, Prévu, Réel et progression doivent tenir sur une seule rangée. Les noms peuvent se renvoyer à la ligne ; les valeurs monétaires ne doivent ni se couper ni déborder. Si cela nécessite des pistes numériques illisibles, arrêter et demander un arbitrage plutôt que de repousser silencieusement la progression en dessous.
- **Exception desktop trois colonnes acceptée :** quand D affiche trois colonnes de cards égales de 320 à 455px de large, la progression peut passer sous la rangée nom/Prévu/Réel. À partir de 456px de largeur de card, elle reprend le track de droite sur la même rangée. Ne pas forcer une card sous 320px pour conserver trois colonnes.

### Ce qu’il faut faire
1. Dans `budget-mensuel.ts`, ajouter l’état d’édition nécessaire via les primitives de signal existantes. Préremplir le brouillon depuis le montant courant et utiliser `BudgetService.setPlannedAmount()` pour toute mutation. Le composant ne convertit pas les euros en centimes, ne modifie pas directement de `BudgetLine` et ne recalcule pas les totaux.
2. Dans `budget-mensuel.html`, rendre la cellule Prévu activable et basculer entre l’affichage formaté `MoneyPipe` et un input inline. Afficher `Non renseigné` pour un prévu absent/nul. Garder la cellule Réel visible et ne pas afficher de libellé séparé « Réel sans prévu ».
3. Gérer les événements : Enter valide ; Escape annule ; blur annule sans appeler le service. Un Enter invalide affiche l’erreur localisée et garde le focus/édition.
4. Valider le brouillon avant d’appeler le service : vide ou zéro = suppression ; positif ≥ `0.01` et maximum deux décimales = sauvegarde ; négatif, non numérique ou valeur positive < `0.01` = erreur, aucune mutation. Ne pas s’appuyer sur une contrainte native `min=0.01` qui empêcherait le comportement de suppression par zéro ; appliquer la règle métier décrite ci-dessus.
5. Vérifier que le résumé et les totaux de catégorie se mettent à jour à travers les signaux du service, sans état dérivé dupliqué dans le composant.
6. Ajouter les clés `budgetMensuel.table.plannedUnset`, `budgetMensuel.table.amountInvalid` et, si nécessaire, le nom accessible de l’action d’édition dans `public/i18n/fr.json` et `public/i18n/en.json`.
7. Ajouter les tests de comportement à `budget-mensuel.spec.ts` ; adapter les tests existants de la table sans supprimer de couverture.

### Fichiers concernés
- Modifier : `src/app/pages/budget-mensuel/budget-mensuel.ts`, `budget-mensuel.html`, `budget-mensuel.scss`, `budget-mensuel.spec.ts`, `public/i18n/fr.json`, `public/i18n/en.json`.
- Ne pas modifier : modèles, services, mocks, `MoneyService`, `MoneyPipe`, progression, `CategoryService`, routage, autres pages/composants, `package.json` ou `package-lock.json`.

### Tests obligatoires
- Fixer `MonthContextService` sur un mois déterministe. Vérifier que le clavier et le toucher ouvrent le champ avec le montant courant, ou un champ vide si le prévu est absent.
- Vérifier qu’Entrée sur un montant positif valide appelle `setPlannedAmount` avec le mois courant, le bon `subcategoryId` et le montant en euros ; le montant affiché et le total de catégorie se mettent à jour via `monthSummary`.
- Vérifier qu’Entrée avec `0.01` est accepté et que la règle minimale n’est pas `0.1`.
- Vérifier que le champ vide ou zéro suivi d’Entrée appelle le service avec `0`, retire la ligne et réaffiche « Non renseigné ».
- Vérifier qu’un montant négatif, non numérique ou positif inférieur à `0.01` n’est pas enregistré, garde le champ en édition et affiche l’erreur localisée.
- Vérifier qu’Échap annule et restaure l’ancienne valeur sans appeler le service.
- Vérifier que le blur annule et restaure l’ancienne valeur sans appeler le service.
- Vérifier le retour du focus vers la cellule après Enter/Escape/blur, l’activation clavier de la cellule et les libellés accessibles FR/EN.
- Vérifier que le Réel reste affiché en absence de prévu, sans texte « Réel sans prévu » séparé.
- Vérifier que la croix supprime effectivement la ligne de prévu : une fois cliquée, l’ancien montant ne réapparaît pas si l’utilisateur presse ensuite Échap ou quitte le contrôle.
- Vérifier que la barre de progression est dans le track à droite sur une ligne à 1280px, que les valeurs restent lisibles et que « Non renseigné » reste sur une ligne à 375px.
- Vérifier que le bouton Prévu au repos a un fond transparent et une bordure discrète en clair/sombre, avec un focus clavier distinct.
- Vérifier que le mapping couleur income donne `under` rouge, `on-track` ambre et `over` vert, sans changer le taux affiché ; vérifier en parallèle que les dépenses gardent leur mapping actuel (`under` vert, `on-track` ambre, `over` rouge).
- Vérifier que les dépenses dans les cards sont affichées en positif sans `−`, les revenus avec `+`, et que les signes du bandeau d’allocation restent inchangés.
- Vérifier qu’aucune barre de progression agrégée n’est rendue dans l’en-tête de catégorie.
- Vérifier la structure desktop en tracks alignés (nom, Prévu, Réel, progression sur une ligne) et mobile (nom, Prévu, Réel sur une ligne, progression dessous), sans libellé Prévu/Réel dupliqué dans chaque ligne.
- Vérifier le layout desktop à trois colonnes (petites à gauche, deux grandes chacune dans sa colonne) : la piste du nom se réduit par rapport au layout à deux colonnes, mais les noms restent lisibles et aucune valeur ne déborde.
- Vérifier que le bord droit des montants Prévu des lignes s’aligne sur celui du montant Prévu de l’en-tête, avec un écart visuel ≤ 1 px, symbole monétaire inclus.
- Vérifier que la croix n’existe qu’en mode édition et appelle immédiatement le service avec `0`, ferme l’édition, puis affiche « Non renseigné » ; un Échap/blur après l’action ne restaure pas l’ancien prévu.
- Vérifier que la croix est visuellement intégrée dans le champ, qu’elle ne chevauche pas le texte et qu’elle garde une cible clavier/tactile accessible de 44×44px.
- Vérifier que le champ est sans fond/bordure au repos, mais conserve un anneau de focus clavier visible en clair et sombre.
- Vérifier visuellement que le contrôle Prévu est identifiable au repos par une bordure/surface subtile, avec focus visible, dans les deux thèmes.
- Vérifier le container query de progression : dans une card de 320–455px, la barre est sur une rangée dédiée sous les montants ; à partir de 456px, la barre rejoint le track à droite.

### Critères d’acceptation
- Les cellules Prévu de sous-catégorie sont directement éditables, accessibles et localisées ; les cellules Réel restent en lecture seule.
- L’absence de `BudgetLine` ou un zéro validé s’affiche « Non renseigné » / « Not set ». Un montant catégorie demeure un total formaté, jamais un champ éditable.
- Entrée est la seule façon d’enregistrer ; Escape et perte de focus annulent sans mutation. Vide/zéro supprime la ligne ; un positif dès `0.01 €` peut être sauvegardé.
- La conversion euros → centimes et le recalcul des agrégats restent dans les services ; `MoneyPipe` affiche les montants selon la devise/locale courante.
- Aucun bouton Enregistrer, dialogue ou état de sauvegarde additionnel n’est ajouté.
- La croix est l’action explicite de réinitialisation : elle supprime immédiatement le prévu ; un Échap ou blur ultérieur ne restaure pas l’ancienne valeur. Enter continue de valider la saisie manuelle.
- En D trois colonnes, une progression sur deux rangées est acceptée si la card fait moins de 456px ; aucune colonne ne descend sous 320px. À 1280px avec deux colonnes, la progression reste sur la rangée des valeurs.
- Le champ de saisie est visuellement nu au repos ; la croix fait partie de sa zone visuelle sans être un bouton adjacent séparé, tout en restant un contrôle accessible.
- Vérification visuelle et clavier à 375px et desktop, en thèmes clair et sombre ; le clavier numérique mobile permet de valider avec sa touche Entrée/Terminé.
- `npx tsc -p tsconfig.app.json --noEmit`, `npx tsc -p tsconfig.spec.json --noEmit`, `npm run build` et `npx ng test --no-watch` passent. Aucun lint n’est demandé : il n’est pas configuré dans le dépôt. Les avertissements SCSS acceptés de TASK-011 peuvent subsister ; ne pas élargir cette tâche en refactor CSS.
- Aucun nouveau package, `any`, `$any`, cast `as`, changement d’API publique ni import de mock dans le composant.

### Hors périmètre pour cette tâche
- Saisie de prévu au niveau catégorie, changement des totaux, ajout de lignes de transaction prévues ou de nouvelles règles récurrentes.
- Solde d’ouverture et ajustement manuel : TASK-013.
- Refonte des catégories, des cartes, des raccourcis ou du conteneur global.
- Persistance backend, autosave au blur, bouton Enregistrer, dialogue/modal, sauvegarde automatique lors du changement de mois.
- Modification du `BudgetService` sauf si une anomalie bloquante est démontrée ; arrêter et demander avant de changer son contrat.

### Références
- `.ai/roadmap.md` § 4, tâche 12.
- `.ai/product-vision.md` § 9 et § 13 : rôle du Budget Mensuel et saisie prévue au niveau sous-catégorie.
- `src/app/services/budget.ts` : `setPlannedAmount()` accepte les euros, supprime la ligne à zéro et met à jour `monthSummary`.
- `src/app/services/money.ts` et `src/app/components/ui/money-pipe/money-pipe.ts` : conversions côté service, affichage localisé.
- `src/app/components/ui/transaction-form/transaction-form.ts` : contrôle de montant existant (ne pas reproduire son minimum historique incorrect de `0.1`).
- `.ai/domain-model.md` § 2–3 : prévu stocké en centimes, >0 ; zéro signifie absence de ligne ; statut/taux non définis sans prévu.
- `DESIGN_SYSTEM.md` § 2, § 4.1, § 5.3, § 6 et § 8 ; `AGENTS.md` : signaux, i18n, montants en centimes, accessibilité et mobile-first.
