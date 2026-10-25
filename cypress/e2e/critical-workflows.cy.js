  });

  it('affiche les récents même si la bibliothèque de sauvegardes est corrompue', () => {
    visitFresh();

    cy.window().then(win => {
      win.localStorage.setItem('enterprise-capacity-mapper:local-maps:v1', '{json invalide');
    });
    cy.get('[data-testid="primary-library"]').click();

    cy.get('.toast').should('contain.text', 'Certaines données locales sont invalides');
    cy.get('[data-testid="library-page"]').should('be.visible');
    cy.get('[data-testid="saved-maps-empty"]').should('be.visible');
    cy.get('[data-testid="recent-maps-list"]').should('be.visible');
  });

  it('masque la barre de défilement native sans bloquer le scroll interne ni faire bouger le viewport', () => {
    cy.viewport(1280, 800);
    cy.visit('/');
    cy.get('body').should('have.css', 'overflow', 'hidden');
    cy.get('.app').should('have.css', 'height', '800px');
