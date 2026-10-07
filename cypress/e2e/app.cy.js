describe('Application smoke test', () => {
  it('charge correctement l’application', () => {
    cy.visit('/');
    cy.contains('Capacity Mapper').should('be.visible');
    cy.contains('Cartographie des capacités').should('be.visible');
    cy.get('#root').should('not.be.empty');
  });
});
