describe('Compagnon cartographe — interface locale', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.clearLocalStorage();
    cy.reload();
  });

  it('ouvre le panneau accessible et affiche les actions de revue disponibles', () => {
    cy.get('[data-testid="companion-launcher"]')
      .should('be.visible')
      .and('have.attr', 'aria-expanded', 'false')
      .click();

    cy.get('[data-testid="companion-panel"]')
      .should('be.visible')
      .and('have.attr', 'role', 'dialog');
    cy.contains('[data-testid="companion-panel"]', 'aucune donnée transmise').should('be.visible');
    cy.get('[data-testid="companion-prompt-overview"]').should('be.visible');
    cy.get('[data-testid="companion-prompt-coverage"]').should('be.visible');
    cy.get('[data-testid="companion-prompt-naming"]').should('be.visible');
    cy.get('[data-testid="companion-prompt-structure"]').should('be.visible');
  });

  it('exécute une revue locale et affiche des constats explicables', () => {
    cy.get('[data-testid="companion-launcher"]').click();
    cy.get('[data-testid="companion-prompt-coverage"]').click();

    cy.get('[data-testid="companion-result"]').should('be.visible');
    cy.get('[data-testid="companion-result-title"]').should('contain.text', 'Résultat de la revue');
    cy.get('[data-testid="companion-result"]').should('contain.text', 'règles locales');
    cy.get('[data-testid="companion-question"]').should('be.visible');
  });

  it('permet de lancer une revue depuis une question et de fermer au clavier', () => {
    cy.get('[data-testid="companion-launcher"]').click();
    cy.get('[data-testid="companion-question"]').type('Où sont les gaps de couverture ?');
    cy.get('[data-testid="companion-submit"]').click();
    cy.get('[data-testid="companion-result"]').should('be.visible');
    cy.get('[data-testid="companion-prompt-coverage"]').should('have.class', 'is-selected');

    cy.get('body').type('{esc}');
    cy.get('[data-testid="companion-panel"]').should('not.exist');
    cy.get('[data-testid="companion-launcher"]').should('have.focus');
  });

  it('reste lisible en thème sombre sans assertion fragile sur les valeurs RGB', () => {
    cy.get('[data-testid="companion-launcher"]').click();
    cy.get('[data-testid="tools-menu-toggle"]').click();
    cy.get('[data-testid="theme-toggle"]').click();

    cy.get('.app.theme-dark .companion-panel').should('be.visible');
    cy.get('.app.theme-dark .companion-panel .companion-heading h2').should('be.visible');
    cy.get('.app.theme-dark .companion-panel .companion-prompt').first().should('be.visible');
    cy.get('.app.theme-dark .companion-panel .companion-composer input').should('be.visible');
  });

  it('ne déborde pas de la fenêtre sur mobile', () => {
    cy.viewport(390, 740);
    cy.get('[data-testid="companion-launcher"]').click();

    cy.get('[data-testid="companion-panel"]').should('be.visible').then(panel => {
      const rect = panel[0].getBoundingClientRect();
      expect(rect.left, 'bord gauche du panneau').to.be.at.least(0);
      expect(rect.right, 'bord droit du panneau').to.be.at.most(390);
      expect(rect.bottom, 'bas du panneau').to.be.at.most(740);
    });
  });
