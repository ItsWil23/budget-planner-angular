# Workflow — Budget Planner v3

> Comment le travail circule entre les trois rôles, du choix d'une tâche jusqu'à la fusion dans `main`.
> Dernière mise à jour : 2026-09-28

## 1. Les trois rôles

| Rôle | Porte | Ne fait pas |
|---|---|---|
| **Toi** | Usage, rendu visuel, ressenti, arbitrages produit quand je te les soumets | N'écrit pas le code de l'application |
| **Moi (PM/architecte)** | Specs, architecture, cohérence avec `PRD.md`/`ARCHITECTURE.md`/`DESIGN_SYSTEM.md`, revue technique | N'écrit pas le code de l'application, n'édite que la documentation (`.ai/`, fichiers racine `*.md`) |
| **IA dev (actuellement Claude Code, en local via Ollama)** | Implémentation du code, à partir d'une spec | Ne décide pas du produit ni de l'architecture ; s'arrête et demande si une info manque (`AGENTS.md`) |

Aucun code applicatif n'est écrit par toi ou par moi. Tout code vient de l'IA dev, sur la base d'une spec, et n'est
fusionné qu'après relecture humaine.

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
2. Spec                  → je rédige une spec ciblée (format § 3)
3. Branche               → toi crées feat/<nom> depuis main à jour
4. Implémentation        → l'IA dev travaille à partir de la spec, dans Continue (chat + apply)
5. Vérification locale   → npm test + npm run build passent, avant toute revue
6. Revue usage           → toi : la fonctionnalité rendue correspond-elle à l'intention, sur mobile et desktop,
                             dans au moins un thème clair et un thème sombre ?
7. Revue technique       → moi : conformité à ARCHITECTURE.md (couche service), DESIGN_SYSTEM.md (tokens),
                             AGENTS.md (règles), pas de dérive de périmètre
8. Itération             → corrections demandées via nouveaux messages dans Continue, sur la même branche,
                             ou annulation manuelle (git checkout -- <fichier> / git reset) si la direction est mauvaise
9. Pull Request          → ouverte une fois les deux revues (5) et (6)/(7) passées
10. Merge                → dans main, jamais de commit direct dessus
11. Mise à jour           → je mets à jour .ai/roadmap.md (statut) et .ai/product-vision.md si une décision a été
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
<explicitement ce qu'il ne faut PAS faire, pour éviter la dérive avec un modèle 7B>

### Références
<sections précises de PRD.md / ARCHITECTURE.md / DESIGN_SYSTEM.md / domain-model.md concernées>
```

Cette spec est ce que tu colles directement dans le chat de Continue, en pièce jointe des fichiers concernés
(@fichier) — plus besoin de fichier de tâche séparé, Continue gère bien le collage multi-lignes dans son panneau
de chat (contrairement à un terminal brut).

> **Piège rencontré (2026-09-25, avec Aider en terminal)** : ne jamais coller une spec longue directement dans un
> terminal interactif. Un collage multi-lignes dans une console Windows peut être interprété ligne par ligne
> (comme si Entrée était pressé à chaque ligne) — seule la fin du texte arrive intacte comme message, le reste se
> perd silencieusement. Ce risque ne concerne pas le panneau de chat de Continue (interface graphique), mais reste
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
- **Merge** : après les deux revues (§ 2, étapes 6-7), jamais avant.

## 5. Portes de qualité avant Pull Request

- [ ] `npm test` passe
- [ ] `npm run build` passe
- [ ] Vérifié en thème sombre **et** clair
- [ ] Vérifié en largeur mobile **et** desktop
- [ ] Aucune chaîne de texte visible en dur ajoutée
- [ ] Aucune couleur/taille en dur ajoutée (tokens `DESIGN_SYSTEM.md` uniquement)
- [ ] Aucun accès direct à un mock depuis un composant

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
