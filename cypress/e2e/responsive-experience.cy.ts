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

    cy.get('[data-ui-experience="desktop"]').should('be.visible');
    cy.get('[data-testid="nav-cartography"]').should('be.visible');
  });

  it('active explicitement l’adaptateur mobile sous le breakpoint', () => {
    cy.viewport(390, 844);
    visitFresh();

    cy.get('[data-ui-experience="mobile"]')
      .should('be.visible')
      .and('have.class', 'app');
    cy.get('[data-testid="nav-cartography"]').should('be.visible');
  });

  it('bascule entre les adaptateurs sans laisser le wrapper mobile contaminer le desktop', () => {
    cy.viewport(1280, 900);
    visitFresh();
    cy.get('[data-ui-experience="desktop"]').should('be.visible');

    cy.viewport(390, 844);
    cy.get('[data-ui-experience="mobile"]').should('be.visible');

    cy.viewport(1280, 900);
    cy.get('[data-ui-experience="desktop"]').should('be.visible');
    cy.get('[data-testid="nav-cartography"]').should('be.visible');
  });
});

export {};
