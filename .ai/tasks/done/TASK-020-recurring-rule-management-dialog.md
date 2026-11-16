## Tâche — gérer les règles récurrentes depuis Budget Mensuel
Statut : validée le 2026-11-16
Ordre : seconde tâche, dépend de TASK-019
Branche après validation : `feat/recurring-rule-management-dialog`

### Intention
Permettre de consulter, créer, modifier, désactiver et réactiver les règles qui alimentent le prévisionnel, sans confondre récurrence et transaction réelle. La date d'effet et les conséquences sur les mois déjà préparés doivent être explicites avant l'enregistrement.

### Approches
- Ouvrir un second formulaire/modal pour créer ou modifier : écarté, car cela imbrique les dialogues et perd le contexte de la liste.
- Un seul dialogue avec formulaire de création en tête, liste défilante et formulaire d'édition dans le même dialogue : retenu conformément aux décisions produit déjà consignées dans `.ai/product-vision.md`.

### Parcours retenu
- Le bouton « Règles » est une action secondaire intégrée au groupe de commandes existant de la carte « Préparation du mois »; il ne crée pas de rangée autonome entre la topbar et la synthèse.
- Un seul dialogue contient le formulaire et les règles existantes. Tout le contenu du dialogue défile ensemble sur mobile et desktop; ni le formulaire ni la liste ne sont sticky, et aucun scroll imbriqué n'est créé.
- Le formulaire de création précède un titre secondaire « Règles existantes » puis la liste. La catégorie filtre les sous-catégories disponibles.
- Esquisse proposée, dans le style et les tokens déjà utilisés par l'application :

```text
┌ Règles récurrentes ─────────────────────────── × ┐
│ Nouvelle règle                                  │
│ Libellé       Catégorie       Sous-catégorie     │
│ Montant       Jour facultatif  Fin facultative   │
│ Cette règle prendra effet à partir de [déc. 2026]│
│ [Ajouter la règle]                              │
│ Règles existantes                               │
│ Salaire mensuel                  2 450 € · Active│
│ Revenus / Salaire                Depuis juil. 26 │
│ Loyer appartement                  850 € · Active│
│ Charges fixes / Loyer            Depuis juil. 26 │
│ ... contenu complet défilant ...                │
└────────────────────────────────────────────────┘

Confirmation dans le même dialogue :
« Synchroniser les mois déjà préparés ? »
[Synchroniser les mois préparés] [Appliquer à partir de décembre 2026]
```
- Le début d'une règle créée ou d'une nouvelle version est fixé au mois système suivant; ce mois est mis en évidence en gras et couleur d'accent dans l'indication de prise d'effet. Une fin facultative est saisissable, inclusive, et doit être égale ou postérieure au mois de début. Pas de date de début rétroactive.
- Les règles sont regroupées par série logique et montrent le libellé, la catégorie/sous-catégorie, le montant, l'état et la période. Les versions passées restent consultables sans être modifiables directement. Une seule série est dépliée à la fois et reçoit une surbrillance discrète avec `--color-accent-soft`.
- Desktop : deux colonnes à deux rangées : nom puis catégorie/sous-catégorie à gauche; montant/statut puis période à droite.
- Mobile : deux colonnes : nom puis montant/statut dans la première; catégorie/sous-catégorie puis période dans la seconde. Catégorie et sous-catégorie ne sont jamais tronquées; seul le nom peut être tronqué par ellipse.
- Le statut « Terminée » signifie que le mois de fin inclusif est passé selon le mois système. « Inactive » signifie une désactivation manuelle; « À venir » signifie que le mois de début est futur.
- Modifier remplace le contenu du formulaire dans ce même dialogue; annuler revient à la liste sans mutation.
- Les actions de ligne passent par un menu accessible au clavier/tactile. Désactiver/réactiver crée une version future via TASK-019 et conserve l'historique; aucune suppression définitive n'est ajoutée.
- Création et modification affichent la date d'effet calculée depuis le mois système, indépendante du mois sélectionné. « À partir de [mois] » est utilisé tant que le début est futur; « Depuis [mois] » dès que le mois système a commencé. Une date de fin facultative est ajoutée au libellé de période.
- Dans la phrase d'effet, isoler la séquence localisée « à partir de [mois] » dans un élément `<strong>` coloré avec `--color-accent`; ne pas injecter de HTML depuis les traductions.
- Si l'enregistrement peut synchroniser au moins un mois déjà préparé concerné, afficher dans le même dialogue un état de confirmation : « Synchroniser les mois déjà préparés » ou « Appliquer à partir de [mois d'effet] ». La première option inclut tous les mois préparés concernés, y compris les mois passés; les montants modifiés manuellement et les lignes effacées à zéro sont préservés. La seconde laisse les budgets préparés inchangés.
- Lors de la création d'une nouvelle série, ne pas proposer la synchronisation : la nouvelle règle ne concerne que les préparations effectuées à partir de son mois d'effet.
- La confirmation de synchronisation concerne uniquement la modification, désactivation ou réactivation d'une série existante et n'apparaît que si des mois préparés concernés existent.
- Une erreur de validation ou d'agrégat laisse le formulaire ouvert, traduit le problème et ne fait aucune mutation partielle.

### Formulaire et validation
- Champs : libellé, catégorie, sous-catégorie, montant positif en centimes, jour du mois optionnel et mois de fin optionnel. Le mois de début d'une version est fixé par le service au mois système suivant; seule la date de fin est saisissable.
- La date de fin est inclusive et ne peut pas précéder le mois de début. Sa suppression rend la règle sans date de fin. La désactivation reste disponible et conserve son sens distinct de fin de période.
- Parser la saisie monétaire via `MoneyService`; aucun montant flottant n'est stocké.
- Libellés, état actif/inactif/terminé, actions, erreurs, confirmation de synchronisation et date d'effet sont localisés FR/EN.

### Accessibilité et présentation
- Le titre principal du modal utilise `--text-heading` pour tous les modals. Dialogue adaptatif, titre accessible, nommément annoncé, `role="dialog"`, `aria-modal="true"`, fermeture au clavier, focus initial et restitution du focus au bouton d'ouverture. Aucune action ne dépend du survol.
- Réutiliser le composant `Modal` existant si son contrat permet ces exigences; sinon l'étendre de façon compatible et couvrir son comportement existant par des tests.
- Le contenu complet du modal défile dans son panneau; le défilement de la page derrière est bloqué et sa position restaurée à la fermeture. Le scroll tactile reste confiné au modal, sans scrollbar décorative visible.
- La marge de sécurité du focus ring est conservée à l'intérieur du panneau aux largeurs mobile et desktop.
- Pas de dialogue imbriqué : la confirmation de synchronisation est un état dans le même dialogue.
- Mobile-first, tailles tactiles du design system, surfaces/tokens existants, sans nouvelle dépendance.

### Fichiers probables
- `src/app/pages/budget-mensuel/` : bouton et ouverture du gestionnaire.
- `src/app/components/ui/opening-balance/` : action secondaire « Règles » intégrée à la carte de préparation.
- `src/app/components/ui/` : dialogue ou formulaire si une frontière réutilisable est nécessaire.
- `src/app/components/ui/modal/` : uniquement les changements d'accessibilité nécessaires au dialogue.
- `src/app/services/recurring-rule.ts` et autres services/modèles déjà livrés par TASK-019 : consommation des APIs typées.
- `public/i18n/fr.json`, `public/i18n/en.json` : chaînes.

### Tests obligatoires
- Ouverture/fermeture du dialogue, focus et accessibilité clavier; l'annulation ne modifie aucun signal.
- Création, modification et désactivation/réactivation appellent les services versionnés attendus; les mois préparés et les données de transactions restent distincts.
- La date affichée est le mois système suivant, en FR et EN, même si un autre mois est sélectionné; tester décembre/janvier.
- Le choix de synchronisation n'apparaît que si des mois préparés sont concernés; les deux options invoquent le comportement TASK-019 correct.
- Préservation visible des ajustements manuels et des lignes supprimées à zéro après synchronisation.
- Formulaire invalide, catégories sans sous-catégorie, montants invalides et échec d'agrégat restent explicites et sans mutation partielle.
- Date de fin vide ou valide, fin antérieure au début, et statuts « À venir », « Active », « Inactive », « Terminée » dérivés du mois système.
- Dialogues mobile/desktop : contenu défilant, création en tête, actions accessibles au tactile et au clavier, absence de débordement horizontal.
- Une seule série dépliée à la fois; disposition des informations desktop/mobile et focus ring visibles.
- Le modal verrouille le scroll du document derrière, et son contenu est entièrement défilable jusqu'aux commandes de fin.
- FR/EN, aucune chaîne visible en dur.
- `npx tsc -p tsconfig.app.json --noEmit`, `npx tsc -p tsconfig.spec.json --noEmit`, `npx ng test --no-watch`, `npm run build` et `git diff --check` passent.

### Hors périmètre
- Contrat de versionnement, synchronisation et gestion des exceptions (TASK-019).
- Transactions réelles, génération de transactions planifiées ou récurrences à montant variable.
- Suppression définitive d'une série et écriture backend.

### Suivi de livraison — 2026-11-16
- Implémentation commitée dans `f91e92a` (`feat: add recurring rule manager to budget month`), sur `feat/recurring-rule-management-dialog`.
- PR #59 mergée dans `main` (squash `7607f5c`).
- Validations réussies : deux typechecks, 573 tests sur 35 fichiers, build et `git diff --check`. Le build conserve deux avertissements de budget SCSS préexistants (`budget-mensuel.scss`, `category-card.scss`). Le lint reste non configuré.
- Écarts validés pendant l'implémentation : action « Récurrences » ; fin de période choisie dans un sélecteur mois/année (`app-month-picker`) au lieu d'un champ natif ; libellés permanents de l'équation et de la préparation.

### Critères d'acceptation
- L'utilisateur peut réaliser les parcours CRUD prévus dans un seul dialogue accessible, sans modales imbriquées.
- La date d'effet système est visible avant sauvegarde et ne dépend pas du mois consulté.
- Le début de toute nouvelle version est le mois système suivant; la fin optionnelle est inclusive.
- Les choix de synchronisation décrivent les mois touchés; les budgets et transactions existants ne sont pas modifiés silencieusement.
- Toutes les mutations passent par les services; aucune donnée mock n'est importée dans l'interface.