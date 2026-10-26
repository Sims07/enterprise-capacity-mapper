const visitFresh = () => cy.visit('/', {
  onBeforeLoad(win) {
    win.localStorage.clear();
  },
});

describe('Architecture d’expérience responsive', () => {
  beforeEach(() => {
    cy.on('uncaught:exception', err => { throw err; });
  });

  it('conserve l’expérience desktop sans wrapper mobile', () => {
    cy.viewport(1280, 900);
    visitFresh();

    cy.get('[data-ui-experience="mobile"]').should('not.exist');
    cy.get('[data-testid="nav-cartography"]').should('be.visible');
  });

  it('active explicitement l’adaptateur mobile sous le breakpoint', () => {
    cy.viewport(390, 844);
    visitFresh();

    cy.get('[data-ui-experience="mobile"]')
      .should('be.visible')
      .and('have.class', 'experience-shell--mobile');
    cy.get('[data-testid="nav-cartography"]').should('be.visible');
  });
});

export {};
