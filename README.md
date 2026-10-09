# Enterprise Capacity Mapper

Application PWA de cartographie des capacités métier et de leur couverture applicative, inspirée des pratiques de cartographie de capacités TOGAF.

## Fonctionnalités

### Cartographie métier

- **Modèle de capacités** : Domaines N0 → Capacités N1 → Applications, avec une relation application-capacité **N↔N**.
- **Cartographie à un ou deux niveaux** : adaptez la profondeur de la cartographie au besoin de représentation.
- **Création guidée** : assistant pour créer une cartographie et définir ses colonnes et ses lignes (*layers*), ou démarrer avec une cartographie vierge.
- **Édition de la matrice** : création et modification des domaines N0, renommage des capacités N1, gestion et renommage des colonnes et des lignes (*layers*), et personnalisation du nom de chaque zone au croisement.
- **Domaines transverses** : un domaine N0 peut couvrir plusieurs colonnes adjacentes sur une même ligne.
- **Déplacement dans la matrice** : déplacement des domaines par glisser-déposer, avec contrôle des positions disponibles.
- **Contrôle de cohérence** : prévention des chevauchements entre domaines et des étendues qui dépassent les colonnes disponibles, avec retour d'erreur explicite.
- **Analyse de couverture et d'impact** : identification des capacités sollicitées, applications impactées, gaps et redondances.

### Présentation et lecture

- **Thèmes visuels** : choisissez entre les thèmes Classique, Exécutif et Contraste.
- **Densité d'affichage** : basculez entre une présentation confortable et une présentation compacte.
- **Mode présentation** : privilégiez la lecture de la cartographie lors d'une revue ou d'un partage à l'écran.
- **Recherche et filtrage** : retrouvez des domaines à partir de leur nom, code ou description.
- **Impression** : mise en page dédiée à l'impression pour faciliter la diffusion de la cartographie.
- **Préférences mémorisées** : les préférences d'affichage sont conservées localement dans le navigateur.

### Données et fonctionnement

- **PWA** : application installable et utilisable hors ligne après chargement, selon le cache du navigateur.
- **Stockage local** : sauvegarde des modifications dans le navigateur, avec migration automatique des anciennes clés `ea_canvas_*`.
- **Import/export JSON** : export et import d'un format versionné (`schemaVersion: 2)) pour sauvegarder, archiver ou partager une cartographie.
- **Sans backend** : application statique compatible GitHub Pages.
- **Déploiement automatisé** : GitHub Actions construit l'application et la publie sur GitHub Pages.

## Utiliser l'application

### Créer ou ouvrir une cartographie

1. Ouvrez l'application depuis GitHub Pages ou lancez-la localement (voir [Développement local](#développement-local)).
2. Utilisez l'assistant de création pour nommer la cartographie, choisir une profondeur à un ou deux niveaux et définir ses colonnes et ses lignes (*layers*). Vous pouvez créer une cartographie vierge, puis ajouter les domaines au fur et à mesure.
3. Dans la matrice, utilisez **Ajouter un domaine ici** dans la cellule souhaitée pour créer un domaine N0 à cet emplacement.
4. Renseignez les champs obligatoires signalés dans le formulaire, puis enregistrez. Pour modifier un domaine par la suite, utilisez son action **Modifier**.

### Présenter et rechercher dans la cartographie

- Utilisez le sélecteur de thème pour passer entre les vues **Classique**, **Exécutif** et **Contraste**.
- Choisissez une densité **Confortable** ou **Compacte** selon le niveau de détail et la taille de l'écran.
- Activez le **mode présentation** pour mettre l'accent sur la matrice.
- Utilisez le filtre pour rechercher un domaine par nom, code ou description.
- Utilisez la fonction d'impression du navigateur pour imprimer ou enregistrer la cartographie en PDF.

### Faire couvrir plusieurs colonnes à un domaine N0

Cette fonction sert à représenter visuellement un domaine transverse qui concerne plusieurs colonnes adjacentes de la cartographie. Elle modifie la présentation et le positionnement du **domaine N0** ; elle ne fusionne pas les capacités N1 ni les applications associées.

1. Dans la matrice, ouvrez **Modifier** sur le domaine N0 concerné.
2. Choisissez la **Colonne** de départ et la **Ligne (layer)** où le domaine doit apparaître.
3. Dans **Étendue sur les colonnes**, choisissez le nombre de colonnes adjacentes que le domaine doit couvrir. La liste est limitée aux colonnes disponibles à partir de la colonne de départ.
4. Cliquez sur **Enregistrer**. Le domaine s'étend visuellement sur le nombre de colonnes choisi ; les cellules couvertes ne sont pas affichées séparément sur cette ligne.
5. Pour réduire ou augmenter cette étendue plus tard, revenez dans **Modifier** et choisissez une nouvelle valeur.

**Règles de placement :**

- L'étendue porte sur des colonnes adjacentes, à partir de la colonne de départ.
- Un domaine ne peut pas dépasser la dernière colonne de la matrice.
- Deux domaines ne peuvent pas se chevaucher sur la même ligne (*layer*). Si le placement ou l'étendue provoque un chevauchement, l'enregistrement est refusé et un message d'erreur est affiché.
- Lors d'un déplacement par glisser-déposer, l'application vérifie également que la nouvelle position est disponible.
- Les domaines existants qui ne définissent pas d'étendue utilisent une valeur de **1 colonne** par défaut : les cartographies JSON existantes restent donc compatibles.

### Capacités et applications

- Les capacités N1 restent rattachées à leur domaine N0.
- Une application peut être associée à plusieurs capacités, et une capacité peut être couverte par plusieurs applications.
- L'étendue multi-colonnes ne change pas ces associations : elle concerne uniquement la représentation du domaine dans la matrice.

### Sauvegarder et partager les données

- Les modifications sont conservées dans le stockage local du navigateur.
- Utilisez l'import/export JSON pour sauvegarder une cartographie, l'archiver ou la partager.
- Pour transférer une cartographie vers un autre navigateur ou poste, exportez le JSON puis importez-le dans l'autre environnement.
- Les préférences d'affichage sont également mémorisées localement.
- La disponibilité hors ligne dépend du chargement préalable de l'application et du cache PWA du navigateur.

## Développement local

```bash
npm install
npm run dev
```

Production :

```bash
npm run build
npm run preview
```

Pour vérifier les parcours automatisés :

```bash
npm run test:e2e
```

## Données

Le modèle est stocké sous la clé `enterprise-capacity-mapper:model:v2`.

L'étendue d'un domaine est enregistrée dans `layout.columnSpan` (nombre de colonnes, avec une valeur par défaut de `1`). Les informations de position sont conservées dans `layout.columnId` et `layout.layerId`.

Le JSON exporté peut être versionné dans un dépôt GitHub ou partagé entre environnements. L'application ne met volontairement **aucun token GitHub permanent dans le navigateur** : une écriture authentifiée dans un dépôt devra passer par un mécanisme d'authentification explicite ou un backend de confiance.

## GitHub Pages

Le workflow `.github/workflows/deploy-pages.yml` construit automatiquement l'application à chaque push sur `main`.

Dans GitHub : **Settings → Pages → Source: GitHub Actions**.

## Évolutions envisagées

1. Provider de stockage interchangeable (LocalStorage / IndexedDB / JSON distant).
2. Configuration d'une source JSON publique dans un dépôt.
3. Authentification GitHub explicite pour le mode collaboratif.
4. Tests du modèle et de l'analyse d'impact.
5. Versionnement/migrations de schéma supplémentaires.

## Licence

MIT.
