# Parcours guidés : risques et processus métier

Les vues **Analyse → Analyser les risques** et **Analyse → Processus métier** utilisent un point d'entrée commun : une **prochaine action** contextualisée, suivie d'une liste de travail et d'outils d'exploration facultatifs.

## Analyser les risques : par où commencer ?

1. L'encart **Pour commencer** recommande une application réelle à examiner, dans l'ordre : risque élevé/critique actionnable, échéance dépassée actionnable, puis application encore à qualifier. Aucune action fictive n'est proposée si toutes les applications ont été revues.
2. **Commencer par cette application** ouvre directement l'éditeur du risque principal de l'application. Saisissez une catégorie et la probabilité + l'impact métier ensemble (1 à 5 chacun), puis choisissez la décision et son suivi.
3. Les raccourcis **Risques élevés**, **À qualifier**, **Échéances dépassées**, **Acceptés** filtrent le registre ; **Tout afficher** enlève aussi la recherche et le filtre de domaine. Le filtre « Afficher les risques » propose toujours les statuts détaillés.
4. Les applications et leurs capacités sont visibles dans le registre ; **Explorer les domaines** et **Exposition des capacités N1** sont des approfondissements repliés par défaut.

Les alertes de fin de support restent indépendantes du score déclaré. **Accepté** ne signifie pas **résolu** et une acceptation conserve l'exposition ; l'échéance de réexamen ramène une acceptation expirée dans les risques à traiter. Une application non évaluée reste « À qualifier » : cela ne signifie pas « sans risque ». La vue représente le **risque principal d'une application actuelle**, pas une mesure exhaustive de cybersécurité, de continuité ou des vulnérabilités.

## Processus métier : par où commencer ?

1. Sans processus, cliquez **Ajouter un processus**. Décrivez ce que fait le métier, puis cochez les capacités N1 (ou les domaines N0 dans une carte à un seul niveau).
2. S'il existe un processus sans capacité, **Relier ses capacités** ouvre directement sa fiche. Les processus non reliés apparaissent en premier et restent visibles dans le filtre **À relier aux capacités**.
3. Sinon, si un processus est indirectement exposé à un risque applicatif élevé/critique, **Examiner les risques liés** ouvre l'analyse des risques. Cette relation provient des capacités : elle **ne prouve pas** que le processus emploie directement une application, ni qu'il est couvert fonctionnellement.
4. Les filtres **Tous / À relier / Exposition indirecte élevée** restent synchronisés avec le filtre détaillé du registre. Une fois les rattachements enregistrés, les applications actuelles et cibles liées aux capacités sont déduites automatiquement.

Les formulaires, statuts et calculs existants ne sont pas modifiés ; ce changement vise uniquement la lisibilité, l'ordre des tâches et la réduction de la charge cognitive. Toutes les données restent locales et exportables comme auparavant (PWA GitHub Pages, sans service supplémentaire).

## Vérification

- E2E Playwright : `playwright/e2e/guided-analysis.spec.ts` (priorité de risque, filtres synchronisés, ouverture des fiches, création/rattachement processus, mobile sans débordement).
- Non-régression : `playwright/e2e/regression.spec.ts` (états de risque, export, suppression des processus, données persistées et sous-chemin GitHub Pages).
