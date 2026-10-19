describe('Description des domaines N0 sur la cartographie', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.clearLocalStorage();
    cy.reload();
  });

  const openFirstDomainEditor = () => {
    cy.get('.domain-card').first().find('.mini-action-trigger').click();
    cy.get('.context-menu').contains('button', 'Modifier').click();
    cy.get('[data-testid="domain-description"]').should('be.visible');
  };

  it('permet de modifier et de conserver la description N0 dans la carte', () => {
    openFirstDomainEditor();
    cy.get('[data-testid="domain-description"]').clear().type('Périmètre client et engagement.');
    cy.get('.modal-actions').contains('button', 'Enregistrer').click();

    cy.get('.domain-card').first().find('.domain-desc')
      .should('be.visible')
      .and('have.text', 'Périmètre client et engagement.');

    cy.reload();
    cy.get('.domain-card').first().find('.domain-desc')
      .should('have.text', 'Périmètre client et engagement.');
  });

  it('n’affiche aucun bloc de description lorsqu’une description N0 est vide', () => {
    openFirstDomainEditor();
    cy.get('[data-testid="domain-description"]').clear();
    cy.get('.modal-actions').contains('button', 'Enregistrer').click();

    cy.get('.domain-card').first().find('.domain-desc').should('not.exist');
    cy.get('.domain-card').first().should('not.contain.text', 'Aucune description');
  });

  it('ne remplace pas une description N1 vide par un texte artificiel', () => {
    cy.get('.cap-desc').should('not.contain.text', 'Aucune description');
  });
});
