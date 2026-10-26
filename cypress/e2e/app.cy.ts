const visitFresh = (path = '/') => cy.visit(path, {
  onBeforeLoad(win) {
    win.localStorage.clear();
  },
});

const assertNoHorizontalPageOverflow = () => {
  cy.document().should(doc => {
    expect(doc.documentElement.scrollWidth).to.be.at.most(doc.documentElement.clientWidth);
  });
};

describe('Smoke tests — application et navigation', () => {
  beforeEach(() => {
    cy.on('uncaught:exception', err => { throw err; });
  });

  it('charge la cartographie à la racine sans erreur de mise en page', () => {
    visitFresh();
    cy.contains('Capacity Mapper').should('be.visible');
    cy.get('.map-filter-bar').should('be.visible');
    cy.get('[data-testid="nav-cartography"]').should('be.visible');
    assertNoHorizontalPageOverflow();
  });

  it('sert l’application sous le chemin GitHub Pages', () => {
    visitFresh('/enterprise-capacity-mapper/');
    cy.contains('Capacity Mapper').should('be.visible');
    cy.get('.map-filter-bar').should('be.visible');
    assertNoHorizontalPageOverflow();
  });

  it('affiche les principales vues d’analyse sans erreur de rendu', () => {
    visitFresh();
    cy.get('[data-testid="nav-analysis"]').click();

    cy.get('[data-testid="dashboard-view-overview"]').should('be.visible').click();
    cy.get('[data-testid="dashboard-view-impact"]').should('be.visible').click();
    cy.get('[data-testid="impact-view"]').should('be.visible');

    cy.get('[data-testid="tab-relations"]').click();
    cy.get('.coverage-tree').should('be.visible');
  });

  it('reste utilisable sur mobile avec une navigation tactile compacte et un canevas horizontal isolé', () => {
    cy.viewport(390, 844);
    visitFresh();
    cy.contains('Capacity Mapper').should('be.visible');
    cy.get('.map-filter-bar').should('be.visible');
    assertNoHorizontalPageOverflow();

    cy.get('header').then($header => {
      expect($header[0].getBoundingClientRect().height).to.be.lessThan(190);
    });
    cy.get('.primary-navigation').should('be.visible').then($nav => {
      const buttons = $nav.find('button');
      expect(buttons.length).to.equal(3);
      const tops = [...buttons].map(button => button.getBoundingClientRect().top);
      expect(Math.max(...tops) - Math.min(...tops)).to.be.lessThan(1);
    });
    cy.get('.toolbar-actions').should('be.visible');
    cy.get('[data-testid="undo-button"]').should('have.css', 'min-height', '42px');
    cy.get('[data-testid="presentation-toggle"]').should('be.visible');

    cy.get('.map-matrix').should('be.visible').then($map => {
      const element = $map[0];
      expect(element.scrollWidth).to.be.at.least(element.clientWidth);
      expect(getComputedStyle(element).overflowX).to.match(/auto|scroll/);
    });
    assertNoHorizontalPageOverflow();
  });

  it('expose le support PWA dans le navigateur', () => {
    visitFresh();
    cy.window().its('navigator.serviceWorker').should('exist');
  });
});

export {};
