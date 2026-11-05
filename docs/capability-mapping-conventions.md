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
