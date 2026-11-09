# Conventions de cartographie des capacités

Ce document définit les règles fonctionnelles et pédagogiques de l'application. Il doit être considéré comme une référence pour toute évolution de l'interface.

## 1. Principe central

Une **capacité métier** décrit ce que l'entreprise sait faire ou doit savoir faire, indépendamment de la façon dont elle le fait.

Une capacité n'est pas :
- une application ou un outil ;
- une équipe ou une entité organisationnelle ;
- une étape de processus ;
- une action opérationnelle formulée comme une instruction.

Question de contrôle : **« Si je change l'organisation ou le logiciel, est-ce que cette capacité existe toujours ? »** Si oui, on est probablement sur le bon niveau d'abstraction.

## 2. N0 — Domaine

Le N0 est un regroupement large de capacités. Il sert à structurer la carte et à permettre une lecture synthétique.

**Convention :** nom court, métier, stable, généralement un groupe nominal.

Exemples :
- Relation client
- Finance
- Supply Chain
- Ressources humaines

Éviter les noms trop techniques, les noms d'applications et les verbes d'action.

## 3. N1 — Capacité

Le N1 décompose un domaine N0 en capacités métier plus précises.

**Convention recommandée :** groupe nominal décrivant un savoir-faire, souvent « nom + objet métier ».

Exemples :
- Relation client → Gestion des réclamations
- Relation client → Gestion des contrats
- Finance → Gestion de la facturation
- Supply Chain → Prévision de la demande

### À privilégier
« Gestion des commandes »

### À éviter
« Gérer les commandes » — verbe d'action / formulation de processus.

« Équipe commandes » — organisation.

« SAP » — application.

## 4. Profondeur

- **1 niveau** : on cartographie directement les domaines N0. C'est adapté à une vue exécutive ou lorsque le niveau de détail n'est pas encore connu.
- **2 niveaux** : N0 + N1. C'est le niveau recommandé lorsque l'objectif est d'analyser finement la couverture applicative et les impacts.

N0 → N1 signifie une **décomposition du périmètre**, pas une succession d'étapes.

## 5. Applications

Les applications sont reliées aux capacités qu'elles supportent. Une application peut couvrir plusieurs capacités et une capacité peut être couverte par plusieurs applications.

Le nom d'une application reste celui du produit ou du service réel. Il ne doit pas être utilisé comme nom de capacité.

## 6. Pédagogie dans l'interface

L'interface doit rappeler ces conventions au moment où l'utilisateur agit :
- expliquer ce qu'est une capacité avant ou pendant sa création ;
- expliquer N0 et N1 dans l'assistant de création ;
- donner des exemples concrets de bons noms ;
- indiquer explicitement la préférence pour les groupes nominaux ;
- distinguer capacité, processus, organisation et application ;
- utiliser un vocabulaire compréhensible par une personne ne connaissant pas TOGAF.

L'objectif n'est pas de transformer l'application en formation TOGAF : les explications doivent être courtes, contextuelles et actionnables.

## 7. Règle d'évolution

Toute nouvelle fonctionnalité qui introduit un concept d'architecture doit fournir une explication contextuelle pour un utilisateur non expert et, lorsque pertinent, un exemple de nommage.

Toute modification des conventions doit mettre à jour ce document et l'aide contextuelle correspondante dans l'interface.

## 8. Évaluation métier d'une capacité N1 (facultative)

Une capacité peut maintenant porter `assessment` dans le même JSON V3, sans migration destructive :
- `functionalCoverage` : `unknown` (défaut), `none`, `partial`, `sufficient` ;
- `currentMaturity` et `targetMaturity` : niveaux définis explicitement sur une échelle de 1 à 5, facultatifs ;
- `rationale` : justification factuelle de l'évaluation.

Les champs absents restent **non évalués**. Aucun nombre d'applications reliées ne doit déterminer automatiquement la maturité ou la qualité de couverture. La priorité P1/P2/P3 reste un indicateur différent de la maturité. Les données N0-only ne reçoivent pas automatiquement d'évaluations N1 fictives.

## 9. Diagnostic des écarts

Dans « Analyse > Examiner les points d'attention », le diagnostic N1 distingue :
- les applications actuelles (hors statut `Cible`) des applications cibles ;
- l'absence de relation actuelle et la qualité de couverture **déclarée** (`none`, `partial`, `sufficient` ou `unknown`) ;
- les différences positives de maturité cible/actuelle lorsque les deux valeurs existent ;
- les supports applicatifs déclarés obsolètes, qui constituent un signal à revoir et non une déduction de défaillance.

L'import facultatif d'une cartographie de référence JSON V3 permet d'identifier les capacités attendues absentes du modèle actif : comparaison stricte des codes normalisés, ou des noms normalisés dans leur domaine si les codes sont absents. Cette comparaison n'effectue aucun appariement flou et ne modifie pas les données actives. Une absence de déclaration n'est **pas** assimilée à une absence de capacité métier.

## 10. Préparer les décisions sans automatiser les décisions

Le panneau de revue d'architecture présente des **questions** classées par priorité métier déclarée, jamais des décisions approuvées. Un export Markdown local (.md) consolide les preuves, les questions et les limites des indicateurs. Une simulation de retrait d'application signale les capacités perdant leur dernier support actuel, celles avec moins de supports, et celles perdant un support cible ; elle ne modifie ni les applications ni leurs relations.

Un JSON V3 de référence peut être sélectionné localement ou chargé depuis une URL HTTPS publique, y compris un lien GitHub `blob` converti en contenu brut. La donnée chargée reste en mémoire pendant la session, sans synchronisation ni backend.

## 11. Couverture par liens applicatifs actuels

Le taux de couverture **applicative actuelle** et les compteurs de gaps/redondances utilisent les applications reliées hors statut `Cible`. Une application `Cible` reste visible dans la carte, les relations et le scénario de transformation mais ne prouve pas une couverture actuelle. Une application `Obsolète` peut encore servir le métier aujourd'hui : elle reste comptée, tout en faisant l'objet d'un signal explicite. Cette couverture par liens n'est pas synonyme de couverture fonctionnelle évaluée.


## 12. Lecture métier directe de la cartographie

Depuis la cartographie N0/N1, le bandeau **Lecture métier** permet de basculer sans modifier le modèle :
- **Applications** (défaut) : relations applicatives et dépôt des applications ;
- **Couverture** : liens actuels/cibles d'une part, couverture fonctionnelle explicitement évaluée d'autre part ;
- **Maturité** : niveaux actuel et cible 1–5 renseignés, avec écart uniquement calculé si les deux sont connus ;
- **Écarts** : signaux issus du diagnostic déterministe, avec « à qualifier » si la couverture n'a pas été évaluée.

Chaque carte N1 présente toujours l'état de couverture fonctionnelle, et le bouton **Fiche** ouvre directement l'édition de ses propriétés métier. La sélection d'impact et les actions de relation restent indépendantes de la lecture choisie. Le mode présentation reste exempt de contrôles d'édition. Les cartographies N0 seules n'affichent pas une maturité N1 fictive.


## 13. Parcours depuis le constat jusqu'à la qualification

La cartographie présente deux compteurs métiers : **capacités à qualifier** (couverture fonctionnelle inconnue) et **capacités avec signaux d'écart**. Le bouton « Examiner les écarts » ouvre directement la vue d'attention du Dashboard, sans étape de navigation intermédiaire.

Dans les constats, « Qualifier la capacité » / « Modifier l'évaluation » ouvre la **même fiche N1** sans passer par la gestion des relations. L'utilisateur peut enregistrer et relire immédiatement les signaux recalculés dans le diagnostic, revenir à la capacité dans la lecture « Écarts » sur la carte, ou examiner séparément les relations applicatives. Les compteurs et constats utilisent les règles métier existantes et ne créent pas de données fictives.


## 14. Diagnostic métier — expérience de revue

L'intention **Examiner les points d'attention** utilise les tokens du design system et conserve ses règles métier. La synthèse comporte deux vues sélectionnables : **Avec signal** (constats issus des liens applicatifs, obsolescence, couverture déclarée et maturité) et **À qualifier** (couverture fonctionnelle inconnue). Cette seconde vue rend accessibles les capacités sans signal mais non évaluées.

Chaque résultat présente le contexte de domaine N0, les signaux, les nombres d'applications actuelles et cibles, puis les actions **Qualifier / Modifier l'évaluation**, **Voir sur la carte**, **Relations**. La liste peut s'étendre sans troncature silencieuse.

La comparaison à une référence est optionnelle et repliée par défaut. Elle propose un import local JSON V3 ou un lien GitHub public ; la référence ne remplace pas la carte active. Les résultats de comparaison, erreurs de validation et bouton de retrait restent visibles une fois une référence chargée.

La revue de décisions distingue les preuves, les questions à instruire et les actions. L'export Markdown inclut l'ensemble des éléments. La simulation de retrait ne modifie jamais les données.


## 14. SIGNAL Professionnel — légendes et densité (lot 2)

La légende est propre à la lecture choisie : **Applications** explicite les liens SI actuels/cibles, **Couverture** distingue les quatre états fonctionnels déclarés, **Maturité** décrit actuel/cible et inconnue, **Écarts** signale les cas à instruire. Le bandeau N0 exprime uniquement l'identité du domaine. Les pastilles N1 distinguent explicitement « Non couverte », « Partielle », « Suffisante » et « À évaluer », sans inférence depuis le nombre d'applications.

**Densité : Confortable/Compacte** est une préférence d'affichage locale : elle n'agit que sur les espacements, jamais sur les identifiants, lignes, colonnes, spans ou relations. Aucun N1 n'est masqué. Le mode présentation possède sa propre composition indépendante.

## Repli de la grille après suppression d'un domaine N0

La suppression d'un domaine retire ses N1 et nettoie les relations applicatives selon les règles du catalogue. L'affichage de la cartographie se **replie automatiquement** sur les lignes de grille libérées, lorsque celles-ci ont été créées automatiquement sous le nom `Ligne N` et ne sont plus occupées par aucun N0.

Une ligne traversée par le `rowSpan` d'un N0 reste occupée. Les lignes métier explicitement nommées (par exemple « Support »), les lignes contenant une zone personnalisée et au moins une ligne d'insertion sont conservées, même si elles sont vides. Les colonnes, les identifiants des N0 restants, leurs spans, leurs relations et les préférences de présentation ne changent pas. Une nouvelle insertion peut à nouveau étendre la grille si nécessaire. L'opération est enregistrée avec le modèle et reste compatible avec l'historique Annuler/Rétablir.



## Déplacement N0 entre lignes métier occupées

Une ligne (layer) est un axe de lecture métier, pas un emplacement exclusif. Déplacer un N0 de Support à Cœur métier déjà occupée ne crée aucune ligne structurelle. Pour les domaines avec `rowSpan = 1`, les empreintes horizontales qui se croisent (même sur une partie de leurs colonnes) s’empilent sur des sous-rangées *visuelles* dans leur ligne métier. Les domaines disjoints utilisent la même sous-rangée. Le domaine déplacé est affiché après les domaines déjà présents.

Le JSON local, les spans, les identifiants N0/N1 et leurs relations applicatives restent inchangés. La vue présentation suit la même règle d’affichage. Les collisions avec un domaine couvrant plusieurs lignes (`rowSpan > 1`) et les débordements de grille restent interdits pour les nouveaux déplacements. L’empilement n’ajoute aucune notion à la sémantique TOGAF ni aucun nouvel axe.
