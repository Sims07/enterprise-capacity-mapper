describe('Nouvelle cartographie — thème', () => {
  beforeEach(() => {
    cy.on('uncaught:exception', (err) => { throw err; });
  });

  it('conserve toutes les surfaces du wizard en dark Linear', () => {
    cy.visit('/');
    cy.clearLocalStorage();
    cy.reload();

    cy.get('[data-testid="tools-menu"]').then($menu => { if (!$menu.attr('open')) cy.get('[data-testid="tools-menu-toggle"]').click(); });
    cy.get('[data-testid="theme-toggle"]').then($toggle => {
      if (!$toggle.closest('.app').hasClass('theme-dark')) cy.wrap($toggle).click();
    });
    cy.get('.app').should('have.class', 'theme-dark');
    cy.get('[data-testid="tools-menu"]').then($menu => { if (!$menu.attr('open')) cy.get('[data-testid="tools-menu-toggle"]').click(); });
    cy.get('[data-testid="new-map-button"]').click();
    cy.get('.modal.wizard').should('be.visible');

    cy.get('.modal.wizard').should('have.css', 'background-color', 'rgb(23, 26, 33)');
    cy.get('.wizard-steps').should('have.css', 'background-color', 'rgb(17, 19, 24)');
    // Les cartes ont deux surfaces valides : neutre si non sélectionnée, indigo si active.
    ['template-matrix', 'template-blank'].forEach(id => {
      cy.get(`[data-testid="${id}"]`).should($card => {
        const selected = $card.attr('aria-pressed') === 'true';
        expect(getComputedStyle($card[0]).backgroundColor).to.equal(
          selected ? 'rgb(38, 35, 59)' : 'rgb(29, 33, 43)'
        );
      });
    });
    cy.get('.wizard-steps li.current')
      .should('have.css', 'background-color', 'rgb(38, 35, 59)')
      .and('have.css', 'color', 'rgb(248, 250, 252)');

    cy.contains('button', 'Suivant').click();
    cy.get('.axis-editor').should('have.length', 2).first().should('have.css', 'background-color', 'rgb(17, 19, 24)');
    cy.get('.axis-row').first().should('have.css', 'background-color', 'rgb(27, 31, 39)');
    cy.get('[data-testid="wizard-preview"]').should('be.visible');
    cy.get('.preview-grid .pv-cell').first().should('have.css', 'background-color', 'rgb(15, 18, 23)');

    cy.contains('button', 'Suivant').click();
    cy.get('.recap').should('have.css', 'background-color', 'rgb(17, 19, 24)');
  });
});
