describe('Défilement mobile', () => {
  beforeEach(() => {
    cy.viewport(390, 844);
    cy.visit('/', {
      onBeforeLoad(win) {
        win.localStorage.clear();
      },
    });
  });

  const assertMainCanScroll = () => {
    cy.get('main').then($main => {
      const element = $main[0];
      expect(element.scrollHeight).to.be.greaterThan(element.clientHeight);
      element.scrollTop = 0;
      cy.wrap(element).scrollTo('bottom');
      cy.wrap(element).should($scroller => {
        expect($scroller[0].scrollTop).to.be.greaterThan(0);
      });
      cy.window().its('scrollY').should('equal', 0);
    });
  };

  it('fait défiler le contenu de la cartographie sans faire défiler le document', () => {
    cy.get('[data-testid="nav-cartography"]').click();
    cy.get('main').should('be.visible');
    cy.window().its('scrollY').should('equal', 0);
    assertMainCanScroll();
  });

  it('fait défiler le contenu de la page Analyse sans faire défiler le document', () => {
    cy.get('[data-testid="nav-analysis"]').click();
    cy.get('main').should('be.visible');
    cy.window().its('scrollY').should('equal', 0);
    assertMainCanScroll();
  });

  it('préserve un espace utilisable et le scroll interne de Bibliothèque', () => {
    cy.get('[data-testid="primary-library"]').click();
    cy.get('[data-testid="library-page"]').should('be.visible');
    cy.get('main').should('be.visible').then($main => {
      const element = $main[0];
      expect(element.clientHeight).to.be.greaterThan(300);
      expect(element.scrollHeight).to.be.greaterThan(element.clientHeight);
    });
    cy.get('.library-page').should('be.visible').then($page => {
      const rect = $page[0].getBoundingClientRect();
      expect(rect.width).to.be.greaterThan(300);
      expect(rect.height).to.be.greaterThan(300);
    });
    cy.window().its('scrollY').should('equal', 0);
    assertMainCanScroll();
    cy.get('[data-testid="library-page"]').should('be.visible');
  });
});

export {};
