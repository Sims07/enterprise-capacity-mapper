describe('Défilement mobile', () => {
  beforeEach(() => {
    cy.viewport(390, 844);
    cy.visit('/', {
      onBeforeLoad(win) {
        win.localStorage.clear();
      },
    });
  });

  const assertElementCanScroll = (selector: string) => {
    cy.get(selector).should('be.visible').then($element => {
      const element = $element[0];
      expect(element.clientHeight, `${selector} must have a usable height`).to.be.greaterThan(300);
      expect(element.scrollHeight, `${selector} must contain scrollable content`).to.be.greaterThan(element.clientHeight);

      cy.wrap(element).scrollTo('top');
      cy.wrap(element).should($scroller => {
        expect($scroller[0].scrollTop).to.equal(0);
      });
      cy.wrap(element).scrollTo('bottom');
      cy.wrap(element).should($scroller => {
        expect($scroller[0].scrollTop).to.be.greaterThan(0);
      });
      cy.window().its('scrollY').should('equal', 0);
    });
  };

  it('fait défiler le contenu de la cartographie sans faire défiler le document', () => {
    cy.get('[data-testid="nav-cartography"]').click();
    assertElementCanScroll('main');
  });

  it('fait défiler le contenu de la page Analyse sans faire défiler le document', () => {
    cy.get('[data-testid="nav-analysis"]').click();
    assertElementCanScroll('main');
  });

  it('préserve un espace utilisable et le scroll interne de Bibliothèque', () => {
    cy.get('[data-testid="primary-library"]').click();
    cy.get('[data-testid="library-page"]').should('be.visible');
    cy.get('.library-page').should('have.css', 'overflow-y').and('match', /auto|scroll/);
    cy.get('.library-page').then($page => {
      const rect = $page[0].getBoundingClientRect();
      expect(rect.width, 'Bibliothèque must use the available viewport width').to.be.greaterThan(300);
      expect(rect.height, 'Bibliothèque must use the available viewport height').to.be.greaterThan(300);
    });
    assertElementCanScroll('.library-page');
  });
});

export {};
