describe('Navigation analyse → relations', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.clearLocalStorage();
    cy.reload();
    cy.get('[data-testid="nav-analysis"]').click();
    cy.get('[data-testid="tab-dashboard"]').click();
  });

  it('fait défiler Relations jusqu’à la cible sélectionnée depuis l’analyse', () => {
    cy.viewport(1280, 900);
    cy.get('[data-testid="dashboard-view-coverage"]').click();
    cy.get('.dashboard-map-capability').last().click();
    cy.get('[data-testid="tab-relations"]').should('have.class', 'active');
    cy.get('.tree-row.impact-highlight').should('be.visible').then($target => {
      expect($target.attr('data-navigation-focused')).to.equal('true');
      cy.get('main').should($main => {
        expect($main[0].scrollTop, 'Relations a été défilé jusqu’à la cible').to.be.greaterThan(0);
      });
    });
  });

  it('place le bouton Retour au dashboard en haut à droite de Relations', () => {
    cy.get('[data-testid="dashboard-view-coverage"]').click();
    cy.get('.dashboard-map-capability').first().click();
    cy.get('[data-testid="return-to-dashboard"]').should('be.visible').then($button => {
      const row = $button.parent()[0].getBoundingClientRect();
      const button = $button[0].getBoundingClientRect();
      expect(getComputedStyle($button.parent()[0]).justifyContent).to.equal('flex-end');
      expect(button.right).to.be.closeTo(row.right, 1);
      expect(button.height).to.be.greaterThan(30);
    });
  });
});
