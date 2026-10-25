# ADR 0002 — Contrats TypeScript, ports et adaptateurs

- **Statut :** accepté
- **Date :** 2026-10-25
- **Contexte :** migration progressive vers TypeScript et architecture hexagonale pragmatique.

## Décision

1. Les frontières comportementales entre application et infrastructure sont exprimées par des ports TypeScript, généralement des `interface`.
2. Les structures de données, unions, résultats et types composés restent des alias `type` lorsque cela correspond mieux à leur rôle.
3. Les adaptateurs sans état complexe sont implémentés par des fabriques d'objets. L'objet retourné est explicitement vérifié avec `satisfies Port`; `Object.freeze` peut protéger la façade si cela est utile.
4. Les classes avec `implements Port` sont utilisées lorsqu'elles apportent une vraie encapsulation, un cycle de vie, un état interne avec invariants ou une identité nécessaire. Elles ne sont pas imposées pour imiter Java.
5. Les cas d'usage dépendent des contrats et reçoivent leurs dépendances via injection. Le point de composition choisit les adaptateurs par défaut.
6. Le domaine reste indépendant de React, du DOM et des API de stockage. Les règles et invariants métier sont testés indépendamment de l'UI autant que possible.
7. Les données importées sont validées au runtime ; les types TypeScript ne sont pas considérés comme un mécanisme de validation des JSON.
8. La migration est progressive, testée et proposée dans une PR dédiée. Aucun merge sans autorisation explicite.

## Conséquences

- Les adaptateurs simples restent légers, mais leur conformité aux ports est visible dans le code.
- Les tests peuvent injecter des dépendances et vérifier les contrats sans instancier le runtime réel.
- Les frontières n'imposent pas la création d'un port pour chaque fonction ni de classes métier pour chaque objet.
- Les nouvelles règles ne déclarent pas l'ensemble du code existant migré : la conformité se construit progressivement et doit être suivie dans les PR.

## Motifs

TypeScript utilise un système de types structurel : une classe n'est pas nécessaire pour qu'un objet respecte un contrat. `implements` vérifie explicitement une classe, tandis que `satisfies` vérifie la compatibilité d'une expression tout en préservant son inférence de type. Le choix de l'un ou l'autre doit servir la lisibilité et la conception, non une imitation mécanique d'un autre langage.

## Références

- [TypeScript Handbook — Interfaces](https://www.typescriptlang.org/docs/handbook/2/objects.html)
- [TypeScript Handbook — Classes](https://www.typescriptlang.org/docs/handbook/2/classes.html)
- [TypeScript 4.9 — satisfies](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-9.html)
- [AWS Prescriptive Guidance — Hexagonal architecture](https://docs.aws.amazon.com/prescriptive-guidance/latest/hexagonal-architectures/)
- Référentiel opérationnel : [typescript-architecture-standard.md](../typescript-architecture-standard.md)
