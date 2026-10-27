describe('Mobile header polish', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('affiche Outils sous forme d’icône à 390px', () => {
    cy.viewport(390, 844);
    cy.get('[data-testid="tools-menu-toggle"]')
      .should('be.visible')
      .and('contain.text', 'Outils')
      .then($toggle => {
        expect(window.getComputedStyle($toggle[0], '::before').content).to.eq('"🔧"');
        expect(window.getComputedStyle($toggle[0], '::after').content).to.eq('none');
      });
    cy.get('[data-testid="tools-menu-toggle"] > span[aria-hidden="true"]')
      .should('not.be.visible');

    cy.get('[data-testid="tools-menu-toggle"]').click();
    cy.get('[data-testid="tools-menu"]').should('have.class', 'is-open');
  });

  it('affiche aussi l’icône Outils à 600px', () => {
    cy.viewport(600, 900);
    cy.get('[data-testid="tools-menu-toggle"]')
      .should('be.visible')
      .then($toggle => {
        expect(window.getComputedStyle($toggle[0], '::before').content).to.eq('"🔧"');
        expect(window.getComputedStyle($toggle[0], '::after').content).to.eq('none');
      });
  });

  it('conserve le menu Outils fonctionnel', () => {
    cy.viewport(390, 844);
    cy.get('[data-testid="tools-menu-toggle"]').click();
    cy.get('[data-testid="tools-menu"]').should('have.class', 'is-open');
  });

  it('déclare une barre de statut iOS opaque alignée sur le header', () => {
    cy.viewport(390, 844);
    cy.get('meta[name="apple-mobile-web-app-status-bar-style"]')
      .should('have.attr', 'content', 'black');
    cy.get('meta[name="theme-color"]')
      .should('have.attr', 'content', '#0f172a');
  });
});
