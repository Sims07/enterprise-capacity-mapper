# ADR 0001 — Principes de migration technologique

- **Statut :** accepté comme cadre documentaire
- **Date :** 2026-10-24
- **Contexte :** préparer d'éventuelles évolutions de runtime, de renderer et de stockage sans régression métier.

## Contexte

L'application est aujourd'hui une PWA React/Vite statique avec persistance locale et export/import JSON. Le besoin futur pourrait inclure une application installable sur poste, par exemple avec Electron, ou un remplacement du renderer.

Un changement de framework ne doit pas imposer de redéfinir le modèle de capability mapping.

## Décision

1. Le modèle de cartographie versionné est la source de vérité métier.
2. Les règles métier doivent être progressivement rendues indépendantes de la plateforme lorsque cela apporte un bénéfice réel.
3. Les mécanismes de stockage, filesystem, réseau, IA et runtime sont traités comme des adaptateurs.
4. Les tests d'acceptance décrivent le comportement utilisateur indépendamment du framework.
5. Les migrations de données sont explicites, versionnées et réversibles autant que possible.
6. Les changements structurants sont réalisés par petites tranches et via PR dédiées.
7. Une migration React → Electron ne doit pas être interprétée automatiquement comme une migration React → autre UI : Electron peut d'abord servir de shell pour le renderer existant.
8. Aucun big bang n'est privilégié lorsqu'une coexistence temporaire permet de réduire le risque.

## Conséquences

### Positives

- migration plus progressive ;
- tests réutilisables ;
- conservation des cartographies existantes ;
- possibilité de changer le stockage indépendamment de l'UI ;
- meilleure capacité d'analyse par des agents IA grâce à des frontières explicites.

### Négatives

- quelques contrats supplémentaires à maintenir ;
- nécessité de conserver des tests de migration ;
- coexistence temporaire de plusieurs adaptateurs lors de certaines migrations.

## Rejeté

### Réécriture complète simultanée

Changer renderer, runtime, stockage et modèle dans une même release rend les régressions difficiles à localiser et empêche de savoir quelle décision a causé une rupture.

### Abstraction systématique de tout

Créer immédiatement des dizaines de ports, hooks et wrappers augmente le coût cognitif sans améliorer la migrabilité. Les frontières doivent apparaître lorsqu'elles protègent un contrat réel.

## Validation

Toute future migration doit se référer au playbook `docs/architecture/migration-playbook.md` et mettre à jour cet ADR ou en créer un nouveau si elle modifie les principes ci-dessus.
