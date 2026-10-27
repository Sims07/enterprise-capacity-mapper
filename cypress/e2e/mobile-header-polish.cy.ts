describe('Mobile header polish', () => {
  beforeEach(() => {
    cy.viewport(390, 844);
    cy.visit('/');
  });

  it('affiche uniquement l’icône Outils sur mobile étroit', () => {
    cy.get('[data-testid="tools-menu-toggle"] > span[aria-hidden="true"]')
      .should('not.be.visible');

    cy.get('[data-testid="tools-menu-toggle"]')
      .should('be.visible')
      .and('contain.text', 'Outils')
      .then($toggle => {
        const before = window.getComputedStyle($toggle[0], '::before');
        const after = window.getComputedStyle($toggle[0], '::after');
        expect(before.content).to.match(/🔧/);
        expect(after.content).to.eq('none');
      });

    cy.get('[data-testid="tools-menu-toggle"]').click();
    cy.get('[data-testid="tools-menu"]').should('have.class', 'is-open');
  });

  it('déclare une barre de statut iOS opaque alignée sur le header', () => {
    cy.get('meta[name="apple-mobile-web-app-status-bar-style"]')
      .should('have.attr', 'content', 'black');
    cy.get('meta[name="theme-color"]')
      .should('have.attr', 'content', '#0f172a');
  });
});
