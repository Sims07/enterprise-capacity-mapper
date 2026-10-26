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

      // Use the application's document: Cypress's runner document is separate.
      // Deterministic content avoids depending on whether the screen has user data.
      const testContent = element.ownerDocument.createElement('div');
      testContent.dataset.testid = 'mobile-scroll-test-content';
      testContent.style.height = '1600px';
      testContent.style.minHeight = '1600px';
      testContent.style.flex = '0 0 auto';
      element.appendChild(testContent);

      expect(element.scrollHeight, `${selector} must scroll when content exceeds its viewport`).to.be.greaterThan(element.clientHeight);
    });

    cy.get(selector).scrollTo('top');
    cy.get(selector).should($scroller => {
      expect($scroller[0].scrollTop).to.equal(0);
    });
    cy.get(selector).scrollTo('bottom');
    cy.get(selector).should($scroller => {
      expect($scroller[0].scrollTop).to.be.greaterThan(0);
    });
    cy.window().its('scrollY').should('equal', 0);
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
