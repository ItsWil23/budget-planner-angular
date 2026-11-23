## Tâche : harmoniser le styling de Transactions
Lot : 2 (`roadmap.md` § 5, TASK-029, après TASK-028)
Statut : implémentée et validée le 2026-11-23 ; PR #71 ouverte pour revue humaine
Branche : `feat/lot2-transactions-styling`

### Suivi de livraison — 2026-11-23
- Commit applicatif : `affc58b` (`feat: improve responsive transactions and form controls`).
- PR #71 vers `main` ouverte pour revue ; aucune fusion effectuée.
- Validations : 707 tests sur 40 fichiers ; build réussi ; `tsc` app et spec sans erreur ; `git diff --check` propre. Aucune dépendance ajoutée.
- Revue navigateur en français/thème sombre : 375, 767, 768, 800, 1024 et 1280 px ; pas de débordement horizontal de page. La disposition suit la largeur réelle du conteneur. Le calendrier tient à 375 px ; Échap le ferme sans fermer la modale ; le dépliage mobile expose catégorie et sous-catégorie.
- Avertissements de build : bundle initial à 548.16 kB pour un budget de 500 kB et cinq avertissements de budgets SCSS.
- Non vérifiés manuellement : rendu visuel anglais et restitution avec lecteur d’écran.

### Contexte et direction
La page utilise encore des anciens tokens et le formulaire reste peu stylé. À 375 px, la table dépasse son île et coupe le montant et les actions. La référence Sam's Finance App inspire la hiérarchie et les séparateurs, pas sa palette, ses filtres ou sa pagination.

Décisions utilisateur du 2026-11-19 : aucun défilement horizontal sur mobile ; lignes compactes quand la liste est étroite, colonnes classiques quand sa largeur réelle suffit. Le breakpoint dépend de la largeur du conteneur liste, pas de la fenêtre, puisque la barre latérale réduit l'espace disponible. Le seuil retenu est 720 px de conteneur : à 768 px de fenêtre la liste fait environ 710 px, donc le mode compact reste actif ; à 800 px de fenêtre elle fait environ 742 px, donc la table classique peut s'activer. Une seule île contient les transactions ; aucune carte flottante par ligne. Après revue du premier essai à trois niveaux, l'utilisateur demande un résumé mobile dépliable : libellé et sous-catégorie au repos, puis libellé complet, catégorie et sous-catégorie au dépliage.

### Premier rendu mobile retenu
Quatre colonnes conservées : icône, identification, montant/date, menu. Au repos :

```text
[icône] Courses de fin...         -81,75 EUR  [menu]
        Courses                  22 nov. 2026
```

Après dépliage :

```text
[icône] Courses de fin de mois    -81,75 EUR  [menu]
        Charges variables        22 nov. 2026
        Courses
```

- Libellé en texte principal légèrement renforcé. Replié : une seule ligne avec ellipse, sous-catégorie seule en seconde ligne secondaire ; la catégorie n'est pas affichée. La sous-catégorie est aussi limitée à une ligne si nécessaire pour garder le résumé compact. Déplié : libellé complet sur autant de lignes que nécessaire, catégorie et sous-catégorie sur leurs lignes distinctes, secondaires, plus petites et en `--text-muted` ; aucune information perdue.
- Montant aligné à droite, en chiffres tabulaires, visuellement aussi important que le libellé. Dépense en `--text-primary`, revenu en `--color-income`, signes conservés et formatage via MoneyPipe depuis les centimes.
- Date secondaire sous le montant, plus petite et en `--text-muted`. Libellé et montant alignés sur leur première ligne ; décision utilisateur après le lot 1 : la date peut descendre quand le libellé déplié occupe plusieurs lignes. Aucune restructuration de grille n'est exigée pour empêcher ce déplacement.
- Colonnes d'icône et d'action stables ; déclencheur du menu avec cible de 44 × 44 px. Zone centrale flexible et place réservée aux montants/dates. Hauteur minimale et espacements communs, sans imposer une hauteur fixe qui coupe le texte.
- Le résumé tronqué est accessible par un vrai bouton de dépliage (Entrée/Espace, `aria-expanded` et relation au contenu détaillé). Un appui sur la zone de ligne (icône, libellé, sous-catégorie, montant/date et espaces du résumé) déclenche le dépliage/repliage, comme pour le résumé des règles : ne pas limiter la cible au texte du libellé. Le menu reste un contrôle frère indépendant, jamais imbriqué dans ce bouton. Cliquer sur le menu ou Modifier/Supprimer ne doit pas déplier/replier la ligne. Ne pas remplacer cette interaction par un simple clic sur `tr` sans équivalent clavier. Le libellé accessible permet d'identifier la transaction sans dépendre d'une infobulle au survol.
- Placer le chevron avant le libellé, dans une place réservée et stable à gauche du texte, sans ajouter de colonne globale ni déplacer la pastille. Aligner les lignes de catégorie/sous-catégorie sur le début du texte du libellé, pas sous le chevron. Décision utilisateur après le deuxième correctif : centrer le chevron verticalement sur toute la hauteur de la ligne mobile, repliée comme dépliée, plutôt que sur la première ligne du libellé. Cette décision remplace la consigne précédente ; garder son axe horizontal stable et la cible de dépliage indépendante du menu.
- Choix PM pour ce premier essai : une seule ligne dépliée à la fois, état géré par signal à partir de l'id de transaction, comme le gestionnaire de règles. La sélection du mois ou la disparition d'une transaction ne doit laisser aucun détail orphelin. Aucun dépliage requis en desktop : toutes les colonnes sont présentes. Le mode lecture seule reste sans menu mais permet de lire les textes complets via le même dépliage mobile.
- Une fois dépliés, les noms longs reviennent à la ligne, y compris les mots sans espace si nécessaire. Aucun chevauchement, troncature inaccessible ou police réduite pour faire tenir une ligne. Pour les montants extrêmes, prévoir un repli lisible sans perdre de chiffres ni provoquer de défilement horizontal ni écraser complètement la zone de résumé.

### Rendu moyen et grand format
Quand le conteneur de la liste atteint 720 px, conserver les colonnes classiques : icône/libellé, catégorie, sous-catégorie, date, montant, menu. En-têtes et cellules alignés ; montant à droite. Conserver la distinction principal/secondaire sans multiplier les couleurs. L'îlot occupe la largeur disponible ; séparateurs fins entre les lignes, sans ombre. Vérifier le seuil de conteneur à 719/720 px et les fenêtres 768, 800, 1024 et 1280 px avec noms longs et montants importants, pas seulement 1280 px.

La longueur du libellé ne doit pas redistribuer les colonnes suivantes à largeur de conteneur identique. Définir des pistes ou largeurs de colonnes maîtrisées en fonction de l'espace disponible (par exemple table à disposition fixe avec répartition explicite), avec retour à la ligne dans les cellules textuelles, plutôt que laisser les contenus dicter toute la répartition. Conserver un espace suffisant pour date, montant et menu sans chevauchement ni réduction de police. Vérifier avec les mêmes données puis un libellé beaucoup plus long, y compris sans espace : les débuts de catégorie, sous-catégorie et date doivent rester stables. Sur desktop, le libellé est du texte complet, pas un bouton de dépliage sans effet visible ; ne pas exposer un contrôle ni `aria-expanded` qui ne servent qu'au mobile.

Ajustement utilisateur après le deuxième correctif : réduire la part de largeur laissée au libellé et redistribuer l'espace aux colonnes de catégorie/sous-catégorie et aux colonnes secondaires qui en ont besoin. Ne plus laisser le libellé absorber sans limite tout l'espace restant. Conserver une répartition stable à contenu variable, mais adaptée à la largeur du conteneur ; vérifier l'équilibre visuel à 768 px, 1280 px et sur grand écran sans colonne inutilement vide ni regroupement excessif des autres données. La réduction du libellé ne doit pas rogner date, montant ou menu.

Choix PM pour l'alignement des dates desktop : aligner à droite la cellule et l'en-tête Date, et utiliser les chiffres tabulaires. Conserver le format localisé avec mois textuel et année (`1 nov. 2026`, `22 nov. 2026`), sans imposer un zéro initial au jour. Vérifier des jours à un et deux chiffres ainsi que la locale anglaise ; conserver la lecture et le placement de date mobile actuels. Ne pas utiliser un alignement justifié qui étire les espaces dans la date.

### Périmètre d'implémentation
1. **Liste** : adapter `transaction-list.html`, `.scss` et l'état de dépliage dans `.ts` aux deux dispositions, avec les tokens sémantiques existants (texte, chiffres, surfaces, bordures, espacements, dimensions). Garder toutes les informations accessibles à chaque largeur (par dépliage sur mobile). Préserver une structure accessible ; si des éléments sont dupliqués pour le responsive, une seule version est exposée et focusable à chaque largeur. Les menus ne doivent être ni rognés par un conteneur ni hors écran, notamment sur la dernière ligne.
2. **Date** : remplacer le format purement numérique par une date localisée avec mois abrégé et année, par exemple `22 nov. 2026` en français et `Nov 22, 2026` en anglais. Utiliser la locale courante de SettingsService et les mécanismes de formatage existants ; le changement de langue/locale met à jour l'affichage. Ne jamais décaler le jour lors d'une conversion de fuseau d'une date civile `YYYY-MM-DD`. Les noms utilisateurs ne sont pas traduits. Ajouter un élément `time` avec `datetime` ISO si compatible avec la structure retenue.
3. **Page** : harmoniser l'îlot, le bouton d'ajout et les actions de confirmation avec les tokens du design system. Conserver le placement actuel du bouton d'ajout (pleine largeur mobile, à gauche sur desktop). Pas de nouvelle section décorative, KPI, filtre, recherche ou tri.
4. **Formulaire ajout/édition** : labels visibles, champs de largeur maîtrisée et hauteur tactile minimale, espacement régulier, erreurs près des champs, aide TASK-028 lisible, boutons primaire/secondaire cohérents et focus visible. Réutiliser les conventions de champs du gestionnaire de règles, sans créer un autre formulaire. Conserver les validations, le brouillon, l'aide et la navigation de TASK-028.
5. **Composants partagés** : ne pas modifier Modal, RowMenu ou UndoToast ni les tokens globaux. Extension utilisateur du 2026-11-19 : l'harmonisation des dropdowns peut toucher leurs consommateurs hors Transactions, et la date de transaction doit disposer d'un calendrier journalier hiérarchique. Les limites et contrôles de cette extension sont décrits ci-dessous. Réutiliser les icônes/utilitaires déjà disponibles ; ne pas inventer un mapping d'icônes métier ni ajouter de dépendance sans accord.

### Extension formulaire demandée le 2026-11-19
Cette extension est autorisée dans TASK-029 même si elle touche des composants hors du lot. Elle couvre des contrôles partagés et leurs intégrations, pas uniquement du SCSS. Signaler les fichiers réellement touchés dans le rapport de livraison.

#### Dropdowns : champ, chevron et panneau d'options
- Recentrer verticalement le chevron et l'éloigner du bord droit avec un retrait cohérent fondé sur les tokens. Réserver sa largeur dans le champ pour que le libellé ne passe jamais dessous ; ne pas réduire la zone cliquable à l'icône. Harmoniser ce retrait entre les formulaires.
- Rappel explicite après le deuxième correctif : la correction des chevrons des champs dropdown n'a pas été livrée et reste obligatoire dans TASK-029. Elle ne doit pas être oubliée en attendant le panneau partagé : positionnement intérieur, centrage vertical et espace réservé au texte sont à vérifier dans chaque consommateur concerné. Le dropdown partagé et le calendrier journalier restent également dans le périmètre autorisé ; un découpage en lots de livraison n'annule pas ces exigences et ne vaut pas clôture ni autorisation de PR.
- Le panneau ouvert et ses items doivent suivre le thème : fond opaque, bordure fine, couleur de texte lisible, focus et option sélectionnée identifiables, options désactivées distinctes. Ni ombre ni couleur brute.
- La police d'item est celle du texte courant (`--text-body`), avec un espacement mesuré et sans hauteur ou padding décoratif excessif. Respecter les cibles tactiles de 44 px en mobile sans transformer chaque item en grosse carte ; une liste longue défile dans un panneau de hauteur bornée au viewport. Ne pas rapetisser la police pour afficher davantage d'items.
- Les panneaux natifs des `<select>` sont contrôlés en partie par le navigateur/OS : du CSS sur `option` ne garantit pas un résultat thémé et uniforme. Pour satisfaire cette demande, privilégier un seul contrôle partagé accessible, réutilisé par tous les consommateurs concernés, plutôt que plusieurs dropdowns sur mesure. Conserver l'intégration Angular Forms et les valeurs/validations existantes ; ne pas transformer un menu d'actions en liste de choix.
- Consommateurs inclus : catégorie et sous-catégorie dans TransactionForm et RecurringRuleManager. Le sélecteur de mois global, le menu de compte, les menus d'actions et CategoryCard ne sont pas inclus dans cette harmonisation.
- Conserver label accessible, valeur sélectionnée, état requis/invalide, `aria-describedby` et disabled ; distinction entre focus d'une option et choix validé. Prévoir clavier (flèches, Début/Fin, Entrée/Espace, Échap, Tab), recherche au clavier par libellé, fermeture extérieure et retour du focus approprié. Aucune option désactivée ne doit devenir sélectionnable. Aucun nom de catégorie/sous-catégorie utilisateur n'est traduit.
- Vérifier le placement du panneau près des bords et en bas de modale : aucun rognage, débordement horizontal ou fermeture de la modale avec Échap destiné au dropdown. Pas de piège clavier dans une liste non modale.

#### Date de transaction : calendrier à trois niveaux
- Remplacer l'expérience visuelle native du champ `type="date"` par un sélecteur journalier cohérent avec MonthPicker : champ thémé, icône calendrier, panneau et contrôles alignés, mêmes conventions de focus et de bordures. Ce n'est pas simplement un changement de format d'affichage dans la liste.
- À l'ouverture, afficher la grille des jours du mois de la date courante du formulaire. Une action dans l'en-tête remonte au choix du mois, puis de l'année ; la sélection redescend année → mois → jour. Les flèches permettent de parcourir la période du niveau courant. Le jour sélectionné et aujourd'hui sont identifiables sans dépendre uniquement de la couleur.
- Naviguer entre niveaux, mois ou années ne modifie pas la valeur du formulaire : seul le choix d'un jour valide enregistre une date complète et ferme le panneau. Échap/fermeture sans choix conserve la date précédente et le brouillon. Une modification de date ne soumet pas le formulaire.
- Garder le contrat `YYYY-MM-DD` comme date civile, la date locale du jour par défaut en ajout et la date existante en édition ; aucune conversion UTC susceptible de décaler le jour. Ne pas reprendre la limite `minMonth` des règles : les transactions passées et futures restent possibles suivant les validations existantes.
- Localiser les noms de mois/jours, l'ordre de semaine et les libellés accessibles via les mécanismes de locale/i18n du projet. Prévoir mois courts/longs, années bissextiles et transitions d'année ; réutiliser les API de dates appropriées plutôt qu'un parsing de libellés affichés.
- Réutiliser MonthPicker et ses conventions là où cela convient, sans casser son usage mensuel. Un composant frère journalier est acceptable pour éviter de changer le contrat des règles ; toute factorisation doit rester nécessaire et testée. Aucun remaniement sans rapport du gestionnaire de règles.
- Navigation clavier du calendrier (flèches entre jours, changement de période, sélection, Échap), focus visible et retour au déclencheur ; panneau utilisable dans Modal sans dialogue imbriqué ni conflits de fermeture. Les 7 colonnes de jours doivent tenir à 375 px : ajuster raisonnablement le padding ou la largeur du panneau dans la modale, sans réduire les cibles tactiles ni créer de défilement horizontal. Ne pas recopier une largeur minimale de MonthPicker sans la mesurer.

### Fichiers concernés
- `src/app/components/ui/transaction-list/transaction-list.html`, `.scss`, `.spec.ts` et `.ts` pour la liste responsive et l'état de dépliage mobile.
- `src/app/pages/transactions/transactions.scss` pour la page Transactions.
- `src/app/components/ui/transaction-form/transaction-form.html`, `.scss`, `.spec.ts` et `.ts` pour le formulaire et les nouveaux contrôles.
- Nouveau composant partagé : `src/app/components/ui/select-field/` (HTML, SCSS, TypeScript et tests), utilisé dans TransactionForm et RecurringRuleManager.
- Nouveau calendrier : `src/app/components/ui/date-picker/` (HTML, SCSS, TypeScript et tests), utilisé dans TransactionForm.
- `src/app/components/ui/recurring-rule-manager/recurring-rule-manager.html`, `.scss`, `.spec.ts` et `.ts` pour l'intégration du sélecteur partagé.
- `public/i18n/fr.json` et `public/i18n/en.json` pour les libellés d'interaction et d'accessibilité ; jamais les noms utilisateur.

### Vérifications et critères d'acceptation
- À 375 px : résumé compact à quatre colonnes, libellé sur une ligne avec ellipse, sous-catégorie seule dessous, montant/date et menu visibles. Au dépliage : libellé complet, catégorie et sous-catégorie distinctes. Aucun défilement horizontal ni contenu coupé hors des ellipses explicitement prévues dans le résumé.
- Contrôler le seuil du conteneur à 719/720 px et les fenêtres 768, 800, 1024 et 1280 px, en FR/EN et thèmes clair/sombre. La disposition classique commence à 720 px de largeur réelle de liste, pas à une largeur de fenêtre fixe ; aucune information ne disparaît à la transition. Le mode compact à 768 px de fenêtre (liste mesurée à 710 px) est validé par l'utilisateur.
- Vérifier plusieurs lignes, avec libellés et catégories longs, mots sans espace, revenus/dépenses, montants usuels et proches de la limite sûre. Les espacements, séparateurs et alignements restent cohérents. Le mode lecture seule reste sans menu.
- Dates avec mois textuel, année conservée, correctes dans les deux locales et sans décalage de jour ; tests ciblés sur locale/date. Montants exacts toujours formatés depuis les centimes.
- Tester l'accès clavier et tactile aux actions, la dernière ligne et le retour du focus après édition, suppression et annulation. Aucun menu ne doit être rogné par un overflow ajouté pour cacher le problème.
- Vérifier ajout/édition, confirmation de suppression, undo et état vide. Ne pas modifier les règles métier ou le contrat de services.
- Tests existants conservés, nouvelles assertions ciblées si le DOM ou le format de date change. `npx ng test --no-watch`, `npm run build`, `tsc` app/spec et `git diff --check` doivent passer. Signaler les avertissements de budget ; lint non configuré, non exécuté.
- Tests ciblés du résumé/dépliage/repliage, de l'exclusivité de la ligne ouverte, du clavier, du mode lecture seule, et de l'indépendance du menu. Revue visuelle obligatoire des deux états, des longs noms et des seuils responsive avant clôture.
- Après le lot 1 : vérifier un appui sur les zones icône, sous-catégorie, montant/date et espaces de ligne, pas seulement sur le libellé ; le menu ne bascule jamais le détail. Chevron avant le libellé avec alignement stable. Le déplacement vertical de la date au dépliage est accepté.
- À 720 px de conteneur et à 1280 px de fenêtre, comparer les positions de colonnes avant/après un libellé long ; aucun décalage piloté par le contenu. Aucun bouton de dépliage sans effet en desktop. Les vérifications de positions se font dans le navigateur, pas uniquement via les tests unitaires de DOM.
- Vérifier le centrage vertical du chevron sur la ligne mobile complète dans les deux états, et les proportions rééquilibrées de la table desktop. L'en-tête et les dates sont alignés à droite ; tester les jours 1/9 et 10/22 avec les mois textuels localisés.
- Dropdowns ouverts/fermés vérifiés en thèmes clair/sombre et FR/EN, dans Transactions, les règles et l'édition des catégories. Tester clavier, options désactivées, synchronisation des formulaires, fermeture et absence de rognage ; conserver les tests métier des consommateurs.
- Calendrier journalier testé en ajout et édition : jours/mois/années, validation au choix du jour uniquement, fermeture sans mutation, années bissextiles, mois et années voisins, date civile sans décalage. Contrôler le clavier, les libellés accessibles, le focus et le panneau à 375 px ; les usages mensuels des règles restent fonctionnels et testés.

### Retour de revue PM — 2026-11-19
- **En-têtes desktop mal alignés (confirmé)** : la règle commune à `thead` et `.header-row` leur applique `display: table-header-group`. Le `tr` doit rester une ligne de table ; dans le premier rendu à 1280 px, l'en-tête Catégorie commence vers x=398 contre x=724 pour les cellules. Vérifier l'alignement réel de toutes les colonnes après correction.
- **Débordement au seuil desktop (confirmé)** : à 768 px, îlot de 750 px de largeur intérieure et contenu défilant d'environ 867 px, même avec les transactions courantes. Conserver le seuil convenu, mais maîtriser les largeurs et les retours à la ligne, sans masquer le problème par un overflow caché.
- **Hiérarchie des montants (confirmé)** : le montant desktop utilise `--num-emphasis` (19 px), réservé aux KPI. Employer `--num-body` pour les montants de liste ; `--text-emphasis` pour le libellé et `--text-caption` / `--text-muted` pour les informations secondaires. La date ne doit pas revenir en texte principal sur desktop.
- **Contraste des boutons accent (confirmé, thème sombre terracotta)** : texte blanc sur accent clair, environ 2.40:1 pour Nouvelle transaction et Ajouter, insuffisant. Corriger la paire texte/fond avec les tokens existants et mesurer les deux thèmes ; ne pas supposer que le blanc convient à toutes les palettes. Si aucun couple existant ne convient, demander un ajustement de tokens plutôt qu'ajouter une couleur brute.
- **Noms sans espace (confirmé par substitution DOM temporaire, sans mutation de données)** : une catégorie longue porte le contenu à 829 px pour un îlot de 358 px sur mobile ; les longues valeurs font également dépasser le tableau desktop. Ajouter les contraintes de largeur et de césure nécessaires dans les cellules de détails et de table. Les substitutions de test ont été retirées.
- **Breakpoint de disposition (décision PM — 2026-11-23)** : l'utilisateur valide le mode compact à 768 px de fenêtre. Avec la sidebar, la liste ne fait alors que ~710 px ; conserver le seuil en largeur de conteneur de 720 px. Ne pas remplacer par un breakpoint media-query à 768 px.
- **Sémantique et icône (risques à traiter explicitement)** : le snapshot Chromium conserve une table dans le premier rendu, mais cela ne prouve pas sa restitution dans tous les lecteurs d'écran avec `display: contents/grid`. Vérifier une sémantique cohérente et le bouton de dépliage. Le texte technique d'icône (ex. shopping-cart) ne doit pas être annoncé comme contenu de transaction ; l'icône/pastille décorative ne remplace pas le nom textuel. Ne pas inventer un mapping métier dans cette tâche.
- **Tokens et mouvement** : retirer les anciens alias locaux encore utilisés (`--spacing-xl`, `--spacing-lm`, `--color-expense`) au profit de leurs rôles sémantiques ; les nouveaux styles ne doivent pas conserver `color: white`, des durées brutes ou un mouvement actif sous `prefers-reduced-motion`.
- **Éléments déjà vérifiés positivement** : 658 tests / 38 fichiers ; build réussi à 521.21 kB (budget 500 kB), avertissements SCSS sur Budget Mensuel, CategoryCard et RecurringRuleManager. Champs/boutons de formulaire et items du menu à 44 px ; menu de dernière ligne visible à 375 px ; ajout ouvert puis annulé sans mutation. Dates FR/EN couvertes par les tests. La vérification navigateur de la locale anglaise et la restitution avec un lecteur d'écran restent à faire après correction.
- Aucun commit ni modification applicative pendant la revue PM ; demander une nouvelle livraison avec captures aux deux états mobiles, à 767/768 px et sur desktop.

### Hors périmètre
 - Intégration de `app-select-field` dans CategoryCard, label du type de catégorie et changements associés à ses templates/tests/styles ; à planifier séparément dans le lot Catégories. Aucun fichier CategoryCard n'est inclus dans la PR #71.
- Tri, pagination (TASK-030), filtres et recherche ; nouvelle logique métier, nouveaux services ou modèles.
- Refonte de Catégories et conservation du brouillon lors d'une navigation vers cette page.
- Refonte du layout global, du système de thèmes ou de la palette catégorielle.

### Consignes de livraison
La revue PM a autorisé la livraison le 2026-11-23. La PR #71 est ouverte pour revue humaine avant toute fusion. Les validations et contrôles navigateur effectués sont consignés ci-dessus.
