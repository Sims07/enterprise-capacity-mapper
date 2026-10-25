describe('Relations — hover N1 en Dark Linear', () => {
  it('permet le survol de la ligne N1 et de son bouton de libellé en thème sombre', () => {
    cy.viewport(1280, 800);
    cy.visit('/');
    cy.clearLocalStorage();
    cy.window().then(win => {
      win.localStorage.setItem('enterprise-capacity-mapper:theme', 'dark');
    });
    cy.reload();

    cy.get('.app').should('have.class', 'theme-dark');
    cy.get('[data-testid="nav-analysis"]').click();
    cy.get('[data-testid="tab-relations"]').click();
    cy.get('.coverage-tree').should('be.visible');

    cy.get('.tree-node-cap > .tree-row').first()
      .should('be.visible')
      .trigger('mouseover')
      .within(() => {
        cy.get('.tree-toggle')
          .should('be.visible')
          .trigger('mouseover');
        cy.get('.tree-name').should('be.visible');
      });

  });
});

export {};
