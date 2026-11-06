# Storybook — catalogue UI et régressions visuelles

Storybook réutilise les composants et les styles réels de l'application. Il ne doit pas contenir de copie HTML/CSS de l'interface : les stories importent le code source de `src/`.

## Démarrage local

Avec Node.js 24 :

```bash
npm install
npm install --prefix storybook-poc
npm run storybook --prefix storybook-poc
```

Ouvrir `http://localhost:6006`. Les contrôles Storybook proposent les thèmes clair et sombre et les viewports téléphone (390×844), tablette (768×1024) et bureau (1440×900).

## Catalogue de composants

Le catalogue applique les vrais styles `src/styles/index.css`, les tokens Signal et les thèmes clair/sombre. Il référence les composants React réels lorsqu'ils existent et les classes de production lorsqu'une commande est encore native dans l'éditeur.

| Rubrique Storybook | Contenu et états couverts | Source de production |
| --- | --- | --- |
| **Design system / Tokens sémantiques** | Surfaces, textes, accents, bordures, statuts, clair/sombre | `src/styles/tokens.css` |
| **Design system / Formulaires** | Texte, recherche, e-mail, URL, nombre, date, couleur, fichier, requis, erreur, désactivé, lecture seule, dropdown, textarea, cases à cocher, boutons radio, switch, formulaire validé | `src/components/ui/Fields.tsx`, `FilePicker.tsx` et styles Signal |
| **Design system / Actions et navigation** | Actions principales/secondaires, boutons icônes, désactivation, onglets, menu outils, cartes de choix, badges métier | `src/components/ui/Button.tsx` et actions métier spécialisées |
| **Design system / Superpositions et messages** | Modale de confirmation, formulaire en modale, Escape, messages neutre/succès/attention/erreur, notification toast | `src/components/ui/Modal.tsx` et styles Signal |
| **Application / Modules métier** | Véritable assistant de création, diagnostics N0/N1 et vue relations sur modèle de démonstration | `src/components/NewMapWizard.tsx`, `Dashboard.tsx`, `CoverageTree.tsx` |
| **Application / Capacity Mapper** | Application complète et navigation Signal, mosaïque, présentation, inventaire SI | `src/adapters/react/ResponsiveApp.tsx` |
| **Application / Compagnon cartographe** | Composant réel et mode sombre | `src/components/CartographerCompanion.tsx` |
| **Application / Guide TOGAF** | Modale d'aide réelle, bureau et mobile | `src/components/TogafGuide.tsx` |

Les démonstrations de formulaire et de menus modifient uniquement l'état React de la story, sans enregistrer de cartographie. Les actions métier nécessitant les services de l'application restent testées dans la story **Capacity Mapper** et la suite E2E applicative, pas simulées comme des sauvegardes réussies.

### Principe d'évolution

- Les champs `Button`, `FilePicker`, `Field`, `SelectField`, `TextareaField`, `CheckboxField`, `SwitchField` et la modale `Modal` sont les primitives réutilisables ; `App.tsx` emploie désormais les mêmes `Field` et `Modal` que le catalogue.
- Ne pas créer une nouvelle variante en CSS figé dans une story : changer les tokens et les composants de production d'abord.
- Documenter les états vide, erreur, désactivé, validation, clavier, mobile et thèmes lorsque c'est applicable.
- Les écrans volumineux (cartographie, couverture, relations et compagnon) restent des composants métier, pas des primitives du design system.

## Tests de régression visuelle

Les tests dédiés se trouvent dans `playwright/storybook/` et utilisent `playwright.storybook.config.ts`, indépendamment de la suite E2E applicative.

```bash
npx playwright install chromium
npx playwright test --config=playwright.storybook.config.ts
```

Les tests capturent quatre références de la cartographie réelle : bureau clair/sombre et mobile 390×844 clair/sombre. Ils contrôlent aussi l'absence de débordement horizontal sur mobile. Deux captures supplémentaires examinent la cartographie unifiée en présentation au format paysage 1600×900, en thèmes clair et sombre ; les PNG sont conservés dans l'artefact `playwright-and-vitest-reports` pour revue du rendu. Une différence de pixels doit être examinée comme une possible régression CSS, pas acceptée automatiquement.

### Première création ou mise à jour des références

Pour initialiser les références après revue du rendu attendu, ou après un changement visuel volontaire :

```bash
npx playwright test --config=playwright.storybook.config.ts --update-snapshots
```

Vérifier visuellement les PNG générés dans `playwright/storybook/__screenshots__/` avant de les committer. Ne jamais lancer `--update-snapshots` comme commande habituelle de CI : cela masquerait les régressions. Si une story ou une capture est modifiée intentionnellement, la PR doit expliquer pourquoi les références changent.

La CI construit Storybook, lance les tests visuels avec Chromium et conserve les rapports Playwright et les captures de diagnostic en artefacts, y compris en cas d'échec.

## Publication

Le build statique est placé dans `dist/storybook/`, sans être importé par le runtime PWA. La CI construit Storybook avec le préfixe `/enterprise-capacity-mapper/storybook/` et l'inclut dans l'artefact GitHub Pages. Après réussite du déploiement, l'URL attendue est `https://sims07.github.io/enterprise-capacity-mapper/storybook/`.

Storybook et les tests visuels complètent Vitest et les parcours E2E existants. Ils ne remplacent pas les tests métier. Les contrôles complémentaires d'accessibilité sont volontairement hors périmètre de cette étape.


### Lecture métier N1

La story « Application / Capacity Mapper » exerce les quatre lectures métier sur le composant réel. Les tests visuels vérifient désormais, sur l'interface réelle en thèmes clair et sombre, la présence des commandes « Lecture métier », le rendu des constats et l'accès direct à la fiche N1. Le mode présentation n'affiche aucune de ces actions d'édition.


La story de l'application vérifie le parcours Cartographie → Diagnostic métier → action de qualification, avec navigation réelle plutôt que captures statiques simulées.


### Attention et décisions — revue visuelle

La story applicative réelle ouvre l'intention « Examiner les points d'attention » en thème clair et sombre. La CI enregistre les captures de ces deux états dans les artefacts Storybook, puis vérifie l'usage des surfaces et bordures issues des tokens du thème, le basculement entre signaux et capacités à qualifier, l'accordéon de référence et la simulation. Ce contrôle visuel cible spécifiquement le rendu HTML brut autrefois présent dans cet écran.


## Fondations d'interaction — lot 1 (novembre 2026)

Les contrôles de production et les stories partagent `src/components/ui/Fields.tsx`, `Modal.tsx`, `src/styles/design-system-controls.css` et les tokens de thème. Les fenêtres conservent le focus dans le dialogue, ferment par Échap et rendent le focus au déclencheur. La présence d'une erreur est communiquée par texte, `aria-invalid` et `aria-describedby`, en plus du contour de couleur. Les thèmes disposent chacun d'un contraste d'erreur explicite.

Les tests `playwright/storybook/component-catalog.visual.spec.ts` doivent rester exécutables en CI. Vérifier manuellement la navigation clavier, la lecture d'écran et le rendu des formulaires à forte densité après toute modification des primitives. Ne pas recopier la maquette en HTML hors des composants de production.

## Lot de cohérence boutons et import de fichiers — novembre 2026

Le catalogue ne doit plus montrer de boutons gris natifs au sein des cartes (ex. déclenchement d'une notification), ni de champ fichier au rendu du navigateur. Les actions standards sont rendues avec la primitive réelle `Button` (`primary`, `secondary`, `quiet`, `danger`, `icon`) ; les surfaces de sélection, onglets et commandes du canevas conservent leur comportement spécialisé.

`FilePicker` est un contrôle d'import **local** associé au même style de commande que `Button`. Il conserve un véritable `input[type=file]` focusable, les attributs `accept`, `disabled` et `onChange` d'origine, l'accès au clavier et l'annonce du nom du fichier sélectionné. Aucun téléchargement vers un serveur n'est introduit. Les deux parcours JSON réels (Outils → Importer depuis JSON et Analyse → Référence JSON) utilisent le même composant. Le champ de référence peut être rechargé et l'import ne modifie pas les règles métier.

Les exemples de boutons, modales, menus, formulaires, notifications et actions de cartographie de Storybook utilisent le composant `Button` au lieu de styliser des actions isolées. La fenêtre `Modal` et l'assistant de création réutilisent également la primitive pour leurs actions standards. Les commandes structurelles de la mosaïque restent des boutons natifs spécialisés, avec les handlers et classes de production existants : leur remplacement arbitraire changerait la géométrie ou les interactions.

### Garde-fous et tests

- Rendu clair/sombre, variantes primaire/secondaire/quiet, focus, états désactivés ; styles fondés sur les tokens Signal dans `src/styles/design-system-controls.css`, non sur des valeurs par story.
- Storybook Playwright : régression du bouton « Déclencher une notification » et de la sélection d'un fichier JSON (clavier, accept, disabled, nom sélectionné).
- Playwright applicatif : parcours existants d'import JSON et de référence JSON conservés.
- Aucun changement de schéma, de PWA, de stockage local ou de géométrie N0/N1 ; GitHub Pages reste statique.
