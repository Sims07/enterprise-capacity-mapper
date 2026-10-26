# Compagnon cartographe IA — fondations et règles métier

## Objectif du lot 1

Ce document fixe les frontières fonctionnelles avant l’ajout d’une interface conversationnelle ou d’un fournisseur IA. Le compagnon doit aider à raisonner sur une cartographie, sans se substituer à l’architecte d’entreprise ni modifier le modèle à sa place.

## Contraintes d’architecture

- L’application reste une PWA React/Vite statique, déployable sur GitHub Pages.
- Les premières analyses sont exécutées dans le navigateur et ne nécessitent ni backend, ni base de données, ni appel réseau.
- Le modèle de cartographie existant reste la source de vérité.
- L’analyse est en lecture seule : elle ne corrige, ne renomme et ne supprime aucun élément.
- Le modèle et les résultats d’analyse ne sont pas fusionnés dans le JSON métier ni dans les exports.
- Les fournisseurs conversationnels sont branchés derrière un contrat commun dans `src/services/ai/companionProviders.js` : Ollama, OpenAI et Google Gemini.

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

Pour le fonctionnement multi-fournisseurs :

- Le mode local doit être distinct du mode cloud et ne doit déclencher aucun appel cloud.
- L’utilisateur choisit explicitement le fournisseur cloud et voit les éléments transmis avant le premier envoi.
- Une clé API n’est jamais embarquée dans le dépôt, dans le bundle public ou dans le JSON métier.
- Sur GitHub Pages, une clé saisie dans le navigateur n’est pas un secret inviolable. La garder en mémoire réduit sa persistance mais ne protège pas contre l’inspection du navigateur.
- Les préférences non sensibles peuvent être locales ; la clé API ne doit pas être persistée par défaut.
- Les erreurs et diagnostics ne doivent pas journaliser la clé, le prompt complet ni la cartographie entière.
- Un usage entreprise avec secrets partagés, contrôle d’accès ou quotas administrés nécessitera un service intermédiaire sécurisé ; cette infrastructure n’est pas fournie par l’application statique.

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
- La zone de question libre oriente les demandes générales vers les contrôles locaux à partir de mots-clés ; elle sait aussi rechercher directement les relations déclarées lorsqu’un nom d’application ou de capacité est cité dans une question sur les rattachements. Cette consultation est déterministe, en lecture seule, et ne constitue pas une conversation générative.
- Le panneau indique explicitement que le modèle n’est pas transmis et qu’aucun fournisseur conversationnel n’est encore connecté.
- La conversation affiche chaque question suivie de sa réponse et conserve les échanges précédents tant que le composant reste monté. Changer de modèle réinitialise l’historique pour éviter de mélanger les résultats de deux cartographies.
- Deux modes explicites et persistants sont disponibles : **Questions guidées** garde les contrôles prédéfinis dans une zone fixe au-dessus de la zone de résultats défilante ; **Conversation** propose la saisie libre et un fil chronologique. Le passage d’un mode à l’autre conserve l’historique de la session. Chaque échange peut être supprimé individuellement après confirmation, et tout l’historique peut être réinitialisé après confirmation. Les constats détaillés sont repliés par défaut pour éviter de surcharger les réponses.
- Les réponses présentent une synthèse et un accès aux constats détaillés (sévérité, explication, piste de revue et éléments concernés).
- Les éléments de preuve qui correspondent à une entité existante sont des liens d’action : ils basculent vers la carte, sélectionnent l’élément et le font défiler dans la zone visible. Les références vers des identifiants absents restent du texte non cliquable.
- Les réponses génératives peuvent citer une entité avec un marqueur typé `[[domain:ID]]`, `[[capability:ID]]` ou `[[application:ID]]`. Le navigateur vérifie le type et l’identifiant contre la cartographie active avant de créer un lien ; les marqueurs invalides sont retirés et signalés.
- Si la recherche locale rencontre plusieurs applications ou capacités portant exactement le même nom, le compagnon demande à l’utilisateur de choisir l’élément au lieu de fusionner les résultats.
- L’interface est compatible avec les thèmes clair/sombre, le clavier (Échap pour fermer), la préférence de réduction des animations et les petits écrans.
- L’historique reste en mémoire React et n’est ni sauvegardé dans le modèle métier, ni ajouté aux exports.

Les tests Cypress de ce lot valident l’ouverture du panneau, la disponibilité des questions guidées lorsque les résultats défilent, la suppression d’un échange, la réinitialisation complète après confirmation, le passage entre les deux modes sans perte d’historique, la recherche des capacités d’une application, la recherche inverse des applications liées à une capacité, le traitement explicite d’un nom introuvable, la soumission d’une question, la fermeture au clavier, le thème sombre et l’affichage mobile sans assertion fragile sur les valeurs RGB/RGBA.



## Lot 3 — Fournisseurs conversationnels

Le compagnon peut utiliser trois fournisseurs derrière `sendCompanionMessage` :

- **Ollama** : appel local `/api/chat`, par défaut sur `http://localhost:11434`, avec streaming activé (`stream: true`). Le navigateur lit les événements JSON successifs et affiche les fragments de texte au fil de leur réception. L’interface indique « Le modèle prépare sa réponse… » avant le premier fragment, puis « Réponse en cours de génération… » tant que le flux continue. Le délai maximal de génération est de trois minutes. Ollama doit être démarré et autoriser les requêtes CORS de l’origine GitHub Pages ou de développement.
- **OpenAI** : appel à l’API Chat Completions, avec un modèle configurable et une clé Bearer.
- **Google Gemini** : appel à `generateContent`, avec modèle et URL de service configurables.

### Activation et données transmises

- L’application reste statique, compatible GitHub Pages ; aucun secret ou fournisseur n’est configuré dans le bundle.
- Le mode local est activé par défaut. L’utilisateur doit ouvrir les paramètres IA et activer explicitement le fournisseur pour les questions du mode Conversation. Les contrôles guidés restent déterministes et locaux.
- Le fournisseur, le modèle, l’URL et l’activation sont conservés dans le stockage local du navigateur. La clé API cloud reste en mémoire React, est effacée lors d’un changement de fournisseur et n’est jamais écrite dans le stockage local.
- Lorsqu’un fournisseur est activé, la question, les derniers échanges et un sous-ensemble utile des données métier (domaines, capacités, applications et relations) sont transmis au fournisseur sélectionné. L’interface affiche cet avertissement avant l’envoi.
- Une clé saisie dans le navigateur n’est pas protégée contre l’inspection locale. Cette solution convient à un usage personnel explicite, mais pas à un secret partagé dans une organisation. Un service intermédiaire sécurisé est nécessaire pour administrer les secrets, les quotas et les accès.
- Les réponses génératives sont affichées comme réponses du fournisseur et ne modifient jamais la cartographie. Les erreurs réseau sont présentées sans journaliser la clé ni recopier le corps d’erreur du fournisseur.

### Vérifications

Les tests unitaires couvrent le format d’appel et l’extraction de réponse des trois fournisseurs, la lecture progressive des fragments Ollama, le refus d’un appel cloud sans clé, la réduction des données transmises et la neutralisation des détails du corps d’erreur HTTP. Les tests Cypress simulent Ollama sans appel réseau réel, vérifient l’indicateur d’attente et contrôlent que la clé cloud n’est pas persistée. Aucun test ne nécessite de clé réelle ni de compte fournisseur.
