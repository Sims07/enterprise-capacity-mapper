# Propositions de maquettes — entête de l’application

## Contexte et objectif

Analyse de la version `main` consultée le 12 octobre 2026. L’application est une SPA React/Vite compatible GitHub Pages et PWA. L’entête doit rester compact : la matrice de cartographie est la surface de travail principale.

Fonctions déjà présentes ou documentées à rendre accessibles sans transformer l’entête en « mur de boutons » :

- bascule **Cartographie / Analyse d’impact** ;
- création d’une cartographie ;
- annuler / rétablir ;
- sauvegarder et ouvrir **Mes cartographies** ;
- import / export JSON ;
- préférences d’affichage / thème ;
- aide TOGAF ;
- commandes de structure de la matrice et recherche/filtrage, qui doivent rester proches de la cartographie plutôt que toutes remonter dans l’entête global.

Les données sont locales au navigateur, avec import/export JSON. La proposition ne suppose ni backend, ni compte utilisateur, ni stockage distant.

## Maquette A — Barre d’application + commandes essentielles (recommandée)

**Intention :** style SaaS professionnel, sobre et très lisible. Une barre unique de hauteur maîtrisée, avec seulement les actions fréquentes visibles ; les commandes secondaires sont regroupées dans des menus nommés.

```text
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│ ◈  CAPACITY MAPPER       [ Cartographie | Analyse d’impact ]     ↶  ↷   [ Sauvegarder ▾ ]  │
│    Architecture métier                                             [ Mes cartographies ]    │
│                                                        [ + Nouvelle ] [ ⋯ ]                 │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

**Organisation**
- À gauche : marque discrète et nom de l’application sur une ligne ; sous-titre facultatif seulement sur grand écran.
- Au centre : sélecteur segmenté « Cartographie / Analyse d’impact » clairement identifiable.
- À droite : historique Annuler/Rétablir, Sauvegarder, Mes cartographies, action principale « + Nouvelle » et menu « ⋯ ».
- Le menu « ⋯ » contient Importer, Exporter, Préférences / thème et les actions moins fréquentes. L’aide TOGAF reste un bouton « ? » accessible, avec libellé accessible et infobulle.
- « Sauvegarder » doit conserver son comportement actuel et ne pas laisser croire à une synchronisation distante.

**Points forts :** hiérarchie claire, actions récurrentes visibles, libellés explicites, faible bruit visuel. La matrice conserve l’espace vertical.

**Vigilances :** sur largeur intermédiaire, le menu secondaire doit absorber les actions avant que les libellés principaux ne se chevauchent. Sur mobile, prévoir un repli explicite et accessible, pas une réduction à des icônes sans nom.

## Maquette B — Navigation par espaces de travail

**Intention :** donner à l’application l’allure d’un outil d’architecture d’entreprise plus structuré. Les espaces de travail deviennent la navigation primaire ; les actions de fichier sont dans une barre d’outils compacte.

```text
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│ ◈ Capacity Mapper     Cartographie   Analyse d’impact                           Aide  ⚙     │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│ Cartographie active ▾     ↶  ↷      [ Sauvegarder ] [ Importer / Exporter ▾ ] [ + Nouvelle ]│
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

**Organisation**
- Première ligne : identité, navigation entre les deux espaces, aide et préférences.
- Deuxième ligne : nom de la cartographie active / sélecteur, historique et opérations sur les données.
- Le nom de la cartographie est visible pour éviter de travailler par erreur sur le mauvais modèle.
- Les options de thème restent dans Préférences ; le bouton d’aide ouvre le guide TOGAF.

**Points forts :** séparation nette entre navigation et actions ; extensible si de nouveaux espaces arrivent (par exemple portefeuille applicatif ou qualité des données).

**Vigilances :** deux lignes consomment plus de hauteur ; la seconde doit pouvoir se réduire sur petit écran. Ne pas créer de faux sélecteur de cartographie si l’interaction ne correspond pas à la bibliothèque locale existante.

## Maquette C — Barre compacte + menu de commandes

**Intention :** maximiser la place disponible pour la matrice, notamment sur des écrans portables. Les actions principales restent visibles, le reste est regroupé dans un menu « Actions ».

```text
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│ ◈ Capacity Mapper   [ Cartographie | Impact ]   ↶ ↷   [ + Nouvelle ] [ Sauvegarder ] [ ☰ ]  │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

Le menu « ☰ » ouvre un panneau structuré, avec des groupes nommés :

```text
┌───────────────────────────────┐
│ DONNÉES                       │
│  Mes cartographies            │
│  Importer un JSON             │
│  Exporter un JSON             │
├───────────────────────────────┤
│ AFFICHAGE                     │
│  Thème et préférences         │
│  Présentation                 │
├───────────────────────────────┤
│ AIDE                          │
│  Guide TOGAF                  │
└───────────────────────────────┘
```

**Points forts :** entête courte et matrice favorisée ; très bonne base pour un affichage mobile ou un mode présentation.

**Vigilances :** les fonctions secondaires sont moins découvrables. Le menu doit être un vrai menu accessible (focus clavier, Échap, fermeture au clic extérieur, noms explicites) et non un hamburger décoratif. Éviter de cacher « Mes cartographies » si cette fonction est fréquente.

## Comparatif

| Critère | A — Essentielle | B — Espaces | C — Compacte |
|---|---:|---:|---:|
| Place laissée à la matrice | Très bonne | Moyenne | Excellente |
| Découvrabilité des actions | Très bonne | Très bonne | Moyenne |
| Évolutivité fonctionnelle | Bonne | Excellente | Bonne |
| Coût de changement / risque | Faible à moyen | Moyen | Moyen |
| Usage bureau | Excellent | Excellent | Très bon |
| Usage mobile | Bon avec repli | Correct avec repli | Excellent |

## Recommandation

**Retenir la maquette A**, avec deux idées complémentaires :
1. afficher le nom de la cartographie active de façon discrète, si cela peut être fait sans ajouter une seconde ligne permanente ;
2. reprendre le repli mobile de la maquette C.

Cette option s’appuie sur les contrôles et les comportements existants sans redessiner l’application entière. Elle répond aussi au besoin déjà exprimé de rendre le thème discret, de garder l’aide TOGAF derrière « ? », de libérer l’espace au-dessus de la cartographie et d’éviter un menu burger visuellement dominant.

## Règles UX à respecter lors de l’implémentation

- Ne pas modifier le modèle métier, les relations N0 → N1 → applications, ni le stockage.
- Conserver les actions existantes et leurs gestionnaires ; le travail doit être principalement structurel et CSS.
- Garder un seul bouton primaire visuellement dominant : « + Nouvelle » ou « Sauvegarder » selon l’état réel, sans rendre les deux identiques.
- Utiliser des libellés et des infobulles accessibles ; aucun contrôle essentiel ne doit être une icône seule sans nom accessible.
- Respecter les états désactivés de Annuler/Rétablir.
- Ajouter des tests Cypress sur l’accès à chaque action depuis l’entête, la bascule Cartographie/Analyse d’impact, les menus et le repli responsive.
- Vérifier le build, les tests E2E et le déploiement sous le sous-chemin GitHub Pages.
- Ne pas fusionner cette proposition documentaire avec une refonte fonctionnelle : l’implémentation éventuelle doit être une PR distincte, petite et testée.
