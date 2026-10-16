describe('Raffinements Outils et Nouvelle cartographie', () => {
  beforeEach(() => {
    cy.on('uncaught:exception', err => { throw err; });
    cy.visit('/');
    cy.clearLocalStorage();
    cy.reload();
  });

  it('ferme Outils lorsqu’on clique ailleurs et avec Echap', () => {
    cy.get('[data-testid="tools-menu-toggle"]').click();
    cy.get('[data-testid="tools-menu"]').should('have.attr', 'open');
    cy.get('.map').click(20, 20);
    cy.get('[data-testid="tools-menu"]').should('not.have.attr', 'open');

    cy.get('[data-testid="tools-menu-toggle"]').click();
    cy.get('[data-testid="tools-menu"]').should('have.attr', 'open');
    cy.get('body').type('{esc}');
    cy.get('[data-testid="tools-menu"]').should('not.have.attr', 'open');
    cy.get('[data-testid="tools-menu-toggle"]').should('have.focus');
  });

  it('utilise un chevron CSS compact au lieu du caractère flèche brut', () => {
    cy.get('[data-testid="tools-menu-toggle"] span[aria-hidden="true"]')
      .should('have.css', 'border-right-style', 'solid')
      .and('have.css', 'border-bottom-style', 'solid')
      .and('have.css', 'font-size', '0px');
  });

  it('garde le wizard Nouvelle cartographie lisible en thème sombre', () => {
    cy.get('[data-testid="theme-toggle"]').click();
    cy.get('.app').should('have.class', 'theme-dark');
    cy.get('[data-testid="tools-menu-toggle"]').click();
    cy.get('[data-testid="new-map-button"]').should('be.visible').click();
    cy.get('.modal.wizard').should('be.visible');

    cy.get('.modal.wizard').should('have.css', 'background-color', 'rgb(23, 26, 33)');
    cy.get('.modal.wizard .field input').first()
      .should('have.css', 'background-color', 'rgb(16, 19, 24)')
      .and('have.css', 'color', 'rgb(243, 244, 246)');
    cy.get('[data-testid="template-matrix"]').should($card => {
      const selected = $card.attr('aria-pressed') === 'true';
      expect(getComputedStyle($card[0]).backgroundColor).to.equal(
        selected ? 'rgb(38, 35, 59)' : 'rgb(29, 33, 43)'
      );
      expect(getComputedStyle($card[0]).borderColor).to.equal(
        selected ? 'rgb(99, 102, 241)' : 'rgb(52, 58, 71)'
      );
    });

    cy.contains('button', 'Suivant').click();
    cy.get('.axis-editor').should('be.visible');
    cy.get('.axis-row input').first()
      .should('have.css', 'background-color', 'rgb(16, 19, 24)')
      .and('have.css', 'color', 'rgb(243, 244, 246)');
    cy.get('[data-testid="wizard-preview"]').should('be.visible');
    cy.get('.pv-cell').first()
      .should('have.css', 'background-color', 'rgb(15, 18, 23)')
      .and('have.css', 'border-color', 'rgb(48, 54, 66)');
  });

  it('expose Présentation dans l’en-tête et Nouvelle cartographie dans Outils', () => {
    cy.get('[data-testid="presentation-toggle"]').should('be.visible').and('have.attr', 'aria-pressed', 'false');
    cy.get('[data-testid="tools-menu"]').should('not.have.attr', 'open');
    cy.get('[data-testid="new-map-button"]').should('not.exist');

    cy.get('[data-testid="presentation-toggle"]').click()
      .should('have.attr', 'aria-pressed', 'true')
      .and('contain.text', 'Quitter la présentation');
    cy.get('[data-testid="presentation-toggle"]').click()
      .should('have.attr', 'aria-pressed', 'false');

    cy.get('[data-testid="tools-menu-toggle"]').click();
    cy.get('[data-testid="new-map-button"]').should('be.visible');
  });

  it('garde les titres des cartes de modèles lisibles en thème clair et sombre', () => {
    cy.get('[data-testid="tools-menu-toggle"]').click();
    cy.get('[data-testid="new-map-button"]').click();
    cy.get('.modal.wizard .template-card > b').first()
      .should('have.css', 'color', 'rgb(31, 41, 55)');
    cy.get('.modal.wizard').should('be.visible');
    cy.get('[data-testid="theme-toggle"]').should('not.exist');
    cy.get('[data-testid="wizard-name"]').should('be.visible');
  });
});
