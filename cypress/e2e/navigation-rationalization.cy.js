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
    cy.get('[data-testid="primary-library"]').click();
    cy.get('.modal').should('be.visible').and('contain.text', 'Mes cartographies');
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
