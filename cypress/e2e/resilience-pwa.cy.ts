describe('Démarrage résilient, migration locale et cycle de vie PWA', () => {
  const MODEL_KEY = 'enterprise-capacity-mapper:model:v3';
  const LOCAL_MAPS_KEY = 'enterprise-capacity-mapper:local-maps:v1';
  const RECENT_MAPS_KEY = 'enterprise-capacity-mapper:recent-maps:v1';
  const ACTIVE_RECENT_MAP_KEY = 'enterprise-capacity-mapper:active-recent-map';

  const visit = (onBeforeLoad: (win: Window) => void): Cypress.Chainable<Window> =>
    cy.visit('/', { onBeforeLoad });

  it('reste navigable si le modèle local est corrompu', () => {
    visit(win => win.localStorage.setItem(MODEL_KEY, '{invalid json'));
    cy.contains('Capacity Mapper').should('be.visible');
    cy.get('.map-filter-bar').should('be.visible');
    cy.get('[data-testid="nav-analysis"]').click();
    cy.get('[data-testid="dashboard-view-overview"]').should('be.visible');
  });

  it('reste navigable si les bibliothèques locales ont une structure invalide', () => {
    visit(win => {
      win.localStorage.setItem(LOCAL_MAPS_KEY, JSON.stringify({ invalid: true }));
      win.localStorage.setItem(RECENT_MAPS_KEY, JSON.stringify({ invalid: true }));
      win.localStorage.setItem(ACTIVE_RECENT_MAP_KEY, '__dismissed__');
    });
    cy.contains('Capacity Mapper').should('be.visible');
    cy.get('[data-testid="primary-library"]').click();
    cy.get('[data-testid="library-page"]').should('be.visible');
    cy.get('[data-testid="saved-maps-count"]').should('contain.text', '0');
    cy.get('[data-testid="recent-maps-count"]').should('contain.text', '0');
  });

  it('migre un modèle legacy vers le schéma actuel', () => {
    visit(win => {
      win.localStorage.removeItem(MODEL_KEY);
      win.localStorage.setItem('ea_canvas_l0', JSON.stringify([
        { id: 'legacy-domain', name: 'Domaine historique', code: 'LEG-0', description: 'Domaine migré', color: 'indigo' }
      ]));
      win.localStorage.setItem('ea_canvas_l1', JSON.stringify([
        { id: 'legacy-cap', name: 'Capacité historique', code: 'LEG-1', description: 'Capacité migrée', l0Id: 'legacy-domain' }
      ]));
      win.localStorage.setItem('ea_canvas_apps', JSON.stringify([
        { id: 'legacy-app', name: 'Application historique', code: 'LEG-APP', type: 'SaaS', status: 'Actif', vendor: 'Legacy', description: 'Application migrée', l1Id: 'legacy-cap' }
      ]));
    });
    cy.contains('.domain h3', 'Domaine historique').should('be.visible');
    cy.contains('.cap h3', 'Capacité historique').should('be.visible');
    cy.window().then(win => {
      const migrated = JSON.parse(win.localStorage.getItem(MODEL_KEY) ?? 'null');
      expect(migrated?.schemaVersion, 'persisted schema version').to.equal(3);
      expect(migrated?.capabilities?.[0]?.domainId).to.equal('legacy-domain');
      expect(migrated?.applications?.[0]?.capabilityIds).to.deep.equal(['legacy-cap']);
    });
  });
});
