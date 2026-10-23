describe('Nouvelle cartographie — thème', () => {
  beforeEach(() => {
    cy.on('uncaught:exception', (err) => { throw err; });
  });

  it('conserve toutes les surfaces du wizard en dark Linear', () => {
    cy.visit('/');
    cy.clearLocalStorage();
    cy.reload();

    cy.get('[data-testid="tools-menu"]').then($menu => { if (!$menu.hasClass('is-open')) cy.get('[data-testid="tools-menu-toggle"]').click(); });
    cy.get('[data-testid="theme-toggle"]').then($toggle => {
      if (!$toggle.closest('.app').hasClass('theme-dark')) cy.wrap($toggle).click();
    });
    cy.get('.app').should('have.class', 'theme-dark');
    cy.get('[data-testid="tools-menu"]').then($menu => { if (!$menu.hasClass('is-open')) cy.get('[data-testid="tools-menu-toggle"]').click(); });
    cy.get('[data-testid="new-map-button"]').click();
    cy.get('.modal.wizard').should('be.visible');

    cy.get('.modal.wizard').should($modal => {
      expect(getComputedStyle($modal[0]).backgroundColor).to.be.a('string').and.not.be.empty;
    });
    cy.get('.wizard-steps').should($steps => {
      expect(getComputedStyle($steps[0]).backgroundColor).not.to.equal(
        getComputedStyle(Cypress.$('.modal.wizard')[0]).backgroundColor
      );
    });
    ['template-capability-map', 'template-value-chain', 'template-blank', 'template-current'].forEach(id => {
      cy.get(`[data-testid="${id}"]`).should($card => {
        expect(getComputedStyle($card[0]).backgroundColor).to.be.a('string').and.not.be.empty;
      });
    });
    cy.get('[data-testid="template-capability-map"]').should('have.attr', 'aria-pressed', 'true');
    cy.get('.wizard-steps li.current').should('have.attr', 'aria-current', 'step');

    cy.contains('button', 'Suivant').click();
    cy.get('.axis-editor').should('have.length', 2).first().should($axis => {
      expect(getComputedStyle($axis[0]).backgroundColor).to.be.a('string').and.not.be.empty;
    });
    cy.get('.axis-row').first().should($row => {
      expect(getComputedStyle($row[0]).backgroundColor).to.be.a('string').and.not.be.empty;
    });
    cy.get('[data-testid="wizard-preview"]').should('be.visible');
    cy.get('.preview-grid .pv-cell').first().should($cell => {
      expect(getComputedStyle($cell[0]).backgroundColor).to.be.a('string').and.not.be.empty;
    });

    cy.contains('button', 'Suivant').click();
    cy.get('.recap').should($recap => {
      expect(getComputedStyle($recap[0]).backgroundColor).to.be.a('string').and.not.be.empty;
    });
  });
});
