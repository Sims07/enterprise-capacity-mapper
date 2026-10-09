describe('Carte poster : couleur par domaine et couverture applicative', () => {
  beforeEach(() => {
    cy.on('uncaught:exception', (err) => {
      throw err;
    });
    cy.visit('/');
    cy.clearLocalStorage();
    cy.reload();
  });

  it('attribue une couleur à chaque domaine N0 sans activer la couverture par défaut', () => {
    cy.get('.domain').should('have.length', 4);
    cy.get('.domain').each(($domain) => {
      expect($domain.attr('style')).to.contain('--dc');
    });
    cy.contains('.domain', 'Relation & Engagement Client').invoke('attr', 'style').then((crm) => {
      cy.contains('.domain', 'Finance, Gestion & Comptabilité').invoke('attr', 'style').should('not.equal', crm);
    });
    cy.get('.cap.cov-ok, .cap.cov-dup, .cap.cov-gap').should('not.exist');
    cy.get('.map-legend').should('not.exist');
  });

  it('colore les capacités par couverture avec symbole, légende et persistance', () => {
    cy.get('.visual-settings > summary').click();
    cy.get('[data-testid="visual-color"]').select('coverage');

    cy.get('.map-legend').should('be.visible').and('contain.text', 'Gap').and('contain.text', 'Redondance');
    cy.get('.cap.cov-gap').should('have.length', 2);
    cy.get('.cap.cov-dup').should('have.length', 1);
    cy.get('.cap.cov-ok').should('have.length', 7);

    cy.contains('.cap', 'Achats Fournisseurs').should('have.class', 'cov-gap').and('contain.text', '✕');
    cy.contains('.cap', 'Facturation & Recouvrement').should('have.class', 'cov-dup').and('contain.text', '⇄');
    cy.contains('.cap', 'Comptabilité Générale').should('have.class', 'cov-ok').and('contain.text', '✓');
    cy.get('.stats').should('contain.text', '2 gaps');

    cy.reload();
    cy.get('.map-legend').should('be.visible');
    cy.get('.cap.cov-gap').should('have.length', 2);
  });

  it('met à jour la couverture quand une application est dissociée', () => {
    cy.get('.visual-settings > summary').click();
    cy.get('[data-testid="visual-color"]').select('coverage');
    cy.contains('.cap', 'Gestion des Prospects & Leads').should('have.class', 'cov-ok').within(() => {
      cy.get('.rel button').click();
    });
    cy.contains('.cap', 'Gestion des Prospects & Leads').should('have.class', 'cov-gap');
    cy.get('.stats').should('contain.text', '3 gaps');
  });

  it('revient à la coloration par domaine sans perdre les données', () => {
    cy.get('.visual-settings > summary').click();
    cy.get('[data-testid="visual-color"]').select('coverage').select('domain');
    cy.get('.map-legend').should('not.exist');
    cy.get('.cap.cov-gap').should('not.exist');
    cy.get('.stats').should('contain.text', '10 N1');
  });
});
