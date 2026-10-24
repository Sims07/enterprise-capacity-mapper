# Checklist de migration

À copier dans une issue ou une PR de migration.

## Cadrage

- [ ] Technologie source identifiée
- [ ] Technologie cible identifiée
- [ ] Motivation documentée
- [ ] Périmètre / hors périmètre définis
- [ ] ADR créé ou mis à jour
- [ ] Stratégie de rollback définie

## Référence avant migration

- [ ] Build vert
- [ ] Tests unitaires verts
- [ ] Cypress vert
- [ ] Cartographie fixture représentative disponible
- [ ] Export de référence disponible
- [ ] Parcours profondeur 1 vérifié
- [ ] Parcours profondeur 2 vérifié
- [ ] Import/export vérifié
- [ ] Relations vérifiées
- [ ] Bibliothèque locale vérifiée
- [ ] Dark mode vérifié
- [ ] GitHub Pages base path vérifié
- [ ] PWA/offline vérifié si dans le périmètre

## Architecture

- [ ] Dépendances plateforme inventoriées
- [ ] Contrat du modèle identifié
- [ ] Contrats storage/file/remote/AI/runtime identifiés
- [ ] Couplages directs UI → plateforme recensés
- [ ] Aucune règle métier nouvelle ne dépend du runtime cible par accident

## Migration des données

- [ ] Fixtures historiques identifiées
- [ ] Migration de schéma explicitement versionnée
- [ ] Validation après migration
- [ ] IDs conservés
- [ ] Export post-migration comparé sémantiquement
- [ ] Cas de données invalides testé
- [ ] Rollback / conservation de l'ancien format documenté

## Tests

- [ ] Tests du noyau
- [ ] Tests des adaptateurs
- [ ] Tests E2E des parcours critiques
- [ ] Tests d'acceptance indépendants des détails React
- [ ] Tests de migration de données
- [ ] Tests spécifiques nouvelle plateforme
- [ ] Aucun test fragile sur RGB/RGBA ou sérialisation CSS accidentelle

## Runtime hôte ou environnement desktop, si applicable

- [ ] Interface isolée des privilèges du runtime hôte
- [ ] API d'accès aux capacités natives minimale et documentée
- [ ] Aucun accès système arbitraire depuis l'interface
- [ ] Entrées des appels inter-processus ou API hôte validées
- [ ] Accès aux fichiers derrière une API contrôlée
- [ ] Secrets absents du code exécuté côté interface
- [ ] Installation / mise à jour testées
- [ ] Fonctionnement hors ligne vérifié

## Finalisation

- [ ] Documentation d'architecture mise à jour
- [ ] ADR mis à jour
- [ ] README mis à jour si nécessaire
- [ ] Limitations connues documentées
- [ ] Rollback documenté
- [ ] Ancien adaptateur conservé jusqu'à validation complète
- [ ] PR prête pour revue
- [ ] Aucun merge sans autorisation explicite du propriétaire
