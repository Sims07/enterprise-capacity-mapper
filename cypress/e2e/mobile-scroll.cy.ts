describe('Défilement mobile', () => {
  beforeEach(() => {
    cy.viewport(390, 844);
    cy.visit('/', {
      onBeforeLoad(win) {
        win.localStorage.clear();
      },
    });
  });

  const assertPageCanScroll = () => {
    cy.document().its('documentElement.scrollHeight').should('be.greaterThan', 844);
    cy.window().then(win => {
      const before = win.scrollY;
      cy.scrollTo('bottom');
      cy.window().its('scrollY').should('be.greaterThan', before);
    });
  };

  it('permet de faire défiler la cartographie sur mobile', () => {
    cy.get('[data-testid="nav-cartography"]').click();
    cy.get('main').should('be.visible');
    assertPageCanScroll();
  });

  it('permet de faire défiler la page Analyse sur mobile', () => {
    cy.get('[data-testid="nav-analysis"]').click();
    cy.get('main').should('be.visible');
    assertPageCanScroll();
  });
});

export {};
