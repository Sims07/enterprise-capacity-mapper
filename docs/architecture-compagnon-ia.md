# Compagnon cartographe IA — fondations et règles métier

## Objectif du lot 1

Ce document fixe les frontières fonctionnelles avant l’ajout d’une interface conversationnelle ou d’un fournisseur IA. Le compagnon doit aider à raisonner sur une cartographie, sans se substituer à l’architecte d’entreprise ni modifier le modèle à sa place.

## Contraintes d’architecture

- L’application reste une PWA React/Vite statique, déployable sur GitHub Pages.
- Les premières analyses sont exécutées dans le navigateur et ne nécessitent ni backend, ni base de données, ni appel réseau.
- Le modèle de cartographie existant reste la source de vérité.
- L’analyse est en lecture seule : elle ne corrige, ne renomme et ne supprime aucun élément.
- Le modèle et les résultats d’analyse ne sont pas fusionnés dans le JSON métier ni dans les exports.
- Les fournisseurs cloud et les modèles locaux seront ajoutés dans des lots ultérieurs, derrière un contrat commun.

## Vocabulaire métier

- **N0 — domaine** : regroupement large et stable de capacités métier.
- **N1 — capacité** : savoir-faire métier plus précis, indépendant des processus, de l’organisation et des applications.
- **Application** : système ou produit qui soutient une ou plusieurs cibles de la cartographie.
- **Couverture** : relation explicite entre une application et une capacité N1 (profondeur 2) ou un domaine N0 (profondeur 1).

La profondeur 1 est un choix de modélisation valide pour une vue synthétique. L’absence de N1 ne doit donc pas être interprétée comme une anomalie lorsque la carte est configurée à un niveau.

## Axes d’analyse

1. **Intégrité structurelle** : rattachement N1 → N0 et relations application → cible qui référencent des éléments existants.
2. **Nommage** : noms absents, doublons exacts après normalisation et formulation verbale à examiner.
3. **Couverture** : domaines ou capacités sans relation applicative déclarée, et applications sans cible associée.
4. **Interprétation métier** : les règles automatiques ne concluent pas seules à un défaut d’architecture. Les constats ambigus doivent être présentés comme des points à vérifier.

### Nommage

Une capacité est idéalement formulée comme un savoir-faire stable, souvent avec un groupe nominal. Les contrôles linguistiques sont des heuristiques, pas une validation grammaticale complète. Un nom qui commence par un verbe peut être légitime dans son contexte ; le compagnon doit toujours expliquer que cette suggestion doit être revue par un humain.

Les doublons sont des doublons **potentiels** : deux éléments portant le même nom peuvent avoir des périmètres différents. Aucun regroupement ni renommage automatique n’est autorisé.

### Cycle de vie applicatif

Des applications ayant des statuts différents dans un même domaine ou couvrant une même capacité ne constituent pas automatiquement une incohérence. Cela peut représenter une coexistence temporaire, une migration, une solution cible ou un retrait planifié. Le statut seul ne permet pas de déduire une anomalie.

## Contrat d’analyse déterministe

Le module `src/services/ai/cartographyAnalysis.js` expose `analyzeCartography(model)`. Il ne dépend d’aucun fournisseur ni d’API navigateur, et ne modifie pas le modèle d’entrée.

Le résultat est un objet JSON versionné :

- `schemaVersion` : version du contrat de sortie.
- `summary` : synthèse textuelle des constats.
- `context` : métadonnées minimales sur la carte et ses volumes.
- `observations` : liste ordonnée de constats.
- `questions` : questions complémentaires, vides pour les règles déterministes initiales.
- `limitations` : limites explicites de l’analyse.

Chaque observation contient :

- `id` : identifiant stable construit à partir de la règle et des éléments concernés ;
- `ruleId` : identifiant de règle exploitable dans les tests et l’interface ;
- `category` : `structure`, `naming` ou `coverage` ;
- `severity` : `error`, `warning`, `review` ou `suggestion` ;
- `title`, `detail`, `recommendation` : formulation destinée à l’utilisateur ;
- `evidence` : éléments source concernés, avec type, identifiant et nom.

### Règles initiales

| Identifiant | Détection | Interprétation |
|---|---|---|
| `model.invalid` | Le modèle n’est pas un objet exploitable | Erreur d’entrée |
| `name.missing` | Nom vide ou absent | Alerte de qualité |
| `name.duplicate` | Même nom normalisé dans le périmètre comparé | Doublon potentiel à examiner |
| `naming.action-phrase` | Préfixe verbal dans un domaine ou une capacité | Suggestion linguistique indicative |
| `relationship.capability-domain-missing` | N1 rattaché à un N0 absent | Erreur structurelle |
| `relationship.application-target-missing` | Relation applicative vers une cible absente | Erreur structurelle |
| `coverage.target-uncovered` | Domaine/capacité sans relation applicative valide | Point de revue, pas une conclusion métier |
| `coverage.application-unlinked` | Application sans cible déclarée | Point de revue, pas une conclusion métier |

La profondeur de la cartographie est respectée : à un niveau, les relations applicatives ciblent les domaines N0 ; à deux niveaux, elles ciblent les capacités N1.

## Contrat cible pour le compagnon génératif

Les fournisseurs OpenAI, Gemini et local devront converger vers une réponse validée côté application, avec les sections logiques suivantes :

- `summary` : réponse directe ;
- `observations` : faits présents dans le contexte fourni ;
- `interpretations` : hypothèses explicitement présentées comme telles ;
- `recommendations` : actions suggérées et leur justification ;
- `evidence` : identifiants d’éléments de cartographie à l’appui ;
- `questions` : informations manquantes à demander ;
- `confidence` : appréciation qualitative, si le fournisseur peut la justifier.

Les réponses génératives ne sont pas des faits de référence. L’application devra rejeter ou signaler les réponses invalides, afficher les limites, et ne jamais appliquer automatiquement une recommandation au modèle.

## Confidentialité et évolutivité

Pour les futurs lots :

- Le mode local doit être distinct du mode cloud et ne doit déclencher aucun appel cloud.
- L’utilisateur choisit explicitement le fournisseur cloud et voit les éléments transmis avant le premier envoi.
- Une clé API n’est jamais embarquée dans le dépôt, dans le bundle public ou dans le JSON métier.
- Sur GitHub Pages, une clé saisie dans le navigateur n’est pas un secret inviolable. La garder en mémoire réduit sa persistance mais ne protège pas contre l’inspection du navigateur.
- Les préférences non sensibles peuvent être locales ; la clé API ne doit pas être persistée par défaut.
- Les erreurs et diagnostics ne doivent pas journaliser la clé, le prompt complet ni la cartographie entière.
- Un usage entreprise avec secrets partagés, contrôle d’accès ou quotas administrés nécessitera un service intermédiaire sécurisé ; cette infrastructure n’est pas requise pour le lot 1.

## Stratégie de test

Les tests doivent privilégier les règles métier et les preuves de comportement plutôt que le texte complet d’une réponse générative. Le lot 1 vérifie notamment :

- modèle invalide et modèle sans point de vigilance ;
- capacité N1 rattachée à un domaine absent ;
- relation applicative qui référence une cible absente ;
- prise en compte de la profondeur 1 ;
- couverture manquante et application non reliée ;
- noms potentiellement dupliqués et suggestion de formulation verbale ;
- absence de mutation du modèle d’entrée ;
- absence de règle qui qualifie les statuts applicatifs différents d’incohérence à eux seuls.

Les tests d’API réels seront distincts des tests Cypress E2E, afin de conserver une suite reproductible sans clé secrète ni dépendance réseau.

## Lot 2 — Interface du compagnon

Le composant `src/components/CartographerCompanion.jsx` ajoute un panneau flottant accessible depuis l’application. Il reçoit le modèle courant en lecture seule et appelle uniquement `analyzeCartography`, dans le navigateur.

- Les actions rapides filtrent les constats par couverture, nommage ou structure.
- La zone de question libre est, pour ce lot, une aide de navigation vers ces mêmes contrôles locaux à partir de mots-clés ; elle n’est pas une conversation générative.
- Le panneau indique explicitement que le modèle n’est pas transmis et qu’aucun fournisseur conversationnel n’est encore connecté.
- La conversation affiche chaque question suivie de sa réponse et conserve les échanges précédents tant que le composant reste monté. Changer de modèle réinitialise l’historique pour éviter de mélanger les résultats de deux cartographies.
- Les actions rapides ne sont proposées qu’au démarrage ; après le premier échange, l’interface privilégie un fil de discussion chronologique. Les constats détaillés sont repliés par défaut pour éviter de surcharger les réponses.
- Les réponses présentent une synthèse et un accès aux constats détaillés (sévérité, explication, piste de revue et éléments concernés).
- L’interface est compatible avec les thèmes clair/sombre, le clavier (Échap pour fermer), la préférence de réduction des animations et les petits écrans.
- L’historique reste en mémoire React et n’est ni sauvegardé dans le modèle métier, ni ajouté aux exports.

Les tests Cypress de ce lot valident l’ouverture du panneau, les actions de revue, la soumission d’une question, la fermeture au clavier, le thème sombre et l’affichage mobile sans assertion fragile sur les valeurs RGB/RGBA.

