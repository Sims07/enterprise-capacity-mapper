# Rapport PDF d'architecture d'entreprise

Le menu **Outils → Générer un rapport PDF** ouvre une prévisualisation du dossier d'architecture construit à partir du modèle actif. **Imprimer / Enregistrer en PDF** utilise l'impression du navigateur, en sélectionnant « Enregistrer au format PDF » (Safari, Chrome ou Edge). Le document se compose en **A4 paysage**, indépendamment de l'impression 16:9 du mode présentation.

## Contenu

1. Page de garde et synthèse exécutive : N0, N1, applications, processus et constats documentés.
2. Quatre vues cartographiques : Carte, Couverture fonctionnelle, Maturité et Écarts. La structure par pistes, les étendues horizontales/verticales et les sous-rangées de domaines sont conservées ; les vues de cartes volumineuses sont distribuées sur plusieurs pages. Les cartes sont un aperçu : les annexes garantissent la restitution exhaustive des données.
3. Couverture : applications actuelles, absence de rattachement actuel, multiplicité de rattachements, et **couverture fonctionnelle déclarée** (séparée).
4. Écarts et maturité : signaux du domaine, maturité actuelle/cible quand saisies et couverture à qualifier.
5. Risques : applications actuelles, niveau, catégorie, responsabilité, échéances, justification et actions déjà déclarées.
6. Processus métier : capacités rattachées, applications indirectement associées, exposition élevée/critique et défauts de support.
7. Registre des actions et points à qualifier : écarts à instruire, actions et responsables enregistrés, décisions manquantes explicitement à définir.
8. Annexes A–D : inventaires des domaines, capacités, applications et relations actuelles/cibles.

Le rapport est **lecture seule** : aucun calcul n'enregistre de nouvelles évaluations. Une application cible ne constitue pas un support actuel. Un rattachement applicatif ne démontre pas une couverture fonctionnelle. L'exposition des processus est **indirecte**, déduite de leurs capacités, et ne prouve pas leur utilisation applicative. Les données manquantes sont marquées « À évaluer » / « À qualifier ». Les observations ne sont pas des priorités ou des décisions inventées.

## Architecture technique

- Couche application : src/application/architectureReport.ts — snapshot de rapport, analyses réutilisées du domaine, projections des pistes et pagination (aucune API navigateur).
- Couche présentation : src/components/ArchitectureReport.tsx — composition en sections, vues et tableaux imprimables ; aucune mutation de données.
- Style : src/styles/architecture-report.css — design system Signal à l'écran et sortie papier A4 avec @page, séparée des styles PDF de présentation.
- Aucune nouvelle dépendance, aucun stockage distant ni service : compatible GitHub Pages/PWA après mise en cache.
- Les très longs textes peuvent nécessiter des pages supplémentaires lors de l'impression pour rester complets. Utiliser **Impression → Arrière-plans** si le navigateur n'active pas les couleurs par défaut.

## Vérifications

- src/application/architectureReport.test.ts : distinction actuel/cible, couverture fonctionnelle, maturité, risque, absence de mutation, carto N0, spans et pagination.
- playwright/e2e/architecture-report.spec.ts : parcours Outils → Rapport, quatre vues et annexes, vérification du fichier PDF réel (en-tête, MediaBox A4 paysage, nombre de pages, contenu via Poppler lorsque disponible), retour au mode édition.
- La CI existante exécute Vitest, typecheck, build PWA et les tests navigateur Playwright.

Le fichier PDF est créé par la fonction d'impression native du navigateur. Le bouton n'écrit pas un binaire sur disque sans interaction utilisateur, ce qui respecte le fonctionnement local des PWA et permet l'enregistrement PDF sur Safari/macOS.
