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
- Un bouton depuis Budget Mensuel ouvre le dialogue de gestion.
- Le formulaire de création est en haut; la liste des règles est défilante en dessous. La catégorie filtre les sous-catégories disponibles.
- Esquisse proposée, dans le style et les tokens déjà utilisés par l'application :

```text
┌ Règles récurrentes ─────────────────────────── × ┐
│ Nouvelle règle                                  │
│ Libellé       Catégorie       Sous-catégorie     │
│ Montant       Jour (facultatif)                 │
│ Cette règle prendra effet à partir de décembre 2026. │
│ [Ajouter la règle]                              │
│ ─────────────────────────────────────────────── │
│ Salaire mensuel · Revenus / Salaire    [Actions] │
│ 2 450,00 € · Active · Depuis juillet 2026       │
│ Loyer appartement · Charges fixes / Loyer [Actions]│
│ 850,00 € · Active · Depuis juillet 2026         │
│ ... liste défilante ...                         │
└────────────────────────────────────────────────┘

Confirmation dans le même dialogue :
« Synchroniser les mois déjà préparés ? »
[Synchroniser les mois préparés] [Appliquer à partir de décembre 2026]
```
- Les règles sont regroupées par série logique et montrent le libellé, la catégorie/sous-catégorie, le montant, l'état et les dates utiles. Les versions passées restent consultables sans être modifiables directement.
- Modifier remplace le contenu du formulaire dans ce même dialogue; annuler revient à la liste sans mutation.
- Les actions de ligne passent par un menu accessible au clavier/tactile. Désactiver/réactiver crée une version future via TASK-019 et conserve l'historique; aucune suppression définitive n'est ajoutée.
- Création et modification affichent la date d'effet calculée depuis le mois système, indépendante du mois sélectionné, sous une forme localisée, par exemple « Cette règle prendra effet à partir de décembre 2026. »
- Si l'enregistrement peut synchroniser au moins un mois déjà préparé concerné, afficher dans le même dialogue un état de confirmation : « Synchroniser les mois déjà préparés » ou « Appliquer à partir de [mois d'effet] ». La première option inclut tous les mois préparés concernés, y compris les mois passés; les montants modifiés manuellement et les lignes effacées à zéro sont préservés. La seconde laisse les budgets préparés inchangés.
- Lors de la création d'une nouvelle série, ne pas proposer la synchronisation : la nouvelle règle ne concerne que les préparations effectuées à partir de son mois d'effet.
- La confirmation de synchronisation concerne uniquement la modification, désactivation ou réactivation d'une série existante et n'apparaît que si des mois préparés concernés existent.
- Une erreur de validation ou d'agrégat laisse le formulaire ouvert, traduit le problème et ne fait aucune mutation partielle.

### Formulaire et validation
- Champs modifiables : libellé, catégorie, sous-catégorie, montant positif en centimes et jour du mois optionnel. Le mois de début d'une version est fixé par le service au mois système suivant; la date d'effet est affichée, pas saisie.
- Respecter les dates de fin inclusives existantes; la désactivation est l'action normale pour arrêter une série.
- Parser la saisie monétaire via `MoneyService`; aucun montant flottant n'est stocké.
- Libellés, état actif/inactif/terminé, actions, erreurs, confirmation de synchronisation et date d'effet sont localisés FR/EN.

### Accessibilité et présentation
- Dialogue adaptatif, titre accessible, nommément annoncé, `role="dialog"`, `aria-modal="true"`, fermeture au clavier, focus initial et restitution du focus au bouton d'ouverture. Aucune action ne dépend du survol.
- Réutiliser le composant `Modal` existant si son contrat permet ces exigences; sinon l'étendre de façon compatible et couvrir son comportement existant par des tests.
- Pas de dialogue imbriqué : la confirmation de synchronisation est un état dans le même dialogue.
- Mobile-first, tailles tactiles du design system, surfaces/tokens existants, sans nouvelle dépendance.

### Fichiers probables
- `src/app/pages/budget-mensuel/` : bouton et ouverture du gestionnaire.
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
- Dialogues mobile/desktop : contenu défilant, création en tête, actions accessibles au tactile et au clavier, absence de débordement horizontal.
- FR/EN, aucune chaîne visible en dur.
- `npx tsc -p tsconfig.app.json --noEmit`, `npx tsc -p tsconfig.spec.json --noEmit`, `npx ng test --no-watch`, `npm run build` et `git diff --check` passent.

### Hors périmètre
- Contrat de versionnement, synchronisation et gestion des exceptions (TASK-019).
- Transactions réelles, génération de transactions planifiées ou récurrences à montant variable.
- Suppression définitive d'une série et écriture backend.

### Critères d'acceptation
- L'utilisateur peut réaliser les parcours CRUD prévus dans un seul dialogue accessible, sans modales imbriquées.
- La date d'effet système est visible avant sauvegarde et ne dépend pas du mois consulté.
- Les choix de synchronisation décrivent les mois touchés; les budgets et transactions existants ne sont pas modifiés silencieusement.
- Toutes les mutations passent par les services; aucune donnée mock n'est importée dans l'interface.