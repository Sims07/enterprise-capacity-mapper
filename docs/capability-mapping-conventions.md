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
