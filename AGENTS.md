# Agent Instructions — Budget Planner v3

> Ce fichier s'adresse à l'agent de développement (Aider + Ollama). Il ne remplace pas la revue humaine : chaque
> tâche se termine par une Pull Request relue par l'humain avant fusion dans `main`.

## Project context

Application Angular 22 de gestion de budget personnel (prévisionnel vs réel), phase A = frontend sur données
mockées, sans backend. Stack : Angular standalone + signals, SCSS pur, pas de framework CSS, i18n runtime FR/EN.

## Before you start

Avant toute modification, lire dans cet ordre :

1. `PRD.md` — ce que le produit doit faire
2. `ARCHITECTURE.md` — comment le projet est structuré
3. `DESIGN_SYSTEM.md` — comment ça doit être stylé
4. Le composant ou service existant le plus proche du besoin, pour réutiliser ses conventions plutôt qu'en inventer
   de nouvelles

**Modèle local 7B (Qwen2.5-Coder) : les tâches doivent rester petites.** Une tâche = un composant, un service, ou une
correction ciblée. Si une demande semble couvrir plusieurs écrans ou plusieurs couches (modèle + service + UI) à la
fois, dis-le explicitement et propose de la découper, plutôt que de deviner un découpage.

## General rules

- **TypeScript strict**, types explicites sur toute fonction publique. Pas de `any`.
- **Composants standalone uniquement.** Pas de `NgModule`.
- **Signals pour l'état**, jamais de nouvel état géré à la main en dehors de `signal`/`computed`/`effect`.
- **Aucun accès direct à un mock depuis un composant.** Toujours via un service typé (`services/`). C'est la règle
  la plus importante du projet — elle seule garantit que le futur backend ne cassera aucun composant.
- **Montants en entiers, en centimes.** Jamais de nombre à virgule pour un montant. Conversion euros ↔ centimes
  dans les services, jamais dans un composant.
- **Aucune chaîne de texte visible en dur** dans un template. Même si la bibliothèque d'i18n n'est pas encore
  branchée, structure le texte pour qu'il soit externalisable facilement (pas de concaténation de chaînes en dur).
- **Mobile-first réel** : écrire les styles pour mobile d'abord, ajouter les media queries `min-width` ensuite —
  jamais l'inverse. Aucune fonctionnalité ne doit dépendre exclusivement du survol (`:hover`) ; le survol enrichit,
  il ne conditionne jamais l'accès.
- Réutilise un composant existant avant d'en créer un nouveau. Si un composant proche existe déjà, adapte-le ou
  demande avant d'en dupliquer un.
- Respecte la structure de dossiers de `ARCHITECTURE.md` sans en créer de nouvelle.

## Design rules

- Toute couleur, taille, espacement ou rayon vient des tokens de `DESIGN_SYSTEM.md`. Aucune valeur brute
  (`#hexadécimal`, `16px`…) écrite directement dans un composant.
- **Aucune ombre portée**, dans aucun thème. La séparation visuelle vient de la luminance et d'une bordure de 1px.
- Disposition en « cartes flottantes » (îles opaques sur fond dégradé) — pas de châssis applicatif à réintroduire.
- Chiffres monétaires toujours en `font-variant-numeric: tabular-nums`.
- Une dépense n'est **jamais** colorée en rouge par défaut (seul le dépassement de budget l'est). Voir
  `DESIGN_SYSTEM.md` § 4.1.

## Security rules

- Jamais de clé, jeton ou secret en dur dans le code. Variables d'environnement uniquement.
- Valide toute entrée utilisateur côté client (aucun backend à ce jour pour valider côté serveur).
- Jamais de `innerHTML` ni de `bypassSecurityTrust*` sans validation explicite de l'humain.
- Aucune donnée financière dans un `console.log` laissé dans le code final.

## Commands

```
npm install       # installer les dépendances
npm start         # ng serve — serveur de développement
npm run build     # build de production
npm test          # ng test (Vitest)
```

Pas de commande de lint à ce jour (non configuré) — ne pas en inventer une ni en supposer une.

## Boundaries — ne jamais faire sans validation humaine explicite

- Ne modifie pas les fichiers `.ai/*.md`, `PRD.md`, `ARCHITECTURE.md`, `DESIGN_SYSTEM.md` — ce sont des documents de
  décision produit/archi, pas du code.
- N'ajoute pas de nouvelle dépendance npm sans le signaler clairement dans la description de la Pull Request.
- Ne touche pas au routage global ni à la structure de dossiers au-delà de ce que demande la tâche.
- N'écris pas de code backend/API — hors périmètre tant que la phase B n'a pas démarré.
- **Un commit = un état cohérent qui compile**, une unité logique. Messages en anglais, Conventional Commits
  (`feat:`, `fix:`, `refactor:`, `style:`, `chore:`, `docs:`).
- **Une branche `feat/<nom>` par tâche**, jamais de commit direct sur `main`. Le travail se termine par une Pull
  Request, jamais par une fusion automatique.
- Si les fichiers de contexte se contredisent, ou qu'une information nécessaire est absente, demande avant de
  supposer.
