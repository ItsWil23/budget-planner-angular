---
description: Démarrer une tâche Budget Planner à partir de sa spec
---

Tu démarres une tâche du projet Budget Planner v3.

1. Identifie la tâche : l'identifiant donné après la commande (ex. TASK-025) ; sinon le seul fichier de `.ai/tasks/active/`. S'il n'y en a aucun ou plusieurs, arrête-toi et demande.
2. Lis, dans cet ordre : la spec de la tâche ; `AGENTS.md` ; les sections de `PRD.md`, `ARCHITECTURE.md` et `DESIGN_SYSTEM.md` citées dans la spec ; les fichiers listés dans « Fichiers concernés » ; le composant ou service existant le plus proche.
3. Vérifie la branche courante (`git branch --show-current`). Si c'est `main`, arrête-toi et demande.
4. Rappel des règles, non négociables :
   - Ne fais que ce que dit la spec. Tout ce qui est dans « Hors périmètre » est interdit. Si une information manque ou si la spec est ambiguë, arrête-toi et demande : ne suppose pas.
   - Ne modifie ni `.ai/*.md`, ni `PRD.md`, `ARCHITECTURE.md`, `DESIGN_SYSTEM.md`, ni la structure des dossiers.
   - Composants standalone, signals pour l'état, TypeScript strict, pas de `any`.
   - Aucun accès direct à un mock depuis un composant : passer par un service typé.
   - Montants en centimes entiers ; conversion euros/centimes dans les services uniquement.
   - Aucun texte en dur dans un template : passer par Transloco (`public/i18n/fr.json` et `en.json`).
   - Valeurs de design via les tokens de `DESIGN_SYSTEM.md` ; mobile-first ; aucune ombre portée ; aucune dépense en rouge par défaut.
   - Pas de `innerHTML`, pas de `bypassSecurityTrust*`, pas de `console.log` de données financières.
   - Pas de nouvelle dépendance npm sans la signaler.
   - Ne commite pas et ne crée pas de branche : le commit n'est fait qu'après autorisation explicite du PM.
   - Le lint n'est pas configuré : ne l'exécute pas et ne le présente pas comme validé.
5. Résume la tâche et ton plan en quelques lignes, puis implémente.
6. À la fin, lance `npx ng test --no-watch`, `npm run build` et `git diff --check`, puis `git status`. Liste les fichiers modifiés et tout écart avec la spec.
