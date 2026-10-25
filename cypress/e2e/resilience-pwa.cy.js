describe('Smoke tests — démarrage résilient', () => {
  it('reste navigable si le modèle local est corrompu', () => {
    cy.visit('/', {
      onBeforeLoad(win) {
        win.localStorage.setItem('enterprise-capacity-mapper:model:v3', '{invalid json');
      },
    });

    cy.contains('Capacity Mapper').should('be.visible');
    cy.get('.map-filter-bar').should('be.visible');
    cy.get('[data-testid="nav-analysis"]').click();
    cy.get('[data-testid="dashboard-view-overview"]').should('be.visible');
  });

  it('reste navigable si les bibliothèques locales ont une structure invalide', () => {
    cy.visit('/', {
      onBeforeLoad(win) {
        win.localStorage.setItem('enterprise-capacity-mapper:local-maps:v1', JSON.stringify({ invalid: true }));
        win.localStorage.setItem('enterprise-capacity-mapper:recent-maps:v1', JSON.stringify({ invalid: true }));
        win.localStorage.setItem('enterprise-capacity-mapper:active-recent-map', '__dismissed__');
      },
    });

    cy.contains('Capacity Mapper').should('be.visible');
    cy.get('[data-testid="primary-library"]').click();
    cy.get('[data-testid="library-page"]').should('be.visible');
    cy.get('[data-testid="saved-maps-count"]').should('contain.text', '0');
    cy.get('[data-testid="recent-maps-count"]').should('contain.text', '0');
  });
});
