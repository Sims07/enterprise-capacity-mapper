describe('Polissage tactile mobile', () => {
  beforeEach(() => {
    cy.viewport(390, 844);
    cy.visit('/', {
      onBeforeLoad(win) {
        win.localStorage.clear();
      },
    });
  });

  it('présente des contrôles de navigation suffisamment grands au toucher', () => {
    cy.get('.primary-navigation > [data-testid="nav-cartography"]')
      .should('be.visible')
      .then($button => {
        expect($button[0].getBoundingClientRect().height).to.be.at.least(42);
      });

    cy.get('.primary-navigation > [data-testid="nav-analysis"]')
      .should('be.visible')
      .then($button => {
        expect($button[0].getBoundingClientRect().height).to.be.at.least(42);
      });

    cy.get('.workspace > aside .search')
      .should('be.visible')
      .and('have.css', 'font-size', '16px');
  });

  it('affiche la fenêtre Structure comme une feuille mobile qui reste dans le viewport', () => {
    cy.get('.canvas-actions').contains('Structure').click();

    cy.get('[role="dialog"]').should('be.visible').then($dialog => {
      const dialog = $dialog[0];
      const rect = dialog.getBoundingClientRect();
      const style = getComputedStyle(dialog);

      expect(rect.width, 'dialog width should fit the phone viewport').to.be.closeTo(window.innerWidth, 1);
      expect(rect.left, 'dialog should align with the viewport edge').to.be.closeTo(0, 1);
      expect(rect.bottom, 'dialog should not extend below the layout viewport').to.be.at.most(window.innerHeight + 1);
      expect(rect.top, 'dialog should have a visible portion').to.be.greaterThan(0);
      expect(style.borderTopLeftRadius).to.equal('18px');
    });

    cy.get('[role="dialog"] input').first().should('have.css', 'font-size', '16px');
    cy.document().should(doc => {
      expect(doc.documentElement.scrollWidth).to.be.at.most(doc.documentElement.clientWidth);
    });
  });

  it('ouvre le compagnon dans une surface adaptée à la hauteur du téléphone', () => {
    cy.get('.companion-launcher').should('be.visible').click();
    cy.get('.companion-panel').should('be.visible').then($panel => {
      const rect = $panel[0].getBoundingClientRect();
      expect(rect.width).to.be.closeTo(window.innerWidth, 1);
      expect(rect.top).to.be.at.most(1);
      expect(rect.bottom).to.be.closeTo(window.innerHeight, 1);
    });
    cy.get('.companion-close').should('be.visible');
  });
});

export {};
