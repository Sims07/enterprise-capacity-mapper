describe('Défilement mobile', () => {
  beforeEach(() => {
    cy.viewport(390, 844);
    cy.visit('/', {
      onBeforeLoad(win) {
        win.localStorage.clear();
      },
    });
  });

  it('permet de faire défiler la cartographie sur mobile', () => {
    cy.get('[data-testid="nav-mapping"]').click();
    cy.get('main').should('be.visible');
    cy.get('main').should($main => {
      expect($main[0].scrollHeight).to.be.greaterThan($main[0].clientHeight);
    });
    cy.window().then(win => {
      const before = win.scrollY;
      cy.get('main').scrollTo('bottom');
      cy.window().its('scrollY').should('be.greaterThan', before);
    });
  });

  it('permet de faire défiler la page Analyse sur mobile', () => {
    cy.get('[data-testid="nav-analysis"]').click();
    cy.get('main').should('be.visible');
    cy.window().then(win => {
      const before = win.scrollY;
      cy.get('main').scrollTo('bottom');
      cy.window().its('scrollY').should('be.greaterThan', before);
    });
  });
});

export {};
