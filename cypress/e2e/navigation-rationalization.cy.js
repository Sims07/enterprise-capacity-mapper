describe('Navigation rationalisée', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('expose les quatre responsabilités principales sans supprimer les parcours existants', () => {
    cy.get('.toolbar-switch').should('be.visible');
    cy.get('.toolbar-switch').should('contain.text', 'Construire');
    cy.get('.toolbar-switch').should('contain.text', 'Analyser');
    cy.get('.toolbar-switch').should('contain.text', 'Gérer');
    cy.get('.toolbar-switch').find('[data-testid="tab-dashboard"]').should('be.visible').and('contain.text', 'Analyse');
    cy.get('.toolbar-switch').find('[data-testid="tab-relations"]').should('be.visible');
    cy.get('.toolbar-switch').find('[data-testid="tab-impact"]').should('be.visible');
    cy.get('[data-testid="primary-library"]').should('be.visible').and('contain.text', 'Bibliothèque');
  });

  it('ouvre la bibliothèque depuis la navigation principale', () => {
    cy.get('[data-testid="primary-library"]').click();
    cy.get('.modal').should('be.visible');
  });

  it('conserve les accès directs Analyse, Relations et Impact', () => {
    cy.get('[data-testid="tab-dashboard"]').click();
    cy.get('[data-testid="tab-dashboard"]').should('have.class', 'active');

    cy.get('[data-testid="tab-relations"]').click();
    cy.get('[data-testid="tab-relations"]').should('have.class', 'active');

    cy.get('[data-testid="tab-impact"]').click();
    cy.get('[data-testid="tab-impact"]').should('have.class', 'active');
  });
});
