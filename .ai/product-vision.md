# Vision produit — Budget Planner v3

> Source de vérité produit. Toute décision de design ou d'implémentation doit pouvoir se justifier par ce document.
> Dernière mise à jour : 2026-09-21

---

## 1. La promesse

**Budget Planner, c'est le template Excel de budget mensuel, rendu vivant.**

L'utilisateur construit son budget prévisionnel en début de mois (catégorie par catégorie, semi-automatiquement grâce aux récurrences), puis le budget réel se construit tout seul au fil de ses saisies. L'écart prévu / réel est visible en permanence — au lieu d'être calculé à la main le 31 du mois.

## 2. Le problème

Les gens qui gèrent sérieusement leur budget le font dans un tableur. Ça marche, mais :

- les formules cassent, les mois sont dupliqués à la main, rien n'est comparable d'un mois à l'autre ;
- le constat arrive **après coup**, en fin de mois, quand il est trop tard pour ajuster ;
- c'est inutilisable sur téléphone, donc la saisie est différée, donc elle n'a pas lieu.

À l'inverse, les applications d'agrégation bancaire automatisent tout et retirent à l'utilisateur toute prise sur son budget : il devient spectateur de ses dépenses.

## 3. Proposition de valeur

| | Tableur | Agrégateur bancaire | **Budget Planner** |
|---|---|---|---|
| Prévisionnel structuré | ✅ manuel, fragile | ❌ absent ou pauvre | ✅ natif, au cœur du produit |
| Écart prévu / réel en continu | ❌ fin de mois | ❌ | ✅ temps réel |
| Maîtrise de l'utilisateur | ✅ totale | ❌ subie | ✅ totale |
| Utilisable au quotidien / mobile | ❌ | ✅ | ✅ |
| Catégories sur mesure | ✅ | ❌ imposées | ✅ |

**Différenciateur central : la saisie manuelle est un choix produit, pas une limite technique.**
Saisir soi-même ses dépenses crée l'assiduité et le contrôle. L'utilisateur doit être **maître de son budget, pas esclave d'une automatisation**. L'automatisation est réservée au prévisible (les récurrences) ; le réel reste toujours déclaré.

## 4. Public cible

- **Cœur de cible** : les personnes qui gèrent déjà (ou ont essayé de gérer) un budget dans un tableur et veulent quelque chose de plus fiable et utilisable au quotidien.
- **Cible secondaire** : les novices qui veulent structurer leurs finances sans se noyer dans un outil complexe.
- **Hors cible v3** : les foyers voulant gérer un budget commun à plusieurs (nécessite partage + multi-comptes).

## 5. Principes produit

1. **Le mois est l'unité de vie du produit.** Tout écran a un mois pour contexte. Le mois est un état global, jamais local à une page.
2. **Prévu et réel sont deux objets distincts qui se comparent, jamais deux états d'un même objet.**
3. **Le réel n'est jamais inventé.** Aucune transaction réelle n'est créée sans action de l'utilisateur.
4. **L'automatisation propose, l'utilisateur dispose.** Les récurrences pré-remplissent le prévisionnel ; rien n'est imposé.
5. **Mobile d'abord, desktop enrichi.** Toute fonction est accessible au doigt. Le survol enrichit, il ne conditionne jamais l'accès à une fonction.
6. **Pas de mode « avancé ».** Un seul parcours, cohérent. La complexité se paie en abandon.

## 6. Non-objectifs explicites (v3)

Écrits noir sur blanc pour éviter la dérive de périmètre. Chacun peut revenir après la mise en production.

- ❌ **Agrégation bancaire** (Powens, Bridge, etc.) — contraire au principe de maîtrise, et coûteux.
- ❌ **Import CSV / relevés bancaires.**
- ❌ **Multi-comptes.** Un seul flux de trésorerie, suivi par un solde d'ouverture mensuel.
- ❌ **Mode simple / mode avancé** (la « planification fine » de la v2). Supprimé : un seul parcours.
- ❌ **Transactions prévisionnelles.** Le prévisionnel s'exprime en lignes de budget, pas en fausses transactions.
- ❌ **Budget partagé / multi-utilisateurs.**
- ❌ **Application mobile native.** Web + PWA installable. Le natif sera reconsidéré si le produit prend.
- ❌ **Multi-devise.** Une devise unique par utilisateur, choisie dans les paramètres.
- ❌ **Constructeur de graphiques sur mesure.** Besoin légitime mais trop coûteux en l'état — voir § 14.

## 7. Périmètre v3 — definition of done

La v3 peut remplacer la v1 en production quand tout ceci fonctionne sur données réelles :

- [ ] Authentification (email + mot de passe, OAuth Google en option)
- [ ] Gestion des catégories et sous-catégories personnalisées
- [ ] **Budget Mensuel** : construction du prévisionnel par catégorie, suivi de l'écart prévu / réel
- [ ] Saisie et gestion des transactions réelles
- [ ] **Dépenses récurrentes** alimentant le prévisionnel
- [ ] **Dashboard** : KPI du mois, graphiques (répartition, prévu vs réel), dernières transactions
- [ ] Paramètres : thème, **langue**, devise, réinitialisation des données
- [ ] **Interface en français et en anglais**, bascule à chaud depuis les paramètres
- [ ] Responsive complet + PWA installable
- [ ] Déployée sur un hébergement public

## 8. Priorités

**Priorité de navigation** ≠ **priorité de construction**.

- L'utilisateur atterrit sur le **Dashboard** après connexion — c'est la vue d'ensemble.
- On **construit** dans l'ordre : Budget Mensuel → Transactions → Dashboard → Catégories → Paramètres.
  Raison : le Dashboard n'est qu'un reflet du Budget Mensuel. Le construire en premier revient à inventer des indicateurs qui ne s'appuient sur rien — l'erreur des v1 et v2.

## 9. Rôle de chaque écran

Chaque écran a **un seul rôle**. Règle d'arbitrage : quand une information peut vivre à deux endroits, elle va là où l'utilisateur peut **agir** dessus.

| Écran | Rôle unique | Contient | Ne contient pas |
|---|---|---|---|
| **Dashboard** | Comprendre son mois en 30 secondes | Chiffre héros, KPI, graphiques de synthèse, dernières transactions | Aucune saisie de budget |
| **Budget Mensuel** | **Construire** le budget du mois | Tables catégorie → sous-catégories, saisie du prévu, réel agrégé en regard | Ni donut ni graphique |
| **Transactions** | Saisir et retrouver le réel | Liste filtrable, formulaire, pagination | Aucun KPI |
| **Catégories** | Configurer sa structure | CRUD catégories / sous-catégories | — |
| **Paramètres** | Préférences et compte | Thème, langue, devise, réinitialisation | — |

**Budget Mensuel reste une page de tables**, fidèle à la métaphore du tableur. Mais « pas de graphiques » ne signifie pas « aucun retour visuel » : construire un budget exige un retour immédiat. Deux éléments y sont conservés, parce qu'ils relèvent du **feedback d'action** et non de la data-visualisation :

- un **bandeau d'allocation** en haut : revenus prévus, dépenses prévues, montant non encore alloué ;
- une **barre de progression prévu / réel par ligne** (le pattern des cartes de Sam's Budgets).

Tout le reste — donuts, comparaisons, historiques — appartient au Dashboard.

## 10. Architecture produit — décisions structurantes

| Décision | Justification |
|---|---|
| **Phase A = frontend sur services mockés** | Aucun composant ne touche un mock directement. Tout passe par un service Angular typé. En phase B on remplace l'intérieur du service, zéro composant modifié. |
| **Backend en phase B, développé par un tiers** | Le contrat de données (interfaces TS + esquisse d'API) est figé côté front **avant** que le backend démarre, pour qu'il construise contre ce contrat. |
| **Web + PWA installable** | Couvre desktop et mobile sans double développement. Le natif viendra si le produit décolle. |
| **Thème sombre par défaut**, clair disponible | Décision utilisateur. Le sombre est le thème qu'on optimise en premier. |
| **Internationalisation dès la première ligne** | Interface FR et EN avec bascule à chaud depuis les paramètres. Impose une librairie i18n **runtime** (type Transloco) — l'i18n natif d'Angular compile un bundle par langue, incompatible avec un sélecteur dans les paramètres. Conséquence immédiate : **aucune chaîne en dur dans les templates**, dès le premier composant. Rétrofitter des textes en dur coûte cher, les externaliser d'emblée ne coûte rien. |

## 11. Direction artistique — cadre

**Adjectifs directeurs** (par ordre de priorité) :
1. Chaleureux / rassurant — on parle d'argent, sujet anxiogène
2. Premium / haut de gamme
3. Moderne / techno (profondeur, dégradés maîtrisés)
4. Épuré / minimaliste

**Références** : Sam's Finance App, FintechX (landing + dashboard), Finary, shots Dribbble « Web Analytics Dashboard Dark UI » et « Health Dashboard UI ».
**Fil rouge commun identifié** : un fond ambiant coloré/dégradé sur lequel flotte une surface applicative arrondie.

**Règle** : les références inspirent, elles ne se copient pas. Chaque emprunt doit se justifier fonctionnellement.

**Tension à arbitrer** : « moderne/techno » (dégradés, flou) contre l'objectif d'accessibilité (contraste) et la performance mobile (`backdrop-filter`). Résolution retenue : **aucun flou**. La profondeur vient de l'étagement des luminances, des bordures d'un pixel et du fond en dégradé — tout cela gratuit en performance.

### Disposition retenue — « cartes flottantes »

Il n'y a **pas de châssis applicatif**. Le fond en mesh gradient est le fond de page et traverse toute l'interface. Chaque bloc — navigation, barre supérieure, chaque carte — est une île **opaque** posée dessus, séparée par des espaces. Appliqué à **toutes** les pages.

Conséquences actées :

- **Navigation en île pleine hauteur**, avec icône + libellé. Non personnalisable en v3 (voir § 14).
- **Layout à hauteur d'écran sur desktop** : `100dvh`, navigation fixe, seul le contenu défile. Le fond ne bouge donc jamais. Sur mobile, défilement de page classique et navigation en tiroir.
- Les cartes étant opaques, **le fond ne passe jamais sous du texte** : le contraste est structurellement garanti.
- Les îles consomment de la hauteur. Le défilement est assumé, l'aération prime sur la compression.

### Fond — mesh gradient organique

Plusieurs taches colorées très diffuses, de tailles et de positions variées, réparties sur tout le fond (et non cantonnées aux coins).

**Composition tirée au sort une seule fois puis figée.** Chaque utilisateur a son propre fond, unique mais stable d'une session à l'autre. Jamais de tirage à chaque chargement de page : l'interface doit être constante.

- La graine est un **nombre aléatoire** (`crypto.getRandomValues`), tiré au premier lancement et stocké comme une préférence ordinaire.
- Elle n'est **jamais dérivée de l'identifiant utilisateur** : l'algorithme de dérivation étant du code front, donc public, un fond dérivé deviendrait un identifiant observable et corrélable. Une donnée ne sert qu'à ce pour quoi elle est collectée.
- Les tirages sont **bornés** (position, taille, opacité) pour qu'aucune composition ne puisse être ratée.

### Échelle de luminance fixe, teinte libre

Règle qui rend les palettes multiples quasi gratuites : on fige une **échelle de luminance** (fond ≈ 6 %, surface ≈ 11 %, bordure ≈ 18 %, texte sourd ≈ 58 %, texte ≈ 92 %) et chaque palette ne fait varier que la **teinte** et la **saturation** à l'intérieur de ces marches.

Le contraste ne dépendant que de la luminance, il est **garanti par construction** : aucune validation palette par palette n'est nécessaire. Seul l'accent demande une vérification, et il n'est jamais employé pour du texte long.

### Palettes — choix laissé à l'utilisateur

Une **palette par défaut**, qui est la couleur de marque (logo, landing, icône PWA, partages), plus quatre alternatives sélectionnables dans les paramètres.

| Rôle | Palette | Registre |
|---|---|---|
| **Par défaut — couleur de marque** | **A — Terracotta** | Chaleureux, humain, sans connotation de luxe |
| Alternative | G — Lin & graphite | Accent quasi neutre, intemporel |
| Alternative | C — Or sobre | Le plus premium |
| Alternative | E — Bleu nuit & cyan | Calme, lisible, registre financier |
| Alternative | H — Aurore | Le plus spectaculaire |

Écartées : **D (teal)** — accent confondable avec le vert « revenu » ; **B (violet)** — redondante avec H ; **F (corail)** — accent trop proche du rouge « dépassement ».

Règles non négociables :

- **Les couleurs sémantiques ne changent jamais avec la palette.** Revenu vert, dépassement rouge, quelle que soit la palette choisie.
- **L'accent d'une palette ne doit jamais être confondable** avec le vert « revenu » ni le rouge « dépassement ». C'est ce critère qui a éliminé D et F.
- **Aucune couleur en dur nulle part.** Tout passe par les tokens.

> À revoir le jour où le nom et le logo existeront. La couleur de marque a été choisie **avant** l'identité visuelle, ce qui est le bon ordre (un logo se dessine dans une palette, pas l'inverse), mais elle reste ajustable.

### Trois axes de couleur indépendants

À ne jamais mélanger :

| Axe | Ce qu'il exprime | Traitement |
|---|---|---|
| **Nature** | revenu / dépense | Revenu coloré en vert et signé « + » ; dépense en **couleur de texte par défaut** et signée « − ». Pas de token `expense` |
| **Santé budgétaire** | sous le budget / proche / dépassé | C'est **ici seulement** que vivent le vert, l'ambre et le rouge |
| **Identité de catégorie** | quelle catégorie | Palette catégorielle (`Category.color`), pour les pastilles et les graphiques |

Une dépense n'est pas une mauvaise nouvelle : payer son loyer dans l'enveloppe prévue est une réussite. Si chaque dépense est rouge, l'application devient culpabilisante.
Les signes `+` et `−` ne sont pas décoratifs : ils garantissent que l'information n'est **pas portée par la couleur seule** (WCAG 1.4.1).

### Survol — enrichissement, jamais accès

- ❌ Interdit : une fonction accessible **uniquement** au survol (typiquement les boutons d'action qui n'apparaissent qu'au passage de la souris — invisibles au doigt).
- ✅ Encouragé : le survol qui **enrichit** ce qui est déjà lisible — infobulle sur un libellé tronqué, infobulle sur un segment de graphique, léger soulèvement de carte.
- Chaque enrichissement au survol a un équivalent tactile.

### Typographie — Plus Jakarta Sans

Une seule famille, plusieurs graisses (400/500/600), pour les libellés comme pour les chiffres. Choisie après comparatif sur maquette ([.ai/design/fonts.html](./design/fonts.html)) : terminaisons douces, meilleur compromis entre « chaleureux » et « premium » parmi les huit candidates testées (Inter, Manrope, Sora, DM Sans, Urbanist, appariement Inter + Space Grotesk, pile système).

- **Chiffres tabulaires** (`font-variant-numeric: tabular-nums`) sur tous les montants, le chiffre héros et les pastilles — pour que les colonnes s'alignent dans les tableaux.
- **Auto-hébergée**, jamais via un CDN tiers (performance, confidentialité, un seul bundle).
- **`font-display: swap`** : le texte s'affiche immédiatement dans la police de secours, jamais invisible.
- **Police de secours ajustée en métriques** (`size-adjust` sur la pile système de repli) pour qu'aucun texte ne se déplace au moment du remplacement — la technique que Next.js applique automatiquement via `next/font`, à reproduire à la main côté Angular.

## 12. Positionnement & go-to-market

- **Distribution** : web public + PWA installable. Test auprès de proches d'abord.
- **Modèle** : gratuit pendant la phase de test. *Monétisation non décidée.*
- **Argument marketing assumé** : « Vous restez maître de votre budget. »
- **Calendrier** : pas de contrainte de date. Priorité à la qualité du rendu et à la solidité des bases.

### Sécurité & données personnelles

Les données budgétaires sont sensibles. Les risques réels, par ordre de gravité — à traiter avec le backend en phase B :

1. **Contrôle d'accès côté serveur.** Chaque requête doit vérifier que les données demandées appartiennent bien à l'appelant. C'est la faille n° 1 du classement OWASP. À **vérifier explicitement**, jamais à supposer.
2. **Gestion de session.** Jeton en cookie `HttpOnly` plutôt qu'en `localStorage`, expiration, rafraîchissement, révocation.
3. **Chiffrement** en transit (HTTPS strict) et au repos côté base.
4. **Aucune donnée financière dans les journaux ni dans les URL.**
5. **XSS.** Angular échappe par défaut ; `innerHTML` et `bypassSecurityTrust*` sont interdits.
6. **RGPD.** Hébergement UE, droit à l'effacement, **minimisation** — principe déjà appliqué à l'inscription (email seul) et à la graine du fond (tirée au hasard, jamais dérivée de l'identité).

## 13. Décisions actées

| Date | Décision |
|---|---|
| 2026-09-21 | L'IA dev implémente ; revue à deux (usage/visuel + archi/code) avant merge |
| 2026-09-21 | v1 reste en production, v2 gelée et utilisée comme référence fonctionnelle |
| 2026-09-21 | Budget Mensuel = écran cœur ; Dashboard = page d'atterrissage |
| 2026-09-21 | Multi-comptes, mode avancé, import CSV et agrégation bancaire hors périmètre |
| 2026-09-21 | Solde d'ouverture reporté automatiquement du mois précédent, ajustable |
| 2026-09-21 | Récurrences → alimentent le prévisionnel uniquement, jamais le réel |
| 2026-09-21 | Topbar sobre portant le sélecteur de mois + menu compte à droite |
| 2026-09-21 | GitHub Flow (`main` + `feat/*`), une Pull Request par spec, pas de branche `dev` |
| 2026-09-21 | Thème sombre par défaut |
| 2026-09-21 | Montants stockés en centimes entiers, jamais en flottants |
| 2026-09-21 | « Reste à dépenser » = chiffre héros du Dashboard ; « disponible réel » en indicateur secondaire |
| 2026-09-21 | Interface bilingue FR / EN, bascule depuis les paramètres, i18n runtime |
| 2026-09-21 | Toute transaction porte obligatoirement une catégorie **et** une sous-catégorie ; une catégorie sans sous-catégorie reste créable mais non sélectionnable en saisie |
| 2026-09-21 | Budget Mensuel = tables uniquement (+ bandeau d'allocation et barres de progression) |
| 2026-09-21 | Constructeur de graphiques reporté ; Dashboard à widgets réarrangeables en v3.1 |
| 2026-09-23 | Disposition « cartes flottantes » sur **toutes** les pages, sans châssis applicatif |
| 2026-09-23 | Fond en **mesh gradient organique**, composé aléatoirement une seule fois puis figé par utilisateur |
| 2026-09-23 | Aucun flou : la profondeur vient des luminances, des hairlines et du dégradé |
| 2026-09-23 | Navigation en **île pleine hauteur** (icône + libellé), non personnalisable en v3 |
| 2026-09-23 | Layout desktop à hauteur d'écran, défilement interne au contenu |
| 2026-09-23 | **Palette choisie par l'utilisateur** : une par défaut (couleur de marque) + 3 à 4 alternatives |
| 2026-09-23 | Couleurs sémantiques **invariantes** quelle que soit la palette ; accent jamais confondable avec revenu ou dépassement |
| 2026-09-23 | Échelle de **luminance fixe**, teinte libre — le contraste devient garanti par construction |
| 2026-09-23 | Palettes retenues : **A par défaut (marque)**, puis G, C, E, H. D, B et F écartées |
| 2026-09-23 | Graine du fond = nombre **aléatoire** stocké en préférence, **jamais dérivée de l'identifiant utilisateur** |
| 2026-09-23 | Police retenue : **Plus Jakarta Sans**, auto-hébergée, chiffres tabulaires, `font-display: swap` + police de secours ajustée en métriques |
| 2026-09-23 | Contrat opérationnel pour l'IA dev créé à la racine du repo : `PRD.md`, `ARCHITECTURE.md`, `DESIGN_SYSTEM.md`, `AGENTS.md` + `.aider.conf.yml` (Aider + Ollama, Qwen2.5-Coder 7B) |
| 2026-09-28 | Aider abandonné (échecs répétés à appliquer les modifications, puis un commit ayant écrasé plusieurs fichiers `.scss` de production) ; remplacé par Continue (déjà installé, Qwen3-Coder 30B via Ollama) ; fichiers `.aider*` supprimés du repo |

## 14. Évolutions envisagées (hors périmètre v3)

### Tableau de bord personnalisable

Besoin exprimé dès le contexte de départ : « l'utilisateur pourra personnaliser ses calculs et ses tableaux de bord ». Idée avancée : un constructeur permettant de composer ses propres graphiques (comparaisons entre catégories, donuts, prévu vs réel d'une sous-catégorie…).

**Verdict : besoin légitime, solution trop coûteuse en l'état.** Un constructeur de graphiques, c'est un constructeur de requêtes + une UI de configuration + une persistance + un moteur de rendu. C'est un produit dans le produit, et il contredit le principe « pas de mode avancé ».

**Tout ce qui compose le Dashboard est un widget** : cartes de chiffres, liste des dernières transactions, graphiques. La différence entre v3 et v3.1 ne porte pas sur le contenu mais sur la **liberté d'agencement**.

| Zone du Dashboard | Contenu | Réarrangeable |
|---|---|---|
| En-tête fixe | Chiffre héros (« reste à dépenser ») + contexte du mois | ❌ jamais |
| Grille de widgets | Cartes de KPI, donut de répartition, prévu vs réel, dernières transactions | ✅ à partir de la v3.1 |

L'en-tête reste fixe pour éviter qu'un utilisateur se fabrique un tableau de bord sans repère.

**Chemin retenu, en trois temps :**

1. **v3** — La grille existe, mais son contenu et son ordre sont figés dans le code. **Contrainte dès maintenant : chaque widget est un composant autonome, qui ne connaît ni sa position ni ses voisins.** On observe ce que les testeurs regardent réellement.
2. **v3.1** — On pose par-dessus un **catalogue de widgets** (donut de répartition, prévu vs réel d'une catégorie, évolution sur 6 mois, KPI au choix) que l'utilisateur ajoute, retire et réordonne, plus la persistance de l'agencement. Pas de constructeur, juste un catalogue — environ 80 % du besoin pour 20 % du coût, et **aucun widget n'est réécrit**. *La v2 avait déjà amorcé cette intention (`DashboardGrid`, `DragHandle`).*
3. **Plus tard** — un vrai constructeur, uniquement si les utilisateurs le réclament après avoir épuisé le catalogue.

### Page « Analyse » dédiée

Une page rassemblant graphiques et indicateurs n'a de sens que si elle montre **autre chose que le mois courant** — sinon elle double le Dashboard et l'utilisateur ne sait plus où regarder.

**Critère d'ouverture** : cette page existera le jour où on traitera le **multi-mois** (tendances, comparaisons d'un mois à l'autre, moyennes annuelles). Pas avant.

### Disposition de la navigation personnalisable

Idée écartée pour la v3 : laisser l'utilisateur choisir entre navigation en île et navigation ancrée au bord.

**Raison** : un réglage doit résoudre un problème. Le thème répond au confort visuel, la langue à la compréhension, la devise à la justesse. Celui-ci ne répond à rien, et il coûte le double sur chaque revue visuelle et chaque test, définitivement. Une option exposée devient de surcroît un contrat qu'on ne peut plus retirer.

**Critère de réouverture** : un testeur le demande explicitement. L'implémentation est alors triviale.

### Fond semé par le mois affiché

Variante écartée mais séduisante : dériver la composition du fond du mois consulté plutôt que de l'utilisateur, pour donner un repère sensoriel au changement de mois. À reconsidérer une fois le produit stabilisé — risqué si l'effet est trop visible.

## 15. Questions ouvertes

- Monétisation : gratuit, freemium, payant ?
- Notifications (dépassement de budget, échéance récurrente) : dans le périmètre v3 ou après ?
- Onboarding d'un nouvel utilisateur : catégories par défaut proposées, ou table rase ?
- Gestion de l'épargne : simple catégorie de dépense, ou notion dédiée (objectifs, enveloppes) ?
- Librairie i18n : Transloco ou ngx-translate ?
- **Nom et logo** : aucun choix arrêté à ce jour. Chantier à planifier — la couleur de marque est posée, l'identité visuelle reste à construire dessus.
