# Workflow — Budget Planner v3

> Comment le travail circule entre les trois rôles, du choix d'une tâche jusqu'à la fusion dans `main`.
> Dernière mise à jour : 2026-10-22

## 1. Les trois rôles

| Rôle | Porte | Ne fait pas |
|---|---|---|
| **Toi** | Usage, rendu visuel, ressenti, arbitrages produit quand je te les soumets | N'écrit pas le code de l'application |
| **Moi (PM/architecte, VS Code AI Chat avec GitHub Copilot)** | Specs, architecture, cohérence avec les documents de référence, revue technique et préparation de la PR après autorisation explicite | N'écrit pas le code de l'application ; édite uniquement la documentation et les fichiers de tâche |
| **IA dev (principalement Claude Code avec un modèle local Ollama)** | Implémentation et tests à partir d'une spec ; relais possible dans VS Code Agents avec GitHub Copilot pour les tâches plus larges, complexes ou dépassant le modèle local | Ne décide pas du produit ni de l'architecture ; s'arrête et demande si une info manque (`AGENTS.md`) |

Aucun code applicatif n'est écrit par toi ou par moi. Tout code vient de l'IA dev, sur la base d'une spec, et n'est
fusionné qu'après relecture humaine.

**GitHub Copilot code review**, une fois configuré, sera le reviewer automatisé des pull requests ; il ne
remplace ni la revue du PM ni celle de l'utilisateur.

### Plugins et choix de l'agent

**Superpowers** et **Frontend Design** sont installés dans Claude Code et dans VS Code Agents / Copilot.

- **Superpowers** : uniquement pour les tâches complexes, refontes, migrations ou tâches nécessitant un plan
  structuré. Ne pas l'utiliser pour une tâche simple.
- **Frontend Design** : à utiliser pour créer ou refondre des écrans, composants ou parcours UI importants,
  dans le respect de `DESIGN_SYSTEM.md`, de l'accessibilité et du mobile-first.

| Complexité | Agent et plugin |
|---|---|
| Tâche simple | Claude Code local, sans Superpowers |
| Tâche UI importante | Claude Code local ou VS Code Agents avec GitHub Copilot, avec Frontend Design |
| Tâche complexe, refonte ou migration | VS Code Agents avec GitHub Copilot et Superpowers, ou Claude Code avec Superpowers si le contexte reste maîtrisé ; ajouter Frontend Design si l'UI est concernée |

Ne pas créer de skill maison dupliquant `workflow.md` ou `AGENTS.md`.

> **Historique** : Aider + Qwen2.5-Coder (7B puis 14B) a été utilisé du 2026-09-23 au 2026-09-25, abandonné après
> des échecs répétés (modifications non appliquées, puis un commit ayant écrasé plusieurs fichiers `.scss` de
> production avec un simple commentaire). Remplacé par Continue (Qwen3-Coder 30B) le 2026-09-25, qui a subi le
> même sort (modifications non appliquées). Remplacé à son tour par **Claude Code** (extension VS Code, pointant
> vers Ollama via un shim compatible API Anthropic, `qwen3-coder:14b`) le 2026-09-28 — première tâche réussie
> (`lot0-01-tokens-styles-scss`) dès le premier essai, y compris exécution autonome de `npm start` pour vérifier.
> Les règles ci-dessous restent valables quel que soit l'outil ; seules les commandes d'interaction changent.

## 2. Cycle de vie d'une tâche

```
1. Choisir la tâche      → dans .ai/roadmap.md, une tâche = un point d'un lot (jamais un lot entier)
2. Spec                  → le PM crée une tâche courte dans tasks/active/TASK-XXX-nom.md (format § 3)
3. Branche               → toi crées feat/<nom> depuis main à jour
4. Implémentation        → l'IA dev travaille à partir du fichier de tâche, avec l'agent adapté (§ 1),
                             et ajoute les tests nécessaires
5. Vérification locale   → l'IA dev exécute npx ng lint, npx ng test et npx ng build (réserve lint : § 5),
                             puis les contrôles de sécurité et de dépendances applicables (§ 5)
6. Revue usage           → toi : la fonctionnalité rendue correspond-elle à l'intention, sur mobile et desktop,
                             dans au moins un thème clair et un thème sombre ?
7. Revue PM              → le PM relit le diff réel, vérifie les critères d'acceptation et la conformité aux
                             documents de référence, puis relance les validations (§ 5)
8. Itération             → corrections sur la même branche, puis nouvelles validations et revues si nécessaire
9. Autorisation          → le PM demande l'autorisation explicite de l'utilisateur avant tout commit
10. Clôture et PR         → après validation, le PM commit, déplace le fichier de tasks/active/ vers tasks/done/,
                             commit ce déplacement sur la même branche, puis crée la pull request
11. Merge                → l'utilisateur effectue le squash & merge dans main, puis supprime la branche
12. Mise à jour           → je mets à jour .ai/roadmap.md (statut) et .ai/product-vision.md si une décision a été
                             prise en cours de route
```

Une session peut couvrir plusieurs tâches, mais **une tâche à la fois en revue** — ne pas ouvrir une seconde
branche avant que la première soit fusionnée ou explicitement mise en pause.

## 3. Format de spec (ce que je te fournirai à chaque tâche)

```markdown
## Tâche : <nom court>
Lot : <n° du lot dans roadmap.md>

### Contexte
<1-2 phrases : pourquoi cette tâche, ce sur quoi elle s'appuie>

### Ce qu'il faut faire
<liste concrète, vérifiable>

### Fichiers concernés
<chemins probables — composants/services/modèles à créer ou modifier>

### Critères d'acceptation
<liste de "c'est fait quand...">

### Hors périmètre pour cette tâche
<explicitement ce qu'il ne faut PAS faire, pour éviter la dérive de périmètre>

### Références
<sections précises de PRD.md / ARCHITECTURE.md / DESIGN_SYSTEM.md / domain-model.md concernées>
```

Cette spec courte est conservée dans `tasks/active/TASK-XXX-nom.md` et transmise à l'IA dev avec les fichiers
concernés. Le fichier de tâche reste la référence jusqu'à son archivage selon le § 2.

> **Piège rencontré (2026-09-25, avec Aider en terminal)** : ne jamais coller une spec longue directement dans un
> terminal interactif. Un collage multi-lignes dans une console Windows peut être interprété ligne par ligne
> (comme si Entrée était pressé à chaque ligne) — seule la fin du texte arrive intacte comme message, le reste se
> perd silencieusement. Ce risque ne concerne pas les panneaux de chat graphiques, mais reste
> valable pour tout outil en ligne de commande.
>
> **Piège plus grave rencontré le même jour** : un commit généré par l'agent a remplacé le contenu de plusieurs
> fichiers `.scss` par un simple commentaire — silencieusement appliqué et commité. **Toujours vérifier sur le
> disque** (`git diff`, ou relire le fichier) que le résultat correspond à la spec avant de continuer, **jamais**
> se fier uniquement à ce qui s'affiche dans le chat.

## 4. Git

- **GitHub Flow** : `main` toujours stable et déployable en l'état, une branche `feat/<nom>` par tâche.
- **Nommage de branche** : `feat/<lot>-<nom-court>` (ex. `feat/budget-mensuel-tables`), `fix/...` pour une
  correction, `chore/...` pour de l'outillage.
- **Commits** : Conventional Commits, messages en anglais, un commit = un état cohérent qui compile. Vérifier le
  diff avant de commiter (`git diff`) plutôt que de faire confiance à un commit automatique.
- **Pull Request** : une par tâche. Description = la spec d'origine + ce qui a effectivement changé. Toute
  dépendance ajoutée ou décision prise en cours de route y est mentionnée explicitement (`AGENTS.md` § boundaries).
- **Autorisation, archivage et merge** : suivre le § 2, étapes 9 à 11 ; aucun commit avant autorisation explicite,
  fichier de tâche archivé inclus dans la branche avant la PR, squash & merge et suppression de branche par toi.

## 5. Portes de qualité avant Pull Request

- [ ] L'IA dev a exécuté `npx ng lint`, `npx ng test` et `npx ng build` ; le PM les a relancés et a vérifié les résultats
- [ ] Les contrôles de sécurité et de dépendances applicables ci-dessous ont été effectués
- [ ] Vérifié en thème sombre **et** clair
- [ ] Vérifié en largeur mobile **et** desktop
- [ ] Diff réel relu, critères d'acceptation satisfaits et règles d'`AGENTS.md` respectées

**Réserve lint** : `npx ng lint` est la validation cible, mais le lint est indiqué non configuré dans `AGENTS.md`
et `ARCHITECTURE.md`. Tant que c'est le cas, signaler ce blocage à l'utilisateur pour arbitrage avant la PR ;
ne jamais le présenter comme une validation réussie ni ajouter une configuration hors périmètre.
Les tests et le build doivent passer.

### Sécurité et dépendances

- Avant toute PR touchant l'authentification, les données utilisateur, les formulaires, le stockage local ou les
  appels API, exécuter `/security-review`.
- Pour un audit global, utiliser le plugin officiel **claude-security**.
- Après tout ajout ou mise à jour de dépendance, exécuter `npm audit` et consigner les résultats dans la PR.
  S'appuyer sur **Dependabot** pour le suivi continu.

## 6. Quand ça bloque

- **L'IA dev dévie du scope ou modifie trop de fichiers d'un coup** : annuler (`git checkout -- <fichier>` ou
  `git reset --hard <dernier commit sain>` si déjà commité et non poussé), reformuler une tâche plus petite plutôt
  que de laisser filer.
- **Une modification est appliquée sans que le résultat corresponde à la spec** : ne jamais commiter avant d'avoir
  relu le fichier réel sur le disque (voir le piège du § 3 — un fichier peut être silencieusement vidé ou
  tronqué).
- **La spec s'avère ambiguë une fois en implémentation** : on revient ici avant de continuer — pas de suppositions
  côté IA dev (`AGENTS.md`), pas de suppositions côté moi non plus si le produit n'a pas tranché.
- **Un désaccord de revue** (toi sur l'usage, moi sur l'architecture) : le point remonte dans `product-vision.md`
  comme une décision à prendre, pas résolu silencieusement dans le code.

## 7. Cadence

Pas de contrainte de calendrier (`product-vision.md` § 12). Le rythme est dicté par la qualité de chaque tâche
livrée, pas par une échéance.
