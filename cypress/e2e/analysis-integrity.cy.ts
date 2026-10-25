describe('Lot 2 — cohérence des indicateurs d’analyse', () => {
  const resetApp = () => {
    cy.visit('/');
    cy.clearLocalStorage();
    cy.reload();
  };

  const openRelations = () => {
    cy.get('[data-testid="nav-analysis"]').click();
    cy.get('[data-testid="tab-relations"]').click();
    cy.get('.coverage-tree').should('be.visible');
  };

  it('recalcule les redondances après ajout puis retrait d’une relation applicative', () => {
    resetApp();
    openRelations();

    cy.get('.tree-summary').should('contain.text', '2 gaps').and('contain.text', '1 redondance');

    cy.get('button[aria-label="Relier des applications à Gestion des Prospects & Leads"]').click();
    cy.get('[data-testid="link-list"]').contains('label', 'Odoo Invoice').find('input').check();
    cy.get('[data-testid="link-save"]').click();

    cy.contains('.tree-node-cap', 'Gestion des Prospects & Leads')
      .should('contain.text', 'Salesforce CRM')
      .and('contain.text', 'Odoo Invoice')
      .and('contain.text', 'Redondance');
    cy.get('.tree-summary').should('contain.text', '2 gaps').and('contain.text', '2 redondances');

    cy.get('button[aria-label="Retirer Odoo Invoice de Gestion des Prospects & Leads"]').click();
    cy.contains('.tree-node-cap', 'Gestion des Prospects & Leads')
      .should('contain.text', 'Salesforce CRM')
      .and('not.contain.text', 'Odoo Invoice')
      .and('not.contain.text', 'Redondance');
    cy.get('.tree-summary').should('contain.text', '2 gaps').and('contain.text', '1 redondance');
  });

  it('conserve la cohérence entre la sélection d’impact, les relations et la cartographie', () => {
    resetApp();

    cy.get('[data-testid="nav-analysis"]').click();
    cy.get('[data-testid="dashboard-view-impact"]').click();
    cy.contains('[data-testid="impact-view"] .dashboard-impact-select-list button', 'CRM-01 — Gestion des Prospects & Leads')
      .click()
      .should('have.attr', 'aria-pressed', 'true');

    openRelations();
    cy.get('.tree-row.impact-highlight')
      .should('have.length.greaterThan', 0)
      .and('contain.text', 'Gestion des Prospects & Leads');

    cy.get('[data-testid="nav-cartography"]').click();
    cy.get('.cap.impact-selected').should('contain.text', 'Gestion des Prospects & Leads');

    cy.get('[data-testid="map-cap-select"]').contains('Gestion des Prospects & Leads').click();
    cy.get('.cap.impact-selected').should('not.exist');

    cy.get('[data-testid="nav-analysis"]').click();
    cy.get('[data-testid="dashboard-view-impact"]').click();
    cy.contains('[data-testid="impact-view"] .dashboard-impact-select-list button', 'CRM-01 — Gestion des Prospects & Leads')
      .should('have.attr', 'aria-pressed', 'false');
  });
});

export {};
