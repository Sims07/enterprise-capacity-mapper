describe('Lot 3 — synthèse de l’analyse d’impact', () => {
  const resetApp = () => {
    cy.visit('/');
    cy.clearLocalStorage();
    cy.reload();
  };

  const openImpact = () => {
    cy.get('[data-testid="nav-analysis"]').click();
    cy.get('[data-testid="dashboard-view-impact"]').click();
    cy.get('[data-testid="impact-view"]').should('be.visible');
  };

  const selectCapability = name => {
    cy.contains('[data-testid="impact-view"] .dashboard-impact-select-list button', name).click();
  };

  beforeEach(resetApp);

  it('présente un état vide explicite avant toute sélection', () => {
    openImpact();

    cy.get('[data-testid="dashboard-impact-empty"]')
      .should('be.visible')
      .and('contain.text', 'Aucune sélection d’impact active');
    cy.get('[data-testid="dashboard-impact-summary"]').should('not.exist');
    cy.get('[data-testid="impact-view"]').should('contain.text', '0 sélectionnée(s)');
  });

  it('calcule les applications impactées et les gaps uniquement à partir des capacités sélectionnées', () => {
    openImpact();

    selectCapability('CRM-01 — Gestion des Prospects & Leads');
    selectCapability('Achats Fournisseurs');

    cy.get('[data-testid="dashboard-impact-summary"]').should('be.visible');
    cy.get('[data-testid="dashboard-impact-summary"] .dashboard-impact-metrics article').should('have.length', 3).then($metrics => {
      expect($metrics.eq(0)).to.contain.text('2');
      expect($metrics.eq(0)).to.contain.text('Éléments sollicités');
      expect($metrics.eq(1)).to.contain.text('1');
      expect($metrics.eq(1)).to.contain.text('Applications impactées');
      expect($metrics.eq(2)).to.contain.text('1');
      expect($metrics.eq(2)).to.contain.text('Gaps dans la sélection');
    });

    cy.get('[data-testid="dashboard-impact-summary"]')
      .should('contain.text', 'Gestion des Prospects & Leads')
      .and('contain.text', 'Achats Fournisseurs')
      .and('contain.text', 'Salesforce CRM');
    cy.get('[data-testid="dashboard-impact-empty"]').should('not.exist');
  });

  it('retire les métriques lorsque toutes les capacités sont désélectionnées', () => {
    openImpact();

    selectCapability('CRM-01 — Gestion des Prospects & Leads');
    cy.get('[data-testid="dashboard-impact-summary"]').should('be.visible');

    selectCapability('CRM-01 — Gestion des Prospects & Leads');
    cy.get('[data-testid="dashboard-impact-empty"]').should('be.visible');
    cy.get('[data-testid="dashboard-impact-summary"]').should('not.exist');
    cy.contains('[data-testid="impact-view"] .dashboard-impact-select-list button', 'CRM-01 — Gestion des Prospects & Leads')
      .should('have.attr', 'aria-pressed', 'false');
  });
});

export {};
