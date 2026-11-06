# Audit des appels LLM du compagnon cartographe — 5 novembre 2026

> **Périmètre :** lecture statique de `main` à `9908854b8d2d979c85ef955266227094b4de2b71` ; aucun appel fournisseur réel ni mesure de latence sur une machine utilisateur. Le présent lot **documente** les constats, sans modifier le comportement, le modèle ou les API. Tous les correctifs ci-dessous nécessitent des PR de réalisation séparées.

## Résumé exécutif

Le compagnon comporte **deux parcours de nature différente** : les questions guidées et le mode conversation sans fournisseur activé appellent l'analyse locale déterministe, sans réseau ; lorsque le fournisseur est activé, le mode conversation envoie une requête générative. Le mode duo Rico + Octave envoie **deux requêtes génératives séquentielles**, la seconde tenant compte de la réponse de Rico.

**Conclusion vérifiée :** le streaming est effectif pour Ollama ; OpenAI et Gemini attendent un JSON de réponse complet. L'interface annonce pourtant que « les réponses apparaissent progressivement » dès que *n'importe quel* fournisseur est activé. L'optimisation prioritaire est le streaming multi-fournisseurs, complétée par la réduction des prompts et l'observabilité des délais.

## Chemin d'appel et frontières hexagonales

`CartographerCompanion.tsx` → `AiCompanionPort.ask({ question, cartography, history, personaInstructions, onChunk })` → `createCompanionAiAdapter` → `sendCompanionRequest` (`providerClient.ts`) → `fetch` navigateur. La factory est injectée depuis `createFrontendApplication` (`src/adapters/react/architecture.ts`) ; le composant ne contacte pas directement les fournisseurs.

Les consignes TOGAF, la posture de Rico/Octave, l'interdiction d'inventer des relations et la validation des marqueurs d'entités existantes sont utiles et cohérentes avec la lecture seule. Le mode duo passe bien la *réponse effective* de Rico à Octave via `buildOctaveFollowUpPrompt` : il ne s'agit pas de deux appels indépendants identiques.

## Contrôle des endpoints

| Fournisseur | Code actuel | Endpoint et protocole attendu | Verdict |
|---|---|---|---|
| Ollama | `POST /api/chat`, `stream: true`, lecture des lignes JSON du `ReadableStream` et `onChunk` | Ollama NDJSON incrémental | **Correct, streaming réel** |
| OpenAI et serveurs compatibles | `POST /v1/chat/completions`, `stream: false`, `response.json()` | Chat Completions accepte `stream: true` avec événements SSE contenant `choices[].delta.content` | **Endpoint correct, streaming désactivé** |
| Gemini | `POST /v1beta/models/{model}:generateContent`, `response.json()` | Pour rester dans le même contrat : `POST /v1beta/models/{model}:streamGenerateContent?alt=sse` | **Endpoint correct pour le non-streaming ; le streaming demande un autre endpoint** |

Le client accepte une URL OpenAI se terminant par `/v1/chat/completions` ou construit le chemin depuis un hôte ou `/v1`. **Limitation compatible API :** il impose une clé API non vide pour tout fournisseur déclaré `openai`, y compris un serveur privé OpenAI-compatible qui pourrait ne pas en exiger ; il ajoute alors systématiquement un header Bearer. Il faut séparer l'authentification requise par le fournisseur hébergé de l'authentification facultative d'un endpoint explicitement configuré, sans supprimer les garde-fous cloud. La compatibilité avec un serveur OpenAI-like justifie de **ne pas imposer tout de suite l'API Responses**, malgré la recommandation actuelle d'OpenAI pour les nouveaux projets. Une migration Responses serait une capacité séparée, avec adaptateur distinct. Pour Gemini, l'API Interactions existe aussi, mais la variante SSE de `streamGenerateContent` est la migration la moins invasive pour ce projet.

Sources fournisseur :
- https://docs.ollama.com/api/chat
- https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create
- https://developers.openai.com/api/reference/resources/chat/subresources/completions/streaming-events
- https://ai.google.dev/gemini-api/docs/generate-content/text-generation

## Constats priorisés

### P0 — Réponses tardives ou trompeuses

1. **OpenAI et Gemini ne diffusent pas de fragments.** Le callback `onChunk` est disponible mais ne reçoit rien pour ces fournisseurs. Il faut un lecteur SSE supportant les frontières de chunks réseau (une ligne ou un événement peut être fragmenté), les événements de fin, les erreurs et un repli clairement identifié si le flux est inaccessible.
2. **L'interface promet du streaming quel que soit le fournisseur.** `CartographerCompanion.tsx` initialise toutes les réponses génératives en `status: 'streaming'`; le texte d'accueil indique également que la réponse apparaît progressivement. L'état doit distinguer attente de premier contenu, lecture progressive, réponse non-streamée et finalisation.
3. **Timeout global fixe de 180 000 ms.** Le `AbortController` est programmé au début de chaque appel puis annule même une génération qui continue à fournir des chunks. Pour Ollama CPU et les grosses cartographies, dissocier délai avant les premiers octets, inactivité du flux, et durée totale configurable/raisonnable ; permettre l'arrêt explicite.
4. **En cas d'erreur après réception de fragments, l'interface remplace la réponse partielle par le message d'erreur.** Préserver le texte déjà généré avec un état « réponse interrompue », sans le présenter comme une analyse achevée. Le comportement existant du duo doit garder une réponse Rico valide si Octave échoue.

### P1 — Coût de contexte et fluidité

5. **Envoi du JSON complet à chaque demande.** `cleanCartography` sérialise tous les N0, N1, applications et pratiquement tous leurs attributs (seul `layout` d'une entité est retiré) ; aucun filtrage par question ni budget de contexte. C'est une charge de tokens et de temps de prélecture importante sur un LLM local, potentiellement supérieure au coût de génération.
6. **Historique redondant, non budgété.** Jusqu'à 8 échanges d'interface deviennent 16 messages, dont les réponses peuvent atteindre 6 000 caractères chacune. La cartographie réapparaît intégralement dans le dernier message utilisateur à **chaque tour**. Le mode duo fait évaluer deux fois le JSON complet de la même carte. Proposer une projection contextuelle métier (faits locaux déterministes + entités concernées), avec repli « contexte étendu » si une question globale le nécessite ; préserver les identifiants et liens de preuve.
7. **Affichage React à chaque chunk.** `onChunk` fait un `setHistory` pour chaque fragment : risque de rerenders coûteux lorsque de nombreux petits fragments arrivent. Regrouper les rafraîchissements à cadence de rendu, sans temporiser la réception ni retarder le premier fragment visible.
8. **Pas d'instrumentation du délai.** Aucun relevé normalisé de délai premier octet/premier token, durée totale, longueur du contexte, tokens de prompt/génération ou chargement Ollama. Les derniers événements Ollama fournissent déjà `load_duration`, `prompt_eval_count`, `prompt_eval_duration`, `eval_count`, etc. Les lire sans exporter les prompts ni les clés.
9. **Risque de masquage des réponses partielles Ollama.** Le lecteur ignore silencieusement une ligne JSON invalide (`catch { continue; }`), ce qui peut perdre du contenu sans alerte. Le lecteur sait correctement conserver les lignes coupées entre chunks réseau, mais la robustesse aux lignes malformées, aux détails d'erreur et aux réponses tronquées doit être vérifiée. Une sortie de réflexion (`message.thinking`) peut aussi précéder `message.content` pour certains modèles ; l'UI doit distinguer activité du flux et premier texte visible plutôt que rester sur un état d'attente générique.

### P2 — Contrat et confidentialité

10. **Absence de vraie annulation utilisateur.** L'`AbortController` est privé à l'adaptateur fournisseur ; le port ne permet ni `signal` ni `cancel`. Quitter/fermer le panneau n'annule pas nécessairement le travail en cours.
11. **Sélection et transmission des attributs.** La projection exclut les champs racine inconnus, mais transmet presque tous les champs des entités, y compris les futurs champs non prévus : définir une projection explicite avec attributs métier autorisés, visible pour l'utilisateur si cloud. Préserver la compatibilité avec les attributs métier personnalisés explicitement attendus.
12. **Pas de réglages de génération selon modèle.** Ollama utilise ses valeurs par défaut pour `keep_alive`, `think`, `num_ctx`, etc. Ne pas forcer `keep_alive: 0`. Une éventuelle préférence de réchauffage et de mode réflexion doit rester facultative, mesurable, et compatible avec les modèles qui ne la prennent pas en charge.
13. **Erreurs du fournisseur peu exploitables.** La neutralisation du corps HTTP évite une fuite de détails, mais l'interface ne distingue pas assez les erreurs de CORS/réseau, la longueur du contexte, le modèle introuvable, l'annulation et le timeout. L'erreur visible doit être actionable, sans divulguer de données sensibles.

## Couverture de tests observée

- `tests/ai/companionProviders.test.ts` vérifie le chemin Ollama, `stream:true`, la livraison de trois fragments, les endpoints OpenAI/Gemini et certains cas d'erreur. **Pas de test de streaming OpenAI/Gemini**, ni de frontières SSE/JSON scindées entre `reader.read()`, ni de timeout actif après réception.
- `playwright/e2e/regression.spec.ts` couvre la navigation et l'ergonomie du compagnon, pas une vraie progression visuelle multi-fournisseurs par fragments réseau. Le projet emploie **Playwright**, pas Cypress, pour les E2E actuels. Certaines mentions historiques de Cypress dans `docs/architecture-compagnon-ia.md` sont obsolètes.
- Les tests unitaires contrôlent la présence de noms/relations et l'absence d'une propriété racine « secret » ; ils ne contrôlent pas un budget de contexte ni un schéma de projection d'attributs.

## Proposition de réalisation

### Lot 1 — Streaming fiable et honnête (priorité haute)
- Ajouter les adaptateurs de flux SSE OpenAI/Gemini, réutiliser le même contrat `onChunk` ; conserver la compatibilité Ollama et les variantes OpenAI-compatible.
- Parser les événements progressivement : `[DONE]`, `data:`, erreurs, frontières arbitraires de flux, décodage UTF-8, absence de duplication.
- Introduire explicitement les états de réponse et préserver les fragments en cas d'erreur.
- Tests unitaires des trois parseurs et Playwright de l'affichage **avant la fin** d'une requête simulée.

**Acceptation :** sur les trois fournisseurs, dès le premier fragment textuel reçu par le navigateur, ce fragment devient visible avant la fermeture du flux.

### Lot 2 — Latence et contexte local (priorité haute)
- Définir une projection minimale et ciblée selon l'intention (relations, couverture, nommage, vue globale), sans perdre les preuves typées N0/N1/Application. Ne pas changer le comportement des questions guidées.
- Conserver les cas où la carte complète est nécessaire, avec indicateur de coût / taille contextuelle et budget, plutôt qu'un filtrage approximatif silencieux.
- Réduire les répétitions historiques, les textes systèmes et la seconde passe duo ; rendre Octave complémentaire sans le débrancher de la preuve.
- Ajouter tests de non-régression sur les réponses factuelles, les entités et attributs personnalisés.

**Acceptation :** réduction du volume de prompt pour les questions ciblées avec mêmes faits vérifiables ; la cartographie complète reste disponible sur demande.

### Lot 3 — Contrôle et observabilité (priorité moyenne)
- Étendre le port avec `AbortSignal` et états ; annulation utilisateur explicite, timeouts distincts et actions de reprise.
- Mesurer `time-to-first-byte`, `time-to-first-visible-text`, `duration`, et données de performance fournisseur disponibles, dans des métriques locales non sensibles.
- Éviter les rerenders par token sans différer le premier affichage.
- Playwright : annulation, erreur après fragments, duo Rico OK/Octave KO, fournisseur lent, carte volumineuse, PWA GitHub Pages.

**Acceptation :** délai initial et génération réellement en cours visibles ; l'utilisateur peut arrêter proprement ; aucun secret, cartographie complète ou prompt stocké dans la télémétrie.

## Limites de l'audit

Il s'agit d'une inspection de code, **pas d'un benchmark réel de débit** sur les modèles. Le streaming améliore surtout la **latence perçue** ; pour réduire la latence avant le premier texte, il faut aussi agir sur le temps de chargement du modèle, les tokens d'entrée et, selon le modèle, sa phase de réflexion. Les gains doivent être mesurés séparément, en particulier en mode local et duo.

Le lot présent est purement documentaire : **aucun code d'exécution, aucun test, aucune configuration et aucun fournisseur n'ont été modifiés**.
