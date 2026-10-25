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

  it('reste navigable si les listes locales récentes sont corrompues', () => {
    cy.visit('/', {
      onBeforeLoad(win) {
        win.localStorage.setItem('enterprise-capacity-mapper:recent-maps:v1', '{invalid json');
        win.localStorage.setItem('enterprise-capacity-mapper:local-maps:v1', '{invalid json');
      },
    });

    cy.contains('Capacity Mapper').should('be.visible');
    cy.get('[data-testid="tools-menu-toggle"]').click();
    cy.get('[data-testid="tools-menu"]').should('be.visible');
  });
});
