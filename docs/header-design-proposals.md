# Propositions de maquettes — entête de l’application

## Contexte
Analyse de main le 12 octobre 2026. L’application React/Vite doit rester compatible GitHub Pages et PWA. La cartographie est la surface de travail principale ; les données restent locales au navigateur, avec import/export JSON.

Fonctions à organiser : Cartographie / Analyse d’impact, création, annuler/rétablir, sauvegarde, Mes cartographies, import/export, préférences/thème, aide TOGAF, et commandes contextuelles de structure et de filtrage.

## Direction privilégiée après clarification : ruban inspiré de Microsoft 365

Le besoin est plus proche de l’organisation d’Office 365 que d’une simple barre d’outils. Il faut privilégier un ruban à onglets fonctionnels, avec une hiérarchie stable et des groupes de commandes nommés.

```text
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│ ◈ Enterprise Capacity Mapper   [ Rechercher une capacité, un domaine… ]  Thème  Aide  ⚙      │
├──────────────────────────────────────────────────────────────────────────────────────────────┤
│ Accueil   Cartographie   Applications   Analyse   Affichage   Mes cartographies   Import/Export│
├──────────────────────────────────────────────────────────────────────────────────────────────┤
│ CRÉER                 MODIFIER             DONNÉES                  AFFICHAGE                 │
│ + Nouvelle carte      ↶ Annuler  ↷ Rétablir  Sauvegarder  Ouvrir      Présentation  Filtrer   │
│ + Domaine N0          Structure             Importer JSON Exporter    Zoom          Thème      │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Principes
- Barre supérieure : nom de l’application, recherche si elle peut réellement couvrir les entités existantes, aide TOGAF et préférences discrètes.
- Onglets : Accueil, Cartographie, Applications, Analyse et Affichage. Bibliothèque et import/export peuvent être des onglets si leur usage le justifie.
- Groupes : création, édition, données et présentation, avec des libellés discrets et des séparateurs visuels.
- Accueil par défaut : création d’une cartographie, sauvegarde, annuler/rétablir et accès à Mes cartographies.
- Les actions N0/N1, la structure et les filtres dépendants du contexte restent proches de la zone de travail.
- Le thème est discret, dans Affichage ou Préférences. L’aide TOGAF reste accessible via un bouton « ? » compact.
- Sur écran étroit, les groupes se replient en menus nommés ; le ruban peut être réduit, sans icônes ambiguës seules.

### Pourquoi cette direction
Le ruban donne une place prévisible à un nombre croissant de fonctionnalités et convient mieux à un outil d’architecture d’entreprise riche en commandes qu’une rangée unique de boutons. Sa hauteur doit toutefois rester maîtrisée pour préserver la matrice.

## Trois concepts comparables

### A — Ruban type Office 365 (recommandé)
Barre d’identité au-dessus, onglets fonctionnels, groupes de commandes sous l’onglet actif.
Atouts : découvrabilité, structure évolutive et vocabulaire stable. Vigilance : éviter trop d’onglets et proposer un mode compact.

### B — Menu latéral + barre d’outils compacte
Navigation persistante à gauche pour Cartographie, Analyse d’impact, Mes cartographies, Bibliothèque et Import/Export ; haut de page consacré à la recherche, aux préférences et aux actions principales.
Atouts : sections toujours visibles. Vigilance : réduit la largeur disponible pour la matrice.

### C — Entête minimale + menu d’actions
Barre courte avec navigation essentielle, Annuler/Rétablir, Nouvelle cartographie et Sauvegarder. Les commandes secondaires sont classées dans un panneau Données, Affichage et Aide.
Atouts : maximise la place pour la matrice. Vigilance : commandes moins découvrables.

## Comparatif

| Critère | A — Ruban Office | B — Menu latéral | C — Minimaliste |
|---|---:|---:|---:|
| Place laissée à la matrice | Bonne | Moyenne | Excellente |
| Découvrabilité | Excellente | Très bonne | Moyenne |
| Évolutivité | Excellente | Bonne | Bonne |
| Usage bureau | Excellent | Très bon | Très bon |
| Usage mobile | Bon avec repli | Moyen | Excellent |
| Adéquation au besoin exprimé | Excellente | Partielle | Partielle |

## Recommandation
Retenir A — le ruban inspiré de Microsoft 365, avec un repli compact inspiré de C pour les petits écrans. Organiser le ruban autour des vrais cas d’usage plutôt que recopier toutes les conventions Office sans discernement.

## Règles UX et d’implémentation
- Ne pas modifier le modèle métier, les relations N0 → N1 → applications, ni le stockage.
- Conserver les gestionnaires existants ; privilégier une refonte structurelle et CSS, avec adaptations de composants seulement si nécessaire.
- Ne pas créer de recherche globale, d’état de compte ou de commandes fictives.
- Garder un bouton primaire dominant et respecter les états désactivés d’Annuler/Rétablir.
- Rendre les onglets et menus accessibles au clavier ; gérer le focus et Échap.
- Ajouter des tests Cypress pour les onglets, les actions déplacées, les menus et le responsive.
- Vérifier build, tests E2E et déploiement sous le sous-chemin GitHub Pages.
- L’implémentation devra faire l’objet d’une PR dédiée, distincte de cette proposition documentaire.
