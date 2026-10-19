describe('Contrastes du thème sombre', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  const toggleTheme = () => {
    cy.get('[data-testid="tools-menu-toggle"]').click();
    cy.get('[data-testid="theme-toggle"]').should('be.visible').click();
  };

  it('renforce la lisibilité des surfaces, textes et champs en mode sombre', () => {
    toggleTheme();

    cy.get('.app.theme-dark').should('exist');
    cy.get('.canvas-title h2').should('have.css', 'color', 'rgb(241, 245, 249)');
    cy.get('aside').should('have.css', 'background-color', 'rgb(17, 28, 46)');
    cy.get('.search').should('have.css', 'background-color', 'rgb(13, 23, 39)');
    cy.get('.search').should('have.css', 'color', 'rgb(241, 245, 249)');
  });

  it('revient au thème clair sans conserver la classe sombre', () => {
    toggleTheme();
    cy.get('.app.theme-dark').should('exist');

    toggleTheme();
    cy.get('.app').should('not.have.class', 'theme-dark');
  });
});
