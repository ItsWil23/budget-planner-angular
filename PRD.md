# PRD — Budget Planner v3

> Version condensée à l'usage de l'agent de développement. Contexte complet, options écartées et historique des
> décisions : [`.ai/product-vision.md`](./.ai/product-vision.md) (vision produit) et
> [`.ai/domain-model.md`](./.ai/domain-model.md) (modèle de données et règles de calcul).
> Dernière mise à jour : 2026-09-23

## Product overview

**Budget Planner** — le template Excel de budget mensuel, rendu vivant. L'utilisateur construit un budget
prévisionnel par catégorie en début de mois, saisit ses transactions réelles au fil de l'eau, et voit l'écart
prévu/réel en continu — au lieu de le calculer à la main en fin de mois.

## Problem

Un tableur casse (formules fragiles, mois dupliqués à la main) et arrive toujours en retard (constat en fin de
mois). Un agrégateur bancaire automatise tout et retire à l'utilisateur toute prise sur son budget.

## Goal

Un seul parcours cohérent, mobile d'abord, où construire un budget prévisionnel et suivre le réel prennent le même
temps qu'ouvrir l'application.

## Target users

- Cœur de cible : personnes qui gèrent déjà un budget dans un tableur et veulent plus de fiabilité au quotidien.
- Cible secondaire : novices voulant structurer leurs finances sans outil complexe.
- Hors cible v3 : foyers voulant un budget partagé à plusieurs.

## Core features (v3)

- Authentification (email + mot de passe, OAuth Google en option)
- Gestion des catégories et sous-catégories personnalisées
- **Budget Mensuel** : construction du prévisionnel par catégorie, suivi de l'écart prévu/réel (écran cœur du
  produit, à construire en priorité)
- Saisie et gestion des transactions réelles (catégorie + sous-catégorie obligatoires)
- Dépenses récurrentes alimentant le prévisionnel (jamais le réel)
- **Dashboard** : chiffre héros, KPI, graphiques, dernières transactions (page d'atterrissage après connexion)
- Paramètres : thème (sombre par défaut), langue (FR/EN), palette, devise, réinitialisation des données
- Responsive complet + PWA installable

## User flows clés

1. **Connexion → Dashboard** : vue d'ensemble du mois en cours.
2. **Ouverture d'un mois → Budget Mensuel** : les lignes prévues des récurrences actives sont proposées ; l'utilisateur
   ajuste, ajoute, supprime.
3. **Saisie d'une dépense → Transactions** : catégorie → sous-catégorie (obligatoire) → montant → le Budget Mensuel
   et le Dashboard se mettent à jour automatiquement.
4. **Changement de mois** : le solde d'ouverture est reporté automatiquement du mois précédent (ajustable à la main).

## Requirements

- **Fonctionnel** : voir modèle de données complet dans `.ai/domain-model.md` (entités, règles de calcul, cycle de
  vie du mois).
- **UX** : voir `DESIGN_SYSTEM.md` (disposition, couleur, typographie, accessibilité).
- **Architecture** : voir `ARCHITECTURE.md` (stack, structure de projet, couche de service).
- **Performance/plateforme** : mobile-first réel (cibles tactiles ≥ 44px), PWA installable, aucune fonction ne doit
  dépendre exclusivement du survol.
- **i18n** : interface bilingue FR/EN dès la conception — aucune chaîne de texte en dur dans un template.
- **Montants** : toujours des entiers en centimes, jamais des flottants.

## Success metrics

- Un mois complet (prévisionnel + réel) peut être construit et suivi de bout en bout sans recourir à un tableur.
- Testeurs (proches) capables d'utiliser l'application quotidiennement sur mobile sans confusion sur le rôle de
  chaque écran.

## Out of scope (v3)

Multi-comptes, mode simple/avancé, transactions prévisionnelles, import CSV, agrégation bancaire, budget partagé,
application native, multi-devise, constructeur de graphiques sur mesure, navigation personnalisable. Détail complet
et justification de chaque exclusion : `.ai/product-vision.md` § 6 et § 14.
