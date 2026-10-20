  });

  it('garde un onglet actif sans curseur violet débordant', () => {
    cy.viewport(390, 844);
    cy.get('[data-testid="tab-relations"]').click();
    cy.get('.toolbar-switch > button.active')
      .should('have.length', 1)
      .and('have.css', 'animation-name', 'none')
      .and('have.css', 'transform', 'none');
    cy.get('.toolbar-switch > button.active').then($button => {
      expect($button[0].getBoundingClientRect().width).to.be.lessThan(200);
    });
  });

  it('permet de revenir au dashboard avec le bouton Retour ou le bouton Précédent du navigateur', () => {
    cy.get('[data-testid="tab-dashboard"]').click();
    cy.get('[data-testid="dashboard-view-coverage"]').click();
    cy.get('.dashboard-map-capability[aria-label*="Explorer dans Relations"]').first().click();
    cy.get('[data-testid="tab-relations"]').should('have.class', 'active');
    cy.get('.tree-impact-toggle[aria-pressed="true"]').should('exist');
    cy.get('[data-testid="return-to-dashboard"]').should('be.visible');

    cy.go('back');
    cy.get('[data-testid="tab-dashboard"]').should('have.class', 'active');
    cy.get('[data-testid="capability-dashboard"]').should('be.visible');

    cy.get('[data-testid="dashboard-view-coverage"]').click();
    cy.get('.dashboard-map-capability[aria-label*="Explorer dans Relations"]').first().click();
    cy.get('[data-testid="return-to-dashboard"]').click();
    cy.get('[data-testid="tab-dashboard"]').should('have.class', 'active');
    cy.get('[data-testid="capability-dashboard"]').should('be.visible');
  });
