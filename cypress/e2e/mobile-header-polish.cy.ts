describe('Mobile header polish', () => {
  beforeEach(() => {
    cy.viewport(390, 844);
    cy.visit('/');
  });

  it('affiche un chevron CSS propre pour le menu Outils sans le caractère flèche', () => {
    cy.get('[data-testid="tools-menu-toggle"] > span[aria-hidden="true"]')
      .should('not.be.visible');

    cy.get('[data-testid="tools-menu-toggle"]')
      .should('be.visible')
      .then($toggle => {
        const after = window.getComputedStyle($toggle[0], '::after');
        expect(after.content).to.eq('""');
        expect(after.width).to.eq('7px');
        expect(after.height).to.eq('7px');
      });

    cy.get('[data-testid="tools-menu-toggle"]').click();
    cy.get('[data-testid="tools-menu"]').should('have.class', 'is-open');

    cy.get('[data-testid="tools-menu-toggle"]').then($toggle => {
      const after = window.getComputedStyle($toggle[0], '::after');
      expect(after.transform).to.not.eq('none');
    });
  });

  it('déclare une barre de statut iOS opaque alignée sur le header', () => {
    cy.get('meta[name="apple-mobile-web-app-status-bar-style"]')
      .should('have.attr', 'content', 'black');
    cy.get('meta[name="theme-color"]')
      .should('have.attr', 'content', '#0f172a');
  });
});
