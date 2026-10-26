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
      const before = element.scrollTop;
      cy.wrap(element).scrollTo('bottom');
      cy.wrap(element).should($scroller => {
        expect($scroller[0].scrollTop).to.be.greaterThan(before);
      });
    });
  };

  it('fait défiler le contenu de la cartographie sans faire défiler le document', () => {
    cy.get('[data-testid="nav-cartography"]').click();
    cy.get('main').should('be.visible');
    cy.window().its('scrollY').should('equal', 0);
    cy.get('main').then($main => {
      expect($main[0].scrollHeight).to.be.greaterThan($main[0].clientHeight);
    });
    assertMainCanScroll();
    cy.window().its('scrollY').should('equal', 0);
  });

  it('fait défiler le contenu de la page Analyse sans faire défiler le document', () => {
    cy.get('[data-testid="nav-analysis"]').click();
    cy.get('main').should('be.visible');
    cy.window().its('scrollY').should('equal', 0);
    assertMainCanScroll();
    cy.window().its('scrollY').should('equal', 0);
  });
});

export {};
