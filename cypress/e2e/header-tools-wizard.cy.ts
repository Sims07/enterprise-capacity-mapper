describe('Raffinements Outils et Nouvelle cartographie', () => {
  beforeEach(() => {
    cy.on('uncaught:exception', err => { throw err; });
    cy.visit('/', {
      onBeforeLoad(win) {
        win.localStorage.clear();
      },
    });
  });

  it('ferme Outils lorsqu’on clique ailleurs et avec Echap', () => {
    cy.get('[data-testid="tools-menu-toggle"]').click();
    cy.get('[data-testid="tools-menu"]').should('have.class', 'is-open');
    cy.get('[data-testid="open-local-maps"]').should('not.exist');
    cy.get('[data-testid="primary-library"]').should('be.visible');
    cy.get('[data-testid="nav-cartography"]').click();
    cy.get('[data-testid="tools-menu"]').should('not.have.class', 'is-open');

    cy.get('[data-testid="tools-menu-toggle"]').click();
    cy.get('[data-testid="tools-menu"]').should('have.class', 'is-open');
    cy.get('body').type('{esc}');
    cy.get('[data-testid="tools-menu"]').should('not.have.class', 'is-open');
    cy.get('[data-testid="tools-menu-toggle"]').should('have.focus');
  });

  it('utilise un chevron CSS compact au lieu du caractère flèche brut', () => {
    cy.get('[data-testid="tools-menu-toggle"] span[aria-hidden="true"]')
      .should('have.css', 'border-right-style', 'solid')
      .and('have.css', 'border-bottom-style', 'solid')
      .and('have.css', 'font-size', '0px');
  });

  it('vérifie les surfaces et les titres du wizard en thèmes clair et sombre', () => {
    cy.get('[data-testid="tools-menu-toggle"]').click();
    cy.get('[data-testid="new-map-button"]').click();
    cy.get('.modal.wizard').should('be.visible');
    cy.get('.modal.wizard .template-card > b').first().should('have.css', 'color', 'rgb(31, 41, 55)');
    cy.contains('.modal.wizard button', 'Annuler').click();
    cy.get('.modal.wizard').should('not.exist');

    cy.get('[data-testid="tools-menu"]').then($menu => {
      if (!$menu.hasClass('is-open')) cy.get('[data-testid="tools-menu-toggle"]').click();
    });
    cy.get('[data-testid="theme-toggle"]').click();
    cy.get('.app').should('have.class', 'theme-dark');
    cy.get('[data-testid="tools-menu"]').then($menu => {
      if (!$menu.hasClass('is-open')) cy.get('[data-testid="tools-menu-toggle"]').click();
    });
    cy.get('[data-testid="new-map-button"]').click();
    cy.get('.modal.wizard').should('be.visible').and('have.css', 'background-color', 'rgb(23, 26, 33)');
    cy.get('.modal.wizard').should($modal => {
      expect(getComputedStyle($modal[0]).backgroundColor).to.be.a('string').and.not.be.empty;
    });
    cy.get('.wizard-steps').should($steps => {
      expect(getComputedStyle($steps[0]).backgroundColor).not.to.equal(getComputedStyle(Cypress.$('.modal.wizard')[0]).backgroundColor);
    });
    ['template-capability-map', 'template-value-chain', 'template-blank', 'template-current'].forEach(id => {
      cy.get(`[data-testid="${id}"]`).should($card => {
        expect(getComputedStyle($card[0]).backgroundColor).to.be.a('string').and.not.be.empty;
      });
    });
    cy.get('[data-testid="template-capability-map"]').should('have.attr', 'aria-pressed', 'true').and($card => {
      expect(getComputedStyle($card[0]).backgroundColor).to.equal('rgb(38, 35, 59)');
      expect(getComputedStyle($card[0]).borderColor).to.equal('rgb(99, 102, 241)');
    });
    cy.get('.wizard-steps li.current').should('have.attr', 'aria-current', 'step');
    cy.get('.modal.wizard .field input').first().should('have.css', 'background-color', 'rgb(16, 19, 24)').and('have.css', 'color', 'rgb(243, 244, 246)');

    cy.contains('button', 'Suivant').click();
    cy.get('.axis-editor').should('have.length', 2).first().should('be.visible').and($axis => {
      expect(getComputedStyle($axis[0]).backgroundColor).to.be.a('string').and.not.be.empty;
    });
    cy.get('.axis-row').first().should($row => {
      expect(getComputedStyle($row[0]).backgroundColor).to.be.a('string').and.not.be.empty;
    });
    cy.get('.axis-row input').first().should('have.css', 'background-color', 'rgb(16, 19, 24)').and('have.css', 'color', 'rgb(243, 244, 246)');
    cy.get('[data-testid="wizard-preview"]').should('be.visible');
    cy.get('.preview-grid .pv-cell').first().should($cell => {
      expect(getComputedStyle($cell[0]).backgroundColor).to.be.a('string').and.not.be.empty;
    }).and('have.css', 'background-color', 'rgb(15, 18, 23)').and('have.css', 'border-color', 'rgb(48, 54, 66)');

    cy.contains('button', 'Suivant').click();
    cy.get('.recap').should($recap => {
      expect(getComputedStyle($recap[0]).backgroundColor).to.be.a('string').and.not.be.empty;
    });
  });

  it('expose Présentation dans l’en-tête et Nouvelle cartographie dans Outils', () => {
    cy.get('[data-testid="presentation-toggle"]').should('be.visible');
    cy.get('[data-testid="presentation-switch-input"]').should('have.attr', 'role', 'switch').and('not.be.checked');
    cy.get('[data-testid="tools-menu"]').should('not.have.class', 'is-open');
    cy.get('[data-testid="new-map-button"]').should('not.exist');

    cy.get('[data-testid="presentation-toggle"]').click();
    cy.get('[data-testid="presentation-switch-input"]').should('be.checked');
    cy.get('[data-testid="presentation-toggle"]').click();
    cy.get('[data-testid="presentation-switch-input"]').should('not.be.checked');

    cy.get('[data-testid="tools-menu"]').then($menu => { if (!$menu.hasClass('is-open')) cy.get('[data-testid="tools-menu-toggle"]').click(); });
    cy.get('[data-testid="new-map-button"]').should('be.visible');
  });

});

export {};
