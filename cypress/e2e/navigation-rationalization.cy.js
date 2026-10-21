describe('Navigation rationalisée', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('présente une navigation principale sans titres de groupe redondants', () => {
    cy.get('.primary-navigation').should('be.visible');
    cy.get('.primary-navigation > button').should('have.length', 3);
    cy.get('[data-testid="nav-cartography"]').should('contain.text', 'Cartographie');
    cy.get('[data-testid="nav-analysis"]').should('contain.text', 'Analyse');
    cy.get('[data-testid="primary-library"]').should('contain.text', 'Bibliothèque');
    cy.contains('.primary-navigation', 'Construire').should('not.exist');
    cy.contains('.primary-navigation', 'Analyser').should('not.exist');
    cy.contains('.primary-navigation', 'Gérer').should('not.exist');
    cy.get('[data-testid="tools-menu-toggle"]').should('contain.text', 'Outils');
  });

  it('ouvre la bibliothèque depuis la navigation principale', () => {
    cy.get('[data-testid="primary-library"]').click().should('have.class', 'active');
    cy.get('[data-testid="library-page"]').should('be.visible').and('contain.text', 'Bibliothèque');
    cy.get('.modal').should('not.exist');
  });

  it('ouvre Outils comme un espace dédié avec import, export et affichage', () => {
    cy.get('[data-testid="tools-menu-toggle"]').click();
    cy.get('[data-testid="tools-menu"]').should('have.attr', 'open');
    cy.get('[data-testid="export-model"]').should('be.visible');
    cy.get('[data-testid="import-model"]').should('exist');
    cy.get('[data-testid="theme-toggle"]').should('be.visible');
  });

  it('regroupe les vues d’analyse dans une navigation secondaire', () => {
    cy.get('[data-testid="analysis-subnav"]').should('be.visible');
    cy.get('[data-testid="tab-dashboard"]').should('contain.text', "Vue d'ensemble");
    cy.get('[data-testid="tab-relations"]').should('be.visible');
    cy.get('[data-testid="tab-impact"]').should('be.visible');

    cy.get('[data-testid="nav-analysis"]').click().should('have.class', 'active');
    cy.get('[data-testid="tab-dashboard"]').click().should('have.class', 'active');
    cy.get('[data-testid="tab-relations"]').click().should('have.class', 'active');
    cy.get('[data-testid="tab-impact"]').click().should('have.class', 'active');
  });

  it('revient à la cartographie sans perdre les vues d’analyse', () => {
    cy.get('[data-testid="nav-cartography"]').click().should('have.class', 'active');
    cy.get('[data-testid="tab-relations"]').click().should('have.class', 'active');
    cy.get('[data-testid="nav-analysis"]').click().should('have.class', 'active');
    cy.get('[data-testid="tab-impact"]').click().should('have.class', 'active');
  });
});
