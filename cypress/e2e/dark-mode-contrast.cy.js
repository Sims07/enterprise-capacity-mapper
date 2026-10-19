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
});
