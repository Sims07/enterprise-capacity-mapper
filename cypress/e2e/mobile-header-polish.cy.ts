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

  it('garde les quatre entrées de navigation dans le cadre à 390px', () => {
    cy.get('.primary-navigation').then($nav => {
      const nav = $nav[0].getBoundingClientRect();
      expect(nav.left).to.be.at.least(0);
      expect(nav.right).to.be.at.most(390);
      expect(getComputedStyle($nav[0]).gridTemplateColumns.split(/\s+/)).to.have.length(4);
      cy.wrap($nav[0]).children().each($item => {
        const rect = $item[0].getBoundingClientRect();
        expect(rect.left).to.be.at.least(nav.left);
        expect(rect.right).to.be.at.most(nav.right);
      });
    });

    cy.get('[data-testid="tools-menu-toggle"]')
      .should('be.visible')
      .then($toggle => {
        const rect = $toggle[0].getBoundingClientRect();
        expect(rect.left).to.be.at.least(0);
        expect(rect.right).to.be.at.most(390);
      });
  });

  it('déclare une barre de statut iOS opaque alignée sur le header', () => {
    cy.get('meta[name="apple-mobile-web-app-status-bar-style"]')
      .should('have.attr', 'content', 'black');
    cy.get('meta[name="theme-color"]')
      .should('have.attr', 'content', '#0f172a');
  });
});
