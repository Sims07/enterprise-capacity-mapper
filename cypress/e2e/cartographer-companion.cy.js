describe('Compagnon cartographe — interface locale', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.clearLocalStorage();
    cy.reload();
  });

  it('ouvre le panneau accessible et présente les deux modes', () => {
    cy.get('[data-testid="companion-launcher"]')
      .should('be.visible')
      .and('have.attr', 'aria-expanded', 'false')
      .click();

    cy.get('[data-testid="companion-panel"]')
      .should('be.visible')
      .and('have.attr', 'role', 'dialog');
    cy.contains('[data-testid="companion-panel"]', 'aucune donnée transmise').should('be.visible');
    cy.get('[data-testid="companion-mode-guided"]').should('be.visible').and('have.attr', 'aria-pressed', 'true');
    cy.get('[data-testid="companion-mode-conversation"]').should('be.visible').and('have.attr', 'aria-pressed', 'false');
    cy.get('[data-testid="companion-prompt-overview"]').should('be.visible');
    cy.get('[data-testid="companion-prompt-coverage"]').should('be.visible');
    cy.get('[data-testid="companion-prompt-naming"]').should('be.visible');
    cy.get('[data-testid="companion-prompt-structure"]').should('be.visible');
  });

  it('garde les questions guidées accessibles après un contrôle et conserve son résultat', () => {
    cy.get('[data-testid="companion-launcher"]').click();
    cy.get('[data-testid="companion-prompt-coverage"]').click();

    cy.get('[data-testid="companion-chat-history"]').should('be.visible');
    cy.get('[data-testid="companion-exchange"]').should('have.length', 1);
    cy.get('[data-testid="companion-user-question"]').should('contain.text', 'Vérifier la couverture');
    cy.get('[data-testid="companion-answer"]').should('be.visible').and('contain.text', 'revue locale');
    cy.get('[data-testid="companion-prompt-coverage"]').should('be.visible');

    cy.get('[data-testid="companion-prompt-naming"]').click();
    cy.get('[data-testid="companion-exchange"]').should('have.length', 2);
    cy.get('[data-testid="companion-user-question"]').eq(0).should('contain.text', 'Vérifier la couverture');
    cy.get('[data-testid="companion-user-question"]').eq(1).should('contain.text', 'Revoir le nommage métier');
  });

  it('permet de passer du mode guidé au mode conversation sans perdre l’historique', () => {
    cy.get('[data-testid="companion-launcher"]').click();
    cy.get('[data-testid="companion-prompt-coverage"]').click();

    cy.get('[data-testid="companion-mode-conversation"]').click();
    cy.get('[data-testid="companion-mode-conversation"]').should('have.attr', 'aria-pressed', 'true');
    cy.get('[data-testid="companion-prompt-coverage"]').should('not.exist');
    cy.get('[data-testid="companion-question"]').type('Peux-tu revoir le nommage des capacités ?');
    cy.get('[data-testid="companion-submit"]').click();

    cy.get('[data-testid="companion-exchange"]').should('have.length', 2);
    cy.get('[data-testid="companion-user-question"]').eq(1).should('contain.text', 'Peux-tu revoir le nommage des capacités ?');
    cy.get('[data-testid="companion-mode-guided"]').click();
    cy.get('[data-testid="companion-prompt-coverage"]').should('be.visible');
    cy.get('[data-testid="companion-exchange"]').should('have.length', 2);

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
    cy.get('.app.theme-dark .companion-panel .companion-mode-switch').should('be.visible');
    cy.get('.app.theme-dark .companion-panel .companion-composer input').should('not.exist');
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
});
