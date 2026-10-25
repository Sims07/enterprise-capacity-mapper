describe('Contrastes du thème sombre', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.clearLocalStorage();
    cy.reload();
  });

  const openToolsMenu = () => {
    cy.get('[data-testid="tools-menu"]').then($menu => {
      if (!$menu.hasClass('is-open')) cy.get('[data-testid="tools-menu-toggle"]').click();
    });
    cy.get('[data-testid="tools-menu-toggle"]').should('have.attr', 'aria-expanded', 'true');
  };

  const toggleTheme = () => {
    openToolsMenu();
    cy.get('[data-testid="theme-toggle"]').should('be.visible').click();
    cy.get('[data-testid="tools-menu"]').should('not.have.class', 'is-open');
  };

  it('renforce la lisibilité des surfaces, textes et champs en mode sombre', () => {
    toggleTheme();

    cy.get('.app.theme-dark').should('exist');
    cy.get('.map-filter-control span').should('be.visible');
    cy.contains('.canvas-actions button', 'Structure').should('be.visible');

    openToolsMenu();
    cy.get('.app.theme-dark .toolbar-tools-panel').should('be.visible');
    cy.get('[data-testid="undo-button"], [data-testid="redo-button"]').each(($button) => {
      cy.wrap($button).should('be.visible').and('have.css', 'opacity', '1');
      cy.wrap($button).find('.history-button-label').should('be.visible');
    });
    cy.get('.search').should('be.visible');
  });

  it('revient au thème clair sans conserver la classe sombre', () => {
    toggleTheme();
    cy.get('.app.theme-dark').should('exist');
    toggleTheme();
    cy.get('.app').should('not.have.class', 'theme-dark');
  });

  it('présente les outils accessibles par catégorie en thème sombre et ferme le menu au clavier', () => {
    toggleTheme();
    openToolsMenu();
    cy.get('.toolbar-tools-panel').should('be.visible').within(() => {
      cy.contains('.toolbar-menu-heading', 'Cartographie').should('be.visible');
      cy.contains('.toolbar-menu-heading', 'Données').should('be.visible');
      cy.contains('.toolbar-menu-heading', 'Affichage').should('be.visible');
      cy.get('[data-testid="new-map-button"]').should('be.visible').and('not.be.disabled');
      cy.get('[data-testid="save-local-map"]').should('be.visible').and('not.be.disabled');
      cy.get('[data-testid="export-model"]').should('be.visible').and('not.be.disabled');
      cy.get('[data-testid="import-model"]').should('exist');
      cy.get('[data-testid="theme-toggle"]').should('be.visible');
    });
    cy.get('body').type('{esc}');
    cy.get('[data-testid="tools-menu"]').should('not.have.class', 'is-open');
    cy.get('[data-testid="tools-menu-toggle"]').should('have.focus');
  });

  it('préserve le contraste de l’éditeur Structure en thèmes clair et sombre', () => {
    cy.contains('.canvas-actions button', 'Structure').click();
    cy.get('.modal h2').should('contain.text', 'Personnaliser la structure');
    cy.get('.modal .structure-section').first().should('be.visible');
    cy.get('.app').should('not.have.class', 'theme-dark');
    cy.get('.modal .structure-section h3').first().should('be.visible');
    cy.get('.modal .modal-actions').contains('button', 'Annuler').click();
    cy.get('.modal').should('not.exist');
    toggleTheme();
    cy.contains('.canvas-actions button', 'Structure').click();
    cy.get('.modal h2').should('contain.text', 'Personnaliser la structure');
    cy.get('.modal .structure-section').should('have.length', 3).first().should('be.visible');
    cy.get('.modal .structure-section h3').each($heading => {
      cy.wrap($heading).should('be.visible');
    });
    cy.get('.modal .structure-hint').should('be.visible');
    cy.get('.modal .structure-row .field input').first().should('be.visible');
    cy.get('.modal .structure-remove').first().should('be.visible');
    cy.get('.modal .structure-section').first().find('.structure-row').then($rows => {
      const initialRowCount = $rows.length;
      cy.get('.modal .structure-add').first().should('be.visible').click();
      cy.get('.modal .structure-section').first().find('.structure-row').should('have.length', initialRowCount + 1);
    });
    cy.get('.modal .modal-actions').contains('button', 'Annuler').click();
    cy.get('.modal').should('not.exist');
  });

  it('affiche l’aide TOGAF avec un contraste cohérent en thème sombre', () => {
    toggleTheme();
    cy.get('.help-icon').click();
    cy.get('.app.theme-dark .togaf-guide').should('be.visible');
    cy.get('.app.theme-dark .togaf-guide .guide-intro').should('be.visible');
    cy.get('.app.theme-dark .togaf-guide section').should('have.length', 4).each($section => {
      cy.wrap($section).should('be.visible');
    });
    cy.get('.app.theme-dark .togaf-guide section p').first().should('be.visible');
    cy.get('.app.theme-dark .togaf-guide .do-dont').should('be.visible');
    cy.get('.app.theme-dark .togaf-guide .modal-actions .primary').should('be.visible').and('not.be.disabled');
    cy.get('.togaf-guide button[aria-label="Fermer"]').click();
    cy.get('.togaf-guide').should('not.exist');
  });

});

export {};
