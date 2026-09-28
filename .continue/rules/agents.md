---
name: Budget Planner v3 — règles projet
alwaysApply: true
---

<!--
  Miroir de AGENTS.md à la racine du repo, pour que Continue charge ces règles
  automatiquement à chaque tâche sans dépendre d'un @mention manuel.
  Si AGENTS.md change, reporter les mêmes changements ici.
-->

## Project context

Application Angular 22 de gestion de budget personnel (prévisionnel vs réel), phase A = frontend sur données
mockées, sans backend. Stack : Angular standalone + signals, SCSS pur, pas de framework CSS, i18n runtime FR/EN.

## Before you start

Avant toute modification, lire dans cet ordre : `PRD.md` (ce que le produit doit faire), `ARCHITECTURE.md`
(comment le projet est structuré), `DESIGN_SYSTEM.md` (comment ça doit être stylé), puis le composant ou service
existant le plus proche du besoin, pour réutiliser ses conventions plutôt qu'en inventer de nouvelles.

Une tâche = un composant, un service, ou une correction ciblée. Si une demande couvre plusieurs écrans ou
plusieurs couches (modèle + service + UI) à la fois, le dire explicitement et proposer de la découper.

## General rules

- **TypeScript strict**, types explicites sur toute fonction publique. Pas de `any`.
- **Composants standalone uniquement.** Pas de `NgModule`.
- **Signals pour l'état**, jamais de nouvel état géré à la main en dehors de `signal`/`computed`/`effect`.
- **Aucun accès direct à un mock depuis un composant.** Toujours via un service typé (`services/`). C'est la règle
  la plus importante du projet.
- **Montants en entiers, en centimes.** Jamais de nombre à virgule pour un montant. Conversion euros ↔ centimes
  dans les services, jamais dans un composant.
- **Aucune chaîne de texte visible en dur** dans un template (préparation i18n).
- **Mobile-first réel** : styles mobiles d'abord, media queries `min-width` ensuite. Aucune fonctionnalité ne doit
  dépendre exclusivement du survol (`:hover`) ; le survol enrichit, il ne conditionne jamais l'accès.
- Réutiliser un composant existant avant d'en créer un nouveau.
- Respecter la structure de dossiers de `ARCHITECTURE.md` sans en créer de nouvelle.

## Design rules

- Toute couleur, taille, espacement ou rayon vient des tokens de `DESIGN_SYSTEM.md`. Aucune valeur brute écrite
  directement dans un composant.
- **Aucune ombre portée**, dans aucun thème. La séparation visuelle vient de la luminance et d'une bordure de 1px.
- Disposition en « cartes flottantes » (îles opaques sur fond dégradé) — pas de châssis applicatif.
- Chiffres monétaires toujours en `font-variant-numeric: tabular-nums`.
- Une dépense n'est **jamais** colorée en rouge par défaut (seul le dépassement de budget l'est).

## Security rules

- Jamais de clé, jeton ou secret en dur dans le code. Variables d'environnement uniquement.
- Valider toute entrée utilisateur côté client (aucun backend à ce jour).
- Jamais de `innerHTML` ni de `bypassSecurityTrust*` sans validation explicite de l'humain.
- Aucune donnée financière dans un `console.log` laissé dans le code final.

## Boundaries

- Ne pas modifier les fichiers `.ai/*.md`, `PRD.md`, `ARCHITECTURE.md`, `DESIGN_SYSTEM.md` — documents de décision
  produit/archi, pas du code.
- Ne pas ajouter de nouvelle dépendance npm sans le signaler clairement.
- Ne pas toucher au routage global ni à la structure de dossiers au-delà de ce que demande la tâche.
- Ne pas écrire de code backend/API — hors périmètre tant que la phase B n'a pas démarré.
- Une branche `feat/<nom>` par tâche, jamais de commit direct sur `main`.
- Si les fichiers de contexte se contredisent, ou qu'une information nécessaire est absente, demander avant de
  supposer.

## Après chaque modification

Toujours vérifier le `git diff` réel avant de considérer une tâche terminée — un incident passé (2026-09-25) a vu
un agent remplacer le contenu de plusieurs fichiers par un simple commentaire tout en l'affichant comme un succès
dans le chat.
