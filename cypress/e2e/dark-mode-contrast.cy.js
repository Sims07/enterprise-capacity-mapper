describe('Contrastes du thème sombre', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.clearLocalStorage();
    cy.reload();
  });

  const openToolsMenu = () => {
    cy.get('[data-testid="tools-menu"]').then($menu => {
      if (!$menu.attr('open')) cy.get('[data-testid="tools-menu-toggle"]').click();
    });
    cy.get('[data-testid="tools-menu-toggle"]').should('have.attr', 'aria-expanded', 'true');
  };

  const toggleTheme = () => {
    openToolsMenu();
    cy.get('[data-testid="theme-toggle"]').should('be.visible').click();
    cy.get('[data-testid="tools-menu"]').should('not.have.attr', 'open');
  };

  it('renforce la lisibilité des surfaces, textes et champs en mode sombre', () => {
    toggleTheme();

    cy.get('.app.theme-dark').should('exist');
    cy.get('.map-filter-control span').should('be.visible').and('have.css', 'color', 'rgb(241, 245, 249)');
    cy.get('aside').should('have.css', 'background-color', 'rgb(25, 27, 34)');
    cy.get('[data-testid="undo-button"], [data-testid="redo-button"]').each(($button) => {
      cy.wrap($button).should('be.visible').and('have.css', 'opacity', '1');
      cy.wrap($button).find('.history-button-label').should('have.css', 'color', 'rgb(203, 213, 225)');
    });
    cy.get('.search').should('have.css', 'background-color', 'rgb(13, 23, 39)');
    cy.get('.search').should('have.css', 'color', 'rgb(241, 245, 249)');
  });

  it('revient au thème clair sans conserver la classe sombre', () => {
    toggleTheme();
    cy.get('.app.theme-dark').should('exist');

    toggleTheme();
    cy.get('.app').should('not.have.class', 'theme-dark');
  });

  it('présente les outils par catégorie et permet de fermer le menu au clavier', () => {
    openToolsMenu();

    cy.get('.toolbar-tools-panel').should('be.visible').within(() => {
      cy.contains('.toolbar-menu-heading', 'Cartographie').should('be.visible');
      cy.contains('.toolbar-menu-heading', 'Données').should('be.visible');
      cy.contains('.toolbar-menu-heading', 'Affichage').should('be.visible');
      cy.get('[data-testid="new-map-button"]').should('be.visible');
      cy.get('[data-testid="save-local-map"]').should('be.visible');
      cy.get('[data-testid="export-model"]').should('be.visible');
      cy.get('[data-testid="import-model"]').should('exist');
      cy.get('[data-testid="theme-toggle"]').should('be.visible');
    });

    cy.get('body').type('{esc}');
    cy.get('[data-testid="tools-menu"]').should('not.have.attr', 'open');
    cy.get('[data-testid="tools-menu-toggle"]').should('have.focus');
  });

  it('préserve le contraste de l’éditeur Structure en thème sombre', () => {
    toggleTheme();

    cy.contains('.canvas-actions button', 'Structure').click();
    cy.get('.modal h2').should('contain.text', 'Personnaliser la structure');
    cy.get('.modal:not(.wizard)').should('have.css', 'background-color', 'rgb(32, 35, 44)');
    cy.get('.modal:not(.wizard) .structure-section').should('have.length', 3)
      .first().should('have.css', 'background-color', 'rgb(23, 26, 33)')
      .and('have.css', 'border-top-color', 'rgb(53, 59, 72)');
    cy.get('.modal:not(.wizard) .structure-section h3').each($heading => {
      cy.wrap($heading).should('be.visible').and('have.css', 'color', 'rgb(243, 244, 246)');
    });
    cy.get('.modal:not(.wizard) .structure-hint')
      .should('be.visible').and('have.css', 'color', 'rgb(193, 200, 213)');
    cy.get('.modal:not(.wizard) .structure-row .field input').first()
      .should('be.visible')
      .and('have.css', 'background-color', 'rgb(16, 19, 24)')
      .and('have.css', 'color', 'rgb(243, 244, 246)');
    cy.get('.modal:not(.wizard) .structure-remove').first()
      .should('be.visible').and('have.css', 'color', 'rgb(254, 202, 202)');
    cy.get('.modal:not(.wizard) .structure-add').first()
      .should('be.visible').and('have.css', 'color', 'rgb(224, 231, 255)')
      .click();
    cy.get('.modal:not(.wizard) .structure-section').first().find('.structure-row').should('have.length', 3);
    cy.get('.modal:not(.wizard) .modal-actions').contains('button', 'Annuler').click();
    cy.get('.modal').should('not.exist');
  });

  it('conserve les surfaces claires de l’éditeur Structure en thème clair', () => {
    cy.contains('.canvas-actions button', 'Structure').click();
    cy.get('.modal h2').should('contain.text', 'Personnaliser la structure');
    cy.get('.modal:not(.wizard)').should('have.css', 'background-color', 'rgb(255, 255, 255)');
    cy.get('.modal:not(.wizard) .structure-section').first()
      .should('have.css', 'border-top-color', 'rgb(226, 232, 240)');
    cy.get('.modal:not(.wizard) .structure-section h3')
      .first().should('have.css', 'color', 'rgb(15, 23, 42)');
    cy.get('.modal:not(.wizard) .modal-actions').contains('button', 'Annuler').click();
    cy.get('.modal').should('not.exist');
  });
});
